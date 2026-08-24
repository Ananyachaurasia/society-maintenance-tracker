const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { sendEmail } = require('../utils/email');

const router = express.Router();

// How many days a complaint can stay non-Resolved before it's "overdue".
// Configurable via .env so the admin threshold isn't hardcoded.
const OVERDUE_DAYS = Number(process.env.OVERDUE_DAYS) || 5;

// Shared SQL fragment: true/false overdue flag computed at query time,
// not stored as a column, so it's always accurate without a cron job.
const OVERDUE_EXPR = `
  (status != 'Resolved' AND created_at < NOW() - INTERVAL '${OVERDUE_DAYS} days') AS overdue
`;

// POST /api/complaints  (resident) — create a complaint, optional photo
router.post('/', requireAuth, upload.single('photo'), async (req, res) => {
  const { category, description } = req.body;
  if (!category || !description) {
    return res.status(400).json({ error: 'category and description are required' });
  }
  const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const result = await pool.query(
      `INSERT INTO complaints (resident_id, category, description, photo_url)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, category, description, photoUrl]
    );
    const complaint = result.rows[0];

    // First history row: creation itself counts as a status entry.
    await pool.query(
      `INSERT INTO complaint_history (complaint_id, old_status, new_status, actor_id, note)
       VALUES ($1, NULL, 'Open', $2, 'Complaint created')`,
      [complaint.id, req.user.id]
    );

    res.status(201).json(complaint);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create complaint' });
  }
});

// GET /api/complaints  (resident: own only | admin: all, with filters)
// query params (admin only): category, status, from, to
router.get('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const { category, status, from, to } = req.query;
      const conditions = [];
      const values = [];

      if (category) { values.push(category); conditions.push(`category = $${values.length}`); }
      if (status) { values.push(status); conditions.push(`status = $${values.length}`); }
      if (from) { values.push(from); conditions.push(`created_at >= $${values.length}`); }
      if (to) { values.push(to); conditions.push(`created_at <= $${values.length}`); }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const result = await pool.query(
        `SELECT *, ${OVERDUE_EXPR} FROM complaints ${where}
         ORDER BY overdue DESC, priority DESC, created_at DESC`,
        values
      );
      return res.json(result.rows);
    }

    // Resident: only their own complaints
    const result = await pool.query(
      `SELECT *, ${OVERDUE_EXPR} FROM complaints WHERE resident_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
});

// GET /api/complaints/:id/history — full timeline for one complaint
router.get('/:id/history', requireAuth, async (req, res) => {
  try {
    // Ownership check for residents: they can only view their own complaint's history.
    const complaint = await pool.query('SELECT resident_id FROM complaints WHERE id = $1', [req.params.id]);
    if (complaint.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'admin' && complaint.rows[0].resident_id !== req.user.id) {
      return res.status(403).json({ error: 'Not your complaint' });
    }

    const history = await pool.query(
      `SELECT h.*, u.name AS actor_name FROM complaint_history h
       JOIN users u ON u.id = h.actor_id
       WHERE h.complaint_id = $1 ORDER BY h.created_at ASC`,
      [req.params.id]
    );
    res.json(history.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// PATCH /api/complaints/:id/status  (admin only)
// body: { status, note }
router.patch('/:id/status', requireAuth, requireAdmin, async (req, res) => {
  const { status, note } = req.body;
  const valid = ['Open', 'In Progress', 'Resolved'];
  if (!valid.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${valid.join(', ')}` });
  }

  try {
    const current = await pool.query(
      `SELECT c.*, u.email AS resident_email FROM complaints c
       JOIN users u ON u.id = c.resident_id WHERE c.id = $1`,
      [req.params.id]
    );
    if (current.rows.length === 0) return res.status(404).json({ error: 'Complaint not found' });
    const old = current.rows[0];

    const resolvedAt = status === 'Resolved' ? 'NOW()' : 'NULL';
    const updated = await pool.query(
      `UPDATE complaints SET status = $1, resolved_at = ${resolvedAt} WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );

    await pool.query(
      `INSERT INTO complaint_history (complaint_id, old_status, new_status, actor_id, note)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.params.id, old.status, status, req.user.id, note || null]
    );

    // Notify resident of the status change.
    sendEmail(
      old.resident_email,
      `Your complaint #${req.params.id} is now "${status}"`,
      `Status changed from "${old.status}" to "${status}".${note ? ` Note: ${note}` : ''}`
    );

    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// PATCH /api/complaints/:id/priority  (admin only)
// body: { priority }
router.patch('/:id/priority', requireAuth, requireAdmin, async (req, res) => {
  const { priority } = req.body;
  if (!['Low', 'Medium', 'High'].includes(priority)) {
    return res.status(400).json({ error: 'priority must be Low, Medium or High' });
  }
  try {
    const updated = await pool.query(
      'UPDATE complaints SET priority = $1 WHERE id = $2 RETURNING *',
      [priority, req.params.id]
    );
    if (updated.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update priority' });
  }
});

module.exports = router;
