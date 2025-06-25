import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import fs from 'fs';
import http from 'http';
import { Server } from 'socket.io';

import authRoutes from './routes/auth';
import orderRoutes from './routes/orders';
import menuRoutes from './routes/menu';
import reportRoutes from './routes/reports';
import webhookRoutes from './routes/webhook'; // NEW: Import webhook routes
import { errorHandler } from './middleware/errorHandler';
import { authenticateToken } from './middleware/authMiddleware';
import path from 'path'; // Add this line

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.set('io', io);

// Middlewares
app.use(cors());
app.use(helmet());
app.use(express.json()); // Essential for parsing JSON request bodies for webhooks

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', authenticateToken, orderRoutes);
app.use('/api/menu', authenticateToken, menuRoutes);
app.use('/api/reports', authenticateToken, reportRoutes);
app.use('/api/webhooks', webhookRoutes); // NEW: Add webhook routes

// Route for downloading invoices (authenticateToken ensures only authorized users can download)
app.get('/api/orders/:id/invoice', authenticateToken, ((req, res) => {
  // Ensure the path is correct and secure
  const invoicesDir = path.join(__dirname, '..', 'invoices'); // Adjust path to 'invoices' folder
  const filePath = path.join(invoicesDir, `invoice-${req.params.id}.pdf`);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Invoice not found or not yet generated.' });
    return;
  }
  // res.download sends the file
  res.download(filePath, (err) => {
    if (err) {
      console.error("Error downloading invoice:", err);
      res.status(500).json({ error: 'Failed to download invoice.' });
    }
  });
}) as express.RequestHandler);


// Socket.IO Live Events
io.on('connection', (socket) => {
  console.log('📡 New client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('🔗 Client disconnected:', socket.id);
  });

  // You can add more socket event listeners here if needed
});

// Global Error Handler
app.use(errorHandler);

// Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Backend server running on port ${PORT}`);
  console.log(`Invoice PDFs will be stored in: ${path.join(__dirname, '..', 'invoices')}`);
});