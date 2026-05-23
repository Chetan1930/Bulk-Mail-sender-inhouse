import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminEmail = 'admin@mailflow.com';
  const adminPassword = await bcrypt.hash('admin123', 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: adminPassword,
      name: 'Admin',
      role: 'admin',
    },
  });

  console.log(`Admin user created: ${admin.email} / admin123`);

  // Create manager user
  const managerEmail = 'manager@mailflow.com';
  const managerPassword = await bcrypt.hash('manager123', 12);

  const manager = await prisma.user.upsert({
    where: { email: managerEmail },
    update: {},
    create: {
      email: managerEmail,
      password: managerPassword,
      name: 'Manager',
      role: 'manager',
    },
  });

  console.log(`Manager user created: ${manager.email} / manager123`);
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
