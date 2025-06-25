import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

// Define the expected structure for an item within the Order.items JSON array
interface OrderItem {
  id: number; // Assuming MenuItem ID to link back to the menu item
  name: string;
  quantity: number;
  price: number;
  notes?: string;
  addedAt: string; // ISO string for tracking when this specific item was added to the order
  status?: 'active' | 'cancelled'; // 'active' by default, can be 'cancelled' if removed after 5 mins
}

/**
 * Helper function to parse order items from Prisma's JsonValue type.
 * Ensures items are always returned as an array of OrderItem objects for consistency.
 * Handles cases where the stored JSON might be a string or already an array/object.
 * Filters out items marked as 'cancelled' if a filter is applied,
 * otherwise returns all items including cancelled ones.
 * @param {any} order - The order object potentially containing items as JsonValue.
 * @returns {Array<OrderItem>} An array of parsed OrderItem objects.
 */
export const parseOrderItems = (order: any): Array<OrderItem> => {
  try {
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    // Ensure it's an array and each item conforms to OrderItem structure
    return Array.isArray(items) ? items.filter((item: any) => item && typeof item.name === 'string' && typeof item.quantity === 'number' && typeof item.price === 'number').map((item: any) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      notes: item.notes,
      addedAt: item.addedAt || new Date().toISOString(), // Ensure addedAt exists, default to now if missing
      status: item.status || 'active' // Default to 'active' if status is missing
    })) : [];
  } catch (error) {
    console.error('Error parsing order items:', error);
    return []; // Return empty array on error
  }
};

/**
 * Generates an invoice for a given order and saves it as a PDF.
 * It also updates the order's gstAmount and total in the database if they differ
 * from the calculated values, ensuring data consistency.
 * Only includes 'active' items in the invoice calculation and display.
 * @param {number} orderId - The ID of the order for which to generate the invoice.
 * @returns {Promise<string>} The file path of the generated PDF invoice.
 * @throws {Error} If the order is not found or invoice generation fails.
 */
