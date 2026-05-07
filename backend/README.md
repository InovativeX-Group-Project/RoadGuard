# RoadGuard Backend API

Node.js/Express backend for the RoadGuard road reporting system.

## Features

- User authentication (login/signup)
- JWT-based authorization
- Report management (CRUD operations)
- Image upload and storage
- AI-powered road damage detection using Google Gemini
- Admin dashboard functionality
- Comment system for reports

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   - Copy `.env` file and update the values:
     - `JWT_SECRET`: A secure random string for JWT signing
     - `GEMINI_API_KEY`: Your Google Gemini API key (optional, for AI analysis)

3. Hash the admin password (one-time setup):
   ```bash
   node hashPassword.js
   ```

4. Start the server:
   ```bash
   npm start
   ```

   For development with auto-restart:
   ```bash
   npm run dev
   ```

The server will run on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `GET /api/auth/verify` - Verify JWT token

### Reports
- `GET /api/reports` - Get all reports (filtered by user role)
- `GET /api/reports/:id` - Get single report
- `POST /api/reports` - Create new report (with image upload)
- `PATCH /api/reports/:id/status` - Update report status (admin only)
- `POST /api/reports/:id/comments` - Add comment to report
- `POST /api/reports/analyze-image` - AI image analysis

### Users (Admin only)
- `GET /api/users` - Get all users
- `GET /api/users/stats` - Get user statistics

### Health Check
- `GET /api/health` - Server health check

## Data Storage

Currently uses JSON file storage for simplicity:
- `data/users.json` - User accounts
- `data/reports.json` - Road reports
- `uploads/` - Uploaded images

## Authentication

Uses JWT tokens for authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## File Upload

Images are stored in the `uploads/` directory and served at `/uploads/filename`.

## AI Integration

The AI service uses Google Gemini to analyze uploaded images for road damage detection. Requires a valid `GEMINI_API_KEY` in the environment variables.