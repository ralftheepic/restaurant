import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getMenu = async (_req: Request, res: Response) => {
  const items = await prisma.menuItem.findMany();
  res.json(items);
};

export const addMenuItem = async (req: Request, res: Response) => {
  const { name, price, category } = req.body;
  const newItem = await prisma.menuItem.create({ data: { name, price, category } });
  res.status(201).json(newItem);
};
