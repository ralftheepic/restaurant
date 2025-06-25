import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateInvoice, parseOrderItems } from './orderController';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// Helper to process and save incoming webhook orders
const processWebhookOrder = async (
  platform: 'swiggy' | 'zomato',
  payload: any,
  req: Request, // Pass req to access io
  res: Response // Pass res to send response
) => {
  try {
    // --- Mock Payload Parsing (THIS IS CRUCIAL) ---
    // In a real integration, you would parse the actual structure
    // of Swiggy/Zomato's webhook payload here.
    // For this mock, we assume a simplified common structure.

    const orderItems = payload.items.map((item: any) => ({
      name: item.name || 'Unknown Item',
      quantity: typeof item.quantity === 'number' ? item.quantity : 1,
      price: typeof item.price === 'number' ? item.price : 0, // Unit price
    }));

    let calculatedSubtotal = 0;
    orderItems.forEach((item: any) => {
      calculatedSubtotal += (item.price * item.quantity);
    });

    const externalRef = payload.orderId || uuidv4(); // Use external order ID or generate one

    // Stringify items array for Json field in Prisma
    const stringifiedItems = JSON.stringify(orderItems);

    // Default GST percentage for webhook orders, e.g., 18%
    const defaultGstPercentage = 18; // ⬅️ NEW: Default GST for webhook orders
    const gstAmount = (calculatedSubtotal * defaultGstPercentage) / 100;
    const totalWithGst = calculatedSubtotal + gstAmount;


    // Create the order in your database
    const newOrder = await prisma.order.create({
      data: {
        items: stringifiedItems,
        total: Math.round(totalWithGst), // Total including GST
        platform: platform, // 'swiggy' or 'zomato'
        status: 'pending', // Default status for new external orders
        tableNo: null, // No table number for external orders
        token: externalRef, // Store external order ID or a generated token
        gstPercentage: defaultGstPercentage, // ⬅️ NEW: Store GST percentage
        gstAmount: Math.round(gstAmount), // ⬅️ NEW: Store calculated GST amount
      },
    });

    // Emit socket event for real-time updates to kitchen/dashboard
    const io = req.app.get('io');
    io.emit('new-order', parseOrderItems(newOrder)); // Ensure parsed items are sent for frontend

    // Generate invoice (optional, but good for record-keeping)
    const invoicePath = await generateInvoice(newOrder.id);

    console.log(`✅ New order ingested from ${platform}: ID ${newOrder.id}, External Ref: ${externalRef}`);
    res.status(200).json({
      message: `Order successfully ingested from ${platform}`,
      orderId: newOrder.id,
      externalRef: externalRef,
      invoicePath: invoicePath
    });

  } catch (error) {
    console.error(`❌ Failed to ingest order from ${platform}:`, error);
    if (error instanceof Error) {
      res.status(500).json({ error: `Failed to process webhook from ${platform}`, message: error.message });
    } else {
      res.status(500).json({ error: `Failed to process webhook from ${platform}`, message: 'An unknown error occurred.' });
    }
  }
};

export const handleSwiggyWebhook = async (req: Request, res: Response) => {
  // Add authentication/validation for real webhooks (e.g., secret keys)
  // For this mock, we'll just process the body
  await processWebhookOrder('swiggy', req.body, req, res);
};

export const handleZomatoWebhook = async (req: Request, res: Response) => {
  // Add authentication/validation for real webhooks (e.g., secret keys)
  // For this mock, we'll just process the body
  await processWebhookOrder('zomato', req.body, req, res);
};
