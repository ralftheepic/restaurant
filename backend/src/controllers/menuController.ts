import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const menuPath = path.join(__dirname, '../data/menu.json');

export const getMenu = (_req: Request, res: Response): void => {
  try {
    const data = fs.readFileSync(menuPath, 'utf-8');
    const menu = JSON.parse(data);
    res.json(menu);
  } catch (err) {
    console.error('Failed to load menu:', err);
    res.status(500).json({ error: 'Failed to load menu' });
  }
};

export const addMenuItem = (req: Request, res: Response): void => {
  try {
    const newItem = req.body;
    const data = fs.readFileSync(menuPath, 'utf-8');
    const menu = JSON.parse(data);

    newItem.id = String(menu.length + 1);
    menu.push(newItem);

    fs.writeFileSync(menuPath, JSON.stringify(menu, null, 2));
    res.status(201).json(newItem);
  } catch (err) {
    console.error('Failed to add menu item:', err);
    res.status(500).json({ error: 'Failed to add menu item' });
  }
};
