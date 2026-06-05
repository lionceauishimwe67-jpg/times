import express from 'express';
import session from 'express-session';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import scheduleRoutes from './routes/schedule.js';
import specialDayRoutes from './routes/special-days.js';
import deviceRoutes from './routes/device.js';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:5173',
  credentials: true,
}));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 8 },
}));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/special-days', specialDayRoutes);
app.use('/api', deviceRoutes); // /api/ring-now, /api/update-status, /api/check-status

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ School Bell backend running on http://localhost:${PORT}`));
