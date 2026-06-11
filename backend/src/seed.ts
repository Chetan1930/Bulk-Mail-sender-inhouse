import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_EMAILS = ['admin@mailflow.com', 'manager@mailflow.com'];

async function main() {
  console.log('Seeding database...');

  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME || 'Admin';

  if (!email || !password) {
    console.error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required');
    process.exit(1);
  }

  const removed = await prisma.user.deleteMany({
    where: { email: { in: DEMO_EMAILS } },
  });
  if (removed.count > 0) {
    console.log(`Removed ${removed.count} demo user(s)`);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      name,
      role: 'admin',
    },
    create: {
      email,
      password: hashedPassword,
      name,
      role: 'admin',
    },
  });

  console.log(`Admin user ready: ${admin.email}`);
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
