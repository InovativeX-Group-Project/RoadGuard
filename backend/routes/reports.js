const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getReports, saveReports, createReport, getReportById, updateReportStatus, addComment } = require('../utils/data');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { detectRoadDamage } = require('../services/aiService');

const router = express.Router();

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
    const reports = await getReports();

    // Filter reports based on user role
    let filteredReports;
    if (req.user.role === 'admin') {
      // Admins see all reports
      filteredReports = reports;
    } else {
      // Citizens see only their own reports
      filteredReports = reports.filter(r => r.userId === req.user.id);
    }

    res.json(filteredReports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single report
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const report = await getReportById(req.params.id);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Check if user can access this report
    if (req.user.role !== 'admin' && report.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
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

    if (!issueType || !description || !location) {
      return res.status(400).json({ error: 'Issue type, description, and location are required' });
    }

    let imageUrl = '';
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.image) {
      // Handle base64 image
      imageUrl = req.body.image;
    }

    const newReport = {
      id: uuidv4(),
      userId: req.user.id,
      image: imageUrl,
      issueType,
      description,
      location,
      status: 'Pending'
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
    const validStatuses = ['Pending', 'In Progress', 'Resolved', 'Rejected'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }

    await updateReportStatus(req.params.id, status, req.user.name || 'Admin');

    const updatedReport = await getReportById(req.params.id);
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
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    const analysis = await detectRoadDamage(image);
    res.json(analysis);
  } catch (error) {
    console.error('Error analyzing image:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;