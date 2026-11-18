import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { generateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import { UserPayload } from '../types';

const TOTP_ISSUER = 'MailFlow';
const TWO_FA_TEMP_EXPIRES = '5m';

const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  active: true,
  totpEnabled: true,
  createdAt: true,
} as const;

type PublicUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  totpEnabled: boolean;
  createdAt: Date;
};

export class AuthService {
  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (user.active === false) {
      throw new Error('This account has been deactivated. Contact an administrator.');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    if (user.totpEnabled && user.totpSecret) {
      return {
        requires2fa: true as const,
        tempToken: this.generateTempToken(user.id),
      };
    }

    return this.issueSession(user);
  }

  static async verifyLogin2fa(tempToken: string, code: string) {
    const userId = this.verifyTempToken(tempToken);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.active === false) {
      throw new Error('Invalid or expired verification session');
    }
    if (!user.totpEnabled || !user.totpSecret) {
      throw new Error('Two-factor authentication is not enabled');
    }

    if (!this.verifyTotp(user.totpSecret, code)) {
      throw new Error('Invalid authenticator code');
    }

    return this.issueSession(user);
  }

  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: publicUserSelect,
    });
    if (!user || user.active === false) {
      throw new Error('User not found or deactivated');
    }
    return user;
  }

  /** Start setup: create/replace pending secret (not enabled until confirm). */
  static async setup2fa(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.active === false) throw new Error('User not found');
    if (user.totpEnabled) {
      throw new Error('Two-factor authentication is already enabled');
    }

    const secret = generateSecret();
    await prisma.user.update({
      where: { id: userId },
      data: { totpSecret: secret, totpEnabled: false },
    });

    const otpauthUrl = generateURI({
      issuer: TOTP_ISSUER,
      label: user.email,
      secret,
    });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    return {
      secret,
      otpauthUrl,
      qrCodeDataUrl,
    };
  }

  static async enable2fa(userId: string, code: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.active === false) throw new Error('User not found');
    if (!user.totpSecret) {
      throw new Error('Start 2FA setup first');
    }
    if (user.totpEnabled) {
      throw new Error('Two-factor authentication is already enabled');
    }
    if (!this.verifyTotp(user.totpSecret, code)) {
      throw new Error('Invalid authenticator code');
    }

    return prisma.user.update({
      where: { id: userId },
      data: { totpEnabled: true },
      select: publicUserSelect,
    });
  }

  static async disable2fa(userId: string, code: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.active === false) throw new Error('User not found');
    if (!user.totpEnabled || !user.totpSecret) {
      throw new Error('Two-factor authentication is not enabled');
    }
    if (!this.verifyTotp(user.totpSecret, code)) {
      throw new Error('Invalid authenticator code');
    }

    return prisma.user.update({
      where: { id: userId },
      data: { totpEnabled: false, totpSecret: null },
      select: publicUserSelect,
    });
  }

  /** Cancel unfinished setup (secret stored but not enabled). */
  static async cancel2faSetup(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    if (user.totpEnabled) {
      throw new Error('Disable 2FA instead of cancelling setup');
    }
    return prisma.user.update({
      where: { id: userId },
      data: { totpSecret: null, totpEnabled: false },
      select: publicUserSelect,
    });
  }

  static async reset2fa(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { totpEnabled: false, totpSecret: null },
      select: publicUserSelect,
    });
  }

  private static issueSession(user: {
    id: string;
    email: string;
    name: string;
    role: string;
    active: boolean;
    totpEnabled: boolean;
    createdAt: Date;
  }) {
    const userData: PublicUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      active: user.active,
      totpEnabled: user.totpEnabled,
      createdAt: user.createdAt,
    };
    const token = this.generateToken(user);
    return { requires2fa: false as const, user: userData, token };
  }

  private static verifyTotp(secret: string, code: string): boolean {
    const token = (code || '').replace(/\s/g, '');
    if (!/^\d{6}$/.test(token)) return false;
    const result = verifySync({ secret, token });
    return Boolean(result && result.valid);
  }

  private static generateToken(user: { id: string; email: string; role: string }): string {
    const payload: UserPayload = { id: user.id, email: user.email, role: user.role };
    return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn as any });
  }

  private static generateTempToken(userId: string): string {
    return jwt.sign({ id: userId, purpose: '2fa_pending' }, config.jwtSecret, {
      expiresIn: TWO_FA_TEMP_EXPIRES,
    });
  }

  private static verifyTempToken(token: string): string {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as { id?: string; purpose?: string };
      if (!decoded?.id || decoded.purpose !== '2fa_pending') {
        throw new Error('Invalid token');
      }
      return decoded.id;
    } catch {
      throw new Error('Invalid or expired verification session. Sign in again.');
    }
  }
}
