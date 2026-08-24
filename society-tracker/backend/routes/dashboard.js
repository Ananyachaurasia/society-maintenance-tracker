const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const OVERDUE_DAYS = Number(process.env.OVERDUE_DAYS) || 5;

// GET /api/dashboard  (admin only) — counts for the summary widgets
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const byStatus = await pool.query(
      `SELECT status, COUNT(*) FROM complaints GROUP BY status`
    );
    const byCategory = await pool.query(
      `SELECT category, COUNT(*) FROM complaints GROUP BY category`
    );
    const overdue = await pool.query(
      `SELECT COUNT(*) FROM complaints
       WHERE status != 'Resolved' AND created_at < NOW() - INTERVAL '${OVERDUE_DAYS} days'`
    );

    res.json({
      byStatus: byStatus.rows,
      byCategory: byCategory.rows,
      overdueCount: Number(overdue.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

module.exports = router;
