import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const users = [
  { email: 'admin', password: 'admin123' },
];

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[LOGIN] Incoming request body:', req.body);

    const { email, password } = req.body;

    const user = users.find((u) => u.email === email && u.password === password);
    if (!user) {
      console.warn('[LOGIN] Invalid credentials for:', email);
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign({ email }, process.env.JWT_SECRET!, { expiresIn: '1h' });
    console.log('[LOGIN] Token generated for:', email);
    res.json({ token });
  } catch (err) {
    console.error('[LOGIN] Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
