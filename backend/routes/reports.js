const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getReports, saveReports, createReport, getReportById, updateReportStatus, addComment } = require('../utils/data');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { detectRoadDamage, generateDescriptionFromContext } = require('../services/aiService');
const { isDatabaseEnabled, query } = require('../config/db');

const router = express.Router();

const validStatuses = ['Pending', 'In Progress', 'Resolved', 'Rejected'];
const validIssueTypes = [
  'Pothole',
  'Broken Street Light',
  'Cracked Road',
  'Faded Road Markings',
  'Broken Traffic Light',
  'Damaged Pavement/Sidewalk',
  'Blocked Storm Drain',
  'Water Leak on Road',
  'Sinkhole',
  'Loose Gravel',
  'Fallen Road Sign',
  'Damaged Guardrail',
  'Uneven Road Surface',
  'Flooded Road',
  'Illegal Dumping',
  'Overgrown Bushes',
  'Missing Manhole Cover',
  'Broken Speed Hump',
  'Oil Spill',
  'Exposed Electrical Cables',
  'Other',
];

let schemaCapabilitiesCache = null;

const getSchemaCapabilities = async () => {
  if (schemaCapabilitiesCache) {
    return schemaCapabilitiesCache;
  }

  const [reportedAtResult, imageUrlResult, statusHistoryResult, reportCommentsResult] = await Promise.all([
    query("SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'reported_at') AS exists"),
    query("SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'image_url') AS exists"),
    query("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'report_status_history') AS exists"),
    query("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'report_comments') AS exists"),
  ]);

  schemaCapabilitiesCache = {
    hasReportedAt: Boolean(reportedAtResult.rows[0]?.exists),
    hasImageUrl: Boolean(imageUrlResult.rows[0]?.exists),
    hasReportStatusHistory: Boolean(statusHistoryResult.rows[0]?.exists),
    hasReportComments: Boolean(reportCommentsResult.rows[0]?.exists),
  };

  return schemaCapabilitiesCache;
};

const mapReportRow = (row) => ({
  id: row.id,
  userId: row.user_id,
  image: row.image || row.image_url || '',
  issueType: row.issue_type,
  description: row.description,
  location: row.location,
  timestamp: row.reported_at || row.timestamp,
  status: row.status,
  history: [],
  comments: [],
});

const getReportHistory = async (reportId) => {
  const schema = await getSchemaCapabilities();

  if (schema.hasReportStatusHistory) {
    const result = await query(
      `SELECT status, changed_at, updated_by_name
       FROM report_status_history
       WHERE report_id = $1
       ORDER BY changed_at ASC`,
      [reportId]
    );

    return result.rows.map((h) => ({
      status: h.status,
      timestamp: h.changed_at,
      updatedBy: h.updated_by_name || 'System',
    }));
  }

  const result = await query(
    `SELECT status, timestamp, updated_by
     FROM report_history
     WHERE report_id = $1
     ORDER BY timestamp ASC`,
    [reportId]
  );

  return result.rows.map((h) => ({
    status: h.status,
    timestamp: h.timestamp,
    updatedBy: h.updated_by || 'System',
  }));
};

const getReportComments = async (reportId) => {
  const schema = await getSchemaCapabilities();

  if (schema.hasReportComments) {
    const result = await query(
      `SELECT id, author_user_id, author_name, comment_text, created_at
       FROM report_comments
       WHERE report_id = $1
       ORDER BY created_at ASC`,
      [reportId]
    );

    return result.rows.map((c) => ({
      id: c.id,
      authorUserId: c.author_user_id,
      author: c.author_name,
      text: c.comment_text,
      timestamp: c.created_at,
    }));
  }

  const result = await query(
    `SELECT id, author, text, timestamp
     FROM comments
     WHERE report_id = $1
     ORDER BY timestamp ASC`,
    [reportId]
  );

  return result.rows.map((c) => ({
    id: c.id,
    authorUserId: null,
    author: c.author,
    text: c.text,
    timestamp: c.timestamp,
  }));
};

