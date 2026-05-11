const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/reports');
const userRoutes = require('./routes/users');
const { getPool, query } = require('./config/db');
const { initDatabase } = require('./initDb');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files for uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);

// Database API endpoints for inspection
app.get('/api/db/tables', async (req, res) => {
  try {
    const result = await query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' ORDER BY table_name
    `);
    res.json({ tables: result.rows.map(r => r.table_name) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
});

app.get('/api/db/table/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const result = await query(`SELECT * FROM ${tableName} LIMIT 100`);
    res.json({ 
      table: tableName, 
      columns: result.fields.map(f => f.name),
      rows: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch table data' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'RoadGuard API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const checkDatabaseConnection = async () => {
  const pool = getPool();
  if (!pool) {
    console.log('⚠️ Database connection not configured. Set DATABASE_URL to enable DB access.');
    return;
  }

  try {
    await pool.query('SELECT 1');
    console.log('✅ Database connection status: connected');
  } catch (error) {
    console.log('❌ Database connection status: failed (Server will continue without DB)');
  }
};

app.listen(PORT, async () => {
  await initDatabase();
  console.log(`RoadGuard API server running on port ${PORT}`);
  await checkDatabaseConnection();
});

module.exports = app;