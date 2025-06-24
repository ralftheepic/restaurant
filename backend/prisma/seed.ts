// backend/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: 'admin123', // Use plain text for initial seed, but bcrypt recommended in production
      role: 'admin',
    },
  });

  await prisma.menuItem.createMany({
    data: [
      { name: 'Paneer Tikka', price: 180, category: 'Starter' },
      { name: 'Butter Naan', price: 40, category: 'Bread' },
      { name: 'Chicken Biryani', price: 250, category: 'Main Course' },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Seed data inserted');
}

main().finally(() => prisma.$disconnect());