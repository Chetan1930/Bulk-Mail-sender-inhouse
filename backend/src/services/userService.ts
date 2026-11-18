import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';

const USER_PUBLIC_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  active: true,
  totpEnabled: true,
  createdAt: true,
} as const;

export class UserService {
  static async list() {
    return prisma.user.findMany({
      select: USER_PUBLIC_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  static async create(data: {
    email: string;
    name: string;
    password: string;
    role?: string;
  }) {
    const email = data.email.trim().toLowerCase();
    const name = data.name.trim();
    const password = data.password;
    const role = data.role === 'admin' ? 'admin' : 'manager';

    if (!email || !password) {
      throw new Error('Email and password are required');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new Error('A user with that email already exists');
    }

    const hashed = await bcrypt.hash(password, 10);
    return prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        password: hashed,
        role,
        active: true,
      },
      select: USER_PUBLIC_SELECT,
    });
  }

  static async update(
    id: string,
    data: {
      name?: string;
      role?: string;
      active?: boolean;
      password?: string;
      resetTotp?: boolean;
    },
    actor: { id: string; role: string }
  ) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error('User not found');

    if (data.active === false && user.id === actor.id) {
      throw new Error('You cannot deactivate your own account');
    }

    if (data.active === false && user.role === 'admin') {
      const adminCount = await prisma.user.count({
        where: { role: 'admin', active: true },
      });
      if (adminCount <= 1) {
        throw new Error('Cannot deactivate the last active admin');
      }
    }

    if (data.role && data.role !== 'admin' && data.role !== 'manager') {
      throw new Error('Role must be admin or manager');
    }

    if (data.role === 'manager' && user.role === 'admin') {
      const adminCount = await prisma.user.count({
        where: { role: 'admin', active: true },
      });
      if (adminCount <= 1 && user.active) {
        throw new Error('Cannot demote the last active admin');
      }
    }

    if (data.password !== undefined && data.password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    const updateData: {
      name?: string;
      role?: string;
      active?: boolean;
      password?: string;
      totpEnabled?: boolean;
      totpSecret?: string | null;
    } = {};

    if (typeof data.name === 'string') updateData.name = data.name.trim();
    if (typeof data.role === 'string') updateData.role = data.role;
    if (typeof data.active === 'boolean') updateData.active = data.active;
    if (typeof data.password === 'string' && data.password.length > 0) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }
    if (data.resetTotp === true) {
      updateData.totpEnabled = false;
      updateData.totpSecret = null;
    }

    return prisma.user.update({
      where: { id },
      data: updateData,
      select: USER_PUBLIC_SELECT,
    });
  }
}
