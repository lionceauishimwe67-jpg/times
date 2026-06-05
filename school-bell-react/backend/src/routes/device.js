// Endpoints used by the dashboard AND the ESP32.
// These mirror the original PHP api/ behavior (manual_ring.flag + esp32_status.flag).
import { Router } from 'express';
import { state } from '../state.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Dashboard -> request a manual ring (auth required)
router.post('/ring-now', requireAuth, (req, res) => {
  state.manualRing = true;
  res.json({ success: true });
});

// ESP32 polls this; consumes the flag (no auth, device endpoint)
router.get('/ring-now', (req, res) => {
  const ring = state.manualRing;
  state.manualRing = false;
  res.json({ ring });
});

// ESP32 heartbeat (no auth)
router.post('/update-status', (req, res) => {
  state.esp32LastSeen = Math.floor(Date.now() / 1000);
  res.json({ success: true, timestamp: state.esp32LastSeen });
});

// Dashboard checks ESP32 online status (auth required)
router.get('/check-status', requireAuth, (req, res) => {
  const now = Math.floor(Date.now() / 1000);
  const online = state.esp32LastSeen > 0 && (now - state.esp32LastSeen) < 60;
  res.json({
    connected: online,
    last_seen: state.esp32LastSeen ? new Date(state.esp32LastSeen * 1000).toISOString() : 'Never',
    status: online ? 'online' : 'offline',
  });
});

export default router;
