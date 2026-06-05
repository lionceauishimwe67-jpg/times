import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });

  const [rows] = await pool.query('SELECT id, username, password_hash FROM users WHERE username = ?', [username]);
  if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, rows[0].password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  req.session.user = { id: rows[0].id, username: rows[0].username };
  const isDefault = await bcrypt.compare('admin123', rows[0].password_hash);
  res.json({ user: req.session.user, isDefaultPassword: isDefault });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/me', (req, res) => {
  if (!req.session?.user) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ user: req.session.user });
});

router.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Missing fields' });
  if (newPassword.length < 4) return res.status(400).json({ error: 'Password too short (min 4)' });

  const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.session.user.id]);
  if (!rows.length) return res.status(404).json({ error: 'User not found' });

  const ok = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!ok) return res.status(400).json({ error: 'Current password is incorrect' });

  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.session.user.id]);
  req.session.destroy(() => res.json({ ok: true }));
});

export default router;
