import express from 'express';
import { PrismaClient, Order } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/sales', async (_req, res) => {
  const orders: Order[] = await prisma.order.findMany();

  let totalSales = 0;
  const itemFrequency: Record<string, number> = {};

  for (const o of orders) {
    totalSales += o.total;

    const items = Array.isArray(o.items) ? o.items : [];

    for (const item of items) {
      // Check item has a 'name' property
      if (typeof item === 'object' && item !== null && 'name' in item) {
        const name = String(item.name);
        itemFrequency[name] = (itemFrequency[name] || 0) + 1;
      }
    }
  }

  const topItems = Object.entries(itemFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  res.json({ totalSales, topItems });
});

export default router;
