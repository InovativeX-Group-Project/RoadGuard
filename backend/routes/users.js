const express = require('express');
const { getUsers, saveUsers } = require('../utils/data');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const users = getUsers();
    // Return users without passwords
    const usersWithoutPasswords = users.map(({ password, ...user }) => user);
    res.json(usersWithoutPasswords);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user stats (admin only)
router.get('/stats', authenticateToken, requireAdmin, (req, res) => {
  try {
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