const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { query, isDatabaseEnabled } = require('../config/db');

const USERS_FILE = path.join(__dirname, '../data/users.json');
const REPORTS_FILE = path.join(__dirname, '../data/reports.json');

// Ensure data directory exists (for fallback)
if (!fs.existsSync(path.dirname(USERS_FILE))) {
  fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
}

// Initialize files if they don't exist (for fallback)
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
}

if (!fs.existsSync(REPORTS_FILE)) {
  fs.writeFileSync(REPORTS_FILE, JSON.stringify([], null, 2));
}

// User utilities
const getUsers = async () => {
  if (isDatabaseEnabled()) {
    try {
      const result = await query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
      return result.rows;
    } catch (error) {
      console.error('Error querying users from database:', error);
      return [];
    }
  } else {
    // Fallback to JSON
    try {
      const data = fs.readFileSync(USERS_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading users file:', error);
      return [];
    }
  }
};

const saveUsers = async (users) => {
  if (isDatabaseEnabled()) {
    // For database, individual operations should be used instead
    console.warn('saveUsers with array not supported for database. Use individual user operations.');
  } else {
    // Fallback to JSON
    try {
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    } catch (error) {
      console.error('Error saving users file:', error);
    }
  }
};

const createUser = async (user) => {
  if (isDatabaseEnabled()) {
    try {
      const result = await query(
        'INSERT INTO users (id, name, email, role, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [user.id, user.name, user.email, user.role, user.password_hash]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error creating user in database:', error);
      throw error;
    }
  } else {
    // Fallback to JSON
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    users.push(user);
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    return user;
  }
};

const getUserByEmail = async (email) => {
  if (isDatabaseEnabled()) {
    try {
      const result = await query('SELECT * FROM users WHERE email = $1', [email]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error querying user by email:', error);
      return null;
    }
  } else {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    return users.find(u => u.email === email) || null;
  }
};

const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Reports utilities
const getReports = async () => {
  if (isDatabaseEnabled()) {
    try {
      const result = await query(`
        SELECT r.id, r.user_id as "userId", r.image, r.issue_type as "issueType", r.description, r.location, r.timestamp, r.status, r.created_at,
               COALESCE(json_agg(DISTINCT rh.*) FILTER (WHERE rh.id IS NOT NULL), '[]') as history,
               COALESCE(json_agg(DISTINCT c.*) FILTER (WHERE c.id IS NOT NULL), '[]') as comments
        FROM reports r
        LEFT JOIN report_history rh ON r.id = rh.report_id
        LEFT JOIN comments c ON r.id = c.report_id
        GROUP BY r.id
        ORDER BY r.timestamp DESC
      `);
      return result.rows.map(row => ({
        ...row,
        history: row.history || [],
        comments: row.comments || []
      }));
    } catch (error) {
      console.error('Error querying reports from database:', error);
      return [];
    }
  } else {
    // Fallback to JSON
    try {
      const data = fs.readFileSync(REPORTS_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading reports file:', error);
      return [];
    }
  }
};

const saveReports = async (reports) => {
  if (isDatabaseEnabled()) {
    // For database, individual operations should be used instead
    console.warn('saveReports with array not supported for database. Use individual report operations.');
  } else {
    // Fallback to JSON
    try {
      fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2));
    } catch (error) {
      console.error('Error saving reports file:', error);
    }
  }
};

const createReport = async (report) => {
  if (isDatabaseEnabled()) {
    try {
      const result = await query(
        'INSERT INTO reports (id, user_id, image, issue_type, description, location, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, user_id as "userId", image, issue_type as "issueType", description, location, timestamp, status, created_at',
        [report.id, report.userId, report.image, report.issueType, report.description, report.location, report.status || 'Pending']
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error creating report in database:', error);
      throw error;
    }
  } else {
    // Fallback to JSON
    const reports = JSON.parse(fs.readFileSync(REPORTS_FILE, 'utf8'));
    reports.push(report);
    fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2));
    return report;
  }
};

const getReportById = async (id) => {
  if (isDatabaseEnabled()) {
    try {
      const result = await query(`
        SELECT r.id, r.user_id as "userId", r.image, r.issue_type as "issueType", r.description, r.location, r.timestamp, r.status, r.created_at,
               COALESCE(json_agg(DISTINCT rh.*) FILTER (WHERE rh.id IS NOT NULL), '[]') as history,
               COALESCE(json_agg(DISTINCT c.*) FILTER (WHERE c.id IS NOT NULL), '[]') as comments
        FROM reports r
        LEFT JOIN report_history rh ON r.id = rh.report_id
        LEFT JOIN comments c ON r.id = c.report_id
        WHERE r.id = $1
        GROUP BY r.id
      `, [id]);
      if (result.rows.length === 0) return null;
      const row = result.rows[0];
      return {
        ...row,
        history: row.history || [],
        comments: row.comments || []
      };
    } catch (error) {
      console.error('Error querying report by id:', error);
      return null;
    }
  } else {
    const reports = JSON.parse(fs.readFileSync(REPORTS_FILE, 'utf8'));
    return reports.find(r => r.id === id) || null;
  }
};

const updateReportStatus = async (id, status, updatedBy) => {
  if (isDatabaseEnabled()) {
    try {
      // Update report status
      await query('UPDATE reports SET status = $1 WHERE id = $2', [status, id]);
      // Add to history
      await query('INSERT INTO report_history (id, report_id, status, updated_by) VALUES (gen_random_uuid(), $1, $2, $3)', [id, status, updatedBy]);
    } catch (error) {
      console.error('Error updating report status:', error);
      throw error;
    }
  } else {
    // Fallback to JSON
    const reports = JSON.parse(fs.readFileSync(REPORTS_FILE, 'utf8'));
    const report = reports.find(r => r.id === id);
    if (report) {
      report.status = status;
      report.history = report.history || [];
      report.history.push({
        status,
        timestamp: new Date().toISOString(),
        updatedBy
      });
      fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2));
    }
  }
};

const addComment = async (reportId, comment) => {
  if (isDatabaseEnabled()) {
    try {
      const result = await query(
        'INSERT INTO comments (id, report_id, author, text) VALUES (gen_random_uuid(), $1, $2, $3) RETURNING *',
        [reportId, comment.author, comment.text]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  } else {
    // Fallback to JSON
    const reports = JSON.parse(fs.readFileSync(REPORTS_FILE, 'utf8'));
    const report = reports.find(r => r.id === reportId);
    if (report) {
      report.comments = report.comments || [];
      const newComment = {
        id: require('uuid').v4(),
        ...comment,
        timestamp: new Date().toISOString()
      };
      report.comments.push(newComment);
      fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2));
      return newComment;
    }
    throw new Error('Report not found');
  }
};

module.exports = {
  getUsers,
  saveUsers,
  createUser,
  getUserByEmail,
  getReports,
  saveReports,
  createReport,
  getReportById,
  updateReportStatus,
  addComment,
  hashPassword,
  comparePassword
};