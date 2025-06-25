import express, { Request, Response, NextFunction } from 'express';
import { handleSwiggyWebhook, handleZomatoWebhook } from '../controllers/webhookController';

const router = express.Router();

// Define webhook endpoints for Swiggy and Zomato
// IMPORTANT: These routes should NOT have authenticateToken middleware
// as external platforms would not have your internal user tokens.
// Instead, real webhooks would use shared secrets or other authentication mechanisms.

router.post('/swiggy', (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(handleSwiggyWebhook(req, res)).catch(next);
});

router.post('/zomato', (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(handleZomatoWebhook(req, res)).catch(next);
});

export default router;