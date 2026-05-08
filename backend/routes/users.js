const express = require('express');
const { getUsers } = require('../utils/data');
const { isDatabaseEnabled, query } = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    if (isDatabaseEnabled()) {
      query('SELECT id, name, email, role, created_at, updated_at FROM users ORDER BY name ASC')
        .then((result) => res.json(result.rows))
        .catch((error) => {
          console.error('Error fetching users:', error);
          res.status(500).json({ error: 'Internal server error' });
        });
      return;
    }

    const users = getUsers();
    // Return users without password fields
    const usersWithoutPasswords = users.map(({ password, password_hash, ...user }) => user);
    res.json(usersWithoutPasswords);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user stats (admin only)
router.get('/stats', authenticateToken, requireAdmin, (req, res) => {
  try {
    if (isDatabaseEnabled()) {
      query(
        `SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE role = 'admin')::int AS admins,
          COUNT(*) FILTER (WHERE role = 'citizen')::int AS citizens
         FROM users`
      )
        .then((result) => res.json(result.rows[0]))
        .catch((error) => {
          console.error('Error fetching user stats:', error);
          res.status(500).json({ error: 'Internal server error' });
        });
      return;
    }

    const users = getUsers();
    const stats = {
      total: users.length,
      admins: users.filter(u => u.role === 'admin').length,
      citizens: users.filter(u => u.role === 'citizen').length
    };
    res.json(stats);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;