export const generateInvoice = async (orderId: number) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Order not found for invoice generation');
    }

    // Parse all items, then filter to include only 'active' items for billing
    const allItems = parseOrderItems(order);
    const activeItems = allItems.filter(item => item.status !== 'cancelled');

    // Calculate subtotal from active items only
    const subtotal = activeItems.reduce((sum: number, item: OrderItem) => sum + (item.price * item.quantity), 0);

    const gstPercentage = order.gstPercentage || 0;
    const gstAmount = (subtotal * gstPercentage) / 100;
    const finalTotal = subtotal + gstAmount;

    // Update the order with calculated gstAmount and finalTotal if they are different
    // This ensures consistency and proper storage of calculated values
    if (Math.round(order.gstAmount || 0) !== Math.round(gstAmount) || Math.round(order.total) !== Math.round(finalTotal)) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          gstAmount: Math.round(gstAmount),
          total: Math.round(finalTotal)
        }
      });
    }

    const invoiceFileName = `invoice-${order.token || order.id}-${Date.now()}.pdf`;
    const invoiceFilePath = path.join(__dirname, '..', 'invoices', invoiceFileName);

    const invoiceDir = path.join(__dirname, '..', 'invoices');
    if (!fs.existsSync(invoiceDir)) {
      fs.mkdirSync(invoiceDir, { recursive: true });
    }

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invoice #${order.token || order.id}</title>
            <style>
                body { font-family: 'Inter', sans-serif; margin: 20px; padding: 20px; color: #333; }
                .invoice-container { max-width: 800px; margin: 0 auto; border: 1px solid #eee; padding: 30px; box-shadow: 0 0 10px rgba(0,0,0,0.05); border-radius: 8px; }
                .header { text-align: center; margin-bottom: 30px; }
                .header h1 { color: #4F46E5; margin: 0; font-size: 2.5em; }
                .header p { color: #666; margin-top: 5px; }
                .details { display: flex; justify-content: space-between; margin-bottom: 20px; gap: 20px; }
                .details div { flex: 1; padding: 10px; border-radius: 5px; background-color: #f9fafb; }
                .details strong { display: block; margin-bottom: 5px; color: #555; font-size: 1.1em; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 30px; border-radius: 8px; overflow: hidden; }
                th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
                th { background-color: #eff6ff; color: #3b82f6; font-weight: 600; }
                .total-section { text-align: right; padding-top: 20px; border-top: 1px dashed #ddd; }
                .total-section div { margin-bottom: 10px; font-size: 1.1em; }
                .total-section .grand-total { font-size: 1.8em; font-weight: bold; color: #4F46E5; margin-top: 15px; }
                .footer { text-align: center; margin-top: 40px; font-size: 0.9em; color: #777; }
                .item-name { font-weight: bold; color: #333; }
                .item-details { font-size: 0.85em; color: #666; margin-top: 2px; }
                .cancelled-item { text-decoration: line-through; color: #999; }
            </style>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
        </head>
        <body>
            <div class="invoice-container">
                <div class="header">
                    <h1>INVOICE</h1>
                    <p>Order #${order.token || order.id}</p>
                    <p>Date: ${new Date(order.createdAt).toLocaleDateString()}</p>
                </div>

                <div class="details">
                    <div>
                        <strong>Billed To:</strong>
                        <p>Customer (Walk-in/Online)</p>
                        <p>Table No: ${order.tableNo || 'N/A'}</p>
                    </div>
                    <div>
                        <strong>From:</strong>
                        <p>Restaurant Name</p>
                        <p>123 Food Street, Delicious City</p>
                        <p>Email: info@restaurant.com</p>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Quantity</th>
                            <th>Unit Price</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${allItems.map((item: OrderItem) => `
                            <tr class="${item.status === 'cancelled' ? 'cancelled-item' : ''}">
                                <td>
                                    <span class="item-name">${item.name}</span><br>
                                    ${item.notes ? `<span class="item-details">(${item.notes})</span>` : ''}
                                    ${item.status === 'cancelled' ? '<span class="item-details">(Cancelled)</span>' : ''}
                                </td>
                                <td>${item.quantity}</td>
                                <td>₹${item.price.toFixed(2)}</td>
                                <td>₹${(item.status === 'cancelled' ? 0 : item.quantity * item.price).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="total-section">
                    <div>Subtotal: ₹${subtotal.toFixed(2)}</div>
                    ${gstPercentage > 0 ? `<div>GST (${gstPercentage}%): ₹${gstAmount.toFixed(2)}</div>` : ''}
                    <div class="grand-total">Grand Total: ₹${finalTotal.toFixed(2)}</div>
                </div>

                <div class="footer">
                    <p>Thank you for your order!</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: invoiceFilePath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });
    await browser.close();

    console.log(`Invoice generated at: ${invoiceFilePath}`);
    return invoiceFilePath;

  } catch (error) {
    console.error('Error generating invoice:', error);
    throw error;
  }
};

/**
 * Retrieves all orders from the database, ordered by creation date (newest first).
 * Parses the `items` JSON string for each order before sending the response.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 */
export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
    });
    // Parse items for each order before sending to client
    const ordersWithParsedItems = orders.map(order => ({
      ...order,
      items: parseOrderItems(order)
    }));
    res.status(200).json(ordersWithParsedItems);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

/**
 * Creates a new order or updates an existing open order for a given table.
 * If an active (pending/preparing) order exists for a table, new items are added to it.
 * Otherwise, a new order is created.
 * Calculates subtotal, GST amount, and total based on provided items and GST percentage.
 * Generates a unique token for new orders and emits socket events for real-time updates.
 * @param {Request} req - The Express request object containing order details in the body.
 * @param {Response} res - The Express response object.
 */
export const createOrder = async (req: Request, res: Response) => {
  try {
    // Expected incoming items should already conform to OrderItem structure, potentially without addedAt/status
    const { items, tableNo, gstPercentage } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required and cannot be empty.' });
    }

    // Add addedAt timestamp and default status to each incoming item
    const newItemsWithTimestamp: OrderItem[] = items.map((item: any) => ({
      id: item.id, // Assuming item.id is the MenuItem ID
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      notes: item.notes,
      addedAt: new Date().toISOString(), // Timestamp when this item is added
      status: 'active' // Default status for newly added items
    }));

    const effectiveGstPercentage = typeof gstPercentage === 'number' ? gstPercentage : 18;

    let targetOrder;
    if (tableNo) {
      targetOrder = await prisma.order.findFirst({
        where: {
          tableNo: tableNo,
          status: { in: ['pending', 'preparing'] }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    let updatedOrder;

    if (targetOrder) {
      // Merge new items with existing active items
      const existingActiveItems = parseOrderItems(targetOrder).filter(item => item.status === 'active');
      const mergedItems = [...existingActiveItems, ...newItemsWithTimestamp];

      const mergedSubtotal = mergedItems.reduce((sum: number, item: OrderItem) => sum + (item.price * item.quantity), 0);
      const newGstAmount = (mergedSubtotal * effectiveGstPercentage) / 100;
      const newTotalWithGst = mergedSubtotal + newGstAmount;

      updatedOrder = await prisma.order.update({
        where: { id: targetOrder.id },
        data: {
          items: JSON.stringify(mergedItems),
          total: Math.round(newTotalWithGst),
          gstPercentage: effectiveGstPercentage,
          gstAmount: Math.round(newGstAmount),
        },
      });
      updatedOrder.token = targetOrder.token; // Keep original token for existing order

    } else {
      // Create a brand new order
      const newOrderSubtotal = newItemsWithTimestamp.reduce((sum: number, item: OrderItem) => sum + (item.price * item.quantity), 0);
      const newGstAmount = (newOrderSubtotal * effectiveGstPercentage) / 100;
      const newTotalWithGst = newOrderSubtotal + newGstAmount;

      const token = Math.random().toString(36).substring(2, 8).toUpperCase();

      updatedOrder = await prisma.order.create({
        data: {
          items: JSON.stringify(newItemsWithTimestamp),
          total: Math.round(newTotalWithGst),
          gstPercentage: effectiveGstPercentage,
          gstAmount: Math.round(newGstAmount),
          tableNo: tableNo || null,
          status: 'pending',
          platform: tableNo ? 'dine-in' : 'internal',
          token: token,
        },
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('order-updated', { ...updatedOrder, items: parseOrderItems(updatedOrder) });
    }

    res.status(201).json({ ...updatedOrder, items: parseOrderItems(updatedOrder) });
  } catch (error) {
    console.error('Error creating/updating order:', error);
    res.status(500).json({ error: 'Failed to create/update order' });
  }
};

/**
 * Updates an existing order's status, table number, or a full list of items.
 * Implements a 5-minute rule for marking items as 'cancelled' instead of removal.
 * Recalculates total and GST based on 'active' items.
 * Emits an 'order-updated' socket event.
 * @param {Request} req - The Express request object containing order ID in params and update data in body.
 * @param {Response} res - The Express response object.
 */
export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, tableNo, items, gstPercentage } = req.body; // 'items' will now be the FULL updated list from frontend

    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const existingOrder = await prisma.order.findUnique({ where: { id: orderId } });

    if (!existingOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    let updateData: any = {};
    let shouldRecalculateTotals = false;

    // Handle general status or tableNo update
    if (status) {
      updateData.status = status;
    }
    if (tableNo !== undefined) {
      updateData.tableNo = tableNo;
    }

    // Handle items update
    if (items !== undefined) { // 'items' here is the *desired* state from the frontend
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Items must be an array.' });
      }

      const existingItems: OrderItem[] = parseOrderItems(existingOrder);
      const updatedItems: OrderItem[] = [];
      const now = new Date();
      const fiveMinutesAgo = now.getTime() - (5 * 60 * 1000); // 5 minutes in milliseconds

      let removalBlocked = false; // Flag to indicate if any removal was blocked

      // Process items from the frontend to determine additions, modifications, or attempted removals
      items.forEach((newItem: OrderItem) => {
        // Find if this item already exists in the original order (by id and name for safety)
        const existingItem = existingItems.find(
          (oldItem) => oldItem.id === newItem.id && oldItem.name === newItem.name && oldItem.status !== 'cancelled'
        );

        if (existingItem) {
          // Item exists: Check for quantity change or notes change
          if (newItem.quantity > 0) {
            // If quantity is positive, keep/update it
            updatedItems.push({
              ...existingItem, // Preserve original addedAt and status
              quantity: newItem.quantity,
              notes: newItem.notes // Update notes
            });
          } else {
            // Quantity is 0 or less, meaning an attempt to remove/cancel
            const itemAddedTime = new Date(existingItem.addedAt).getTime();
            if (itemAddedTime < fiveMinutesAgo) {
              // Item is older than 5 minutes, mark as cancelled instead of removing
              updatedItems.push({
                ...existingItem,
                quantity: existingItem.quantity, // Keep original quantity
                status: 'cancelled', // Mark as cancelled
                notes: existingItem.notes // Preserve original notes
              });
              removalBlocked = true; // Set flag
              console.warn(`Removal blocked for item ${existingItem.name} (ID: ${existingItem.id}). Marked as cancelled.`);
            } else {
              // Item is within 5 minutes, proceed with removal (don't add to updatedItems)
              console.log(`Item ${existingItem.name} (ID: ${existingItem.id}) removed successfully.`);
            }
          }
        } else {
          // New item: Add it with current timestamp
          if (newItem.quantity > 0) { // Only add if quantity is positive
            updatedItems.push({
              id: newItem.id,
              name: newItem.name,
              quantity: newItem.quantity,
              price: newItem.price,
              notes: newItem.notes,
              addedAt: now.toISOString(), // Timestamp when this new item is added
              status: 'active'
            });
          }
        }
      });

      // Also carry over any existing items that were NOT touched/present in the frontend 'items' list
      // and are not already in updatedItems (e.g., items that were already cancelled)
      existingItems.forEach(oldItem => {
          if (!updatedItems.some(updated => updated.id === oldItem.id && updated.name === oldItem.name) && oldItem.status === 'cancelled') {
              updatedItems.push(oldItem); // Add back previously cancelled items
          }
          // Optionally, if you want to explicitly carry over untampered active items, uncomment this
          // else if (!updatedItems.some(updated => updated.id === oldItem.id && updated.name === oldItem.name) && oldItem.status === 'active') {
          //      updatedItems.push(oldItem);
          // }
      });


      updateData.items = JSON.stringify(updatedItems);
      shouldRecalculateTotals = true; // Always recalculate if items are being updated

      if (removalBlocked) {
        // You might want to send a specific message to the frontend if removals were blocked
        // However, the current flow only sets status and updates order, not direct response.
        // The frontend will receive the updated order with 'cancelled' items.
        console.log("Some item removals were blocked due to the 5-minute rule.");
      }
    }

    // Handle GST percentage update - independent of item changes but influences total
    if (typeof gstPercentage === 'number') {
      updateData.gstPercentage = gstPercentage;
      shouldRecalculateTotals = true; // Recalculate if GST % changes
    } else {
      // If gstPercentage is not provided in the update, use the existing one for recalculation if needed
      updateData.gstPercentage = existingOrder.gstPercentage || 18;
    }

    // Recalculate total and GST if items or gstPercentage changed
    if (shouldRecalculateTotals) {
      // Ensure calculation only considers 'active' items for the subtotal
      const currentEffectiveItems = parseOrderItems({ items: updateData.items }).filter(item => item.status === 'active');
      let newSubtotal = currentEffectiveItems.reduce((sum: number, item: OrderItem) => {
        if (typeof item.price === 'number' && typeof item.quantity === 'number' && item.price >= 0 && item.quantity >= 0) {
          return sum + (item.price * item.quantity);
        }
        console.warn('Invalid item price or quantity detected during recalculation:', item);
        return sum;
      }, 0);

      const newGstPercentage = updateData.gstPercentage;
      const newGstAmount = (newSubtotal * newGstPercentage) / 100;
      const newTotalWithGst = newSubtotal + newGstAmount;

      updateData.gstAmount = Math.round(newGstAmount);
      updateData.total = Math.round(newTotalWithGst);
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('order-updated', { ...updatedOrder, items: parseOrderItems(updatedOrder) });
    }

    res.status(200).json({ ...updatedOrder, items: parseOrderItems(updatedOrder) });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
};

/**
 * Deletes an order from the database by ID.
 * Emits an 'order-deleted' socket event.
 * @param {Request} req - The Express request object containing the order ID in params.
 * @param {Response} res - The Express response object.
 */
export const deleteOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orderId = parseInt(id, 10);

    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    await prisma.order.delete({
      where: { id: orderId },
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('order-deleted', { id: orderId });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting order:', error);
    if (error instanceof Error && (error as any).code === 'P2025') {
      res.status(404).json({ error: 'Order not found for deletion.' });
    } else {
      res.status(500).json({ error: 'Failed to delete order' });
    }
  }
};

/**
 * Retrieves a single order by its ID.
 * Parses the `items` JSON string for the order before sending the response.
 * @param {Request} req - The Express request object containing the order ID in params.
 * @param {Response} res - The Express response object.
 */
export const getOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orderId = parseInt(id, 10);

    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.status(200).json({ ...order, items: parseOrderItems(order) });
  } catch (error) {
    console.error('Error fetching order by ID:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};

/**
 * Endpoint to download a generated invoice PDF.
 * Calls `generateInvoice` to create the PDF and then sends it as a download.
 * @param {Request} req - The Express request object containing the order ID in params.
 * @param {Response} res - The Express response object.
 */
export const downloadInvoice = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const parsedOrderId = parseInt(orderId, 10);

    if (isNaN(parsedOrderId)) {
      return res.status(400).json({ error: 'Invalid order ID provided.' });
    }

    const invoiceFilePath = await generateInvoice(parsedOrderId);

    if (fs.existsSync(invoiceFilePath)) {
      res.download(invoiceFilePath, (err) => {
        if (err) {
          console.error('Error downloading invoice:', err);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to download invoice' });
          }
        }
      });
    } else {
      res.status(404).json({ error: 'Invoice not found on server.' });
    }

  } catch (error) {
    console.error('Error in downloadInvoice endpoint:', error);
    if (error instanceof Error) {
      res.status(500).json({ error: 'Failed to generate or retrieve invoice.', message: error.message });
    } else {
      res.status(500).json({ error: 'Failed to generate or retrieve invoice.', message: 'An unknown error occurred.' });
    }
  }
};