import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DEFAULT_OPERATOR_EMAIL } from './services/authService';

const prisma = new PrismaClient();

const DEMO_EMAILS = ['admin@mailflow.com', 'manager@mailflow.com'];

async function main() {
  console.log('Seeding database...');

  const removed = await prisma.user.deleteMany({
    where: { email: { in: DEMO_EMAILS } },
  });
  if (removed.count > 0) {
    console.log(`Removed ${removed.count} demo user(s)`);
  }

  // Always ensure open-access operator (no login required)
  const hashed = await bcrypt.hash(`open-${Date.now()}`, 12);
  const operator = await prisma.user.upsert({
    where: { email: DEFAULT_OPERATOR_EMAIL },
    update: { role: 'admin', name: 'Operator' },
    create: {
      email: DEFAULT_OPERATOR_EMAIL,
      password: hashed,
      name: 'Operator',
      role: 'admin',
    },
  });
  console.log(`Open-access operator ready: ${operator.email}`);

  // Optional extra admin if SEED_ADMIN_* is set
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME || 'Admin';

  if (email && password) {
    const hashedPassword = await bcrypt.hash(password, 12);
    const admin = await prisma.user.upsert({
      where: { email },
      update: { password: hashedPassword, name, role: 'admin' },
      create: { email, password: hashedPassword, name, role: 'admin' },
    });
    console.log(`Admin user ready: ${admin.email}`);
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
