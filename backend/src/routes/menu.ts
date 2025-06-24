
// backend/src/routes/menu.ts
import express from 'express';
import { getMenu, addMenuItem } from '../controllers/menuController';
const router = express.Router();
router.get('/', getMenu);
router.post('/', addMenuItem);
export default router;