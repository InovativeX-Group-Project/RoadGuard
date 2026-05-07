const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getUsers, saveUsers, hashPassword, comparePassword } = require('../utils/data');
const { isDatabaseEnabled, query } = require('../config/db');

const router = express.Router();

const normalizeUser = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
});

const findUserByEmail = async (email) => {
  if (isDatabaseEnabled()) {
    const result = await query(
      `SELECT id, name, email, role, password_hash
       FROM users
       WHERE lower(email) = lower($1)
       LIMIT 1`,
      [email]
    );
    if (result.rowCount === 0) {
      return null;
    }
    return {
      ...normalizeUser(result.rows[0]),
      password: result.rows[0].password_hash,
    };
  }

  const users = getUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
};

const createUser = async ({ name, email, passwordHash }) => {
  if (isDatabaseEnabled()) {
    const result = await query(
      `INSERT INTO users (id, name, email, role, password_hash)
       VALUES ($1, $2, $3, 'citizen', $4)
       RETURNING id, name, email, role`,
      [uuidv4(), name, email, passwordHash]
    );
    return normalizeUser(result.rows[0]);
  }

  const users = getUsers();
  const newUser = {
    id: uuidv4(),
    name,
    email,
    role: 'citizen',
    password: passwordHash,
  };
  users.push(newUser);
  saveUsers(users);
  const { password, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
};

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    res.json({
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const existingUser = await findUserByEmail(email);

    // Check if user already exists
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new user
    const newUser = await createUser({
      name,
      email,
      passwordHash: hashedPassword,
    });

    // Create JWT token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Return user without password
    res.status(201).json({
      user: newUser,
      token
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify token (for frontend to check if token is still valid)
router.get('/verify', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    res.json({ user });
  });
});

module.exports = router;