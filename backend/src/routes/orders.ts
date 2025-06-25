import express, { Request, Response, NextFunction } from 'express';
// Import all necessary controller functions
import {
  createOrder,
  getOrderById,
  updateOrderStatus,
  getAllOrders,
  deleteOrder,
  generateInvoice,
  downloadInvoice
} from '../controllers/orderController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// 🔹 Get all orders (requires authentication)
router.get('/', authenticateToken, (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(getAllOrders(req, res)).catch(next);
});

// 🔹 Create order (requires authentication)
router.post('/', authenticateToken, (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(createOrder(req, res)).catch(next);
});

// 🔹 Get order by ID (requires authentication)
router.get('/:id', authenticateToken, (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(getOrderById(req, res)).catch(next);
});

// 🔹 Update order status or details (requires authentication)
// THIS HAS BEEN CHANGED FROM PATCH TO PUT to match frontend request for item editing
router.put('/:id/status', authenticateToken, (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(updateOrderStatus(req, res)).catch(next);
});

// 🔹 Delete order (requires authentication)
router.delete('/:id', authenticateToken, (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(deleteOrder(req, res)).catch(next);
});

// 🚀 Download Invoice (requires authentication)
router.get('/:orderId/invoice/download', authenticateToken, (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(downloadInvoice(req, res)).catch(next);
});

export default router;
