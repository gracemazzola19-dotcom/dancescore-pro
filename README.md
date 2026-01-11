# DanceScore Pro

A digital judging platform designed to streamline the dance audition process. DanceScore Pro enables judges to score multiple dancers simultaneously across various performance criteria, automatically calculates averages, and generates easy-to-read summaries for directors and staff.

## Features

### For Judges
- Score 4-5 dancers simultaneously in real-time
- Intuitive slider-based scoring interface
- Score categories: Kick (4), Jump (4), Turn (4), Performance (4), Execution (8), Technique (8)
- Optional comments for each dancer
- Group-based dancer organization
- Mobile-responsive design

### For Administrators
- Add dancers manually or upload from CSV/Excel files
- View live results dashboard
- Export results in CSV or Excel format
- Manage dancer groups and audition numbers
- Real-time score tracking

## Technology Stack

- **Frontend**: React with TypeScript
- **Backend**: Node.js with Express
- **Database**: Firebase Firestore
- **Authentication**: JWT-based authentication
- **Styling**: CSS3 with responsive design
- **Export**: CSV and Excel file generation

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase project (for database)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd dancescore-pro
```

2. Install dependencies:
```bash
npm run install-all
```

3. Set up environment variables:
```bash
cd server
cp .env.example .env
# Edit .env with your configuration
```

4. Set up Firebase:
   - Create a Firebase project
   - Enable Firestore Database
   - Generate a service account key
   - Add the key file path to your .env file

5. Start the development servers:
```bash
npm run dev
```

This will start both the backend server (port 5000) and frontend development server (port 3000).

### Demo Credentials

- **Judge**: judge@dancescore.com / judge123
- **Admin**: admin@dancescore.com / admin123

## Usage

### For Judges
1. Login with judge credentials
2. Select a dancer group
3. Score each dancer using the sliders (Kick/Jump/Turn/Performance: 0-4, Execution/Technique: 0-8)
4. Add optional comments
5. Submit scores

### For Administrators
1. Login with admin credentials
2. Add dancers manually or upload from file
3. View real-time results
4. Export results when ready

## File Upload Format

When uploading dancers from a file, use the following format:

| Name | Audition Number | Group |
|------|----------------|-------|
| Jane Doe | 001 | Group 1 |
| John Smith | 002 | Group 1 |

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login

### Dancers
- `GET /api/dancers` - Get all dancers
- `POST /api/dancers` - Add a dancer
- `POST /api/dancers/upload` - Upload dancers from file

### Scoring
- `POST /api/scores` - Submit scores
- `GET /api/scores/:dancerId` - Get scores for a dancer

### Results
- `GET /api/results` - Get all results with averages
- `GET /api/export/csv` - Export results as CSV
- `GET /api/export/excel` - Export results as Excel

## Deployment

### Production Setup

1. Build the frontend:
```bash
cd client
npm run build
```

2. Set production environment variables
3. Deploy backend to your preferred hosting service
4. Serve the built frontend files

### Recommended Hosting
- **Backend**: Heroku, AWS, or DigitalOcean
- **Frontend**: Netlify, Vercel, or AWS S3
- **Database**: Firebase Firestore (already configured)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support or questions, please contact the development team or create an issue in the repository.
