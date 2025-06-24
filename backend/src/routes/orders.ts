import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { createOrder, getOrderById } from '../controllers/orderController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();
const prisma = new PrismaClient();

// 🔹 Create order
router.post('/', (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(createOrder(req, res)).catch(next);
});

// 🔹 Get order by ID
router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(getOrderById(req, res)).catch(next);
});

// 🔹 Update order status (auth required)
router.patch('/:id/status', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;

    const order = await prisma.order.update({
      where: { id },
      data: { status },
    });

    // ✅ Emit to all connected clients
    const io = req.app.get('io');
    io.emit('order-updated', order); // 👈 this triggers update on frontend

    res.json(order);
  } catch (error) {
    next(error);
  }
});


export default router;
