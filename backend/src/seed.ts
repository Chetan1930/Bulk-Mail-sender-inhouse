import bcrypt from 'bcryptjs';
import { prisma } from './lib/prisma';

const DEMO_EMAILS = ['admin@mailflow.com', 'manager@mailflow.com'];

async function main() {
  console.log('Seeding database...');

  const removed = await prisma.user.deleteMany({
    where: { email: { in: DEMO_EMAILS } },
  });
  if (removed.count > 0) {
    console.log(`Removed ${removed.count} demo user(s)`);
  }

  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME || 'Admin';

  if (!email || !password) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required');
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const admin = await prisma.user.upsert({
    where: { email },
    update: { password: hashedPassword, name, role: 'admin' },
    create: { email, password: hashedPassword, name, role: 'admin' },
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