const getFullReportById = async (reportId) => {
  const schema = await getSchemaCapabilities();
  const timeCol = schema.hasReportedAt ? 'reported_at' : 'timestamp';
  const imageCol = schema.hasImageUrl ? 'image_url' : 'image';

  const reportResult = await query(
    `SELECT id, user_id, ${imageCol} as image, issue_type, description, location, status, ${timeCol} as reported_at
     FROM reports
     WHERE id = $1
     LIMIT 1`,
    [reportId]
  );

  if (reportResult.rowCount === 0) {
    return null;
  }

  const report = mapReportRow(reportResult.rows[0]);
  report.history = await getReportHistory(report.id);
  report.comments = await getReportComments(report.id);
  return report;
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Ensure uploads directory exists
const fs = require('fs');
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Get all reports (authenticated users only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (isDatabaseEnabled()) {
      const schema = await getSchemaCapabilities();
      const timeCol = schema.hasReportedAt ? 'reported_at' : 'timestamp';
      const imageCol = schema.hasImageUrl ? 'image_url' : 'image';

      const result = await query(
        `SELECT id, user_id, ${imageCol} as image, issue_type, description, location, status, ${timeCol} as reported_at
         FROM reports
         ORDER BY ${timeCol} DESC`,
        []
      );

      const reports = await Promise.all(
        result.rows.map(async (row) => {
          const report = mapReportRow(row);
          report.history = await getReportHistory(report.id);
          report.comments = await getReportComments(report.id);
          return report;
        })
      );

      res.json(reports);
      return;
    }

    const reports = await getReports();

    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single report
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    if (isDatabaseEnabled()) {
      const report = await getFullReportById(req.params.id);
      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      res.json(report);
      return;
    }

    const report = await getReportById(req.params.id);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json(report);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new report
router.post('/', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { issueType, description, location } = req.body;
    const issueTypeValue = String(issueType || '').trim();
    const descriptionValue = String(description || '').trim();
    const locationValue = String(location || '').trim();

    if (!issueTypeValue || !descriptionValue || !locationValue) {
      return res.status(400).json({ error: 'Issue type, description, and location are required' });
    }

    if (!validIssueTypes.includes(issueTypeValue)) {
      return res.status(400).json({ error: 'Invalid issue type' });
    }

    // Handle image
    let imageUrl = '';
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.image) {
      // Handle base64 image
      imageUrl = req.body.image;
    }

    const reportId = uuidv4();
    const timestamp = new Date().toISOString();

    if (isDatabaseEnabled()) {
      const schema = await getSchemaCapabilities();
      const timeCol = schema.hasReportedAt ? 'reported_at' : 'timestamp';
      const imageCol = schema.hasImageUrl ? 'image_url' : 'image';

      await query(
        `INSERT INTO reports (id, user_id, ${imageCol}, issue_type, description, location, status, ${timeCol})
         VALUES ($1, $2, $3, $4, $5, $6, 'Pending', $7)`,
        [reportId, req.user.id, imageUrl, issueTypeValue, descriptionValue, locationValue, timestamp]
      );

      if (schema.hasReportStatusHistory) {
        await query(
          `INSERT INTO report_status_history (id, report_id, status, updated_by_user_id, updated_by_name, changed_at)
           VALUES (gen_random_uuid(), $1, 'Pending', $2, $3, $4)`,
          [reportId, req.user.id, req.user.name || req.user.email || 'User', timestamp]
        );
      } else {
        await query(
          `INSERT INTO report_history (id, report_id, status, updated_by, timestamp)
           VALUES (gen_random_uuid(), $1, 'Pending', $2, $3)`,
          [reportId, req.user.name || req.user.email || 'User', timestamp]
        );
      }

      const created = await getFullReportById(reportId);
      return res.status(201).json(created);
    }

    const reports = getReports();

    const newReport = {
      id: reportId,
      userId: req.user.id,
      image: imageUrl,
      issueType: issueTypeValue,
      description: descriptionValue,
      location: locationValue,
      timestamp,
      status: 'Pending',
      history: [{
        status: 'Pending',
        timestamp,
        updatedBy: req.user.name || 'User'
      }],
      comments: []
    };

    const createdReport = await createReport(newReport);

    res.status(201).json(createdReport);
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update report status (admin only)
router.patch('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }

    if (isDatabaseEnabled()) {
      const schema = await getSchemaCapabilities();
      const updateResult = await query(
        `UPDATE reports
         SET status = $1
         WHERE id = $2
         RETURNING id`,
        [status, req.params.id]
      );

      if (updateResult.rowCount === 0) {
        return res.status(404).json({ error: 'Report not found' });
      }

      if (schema.hasReportStatusHistory) {
        await query(
          `INSERT INTO report_status_history (id, report_id, status, updated_by_user_id, updated_by_name, changed_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())`,
          [req.params.id, status, req.user.id, req.user.name || req.user.email || 'Admin']
        );
      } else {
        await query(
          `INSERT INTO report_history (id, report_id, status, updated_by, timestamp)
           VALUES (gen_random_uuid(), $1, $2, $3, NOW())`,
          [req.params.id, status, req.user.name || req.user.email || 'Admin']
        );
      }

      const updated = await getFullReportById(req.params.id);
      return res.json(updated);
    }

    await updateReportStatus(req.params.id, status, req.user.name || 'Admin');

    const updatedReport = await getReportById(req.params.id);
    if (!updatedReport) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(updatedReport);
  } catch (error) {
    console.error('Error updating report status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add comment to report
router.post('/:id/comments', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    if (isDatabaseEnabled()) {
      const schema = await getSchemaCapabilities();
      const reportResult = await query(
        'SELECT id, user_id FROM reports WHERE id = $1 LIMIT 1',
        [req.params.id]
      );

      if (reportResult.rowCount === 0) {
        return res.status(404).json({ error: 'Report not found' });
      }

      const report = reportResult.rows[0];
      if (req.user.role !== 'admin' && report.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (schema.hasReportComments) {
        const result = await query(
          `INSERT INTO report_comments (id, report_id, author_user_id, author_name, comment_text, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
           RETURNING id, author_user_id, author_name, comment_text, created_at`,
          [req.params.id, req.user.id, req.user.name || req.user.email, text.trim()]
        );

        const row = result.rows[0];
        return res.status(201).json({
          id: row.id,
          authorUserId: row.author_user_id,
          author: row.author_name,
          text: row.comment_text,
          timestamp: row.created_at,
        });
      }

      const result = await query(
        `INSERT INTO comments (id, report_id, author, text, timestamp)
         VALUES (gen_random_uuid(), $1, $2, $3, NOW())
         RETURNING id, author, text, timestamp`,
        [req.params.id, req.user.name || req.user.email, text.trim()]
      );

      const row = result.rows[0];
      return res.status(201).json({
        id: row.id,
        authorUserId: null,
        author: row.author,
        text: row.text,
        timestamp: row.timestamp,
      });
    }

    const report = await getReportById(req.params.id);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Check if user can comment on this report
    if (req.user.role !== 'admin' && report.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const newComment = {
      author: req.user.name || req.user.email,
      text: text.trim()
    };

    const createdComment = await addComment(req.params.id, newComment);

    res.status(201).json(createdComment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// AI analysis endpoint
router.post('/analyze-image', authenticateToken, async (req, res) => {
  try {
    const { image, location } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    const analysis = await detectRoadDamage(image, { location });
    res.json(analysis);
  } catch (error) {
    console.error('Error analyzing image:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/generate-description', authenticateToken, async (req, res) => {
  try {
    const { issueType, location } = req.body;

    if (!issueType) {
      return res.status(400).json({ error: 'Issue type is required' });
    }

    const analysis = await generateDescriptionFromContext({ issueType, location });
    res.json(analysis);
  } catch (error) {
    console.error('Error generating description:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;