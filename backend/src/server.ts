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
import { errorHandler } from './middleware/errorHandler';
import { authenticateToken } from './middleware/authMiddleware';

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.set('io', io);

// Middlewares
app.use(cors());
app.use(helmet());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', authenticateToken, orderRoutes);
app.use('/api/menu', authenticateToken, menuRoutes);
app.use('/api/reports', authenticateToken, reportRoutes);

app.get('/api/orders/:id/invoice', authenticateToken, ((req, res) => {
  const filePath = `invoices/invoice-${req.params.id}.pdf`;
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }
  res.download(filePath);
}) as express.RequestHandler);

// Socket.IO Live Events
io.on('connection', (socket) => {
  console.log('📡 New client connected');
});

app.set('io', io);

// Global Error Handler
app.use(errorHandler);

// Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Backend server running on port ${PORT}`);
});
