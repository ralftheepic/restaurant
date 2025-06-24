import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const PDFDocument = require('pdfkit');

const prisma = new PrismaClient();

// ✅ Generate invoice PDF
export const generateInvoice = async (orderId: number) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error('Order not found');

  const filePath = `invoices/invoice-${order.id}.pdf`;
  fs.mkdirSync('invoices', { recursive: true });

  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(filePath));
  doc.fontSize(20).text('Restaurant Invoice', { align: 'center' });
  doc.moveDown();
  doc.fontSize(14).text(`Order ID: ${order.id}`);
  doc.text(`Total: ₹${order.total}`);
  doc.text(`Date: ${new Date(order.createdAt).toLocaleString()}`);
  doc.end();

  return filePath;
};

// ✅ Create order + emit socket event
export const createOrder = async (req: Request, res: Response) => {
  try {
    const { items, total, tableNo, platform } = req.body;
    const order = await prisma.order.create({
      data: { items, total, tableNo, platform, status: 'pending' },
    });

    const io = req.app.get('io'); // ✅ Must be inside function
    io.emit('new-order', order);  // ✅ Real-time emit

    const invoicePath = await generateInvoice(order.id);
    res.status(201).json({ order, invoice: invoicePath });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create order' });
  }
};

// ✅ Get order by ID
export const getOrderById = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
};

// ✅ Optional: update order status + notify kitchen
export const updateOrderStatus = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;
  const order = await prisma.order.update({
    where: { id },
    data: { status },
  });

  const io = req.app.get('io'); // 🔁 again, must be inside function
  io.emit('order-updated', order);

  res.json(order);
};
// ✅ Optional: delete order
export const deleteOrder = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const order = await prisma.order.delete({ where: { id } });
  res.json(order);
}