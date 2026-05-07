# RoadGuard

A comprehensive road reporting system for citizens to report infrastructure issues and for municipalities to manage them efficiently.

## Features

- **Citizen Reporting**: Easy-to-use interface for citizens to report potholes, broken traffic lights, and other road issues
- **AI-Powered Analysis**: Automatic detection of road damage types using Google Gemini AI
- **Image Upload**: Support for photo evidence with AI analysis
- **Admin Dashboard**: Municipal staff can track, update, and manage all reports
- **Real-time Updates**: Status tracking and comment system for communication
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

### Frontend
- React 19 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Lucide React for icons
- Motion for animations

### Backend
- Node.js with Express
- JWT authentication
- File-based data storage (easily replaceable with database)
- Google Gemini AI integration
- Multer for file uploads

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env` and update the values:
     ```env
     PORT=5000
     JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
     GEMINI_API_KEY=your-gemini-api-key-here
     ```

4. Hash the admin password (one-time setup):
   ```bash
   node hashPassword.js
   ```
   Or manually update `backend/data/users.json` with a bcrypt hash of "admin123"

5. Start the backend server:
   ```bash
   npm start
   ```
   Or for development with auto-restart:
   ```bash
   npm run dev
   ```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will run on `http://localhost:3000`

## Usage

### Default Accounts
- **Admin**: email: `staff@roadguard.gov.za`, password: `admin123`
- **Citizen**: Create a new account via the signup form

### API Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `GET /api/reports` - Get reports (filtered by user role)
- `POST /api/reports` - Create new report
- `PATCH /api/reports/:id/status` - Update report status (admin)
- `POST /api/reports/:id/comments` - Add comments
- `POST /api/reports/analyze-image` - AI image analysis

## Development

### Project Structure
```
RoadGuard/
├── backend/           # Node.js/Express API server
│   ├── data/         # JSON data storage
│   ├── middleware/   # Authentication middleware
│   ├── routes/       # API route handlers
│   ├── services/     # AI and external services
│   └── utils/        # Data management utilities
├── frontend/         # React application
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── views/       # Page components
│   │   ├── lib/         # Utilities
│   │   └── types.ts     # TypeScript type definitions
│   └── public/          # Static assets
└── README.md
```

### Building for Production

Frontend:
```bash
cd frontend
npm run build
```

Backend is ready for production as-is (consider adding a process manager like PM2).

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
