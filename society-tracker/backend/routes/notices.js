const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');

const router = express.Router();

// GET /api/notices — everyone can view, pinned/important first
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM notices ORDER BY is_important DESC, created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch notices' });
  }
});

// POST /api/notices  (admin only)
// body: { title, body, is_important }
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { title, body, is_important } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'title and body are required' });

  try {
    const result = await pool.query(
      `INSERT INTO notices (title, body, is_important, posted_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [title, body, !!is_important, req.user.id]
    );

    if (is_important) {
      // Email every resident when an important notice goes up.
      const residents = await pool.query(`SELECT email FROM users WHERE role = 'resident'`);
      residents.rows.forEach((r) => sendEmail(r.email, `Important notice: ${title}`, body));
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to post notice' });
  }
});

module.exports = router;
