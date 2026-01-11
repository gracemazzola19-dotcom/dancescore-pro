const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const dbAdapter = require('./database-adapter');
const multer = require('multer');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const admin = require('firebase-admin');
const emailService = require('./email-service');
const NodeCache = require('node-cache');
const rateLimit = require('express-rate-limit');

dotenv.config();

// Initialize email service on server start
emailService.initializeEmailService();

// Initialize cache for API responses (TTL: 30 seconds)
const cache = new NodeCache({ stdTTL: 30, checkperiod: 60, useClones: false });

const app = express();
const PORT = process.env.PORT || 5001; // Match client proxy configuration

// Rate limiting middleware (100 requests per minute per IP)
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for base64 file uploads
app.use('/api/', limiter); // Apply rate limiting to all API routes
app.use(express.static('public'));
app.use('/uploads', express.static('uploads')); // Serve uploaded files

// Serve React app build in production
const path = require('path');
if (process.env.NODE_ENV === 'production') {
  // Serve static files from the React app build directory
  app.use(express.static(path.join(__dirname, '../client/build')));
}

const db = dbAdapter;

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Configure multer for make-up file uploads
const makeUpStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const fs = require('fs');
    const dir = 'uploads/make-up/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: timestamp-random.ext
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = file.originalname.split('.').pop() || 'pdf';
    cb(null, `makeup-${uniqueSuffix}.${ext}`);
  }
});

const makeUpUpload = multer({
  storage: makeUpStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  }
});

// Configure multer for video uploads (larger file size, specific video types)
const videoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const fs = require('fs');
    const dir = 'uploads/videos/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: timestamp-auditionId-group.mp4
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = file.originalname.split('.').pop() || 'webm';
    cb(null, `video-${uniqueSuffix}.${ext}`);
  }
});

const videoUpload = multer({
  storage: videoStorage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB max file size
  },
  fileFilter: function (req, file, cb) {
    // Accept video files (webm, mp4, etc.)
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed!'), false);
    }
  }
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    // Ensure clubId exists (fallback to default for backwards compatibility)
    if (!req.user.clubId) {
      req.user.clubId = 'msu-dance-club'; // Default club for existing tokens
    }
    next();
  });
};

// Helper function to get clubId from request (for multi-tenant filtering)
const getClubId = (req) => {
  return req.user?.clubId || 'msu-dance-club'; // Fallback for safety
};

// Routes

// Settings management
app.get('/api/settings', authenticateToken, async (req, res) => {
  try {
    const clubId = getClubId(req);
    
    // Settings document is per-club: use club-specific document ID
    // For backward compatibility, check both 'audition_settings' (old) and 'settings_{clubId}' (new)
    let settingsDoc = await db.collection('settings').doc(`settings_${clubId}`).get();
    
    // Fallback to old document ID for backward compatibility (MSU Dance Club)
    if (!settingsDoc.exists && clubId === 'msu-dance-club') {
      settingsDoc = await db.collection('settings').doc('audition_settings').get();
    }
    
    if (settingsDoc.exists) {
      const settings = settingsDoc.data();
      
      // Verify clubId matches (security check)
      if (settings.clubId && settings.clubId !== clubId) {
        return res.status(403).json({ error: 'Access denied: Settings belong to a different club' });
      }
      // Ensure all settings categories have defaults if they don't exist
      const defaultSettings = {
        scoringFormat: 'slider',
        editMode: false,
        customTexts: {
          attendanceSheetTitle: 'Attendance Sheet',
          pointSheetTitle: 'Point Sheet',
          missingPracticeLabel: 'Missing Practice',
          excusedAbsenceLabel: 'Excused Absence',
          requestButtonLabel: 'Request',
          submitRequestLabel: 'Submit Request',
          pendingLabel: 'Pending',
          approvedLabel: 'Approved',
          deniedLabel: 'Denied',
          makeUpSubmissionLabel: 'Make-Up Submissions',
          submitMakeUpLabel: 'Submit Make-Up Work',
          absenceRequestInstructions: 'Submit proof of your make-up work to earn points back for the missed practice.',
          absenceRequestsTabLabel: 'Absence Requests',
          makeUpSubmissionsTabLabel: 'Make-Up Submissions',
        },
        auditionSettings: {
          defaultGroupSize: 5,
          autoAssignGroups: false,
          requireMinimumJudges: true,
          minimumJudgesCount: 3,
          allowMultipleSessions: true,
          defaultStatus: 'draft',
        },
        scoringSettings: {
          scoreCategories: [
            { name: 'kick', label: 'Kick', maxScore: 4, enabled: true },
            { name: 'jump', label: 'Jump', maxScore: 4, enabled: true },
            { name: 'turn', label: 'Turn', maxScore: 4, enabled: true },
            { name: 'performance', label: 'Performance', maxScore: 4, enabled: true },
            { name: 'execution', label: 'Execution', maxScore: 8, enabled: true },
            { name: 'technique', label: 'Technique', maxScore: 8, enabled: true },
          ],
          totalPossibleScore: 32,
          allowDecimalScores: true,
          showScoreBreakdown: true,
        },
        dancerSettings: {
          requiredFields: ['name', 'auditionNumber', 'email', 'phone', 'shirtSize', 'previousMember'],
          shirtSizeOptions: ['XS', 'Small', 'Medium', 'Large', 'XL', 'XXL'],
          previousLevelOptions: ['Level 1', 'Level 2', 'Level 3', 'Level 4'],
          autoNumberingEnabled: false,
          autoNumberingStart: 1,
          allowSelfRegistration: true,
          requireEmailVerification: false,
          allowDuplicateAuditionNumbers: false,
        },
        attendanceSettings: {
          pointPerPractice: 1,
          excusedAbsencePoints: 0,
          unexcusedAbsencePoints: 0,
          makeUpWorkEnabled: true,
          makeUpWorkPointsMultiplier: 1.0,
          requiredMakeUpProof: true,
          maxPointsPerPractice: 1,
          attendanceTrackingEnabled: true,
        },
        videoSettings: {
          videoRecordingEnabled: true,
          maxVideoSizeMB: 500,
          allowedVideoFormats: ['webm', 'mp4', 'mov'],
          requireVideoDescription: false,
          autoGroupVideos: true,
          videoRetentionDays: 365,
          allowVideoDownload: true,
        },
        notificationSettings: {
          emailNotificationsEnabled: false,
          notifyOnNewDancer: false,
          notifyOnScoreSubmission: false,
          notifyOnAbsenceRequest: true,
          notifyOnMakeUpSubmission: true,
          adminEmail: '',
          smtpConfigured: false,
        },
        appearanceSettings: {
          clubName: 'MSU Dance Club',
          siteTitle: 'DanceScore Pro',
          primaryColor: '#B380FF',
          secondaryColor: '#FFB3D1',
          logoUrl: '',
          showLogoInHeader: true,
          customFavicon: '',
        },
        systemSettings: {
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          dateFormat: 'MM/DD/YYYY',
          timeFormat: '12h',
          firstDayOfWeek: 'Sunday',
          language: 'en',
          enableAnalytics: false,
          enableErrorReporting: true,
          sessionTimeoutMinutes: 60,
        },
        securitySettings: {
          requireEmailVerificationForLogin: true, // Require email verification for all login types
          emailVerificationCodeExpiryMinutes: 10,
          maxVerificationAttempts: 5,
        },
      };
      
      // Merge with existing settings, keeping defaults for missing values
      res.json({
        ...defaultSettings,
        ...settings,
        customTexts: { ...defaultSettings.customTexts, ...(settings.customTexts || {}) },
        auditionSettings: { ...defaultSettings.auditionSettings, ...(settings.auditionSettings || {}) },
        scoringSettings: { 
          ...defaultSettings.scoringSettings, 
          ...(settings.scoringSettings || {}),
          scoreCategories: settings.scoringSettings?.scoreCategories || defaultSettings.scoringSettings.scoreCategories
        },
        dancerSettings: { ...defaultSettings.dancerSettings, ...(settings.dancerSettings || {}) },
        attendanceSettings: { ...defaultSettings.attendanceSettings, ...(settings.attendanceSettings || {}) },
        videoSettings: { ...defaultSettings.videoSettings, ...(settings.videoSettings || {}) },
        notificationSettings: { ...defaultSettings.notificationSettings, ...(settings.notificationSettings || {}) },
        appearanceSettings: { ...defaultSettings.appearanceSettings, ...(settings.appearanceSettings || {}) },
        systemSettings: { ...defaultSettings.systemSettings, ...(settings.systemSettings || {}) },
        securitySettings: { ...defaultSettings.securitySettings, ...(settings.securitySettings || {}) },
      });
    } else {
      // Return default settings if none exist
      // Try to get club name from clubs collection for better defaults
      let clubName = 'DanceScore Pro';
      try {
        const clubDoc = await db.collection('clubs').doc(clubId).get();
        if (clubDoc.exists) {
          const clubData = clubDoc.data();
          clubName = clubData.name || clubData.appearanceSettings?.clubName || 'DanceScore Pro';
        }
      } catch (err) {
        console.log('Could not fetch club name for defaults:', err.message);
      }
      
      const defaultSettings = {
        clubId: clubId, // Include clubId in defaults
        scoringFormat: 'slider',
        editMode: false,
        customTexts: {
          attendanceSheetTitle: 'Attendance Sheet',
          pointSheetTitle: 'Point Sheet',
          missingPracticeLabel: 'Missing Practice',
          excusedAbsenceLabel: 'Excused Absence',
          requestButtonLabel: 'Request',
          submitRequestLabel: 'Submit Request',
          pendingLabel: 'Pending',
          approvedLabel: 'Approved',
          deniedLabel: 'Denied',
          makeUpSubmissionLabel: 'Make-Up Submissions',
          submitMakeUpLabel: 'Submit Make-Up Work',
          absenceRequestInstructions: 'Submit proof of your make-up work to earn points back for the missed practice.',
          absenceRequestsTabLabel: 'Absence Requests',
          makeUpSubmissionsTabLabel: 'Make-Up Submissions',
        },
        auditionSettings: {
          defaultGroupSize: 5,
          autoAssignGroups: false,
          requireMinimumJudges: true,
          minimumJudgesCount: 3,
          allowMultipleSessions: true,
          defaultStatus: 'draft',
        },
        scoringSettings: {
          scoreCategories: [
            { name: 'kick', label: 'Kick', maxScore: 4, enabled: true },
            { name: 'jump', label: 'Jump', maxScore: 4, enabled: true },
            { name: 'turn', label: 'Turn', maxScore: 4, enabled: true },
            { name: 'performance', label: 'Performance', maxScore: 4, enabled: true },
            { name: 'execution', label: 'Execution', maxScore: 8, enabled: true },
            { name: 'technique', label: 'Technique', maxScore: 8, enabled: true },
          ],
          totalPossibleScore: 32,
          allowDecimalScores: true,
          showScoreBreakdown: true,
        },
        dancerSettings: {
          requiredFields: ['name', 'auditionNumber', 'email', 'phone', 'shirtSize', 'previousMember'],
          shirtSizeOptions: ['XS', 'Small', 'Medium', 'Large', 'XL', 'XXL'],
          previousLevelOptions: ['Level 1', 'Level 2', 'Level 3', 'Level 4'],
          autoNumberingEnabled: false,
          autoNumberingStart: 1,
          allowSelfRegistration: true,
          requireEmailVerification: false,
          allowDuplicateAuditionNumbers: false,
        },
        attendanceSettings: {
          pointPerPractice: 1,
          excusedAbsencePoints: 0,
          unexcusedAbsencePoints: 0,
          makeUpWorkEnabled: true,
          makeUpWorkPointsMultiplier: 1.0,
          requiredMakeUpProof: true,
          maxPointsPerPractice: 1,
          attendanceTrackingEnabled: true,
        },
        videoSettings: {
          videoRecordingEnabled: true,
          maxVideoSizeMB: 500,
          allowedVideoFormats: ['webm', 'mp4', 'mov'],
          requireVideoDescription: false,
          autoGroupVideos: true,
          videoRetentionDays: 365,
          allowVideoDownload: true,
        },
        notificationSettings: {
          emailNotificationsEnabled: false,
          notifyOnNewDancer: false,
          notifyOnScoreSubmission: false,
          notifyOnAbsenceRequest: true,
          notifyOnMakeUpSubmission: true,
          adminEmail: '',
          smtpConfigured: false,
        },
        appearanceSettings: {
          clubName: clubName, // Use dynamic club name from clubs collection
          siteTitle: 'DanceScore Pro',
          primaryColor: '#B380FF',
          secondaryColor: '#FFB3D1',
          logoUrl: '',
          showLogoInHeader: true,
          customFavicon: '',
        },
        systemSettings: {
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          dateFormat: 'MM/DD/YYYY',
          timeFormat: '12h',
          firstDayOfWeek: 'Sunday',
          language: 'en',
          enableAnalytics: false,
          enableErrorReporting: true,
          sessionTimeoutMinutes: 60,
        },
        securitySettings: {
          requireEmailVerificationForLogin: true, // Require email verification for all login types
          emailVerificationCodeExpiryMinutes: 10,
          maxVerificationAttempts: 5,
        },
        updatedAt: new Date()
      };
      res.json(defaultSettings);
    }
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/settings', authenticateToken, async (req, res) => {
  try {
    const clubId = getClubId(req);
    
    const { 
      scoringFormat, 
      customTexts, 
      editMode,
      auditionSettings,
      scoringSettings,
      dancerSettings,
      attendanceSettings,
      videoSettings,
      notificationSettings,
      appearanceSettings,
      systemSettings,
      securitySettings
    } = req.body;
    
    const settingsData = {
      clubId: clubId, // Ensure clubId is set (for multi-tenant isolation)
      updatedAt: new Date(),
      updatedBy: req.user.id
    };
    
    // Handle scoring format
    if (scoringFormat !== undefined) {
      if (!['slider', 'input', 'checkbox'].includes(scoringFormat)) {
        return res.status(400).json({ error: 'Invalid scoring format. Must be "slider", "input", or "checkbox"' });
      }
      settingsData.scoringFormat = scoringFormat;
    }
    
    // Handle custom texts
    if (customTexts !== undefined) {
      settingsData.customTexts = customTexts;
    }
    
    // Handle edit mode
    if (editMode !== undefined) {
      settingsData.editMode = editMode;
    }
    
    // Handle comprehensive settings categories
    if (auditionSettings !== undefined) {
      settingsData.auditionSettings = auditionSettings;
    }
    
    if (scoringSettings !== undefined) {
      settingsData.scoringSettings = scoringSettings;
    }
    
    if (dancerSettings !== undefined) {
      settingsData.dancerSettings = dancerSettings;
    }
    
    if (attendanceSettings !== undefined) {
      settingsData.attendanceSettings = attendanceSettings;
    }
    
    if (videoSettings !== undefined) {
      settingsData.videoSettings = videoSettings;
    }
    
    if (notificationSettings !== undefined) {
      settingsData.notificationSettings = notificationSettings;
    }
    
    if (securitySettings !== undefined) {
      settingsData.securitySettings = securitySettings;
    }
    
    if (appearanceSettings !== undefined) {
      settingsData.appearanceSettings = appearanceSettings;
    }
    
    if (systemSettings !== undefined) {
      settingsData.systemSettings = systemSettings;
    }
    
    // Use club-specific document ID for new organizations, 'audition_settings' for MSU Dance Club (backward compatibility)
    // For new organizations, use settings_{clubId}; for MSU Dance Club, use 'audition_settings'
    const settingsDocId = clubId === 'msu-dance-club' ? 'audition_settings' : `settings_${clubId}`;
    
    // Get existing settings to preserve clubId if it exists
    const existingSettingsDoc = await db.collection('settings').doc(settingsDocId).get();
    if (existingSettingsDoc.exists) {
      const existingData = existingSettingsDoc.data();
      // Ensure clubId is preserved
      if (existingData.clubId) {
        settingsData.clubId = existingData.clubId;
      } else {
        settingsData.clubId = clubId;
      }
    } else {
      // For new organizations, ensure clubId is set
      settingsData.clubId = clubId;
    }
    
    await db.collection('settings').doc(settingsDocId).set(settingsData, { merge: true });
    
    res.json({ message: 'Settings updated successfully', settings: settingsData });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Audition Management
app.get('/api/auditions', authenticateToken, async (req, res) => {
  try {
    const clubId = getClubId(req);
    
    // Filter auditions by clubId for multi-tenant isolation
    // Note: Sorting in memory to avoid Firestore composite index requirement
    const auditionsSnapshot = await db.collection('auditions')
      .where('clubId', '==', clubId)
      .get();
    const auditions = [];
    
    for (const doc of auditionsSnapshot.docs) {
      const auditionData = doc.data();
      
      // Count dancers for this audition (already filtered by clubId through auditionId)
      const dancersSnapshot = await db.collection('dancers')
        .where('clubId', '==', clubId) // Additional security: filter by clubId
        .where('auditionId', '==', doc.id)
        .get();
      
      auditions.push({
        id: doc.id,
        name: auditionData.name,
        date: auditionData.date,
        status: auditionData.status || 'draft',
        judges: auditionData.judges || [],
        dancers: dancersSnapshot.size,
        createdAt: auditionData.createdAt?.toDate?.() || auditionData.createdAt
      });
    }
    
    // Sort by createdAt descending (newest first), or by name if no createdAt
    auditions.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return b.createdAt.getTime() - a.createdAt.getTime();
      }
      if (a.createdAt) return -1;
      if (b.createdAt) return 1;
      // Fallback to name sorting
      return (a.name || '').localeCompare(b.name || '');
    });
    
    res.json(auditions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single audition by ID
app.get('/api/auditions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const clubId = getClubId(req);
    
    const auditionDoc = await db.collection('auditions').doc(id).get();
    
    if (!auditionDoc.exists) {
      return res.status(404).json({ error: 'Audition not found' });
    }
    
    const auditionData = auditionDoc.data();
    
    // Security check: verify audition belongs to user's club
    if (auditionData.clubId && auditionData.clubId !== clubId) {
      return res.status(403).json({ error: 'Access denied: Audition belongs to a different club' });
    }
    
    // Count dancers filtered by clubId for security
    const dancersSnapshot = await db.collection('dancers')
      .where('clubId', '==', clubId)
      .where('auditionId', '==', id)
      .get();
    
    res.json({
      id: auditionDoc.id,
      name: auditionData.name,
      date: auditionData.date,
      status: auditionData.status || 'draft',
      judges: auditionData.judges || [],
      dancers: dancersSnapshot.size,
      deliberationsProgress: auditionData.deliberationsProgress ? JSON.parse(auditionData.deliberationsProgress) : null,
      createdAt: auditionData.createdAt?.toDate?.() || auditionData.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get dancers for a specific audition (OPTIMIZED: batch fetch scores + caching)
app.get('/api/auditions/:id/dancers', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const clubId = getClubId(req);
    
    // Check cache first (key includes clubId for multi-tenant safety)
    const cacheKey = `dancers_${clubId}_${id}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log(`Cache hit for dancers ${id} (club ${clubId})`);
      return res.json(cachedData);
    }
    
    // Check if audition exists and belongs to user's club
    const auditionDoc = await db.collection('auditions').doc(id).get();
    if (!auditionDoc.exists) {
      return res.status(404).json({ error: 'Audition not found' });
    }
    
    const auditionData = auditionDoc.data();
    // Security check: verify audition belongs to user's club
    if (auditionData.clubId && auditionData.clubId !== clubId) {
      return res.status(403).json({ error: 'Access denied: Audition belongs to a different club' });
    }
    
    // Get dancers for this audition, filtered by clubId for security
    const dancersSnapshot = await db.collection('dancers')
      .where('clubId', '==', clubId)
      .where('auditionId', '==', id)
      .get();
    
    // OPTIMIZATION: Batch fetch all scores for all dancers at once
    const dancerIds = dancersSnapshot.docs.map(doc => doc.id);
    
    // Fetch all scores for this audition in one query (filtered by clubId)
    let allScoresSnapshot;
    if (dancerIds.length > 0) {
      // Firestore 'in' queries are limited to 10 items, so we need to batch
      const scoreQueries = [];
      for (let i = 0; i < dancerIds.length; i += 10) {
        const batchIds = dancerIds.slice(i, i + 10);
        scoreQueries.push(
          db.collection('scores')
            .where('clubId', '==', clubId)
            .where('dancerId', 'in', batchIds)
            .get()
        );
      }
      const scoreResults = await Promise.all(scoreQueries);
      // Combine all score documents
      allScoresSnapshot = { docs: scoreResults.flatMap(result => result.docs) };
    } else {
      allScoresSnapshot = { docs: [] };
    }
    
    // Group scores by dancerId
    const scoresByDancerId = {};
    for (const scoreDoc of allScoresSnapshot.docs) {
      const scoreData = scoreDoc.data();
      const dancerId = scoreData.dancerId;
      if (!scoresByDancerId[dancerId]) {
        scoresByDancerId[dancerId] = [];
      }
      scoresByDancerId[dancerId].push(scoreData);
    }
    
    const dancers = [];
    for (const doc of dancersSnapshot.docs) {
      const dancerData = doc.data();
      const dancerId = doc.id;
      
      // Get scores for this dancer from pre-fetched data
      const dancerScores = scoresByDancerId[dancerId] || [];
      
      // Build scores object by judge
      const scoresByJudge = {};
      let totalScoreSum = 0;
      let judgeCount = 0;
      
      for (const scoreData of dancerScores) {
        const judgeName = scoreData.judgeName;
        
        if (judgeName) {
          // Handle both nested scores object and flat structure
          const scoreValues = scoreData.scores || scoreData;
          const kick = scoreValues.kick || 0;
          const jump = scoreValues.jump || 0;
          const turn = scoreValues.turn || 0;
          const performance = scoreValues.performance || 0;
          const execution = scoreValues.execution || 0;
          const technique = scoreValues.technique || 0;
          const total = kick + jump + turn + performance + execution + technique;
          
          scoresByJudge[judgeName] = {
            kick: kick,
            jump: jump,
            turn: turn,
            performance: performance,
            execution: execution,
            technique: technique,
            total: total,
            comments: scoreData.comments || '',
            submittedAt: scoreData.submittedAt || scoreData.timestamp
          };
          
          totalScoreSum += total;
          judgeCount++;
        }
      }
      
      // Calculate average score
      const averageScore = judgeCount > 0 ? totalScoreSum / judgeCount : 0;
      
      dancers.push({
        id: dancerId,
        name: dancerData.name,
        auditionNumber: dancerData.auditionNumber,
        email: dancerData.email || '',
        phone: dancerData.phone || '',
        year: dancerData.year || '',
        major: dancerData.major || '',
        group: dancerData.group || 'Unassigned',
        previousMember: dancerData.previousMember || false,
        previousLevel: dancerData.previousLevel || '',
        averageScore: parseFloat(averageScore.toFixed(2)),
        scores: scoresByJudge,
        videoId: dancerData.videoId || null,
        videoUrl: dancerData.videoUrl || null,
        videoGroup: dancerData.videoGroup || null
      });
    }
    
    // Sort by audition number
    dancers.sort((a, b) => a.auditionNumber - b.auditionNumber);
    
    console.log(`Returning ${dancers.length} dancers for audition ${id} (optimized batch fetch)`);
    res.json(dancers);
  } catch (error) {
    console.error('Error fetching dancers for audition:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auditions', authenticateToken, async (req, res) => {
  try {
    const clubId = getClubId(req);
    const { name, date, judges } = req.body;
    
    if (!name || !date) {
      return res.status(400).json({ error: 'Name and date are required' });
    }
    
    const auditionData = {
      name,
      date,
      status: 'draft',
      judges: JSON.stringify(judges || []),
      clubId: clubId, // Multi-tenant: associate with user's club
      createdAt: new Date(),
      createdBy: req.user.id
    };
    
    const docRef = await db.collection('auditions').add(auditionData);
    
    res.json({ 
      id: docRef.id, 
      ...auditionData,
      judges: JSON.parse(auditionData.judges),
      dancers: 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/auditions/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const clubId = getClubId(req);
    const { status } = req.body;
    
    if (!['draft', 'active', 'completed', 'archived'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    // Verify audition exists and belongs to user's club
    const auditionDoc = await db.collection('auditions').doc(id).get();
    if (!auditionDoc.exists) {
      return res.status(404).json({ error: 'Audition not found' });
    }
    
    const auditionData = auditionDoc.data();
    if (auditionData.clubId && auditionData.clubId !== clubId) {
      return res.status(403).json({ error: 'Access denied: Audition belongs to a different club' });
    }
    
    // If activating an audition, deactivate all others in the same club
    if (status === 'active') {
      const activeAuditionsSnapshot = await db.collection('auditions')
        .where('clubId', '==', clubId)
        .where('status', '==', 'active')
        .get();
      for (const doc of activeAuditionsSnapshot.docs) {
        await doc.ref.update({ status: 'draft' });
      }
    }
    
    await db.collection('auditions').doc(id).update({
      status,
      updatedAt: new Date(),
      updatedBy: req.user.id
    });
    
    res.json({ message: 'Audition status updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lock scores and transfer dancers to club database
app.post('/api/auditions/:id/lock-scores', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const clubId = getClubId(req);
    
    // Verify audition belongs to user's club
    const auditionDoc = await db.collection('auditions').doc(id).get();
    if (!auditionDoc.exists) {
      return res.status(404).json({ error: 'Audition not found' });
    }
    
    const auditionData = auditionDoc.data();
    if (auditionData.clubId && auditionData.clubId !== clubId) {
      return res.status(403).json({ error: 'Access denied: Audition belongs to a different club' });
    }
    
    // Get all dancers for this audition (filtered by clubId)
    const dancersSnapshot = await db.collection('dancers')
      .where('clubId', '==', clubId)
      .where('auditionId', '==', id)
      .get();
    
    // Transfer dancers to club members collection
    const transferredCount = dancersSnapshot.size;
    
    for (const dancerDoc of dancersSnapshot.docs) {
      const dancerData = dancerDoc.data();
      
      // Create club member record with clubId
      await db.collection('club_members').add({
        ...dancerData,
        clubId: clubId, // Ensure clubId is set
        auditionId: id,
        auditionName: auditionData.name,
        auditionDate: auditionData.date,
        transferredAt: new Date(),
        transferredBy: req.user.id
      });
    }
    
    console.log(`Transferred ${transferredCount} dancers to club database for club ${clubId}`);
    res.json({ 
      message: `Successfully transferred ${transferredCount} dancers to club database`,
      count: transferredCount 
    });
  } catch (error) {
    console.error('❌ Error locking scores:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save deliberations progress route
app.post('/api/auditions/:id/save-deliberations', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const clubId = getClubId(req);
    const { levelAssignments } = req.body;

    // Verify audition belongs to user's club
    const auditionDoc = await db.collection('auditions').doc(id).get();
    if (!auditionDoc.exists) {
      return res.status(404).json({ error: 'Audition not found' });
    }
    
    const auditionData = auditionDoc.data();
    if (auditionData.clubId && auditionData.clubId !== clubId) {
      return res.status(403).json({ error: 'Access denied: Audition belongs to a different club' });
    }

    // Update audition status to deliberations if not already
    await db.collection('auditions').doc(id).update({
      status: 'deliberations',
      deliberationsProgress: JSON.stringify(levelAssignments),
      updatedAt: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving deliberations progress:', error);
    res.status(500).json({ error: error.message });
  }
});

// Submit deliberations and move to club database
app.post('/api/auditions/:id/submit-deliberations', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const clubId = getClubId(req);
    const { levelAssignments } = req.body;
    
    console.log(`Submitting deliberations for audition ${id} in club ${clubId}`);
    console.log('Level assignments received:', levelAssignments);
    
    // Verify audition belongs to user's club
    const auditionDoc = await db.collection('auditions').doc(id).get();
    if (!auditionDoc.exists) {
      return res.status(404).json({ error: 'Audition not found' });
    }
    
    const auditionData = auditionDoc.data();
    if (auditionData.clubId && auditionData.clubId !== clubId) {
      return res.status(403).json({ error: 'Access denied: Audition belongs to a different club' });
    }
    
    // Get processed dancers with scores directly (same logic as /api/auditions/:id/dancers)
    // Filter by clubId for security
    const dancersSnapshot = await db.collection('dancers')
      .where('clubId', '==', clubId)
      .where('auditionId', '==', id)
      .get();
    
    const dancers = [];
    for (const doc of dancersSnapshot.docs) {
      const dancerData = doc.data();
      const dancerId = doc.id;
      
      // Skip dancers with missing required fields
      if (!dancerData.name || !dancerData.auditionNumber || 
          dancerData.name.trim() === '' || dancerData.auditionNumber.toString().trim() === '') {
        continue;
      }
      
      // Fetch scores from the scores collection (filtered by clubId)
      const scoresSnapshot = await db.collection('scores')
        .where('clubId', '==', clubId)
        .where('dancerId', '==', dancerId)
        .get();
      
      // Build scores object by judge and calculate totals
      const scoresByJudge = {};
      let totalScoreSum = 0;
      let judgeCount = 0;
      
      for (const scoreDoc of scoresSnapshot.docs) {
        const scoreData = scoreDoc.data();
        const judgeName = scoreData.judgeName || scoreData.judgeId || 'Unknown Judge';
        
        // Handle both nested scores object and flat structure
        const scoreValues = scoreData.scores || scoreData;
        const kick = scoreValues.kick || 0;
        const jump = scoreValues.jump || 0;
        const turn = scoreValues.turn || 0;
        const performance = scoreValues.performance || 0;
        const execution = scoreValues.execution || 0;
        const technique = scoreValues.technique || 0;
        const total = kick + jump + turn + performance + execution + technique;
        
        scoresByJudge[judgeName] = {
          kick: kick,
          jump: jump,
          turn: turn,
          performance: performance,
          execution: execution,
          technique: technique,
          total: total,
          comments: scoreData.comments || '',
          submittedAt: scoreData.submittedAt || scoreData.timestamp
        };
        
        totalScoreSum += total;
        judgeCount++;
      }
      
      // Calculate average score
      const averageScore = judgeCount > 0 ? totalScoreSum / judgeCount : 0;
      
      dancers.push({
        id: dancerId,
        name: dancerData.name,
        auditionNumber: dancerData.auditionNumber,
        email: dancerData.email || '',
        phone: dancerData.phone || '',
        shirtSize: dancerData.shirtSize || '',
        group: dancerData.group || 'Unassigned',
        previousMember: dancerData.previousMember || false,
        previousLevel: dancerData.previousLevel || '',
        averageScore: parseFloat(averageScore.toFixed(2)),
        scores: scoresByJudge
      });
    }
    
    // Sort by audition number
    dancers.sort((a, b) => a.auditionNumber - b.auditionNumber);
    
    // Add rank based on average score
    const sortedByScore = [...dancers].sort((a, b) => b.averageScore - a.averageScore);
    sortedByScore.forEach((dancer, index) => {
      const originalDancer = dancers.find(d => d.id === dancer.id);
      if (originalDancer) {
        originalDancer.rank = index + 1;
      }
    });
    
    // Clear existing club members for this audition and club to avoid duplicates
    const existingMembers = await db.collection('club_members')
      .where('clubId', '==', clubId)
      .where('auditionId', '==', id)
      .get();
    for (const memberDoc of existingMembers.docs) {
      await db.collection('club_members').doc(memberDoc.id).delete();
    }
    
    // Transfer dancers to club members collection with level assignments
    const transferredCount = dancers.length;
    
    for (const dancer of dancers) {
      const assignedLevel = levelAssignments[dancer.id] || 'Level 4';
      
      // Use the already calculated average score from the dancers endpoint
      const averageScore = dancer.averageScore || 0;
      
      console.log(`Processing dancer ${dancer.name}:`, {
        averageScore: averageScore,
        assignedLevel: assignedLevel
      });
      
      // Convert all values to SQLite-compatible types
      const clubMemberData = {
        id: String(dancer.id),
        name: String(dancer.name || ''),
        email: String(dancer.email || ''),
        phone: String(dancer.phone || ''),
        shirtSize: String(dancer.shirtSize || ''),
        auditionNumber: String(dancer.auditionNumber || ''),
        dancerGroup: String(dancer.group || ''),
        averageScore: Number(averageScore.toFixed(2)),
        rank: Number(dancer.rank) || 0,
        previousMember: String(dancer.previousMember || ''),
        previousLevel: String(dancer.previousLevel || ''),
        level: String(assignedLevel),
        assignedLevel: String(assignedLevel),
        clubId: clubId, // Multi-tenant: ensure clubId is set
        auditionId: String(id),
        auditionName: String(auditionData.name || ''),
        auditionDate: String(auditionData.date || ''),
        transferredAt: new Date().toISOString(),
        transferredBy: String(req.user?.id || 'admin'),
        deliberationPhase: 1, // SQLite boolean as integer
        overallScore: Number(averageScore.toFixed(2)), // Use calculated average score
        scores: dancer.scores || {} // Include detailed scores for club members page
      };
      
      // Create club member record with level assignment using database adapter
      await db.collection('club_members').add(clubMemberData);
    }
    
    // Update audition status to completed
    await db.collection('auditions').doc(id).update({
      status: 'completed',
      deliberationsCompletedAt: new Date().toISOString(),
      deliberationsCompletedBy: req.user.id || 'admin'
    });
    
    console.log(`✅ Transferred ${transferredCount} dancers to club database with level assignments`);
    res.json({ 
      message: `Successfully transferred ${transferredCount} dancers to club database with level assignments`,
      count: transferredCount 
    });
  } catch (error) {
    console.error('❌ Error submitting deliberations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete audition
app.delete('/api/auditions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const clubId = getClubId(req);
    
    console.log(`DELETE /api/auditions/${id} called by ${req.user.id}`);
    
    // Check if audition exists and belongs to user's club
    const auditionDoc = await db.collection('auditions').doc(id).get();
    if (!auditionDoc.exists) {
      return res.status(404).json({ error: 'Audition not found' });
    }
    
    const auditionData = auditionDoc.data();
    // Security check: verify audition belongs to user's club
    if (auditionData.clubId && auditionData.clubId !== clubId) {
      return res.status(403).json({ error: 'Access denied: Audition belongs to a different club' });
    }
    
    // Optional: Delete associated data (dancers linked to this audition) filtered by clubId
    // For now, we'll just delete the audition document
    // You may want to add logic to handle dancers associated with this audition
    
    await db.collection('auditions').doc(id).delete();
    
    console.log(`✅ Audition ${id} deleted successfully by ${req.user.id}`);
    res.json({ message: 'Audition deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting audition:', error);
    res.status(500).json({ error: error.message });
  }
});

// Judge Management
app.get('/api/judges', authenticateToken, async (req, res) => {
  try {
    const clubId = getClubId(req);
    
    // Filter judges by clubId for multi-tenant isolation
    // Note: Sorting in memory to avoid Firestore composite index requirement
    const judgesSnapshot = await db.collection('judges')
      .where('clubId', '==', clubId)
      .get();
    
    const judges = judgesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt
    })).sort((a, b) => {
      // Sort by createdAt descending (newest first), or by name if no createdAt
      if (a.createdAt && b.createdAt) {
        return b.createdAt - a.createdAt;
      }
      if (a.createdAt) return -1;
      if (b.createdAt) return 1;
      // Fallback to name sorting
      return (a.name || '').localeCompare(b.name || '');
    });
    
    res.json(judges);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/judges', authenticateToken, async (req, res) => {
  try {
    const clubId = getClubId(req);
    const { name, email, role, position } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    
    if (!['judge', 'admin', 'secretary'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    // Check if judge already exists in this club (filter by clubId)
    const existingJudgeSnapshot = await db.collection('judges')
      .where('clubId', '==', clubId)
      .where('email', '==', email)
      .get();
    if (!existingJudgeSnapshot.empty) {
      return res.status(400).json({ error: 'Judge with this email already exists in your club' });
    }
    
    const judgeData = {
      name,
      email,
      role: role || 'judge',
      position: position || '',
      active: true,
      clubId: clubId, // Multi-tenant: associate with user's club
      createdAt: new Date(),
      createdBy: req.user.id
    };
    
    const docRef = await db.collection('judges').add(judgeData);
    
    console.log(`Judge created: ${name} (${email}) in club ${clubId} by ${req.user.id}`);
    res.json({ 
      id: docRef.id, 
      ...judgeData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/judges/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const clubId = getClubId(req);
    const { active } = req.body;
    
    // Verify judge exists and belongs to user's club
    const judgeDoc = await db.collection('judges').doc(id).get();
    if (!judgeDoc.exists) {
      return res.status(404).json({ error: 'Judge not found' });
    }
    
    const judgeData = judgeDoc.data();
    if (judgeData.clubId && judgeData.clubId !== clubId) {
      return res.status(403).json({ error: 'Access denied: Judge belongs to a different club' });
    }
    
    await db.collection('judges').doc(id).update({
      active: Boolean(active),
      updatedAt: new Date(),
      updatedBy: req.user.id
    });
    
    console.log(`Judge ${id} status changed to ${active ? 'active' : 'inactive'} by ${req.user.id} in club ${clubId}`);
    res.json({ message: 'Judge status updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update judge details (email, name, position, role)
app.put('/api/judges/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const clubId = getClubId(req);
    const { name, email, position, role } = req.body;
    
    // Verify judge exists and belongs to user's club
    const judgeDoc = await db.collection('judges').doc(id).get();
    if (!judgeDoc.exists) {
      return res.status(404).json({ error: 'Judge not found' });
    }
    
    const judgeData = judgeDoc.data();
    if (judgeData.clubId && judgeData.clubId !== clubId) {
      return res.status(403).json({ error: 'Access denied: Judge belongs to a different club' });
    }
    
    // If email is being changed, check if new email already exists
    if (email && email !== judgeData.email) {
      const existingJudgeSnapshot = await db.collection('judges')
        .where('clubId', '==', clubId)
        .where('email', '==', email.toLowerCase().trim())
        .get();
      
      if (!existingJudgeSnapshot.empty) {
        const existingJudgeId = existingJudgeSnapshot.docs[0].id;
        if (existingJudgeId !== id) {
          return res.status(400).json({ error: 'Judge with this email already exists in your club' });
        }
      }
    }
    
    // Validate role if provided
    if (role && !['judge', 'admin', 'secretary'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    // Build update object
    const updateData = {
      updatedAt: new Date(),
      updatedBy: req.user.id
    };
    
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email.toLowerCase().trim();
    if (position !== undefined) updateData.position = position;
    if (role !== undefined) updateData.role = role;
    
    await db.collection('judges').doc(id).update(updateData);
    
    console.log(`Judge ${id} updated by ${req.user.id} in club ${clubId}:`, updateData);
    res.json({ 
      message: 'Judge updated successfully',
      id,
      ...updateData
    });
  } catch (error) {
    console.error('Error updating judge:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current user's permissions
app.get('/api/user/permissions', authenticateToken, async (req, res) => {
  try {
    const clubId = getClubId(req);
    
    // Verify judge belongs to user's club (filter by clubId for security)
    const judgeDoc = await db.collection('judges').doc(req.user.id).get();
    
    if (!judgeDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const judge = judgeDoc.data();
    
    // Security check: verify judge belongs to user's club
    if (judge.clubId && judge.clubId !== clubId) {
      return res.status(403).json({ error: 'Access denied: User belongs to a different club' });
    }
    
    const canHideDancer = judge.role === 'admin' || 
                         judge.role === 'secretary' || 
                         judge.position === 'President' || 
                         judge.position === 'Vice President';
    
    res.json({
      canHideDancer,
      role: judge.role,
      position: judge.position || ''
    });
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Video recording endpoints
// Upload audition video
app.post('/api/auditions/:id/videos', authenticateToken, videoUpload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    const { id: auditionId } = req.params;
    const clubId = getClubId(req);
    const { group, dancerIds, description } = req.body;

    // Verify audition exists and belongs to user's club
    const auditionDoc = await db.collection('auditions').doc(auditionId).get();
    if (!auditionDoc.exists) {
      return res.status(404).json({ error: 'Audition not found' });
    }
    
    const auditionData = auditionDoc.data();
    if (auditionData.clubId && auditionData.clubId !== clubId) {
      return res.status(403).json({ error: 'Access denied: Audition belongs to a different club' });
    }

    // Create video record in database with clubId
    const videoData = {
      auditionId,
      clubId: clubId, // Multi-tenant: associate with user's club
      group: group || 'Unknown Group',
      dancerIds: dancerIds ? (typeof dancerIds === 'string' ? JSON.parse(dancerIds) : dancerIds) : [],
      videoUrl: `/uploads/videos/${req.file.filename}`,
      videoPath: req.file.path,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      description: description || `Video for ${group || 'Unknown Group'}`,
      recordedBy: req.user.id,
      recordedByName: req.user.name || 'Unknown',
      recordedAt: new Date(),
      createdAt: new Date()
    };

    const videoRef = await db.collection('audition_videos').add(videoData);
    const videoId = videoRef.id;
    const videoUrl = `/api/videos/${videoId}/stream`;

    // Also store video reference in dancers collection (update each dancer with video info)
    const dancerIdsArray = dancerIds ? (typeof dancerIds === 'string' ? JSON.parse(dancerIds) : dancerIds) : [];
    
    if (dancerIdsArray.length > 0) {
      // Update each dancer document with video reference
      const updatePromises = dancerIdsArray.map(async (dancerId) => {
        try {
          const dancerDoc = await db.collection('dancers').doc(dancerId).get();
          if (dancerDoc.exists) {
            const dancerData = dancerDoc.data();
            // Verify dancer belongs to same club
            if (dancerData.clubId === clubId) {
              // Update dancer with video reference
              await db.collection('dancers').doc(dancerId).update({
                videoId: videoId,
                videoUrl: videoUrl,
                videoGroup: group,
                videoRecordedAt: new Date(),
                videoRecordedBy: req.user.id,
                videoRecordedByName: req.user.name || 'Unknown'
              });
              console.log(`✅ Updated dancer ${dancerId} with video reference`);
            }
          }
        } catch (error) {
          console.error(`Error updating dancer ${dancerId} with video:`, error);
          // Don't fail the upload if dancer update fails
        }
      });
      
      await Promise.all(updatePromises);
    }

    console.log(`✅ Video uploaded for audition ${auditionId}, group ${group} by ${req.user.id}`);
    res.json({
      id: videoId,
      ...videoData,
      videoUrl: videoUrl // Use streaming endpoint
    });
  } catch (error) {
    console.error('Error uploading video:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get videos for an audition
app.get('/api/auditions/:id/videos', authenticateToken, async (req, res) => {
  try {
    const { id: auditionId } = req.params;
    const clubId = getClubId(req);

    // Verify audition belongs to user's club
    const auditionDoc = await db.collection('auditions').doc(auditionId).get();
    if (auditionDoc.exists) {
      const auditionData = auditionDoc.data();
      if (auditionData.clubId && auditionData.clubId !== clubId) {
        return res.status(403).json({ error: 'Access denied: Audition belongs to a different club' });
      }
    }

    // Check if user is admin (only admins can view videos) - filter by clubId
    const judgeDoc = await db.collection('judges').doc(req.user.id).get();
    if (!judgeDoc.exists) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const judge = judgeDoc.data();
    if (judge.clubId && judge.clubId !== clubId) {
      return res.status(403).json({ error: 'Access denied: Judge belongs to a different club' });
    }
    
    const isAdmin = judge.role === 'admin' || judge.role === 'secretary' || 
                   judge.position === 'President' || judge.position === 'Vice President';
    
    if (!isAdmin) {
      return res.status(403).json({ error: 'Only admins can view audition videos' });
    }

    // Get all videos for this audition (filtered by clubId)
    // Note: If orderBy fails due to missing index, we'll sort in memory
    let videosSnapshot;
    try {
      videosSnapshot = await db.collection('audition_videos')
        .where('clubId', '==', clubId) // Filter by clubId for security
        .where('auditionId', '==', auditionId)
        .orderBy('recordedAt', 'desc')
        .get();
    } catch (error) {
      // If orderBy fails (missing index), get without ordering and sort in memory
      console.warn('OrderBy failed, sorting in memory:', error.message);
      videosSnapshot = await db.collection('audition_videos')
        .where('clubId', '==', clubId) // Filter by clubId for security
        .where('auditionId', '==', auditionId)
        .get();
    }

    const videos = videosSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        recordedAt: data.recordedAt?.toDate?.() || data.recordedAt,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        videoUrl: `/api/videos/${doc.id}/stream`
      };
    });

    // Sort by recordedAt if orderBy didn't work
    videos.sort((a, b) => {
      const aDate = new Date(a.recordedAt).getTime();
      const bDate = new Date(b.recordedAt).getTime();
      return bDate - aDate; // Descending order
    });

    res.json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stream video file (serve video files)
// Allow token in query param for video tag compatibility (video tags can't send Authorization headers)
app.get('/api/videos/:id/stream', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get token from header or query parameter (for video tag compatibility)
    const authHeader = req.headers['authorization'];
    const token = authHeader ? authHeader.split(' ')[1] : req.query.token;
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify token
    let user;
    try {
      user = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      // Ensure clubId exists in token (fallback for backwards compatibility)
      if (!user.clubId) {
        user.clubId = 'msu-dance-club';
      }
    } catch (error) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    const clubId = user.clubId || 'msu-dance-club';

    const videoDoc = await db.collection('audition_videos').doc(id).get();

    if (!videoDoc.exists) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const videoData = videoDoc.data();
    
    // Security check: verify video belongs to user's club
    if (videoData.clubId && videoData.clubId !== clubId) {
      return res.status(403).json({ error: 'Access denied: Video belongs to a different club' });
    }
    
    const path = require('path');
    const fs = require('fs');
    // videoPath is already relative to uploads directory, so join with __dirname/uploads/videos
    const videoPath = path.join(__dirname, 'uploads', 'videos', videoData.filename || path.basename(videoData.videoPath));

    // Check if file exists
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ error: 'Video file not found on server' });
    }

    // Check if user is admin (only admins can view videos) - verify clubId match
    const judgeDoc = await db.collection('judges').doc(user.id).get();
    if (!judgeDoc.exists) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const judge = judgeDoc.data();
    
    // Verify judge belongs to same club as video
    if (judge.clubId && videoData.clubId && judge.clubId !== videoData.clubId) {
      return res.status(403).json({ error: 'Access denied: Judge belongs to a different club' });
    }
    
    // Verify judge belongs to same club as video
    if (judge.clubId && videoData.clubId && judge.clubId !== videoData.clubId) {
      return res.status(403).json({ error: 'Access denied: Video belongs to a different club' });
    }
    
    const isAdmin = judge.role === 'admin' || judge.role === 'secretary' || 
                   judge.position === 'President' || judge.position === 'Vice President';
    
    if (!isAdmin) {
      return res.status(403).json({ error: 'Only admins can view audition videos' });
    }

    // Set headers for video streaming
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': videoData.mimeType || 'video/webm'
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': videoData.mimeType || 'video/webm'
      };
      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }
  } catch (error) {
    console.error('Error streaming video:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete video (admin only)
app.delete('/api/videos/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const clubId = getClubId(req);

    // Get video record first to verify clubId
    const videoDoc = await db.collection('audition_videos').doc(id).get();
    if (!videoDoc.exists) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const videoData = videoDoc.data();
    
    // Security check: verify video belongs to user's club
    if (videoData.clubId && videoData.clubId !== clubId) {
      return res.status(403).json({ error: 'Access denied: Video belongs to a different club' });
    }

    // Check if user is admin (only admins can delete videos) - verify clubId match
    const judgeDoc = await db.collection('judges').doc(req.user.id).get();
    if (!judgeDoc.exists) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const judge = judgeDoc.data();
    if (judge.clubId && judge.clubId !== clubId) {
      return res.status(403).json({ error: 'Access denied: Judge belongs to a different club' });
    }
    
    const isAdmin = judge.role === 'admin' || judge.role === 'secretary' || 
                   judge.position === 'President' || judge.position === 'Vice President';
    
    if (!isAdmin) {
      return res.status(403).json({ error: 'Only admins can delete audition videos' });
    }
    const path = require('path');
    const fs = require('fs');

    // Delete video file from server
    const videoPath = path.join(__dirname, 'uploads', 'videos', videoData.filename || path.basename(videoData.videoPath));
    if (fs.existsSync(videoPath)) {
      try {
        fs.unlinkSync(videoPath);
        console.log(`✅ Deleted video file: ${videoPath}`);
      } catch (fileError) {
        console.error('Error deleting video file:', fileError);
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete video record from database
    await db.collection('audition_videos').doc(id).delete();

    console.log(`✅ Video ${id} deleted by ${req.user.id}`);
    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete judge
app.delete('/api/judges/:id', authenticateToken, async (req, res) => {
  try {
    console.log('DELETE /api/judges/:id called with id:', req.params.id);
    console.log('User:', req.user);
    
    const { id } = req.params;
    const clubId = getClubId(req);
    
    // Check if judge exists and belongs to user's club
    const judgeDoc = await db.collection('judges').doc(id).get();
    console.log('Judge exists:', judgeDoc.exists);
    
    if (!judgeDoc.exists) {
      return res.status(404).json({ error: 'Judge not found' });
    }
    
    const judgeData = judgeDoc.data();
    // Security check: verify judge belongs to user's club
    if (judgeData.clubId && judgeData.clubId !== clubId) {
      return res.status(403).json({ error: 'Access denied: Judge belongs to a different club' });
    }
    
    // Delete the judge
    await db.collection('judges').doc(id).delete();
    
    console.log(`✅ Judge ${id} deleted successfully by ${req.user.id} from club ${clubId}`);
    res.json({ message: 'Judge deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting judge:', error);
    res.status(500).json({ error: error.message });
  }
});

// Public endpoint to get appearance settings (NO authentication required)
// Returns appearance settings for the default club (msu-dance-club)
app.get('/api/appearance', async (req, res) => {
  try {
    const clubId = 'msu-dance-club'; // Default club for public pages
    const settingsDoc = await db.collection('settings').doc('audition_settings').get();
    
    if (settingsDoc.exists) {
      const settings = settingsDoc.data();
      // Verify clubId matches (only return if it's the default club)
      if (settings.clubId === clubId || !settings.clubId) {
        return res.json({
          clubName: settings.appearanceSettings?.clubName || 'MSU Dance Club',
          siteTitle: settings.appearanceSettings?.siteTitle || 'DanceScore Pro',
          primaryColor: settings.appearanceSettings?.primaryColor || '#B380FF',
          secondaryColor: settings.appearanceSettings?.secondaryColor || '#FFB3D1',
          logoUrl: settings.appearanceSettings?.logoUrl || '',
          showLogoInHeader: settings.appearanceSettings?.showLogoInHeader !== false
        });
      }
    }
    
    // Return default if no settings found
    res.json({
      clubName: 'MSU Dance Club',
      siteTitle: 'DanceScore Pro',
      primaryColor: '#B380FF',
      secondaryColor: '#FFB3D1',
      logoUrl: '',
      showLogoInHeader: true
    });
  } catch (error) {
    console.error('Error fetching appearance settings:', error);
    // Return defaults on error
    res.json({
      clubName: 'MSU Dance Club',
      siteTitle: 'DanceScore Pro',
      primaryColor: '#B380FF',
      secondaryColor: '#FFB3D1',
      logoUrl: '',
      showLogoInHeader: true
    });
  }
});

// Public endpoint to get audition info (NO authentication required)
app.get('/api/auditions/:id/public', async (req, res) => {
  try {
    const { id } = req.params;
    const auditionDoc = await db.collection('auditions').doc(id).get();
    
    if (!auditionDoc.exists) {
      return res.status(404).json({ error: 'Audition not found' });
    }
    
    const auditionData = auditionDoc.data();
    
    res.json({
      id: auditionDoc.id,
      name: auditionData.name,
      date: auditionData.date,
      status: auditionData.status
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Public dancer registration (NO authentication required)
app.post('/api/register', async (req, res) => {
  try {
    const { name, auditionNumber, email, phone, shirtSize, auditionId, previousMember, previousLevel } = req.body;
    
    console.log('Public registration request:', { name, auditionNumber, email, phone, shirtSize, auditionId, previousMember, previousLevel });
    
    // Validate all required fields
    if (!name || !auditionNumber || !email || !phone || !shirtSize || !previousMember) {
      return res.status(400).json({ 
        error: 'All fields are required: name, audition number, email, phone, shirt size, and previous member status' 
      });
    }

    // If previous member is "yes", validate level selection
    if (previousMember === 'yes' && !previousLevel) {
      return res.status(400).json({ 
        error: 'Please select your previous level' 
      });
    }
    
    // Get clubId from audition if auditionId is provided
    let clubId = 'msu-dance-club'; // Default clubId for backwards compatibility
    if (auditionId) {
      const auditionDoc = await db.collection('auditions').doc(auditionId).get();
      if (auditionDoc.exists) {
        const auditionData = auditionDoc.data();
        if (auditionData.clubId) {
          clubId = auditionData.clubId;
        }
      }
    }
    
    // Check for duplicate audition number in this specific audition (if auditionId provided)
    // Filter by clubId to ensure proper multi-tenant isolation
    let duplicateQuery = db.collection('dancers')
      .where('clubId', '==', clubId)
      .where('auditionNumber', '==', auditionNumber.toString());
    
    if (auditionId) {
      duplicateQuery = duplicateQuery.where('auditionId', '==', auditionId);
    }
    
    const existingDancer = await duplicateQuery.get();
    
    if (!existingDancer.empty) {
      return res.status(400).json({ 
        error: `Audition number ${auditionNumber} is already registered. Please see staff if you need assistance.` 
      });
    }
    
    // Auto-assign group based on audition number
    const auditionNum = parseInt(auditionNumber);
    let autoGroup = 'Unassigned';
    if (!isNaN(auditionNum) && auditionNum > 0) {
      const groupNumber = Math.ceil(auditionNum / 5);
      autoGroup = `Group ${groupNumber}`;
    }
    
    const dancerData = {
      name: name.trim(),
      auditionNumber: auditionNumber.toString(),
      email: email.trim(),
      phone: phone.trim(),
      shirtSize: shirtSize,
      previousMember: previousMember,
      previousLevel: previousMember === 'yes' ? previousLevel : null,
      group: autoGroup,
      clubId: clubId, // Multi-tenant: associate with audition's club
      auditionId: auditionId || null,
      createdAt: new Date(),
      registeredVia: 'self-registration',
      scores: []
    };
    
    const docRef = await db.collection('dancers').add(dancerData);
    console.log(`Dancer self-registered with ID: ${docRef.id}, assigned to ${autoGroup}, audition: ${auditionId || 'none'}`);
    
    res.json({ 
      message: 'Registration successful! You have been added to the audition list.',
      dancer: { id: docRef.id, ...dancerData }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please see staff for assistance.' });
  }
});

// Debug endpoint to check judge data
app.get('/api/debug/judge/:email', authenticateToken, async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const judgesSnapshot = await db.collection('judges')
      .where('email', '==', email)
      .limit(1)
      .get();
    
    if (judgesSnapshot.empty) {
      return res.json({ found: false, message: 'No judge found with that email' });
    }
    
    const judgeDoc = judgesSnapshot.docs[0];
    const judge = judgeDoc.data();
    
    res.json({
      found: true,
      judge: {
        id: judgeDoc.id,
        name: judge.name,
        email: judge.email,
        position: judge.position,
        role: judge.role,
        active: judge.active
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Public endpoint to check if email verification is required (used by login pages)
app.get('/api/auth/verification-required/:clubId?', async (req, res) => {
  try {
    const clubId = req.params.clubId || req.query.clubId || 'msu-dance-club';
    const email = req.query.email; // Optional: email to check per-user login count
    
    // Get settings for the club
    let settingsDoc = await db.collection('settings').doc(`settings_${clubId}`).get();
    if (!settingsDoc.exists && clubId === 'msu-dance-club') {
      settingsDoc = await db.collection('settings').doc('audition_settings').get();
    }
    
    // Check if email service is actually configured and working
    const emailConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
    
    // Check security settings for email verification requirement
    const securitySettings = settingsDoc.exists ? (settingsDoc.data().securitySettings || {}) : {};
    const requireEmailVerificationForLogin = securitySettings.requireEmailVerificationForLogin !== undefined 
      ? securitySettings.requireEmailVerificationForLogin 
      : true; // Default to true if not set
    
    // If verification is disabled in settings, don't require it
    if (!requireEmailVerificationForLogin) {
      return res.json({
        requireVerification: false,
        emailConfigured: emailConfigured,
        codeExpiryMinutes: securitySettings.emailVerificationCodeExpiryMinutes || 10
      });
    }
    
    // Default: verification required if email is configured AND setting is enabled
    let requireVerification = emailConfigured;
    
    // If email is provided, check user's login count
    // Require verification: first login (loginCount is undefined or 0) OR every 10th login (loginCount % 10 === 0)
    // BUT: If user exists but loginCount is undefined, treat as existing user (don't require verification)
    // This handles migration: existing users without loginCount don't need verification
    if (email && emailConfigured) {
      try {
        // Try to find user in judges collection first
        const judgesSnapshot = await db.collection('judges')
          .where('email', '==', email.toLowerCase().trim())
          .where('clubId', '==', clubId)
          .limit(1)
          .get();
        
        if (!judgesSnapshot.empty) {
          const judge = judgesSnapshot.docs[0].data();
          const loginCount = judge.loginCount;
          
          // Only require verification if:
          // 1. loginCount is explicitly 0 (first login after migration)
          // 2. loginCount is divisible by 10 (every 10th login: 10, 20, 30, etc.)
          // 3. loginCount is undefined BUT user has lastLoginAt (migration case - treat as existing user)
          if (loginCount === undefined) {
            // User exists but no loginCount yet - treat as existing user (don't require verification)
            // They'll get loginCount set on next login
            requireVerification = false;
          } else if (loginCount === 0) {
            // Explicitly first login (loginCount is 0)
            requireVerification = true;
          } else {
            // Check if divisible by 10 (every 10th login)
            requireVerification = (loginCount % 10 === 0);
          }
        } else {
          // Try club_members collection for dancers
          const membersSnapshot = await db.collection('club_members')
            .where('email', '==', email.toLowerCase().trim())
            .where('clubId', '==', clubId)
            .limit(1)
            .get();
          
          if (!membersSnapshot.empty) {
            const member = membersSnapshot.docs[0].data();
            const loginCount = member.loginCount;
            
            // Same logic as judges
            if (loginCount === undefined) {
              // User exists but no loginCount yet - treat as existing user (don't require verification)
              requireVerification = false;
            } else if (loginCount === 0) {
              // Explicitly first login
              requireVerification = true;
            } else {
              // Check if divisible by 10 (every 10th login)
              requireVerification = (loginCount % 10 === 0);
            }
          } else {
            // User not found, require verification (first login - new user)
            requireVerification = true;
          }
        }
      } catch (userCheckError) {
        console.error('Error checking user login count:', userCheckError);
        // On error, default to not requiring verification (safer for existing users)
        requireVerification = false;
      }
    }
    
    res.json({
      requireVerification: requireVerification && emailConfigured, // Only require if email is configured
      emailConfigured: emailConfigured,
      codeExpiryMinutes: settingsDoc.exists 
        ? (settingsDoc.data().securitySettings?.emailVerificationCodeExpiryMinutes || 10)
        : 10
    });
  } catch (error) {
    console.error('Error checking verification requirements:', error);
    res.json({ requireVerification: false, emailConfigured: false }); // Default to false on error
  }
});

// Test email configuration endpoint (admin only, but public for testing)
app.post('/api/auth/test-email-config', async (req, res) => {
  try {
    // Re-initialize email service to pick up any new environment variables
    const initialized = emailService.initializeEmailService();
    
    if (!initialized) {
      return res.json({
        success: false,
        emailConfigured: false,
        message: 'Email service is not configured. Please set SMTP environment variables (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD).'
      });
    }
    
    // Test the actual SMTP connection
    const testResult = await emailService.testEmailConnection();
    
    if (testResult.success) {
      res.json({
        success: true,
        emailConfigured: true,
        message: 'Email service is configured correctly and connection test passed!'
      });
    } else {
      res.json({
        success: false,
        emailConfigured: false,
        message: `Email service configuration found but connection test failed: ${testResult.error || 'Unknown error'}`
      });
    }
  } catch (error) {
    console.error('Error testing email configuration:', error);
    res.json({
      success: false,
      emailConfigured: false,
      message: `Failed to test email configuration: ${error.message}`
    });
  }
});

// Email verification routes (public, before authentication)
// Send verification code endpoint
app.post('/api/auth/send-verification-code', async (req, res) => {
  try {
    const { email, userType } = req.body; // userType: 'judge', 'dancer', 'admin'

    if (!email || !userType) {
      return res.status(400).json({ error: 'Email and user type are required' });
    }

    const clubId = req.body.clubId || 'msu-dance-club'; // Default for backward compatibility

    // Find user based on type and email
    let user = null;
    let userName = 'User';
    let userId = null;

    if (userType === 'judge' || userType === 'admin' || userType === 'eboard') {
      // Find in judges collection
      const judgesSnapshot = await db.collection('judges')
        .where('email', '==', email.toLowerCase().trim())
        .where('active', '==', true)
        .limit(1)
        .get();
      
      if (judgesSnapshot.empty) {
        return res.status(404).json({ error: 'No active user found with this email' });
      }

      const judgeDoc = judgesSnapshot.docs[0];
      const judgeData = judgeDoc.data();
      
      // Check if email matches clubId (for multi-tenant)
      if (judgeData.clubId && judgeData.clubId !== clubId) {
        return res.status(403).json({ error: 'Email not associated with this organization' });
      }

      user = judgeData;
      userName = judgeData.name || 'User';
      userId = judgeDoc.id;
    } else if (userType === 'dancer') {
      // Find in club_members collection
      const membersSnapshot = await db.collection('club_members')
        .where('email', '==', email.toLowerCase().trim())
        .limit(1)
        .get();
      
      if (membersSnapshot.empty) {
        return res.status(404).json({ error: 'No dancer found with this email' });
      }

      const memberDoc = membersSnapshot.docs[0];
      const memberData = memberDoc.data();
      
      // Check if email matches clubId (for multi-tenant)
      if (memberData.clubId && memberData.clubId !== clubId) {
        return res.status(403).json({ error: 'Email not associated with this organization' });
      }

      user = memberData;
      userName = memberData.name || 'User';
      userId = memberDoc.id;
    } else {
      return res.status(400).json({ error: 'Invalid user type' });
    }

    // Generate verification code
    const code = emailService.generateVerificationCode();
    const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes from now

    // Store verification code in database
    await db.collection('verification_codes').add({
      email: email.toLowerCase().trim(),
      code: code,
      userType: userType,
      userId: userId,
      clubId: clubId,
      expiresAt: expiresAt,
      createdAt: Date.now(),
      used: false,
    });

    // Send verification email
    try {
      await emailService.sendVerificationCode(email, code, userName);
      console.log(`✅ Verification code sent to ${email} for ${userType} login`);
      res.json({ 
        success: true, 
        message: 'Verification code sent to your email',
        expiresIn: 600 // 10 minutes in seconds
      });
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      // Code is already stored in database, so return success but with email failure flag
      // This allows the login process to continue even if email fails
      // The verification code is stored and can be used if email service recovers
      res.json({ 
        success: true, 
        message: 'Verification code generated. Email delivery failed - please contact your administrator if this persists.',
        expiresIn: 600,
        emailFailed: true, // Flag to indicate email sending failed
        warning: 'Email service is experiencing issues. You may need to contact your administrator to retrieve your verification code.'
      });
    }
  } catch (error) {
    console.error('Error sending verification code:', error);
    res.status(500).json({ error: error.message || 'Failed to send verification code' });
  }
});

// Verify code endpoint
app.post('/api/auth/verify-code', async (req, res) => {
  try {
    const { email, code, userType, password } = req.body;

    if (!email || !code || !userType) {
      return res.status(400).json({ error: 'Email, code, and user type are required' });
    }

    const clubId = req.body.clubId || 'msu-dance-club';

    // Find the verification code (get all and filter in memory to avoid index requirement)
    const codesSnapshot = await db.collection('verification_codes')
      .where('email', '==', email.toLowerCase().trim())
      .where('code', '==', code)
      .where('userType', '==', userType)
      .where('clubId', '==', clubId)
      .where('used', '==', false)
      .get();

    if (codesSnapshot.empty) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    // Find the most recent unused code (sort by createdAt in memory)
    const validCodes = codesSnapshot.docs
      .map(doc => ({ doc, data: doc.data() }))
      .filter(({ data }) => !data.used && data.expiresAt > Date.now())
      .sort((a, b) => b.data.createdAt - a.data.createdAt);

    if (validCodes.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    const codeDoc = validCodes[0].doc;
    const codeData = validCodes[0].data;

    // Check if code is expired
    if (codeData.expiresAt < Date.now()) {
      // Mark as used even though expired
      await codeDoc.ref.update({ used: true });
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    // Mark code as used
    await codeDoc.ref.update({ used: true });

    // If password is provided, verify it and then proceed with login
    // This allows us to verify the code and password in one step
    if (password) {
      if (userType === 'judge' || userType === 'admin' || userType === 'eboard') {
        // Verify password (position) for judges/admins
        const judgesSnapshot = await db.collection('judges')
          .where('email', '==', email.toLowerCase().trim())
          .where('active', '==', true)
          .where('clubId', '==', clubId)
          .limit(1)
          .get();

        if (judgesSnapshot.empty) {
          return res.status(404).json({ error: 'User not found' });
        }

        const judgeDoc = judgesSnapshot.docs[0];
        const judge = judgeDoc.data();

        // Verify password - check password field first, fallback to position for existing users
        const passwordMatch = judge.password 
          ? judge.password === password 
          : judge.position === password;

        if (!passwordMatch) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if password change is required
        const requiresPasswordChange = !judge.passwordChanged && !judge.password;

        // Return success - the frontend will proceed with login
        // Login count will be incremented in the login endpoint
        res.json({ 
          success: true, 
          message: 'Verification code verified',
          verified: true,
          userId: judgeDoc.id,
          userType: userType,
          requiresPasswordChange: requiresPasswordChange
        });
      } else if (userType === 'dancer') {
        // Verify password (level) for dancers
        const membersSnapshot = await db.collection('club_members')
          .where('email', '==', email.toLowerCase().trim())
          .where('clubId', '==', clubId)
          .limit(1)
          .get();

        if (membersSnapshot.empty) {
          return res.status(404).json({ error: 'Dancer not found' });
        }

        const memberDoc = membersSnapshot.docs[0];
        const member = memberDoc.data();

        // Verify password - check password field first, fallback to level for existing users
        const passwordMatch = member.password 
          ? member.password === password 
          : member.level === password;

        if (!passwordMatch) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if password change is required
        const requiresPasswordChange = !member.passwordChanged && !member.password;

        // Return success - the frontend will proceed with login
        res.json({ 
          success: true, 
          message: 'Verification code verified',
          verified: true,
          userId: memberDoc.id,
          userType: 'dancer',
          requiresPasswordChange: requiresPasswordChange
        });
      }
    } else {
      // Just verify the code, don't proceed with login yet
      res.json({ 
        success: true, 
        message: 'Verification code verified',
        verified: true
      });
    }
  } catch (error) {
    console.error('Error verifying code:', error);
    res.status(500).json({ error: error.message || 'Failed to verify code' });
  }
});

// Authentication routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, selectedRole } = req.body;
    
    console.log('Login attempt:', { email, selectedRole });
    
    // Find judge by email in the judges collection
    const judgesSnapshot = await db.collection('judges')
      .where('email', '==', email)
      .where('active', '==', true)
      .limit(1)
      .get();
    
    if (judgesSnapshot.empty) {
      console.log('No active judge found with email:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const judgeDoc = judgesSnapshot.docs[0];
    const judge = judgeDoc.data();
    const judgeId = judgeDoc.id;
    
    // Get clubId from judge (should exist after migration)
    const clubId = judge.clubId || 'msu-dance-club'; // Fallback for safety
    
    // Verify password - check password field first, fallback to position for existing users
    const passwordMatch = judge.password 
      ? judge.password === password 
      : judge.position === password;
    
    if (!passwordMatch) {
      console.log('Password mismatch for:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check if this is first-time login (password not changed yet)
    const requiresPasswordChange = !judge.passwordChanged && !judge.password;
    const firstTimeLogin = judge.firstTimeLogin !== false; // Default to true if not set
    
    // Determine the role to use
    // If selectedRole is provided (user chose), use that
    // Otherwise, use their default role from the database
    let roleToUse = selectedRole || judge.role;
    
    // Security checks - secretary and admin can access admin features
    const canAccessAdmin = judge.role === 'admin' || judge.role === 'secretary';
    
    if (selectedRole === 'admin' && !canAccessAdmin) {
      console.log('User tried to access admin role without permission:', email);
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    // Allow secretary and admin to select any role
    if (canAccessAdmin && !selectedRole) {
      // Don't force role, let the frontend decide via canAccessAdmin flag
    }
    
    console.log('✅ Login successful:', { email, role: roleToUse, name: judge.name, clubId, canAccessAdmin, requiresPasswordChange });
    
    // Increment login count after successful login
    const currentLoginCount = judge.loginCount || 0;
    await judgeDoc.ref.update({
      loginCount: currentLoginCount + 1,
      lastLoginAt: new Date()
    });
    
    // Include clubId in JWT token for multi-tenant support
    const token = jwt.sign(
      { id: judgeId, email, role: roleToUse, name: judge.name, clubId },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({ 
      token, 
      user: { 
        id: judgeId, 
        email, 
        role: roleToUse, 
        name: judge.name,
        position: judge.position || '',
        clubId: clubId, // Include clubId in user object
        canAccessAdmin: canAccessAdmin, // Flag to show role selector for admin and secretary
        requiresPasswordChange: requiresPasswordChange // Flag to show password change UI
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Dancer login endpoint
app.post('/api/auth/dancer-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('Dancer login attempt:', { email });
    
    // Find dancer by email in the club_members collection
    const membersSnapshot = await db.collection('club_members')
      .where('email', '==', email)
      .limit(1)
      .get();
    
    if (membersSnapshot.empty) {
      console.log('No club member found with email:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const memberDoc = membersSnapshot.docs[0];
    const member = memberDoc.data();
    const memberId = memberDoc.id;
    
    // Get clubId from member (should exist after migration)
    const clubId = member.clubId || 'msu-dance-club'; // Fallback for safety
    
    // Verify password - check password field first, fallback to level for existing users
    const passwordMatch = member.password 
      ? member.password === password 
      : member.level === password;
    
    if (!passwordMatch) {
      console.log('Password (level) mismatch for:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check if this is first-time login (password not changed yet)
    const requiresPasswordChange = !member.passwordChanged && !member.password;
    const firstTimeLogin = member.firstTimeLogin !== false; // Default to true if not set
    
    console.log('✅ Dancer login successful:', { email, name: member.name, level: member.level, clubId, requiresPasswordChange });
    
    // Increment login count after successful login
    const currentLoginCount = member.loginCount || 0;
    await memberDoc.ref.update({
      loginCount: currentLoginCount + 1,
      lastLoginAt: new Date()
    });
    
    // Include clubId in JWT token for multi-tenant support
    const token = jwt.sign(
      { id: memberId, email, role: 'dancer', name: member.name, level: member.level, clubId },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({ 
      token, 
      user: { 
        id: memberId, 
        email, 
        role: 'dancer', 
        name: member.name,
        level: member.level,
        clubId: clubId, // Include clubId in user object
        shirtSize: member.shirtSize || '',
        requiresPasswordChange: requiresPasswordChange // Flag to show password change UI
      } 
    });
  } catch (error) {
    console.error('Dancer login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Password change endpoint for judges/admins
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { newPassword, currentPassword } = req.body;
    const userId = req.user.id;
    const clubId = getClubId(req);
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    // Get judge from database
    const judgeDoc = await db.collection('judges').doc(userId).get();
    if (!judgeDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const judge = judgeDoc.data();
    
    // Security check: verify judge belongs to user's club
    if (judge.clubId && judge.clubId !== clubId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Verify current password (check password field first, fallback to position for existing users)
    const currentPasswordMatch = judge.password 
      ? judge.password === currentPassword 
      : judge.position === currentPassword;
    
    if (!currentPasswordMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Update password (store in plaintext for admin visibility as requested)
    await judgeDoc.ref.update({
      password: newPassword,
      passwordChanged: true,
      passwordChangedAt: new Date(),
      firstTimeLogin: false
    });
    
    console.log(`✅ Password changed for judge: ${judge.email} in club ${clubId}`);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Password change endpoint for dancers
app.post('/api/auth/change-dancer-password', authenticateToken, async (req, res) => {
  try {
    const { newPassword, currentPassword } = req.body;
    const userId = req.user.id;
    const clubId = getClubId(req);
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    // Get dancer from database
    const memberDoc = await db.collection('club_members').doc(userId).get();
    if (!memberDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const member = memberDoc.data();
    
    // Security check: verify member belongs to user's club
    if (member.clubId && member.clubId !== clubId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Verify current password (check password field first, fallback to level for existing users)
    const currentPasswordMatch = member.password 
      ? member.password === currentPassword 
      : member.level === currentPassword;
    
    if (!currentPasswordMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Update password (store in plaintext for admin visibility as requested)
    await memberDoc.ref.update({
      password: newPassword,
      passwordChanged: true,
      passwordChangedAt: new Date(),
      firstTimeLogin: false
    });
    
    console.log(`✅ Password changed for dancer: ${member.email} in club ${clubId}`);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Dancer password change error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Forgot password - send reset code
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email, userType, clubId: providedClubId } = req.body;
    const clubId = providedClubId || 'msu-dance-club';
    
    if (!email || !userType) {
      return res.status(400).json({ error: 'Email and user type are required' });
    }
    
    let userDoc = null;
    let userName = 'User';
    
    if (userType === 'judge' || userType === 'admin' || userType === 'eboard') {
      const judgesSnapshot = await db.collection('judges')
        .where('email', '==', email.toLowerCase().trim())
        .where('active', '==', true)
        .where('clubId', '==', clubId)
        .limit(1)
        .get();
      
      if (judgesSnapshot.empty) {
        // Don't reveal if user exists for security
        return res.json({ success: true, message: 'If an account exists, a reset code has been sent' });
      }
      
      userDoc = judgesSnapshot.docs[0];
      userName = userDoc.data().name || 'User';
    } else if (userType === 'dancer') {
      const membersSnapshot = await db.collection('club_members')
        .where('email', '==', email.toLowerCase().trim())
        .where('clubId', '==', clubId)
        .limit(1)
        .get();
      
      if (membersSnapshot.empty) {
        return res.json({ success: true, message: 'If an account exists, a reset code has been sent' });
      }
      
      userDoc = membersSnapshot.docs[0];
      userName = userDoc.data().name || 'User';
    } else {
      return res.status(400).json({ error: 'Invalid user type' });
    }
    
    // Generate reset code
    const resetCode = emailService.generateVerificationCode();
    const expiresAt = Date.now() + (15 * 60 * 1000); // 15 minutes
    
    // Store reset code
    await db.collection('password_reset_codes').add({
      email: email.toLowerCase().trim(),
      code: resetCode,
      userType: userType,
      userId: userDoc.id,
      clubId: clubId,
      expiresAt: expiresAt,
      createdAt: Date.now(),
      used: false
    });
    
    // Send reset code email
    try {
      await emailService.sendVerificationCode(email, resetCode, userName);
      res.json({ success: true, message: 'Password reset code sent to your email' });
    } catch (emailError) {
      console.error('Error sending reset code email:', emailError);
      // Still return success (code stored) - user can contact admin
      res.json({ 
        success: true, 
        message: 'Reset code generated. Email delivery failed - please contact your administrator.',
        emailFailed: true
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reset password with code
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword, userType, clubId: providedClubId } = req.body;
    const clubId = providedClubId || 'msu-dance-club';
    
    if (!email || !code || !newPassword || !userType) {
      return res.status(400).json({ error: 'Email, code, new password, and user type are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    // Find reset code
    const codesSnapshot = await db.collection('password_reset_codes')
      .where('email', '==', email.toLowerCase().trim())
      .where('code', '==', code)
      .where('userType', '==', userType)
      .where('clubId', '==', clubId)
      .where('used', '==', false)
      .get();
    
    if (codesSnapshot.empty) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }
    
    // Find the most recent unused code
    const validCodes = codesSnapshot.docs
      .map(doc => ({ doc, data: doc.data() }))
      .filter(({ data }) => !data.used && data.expiresAt > Date.now())
      .sort((a, b) => b.data.createdAt - a.data.createdAt);
    
    if (validCodes.length === 0) {
      return res.status(400).json({ error: 'Reset code has expired. Please request a new one.' });
    }
    
    const codeDoc = validCodes[0].doc;
    
    // Mark code as used
    await codeDoc.ref.update({ used: true });
    
    // Update password
    const userId = codeDoc.data().userId;
    
    if (userType === 'judge' || userType === 'admin' || userType === 'eboard') {
      const judgeDoc = await db.collection('judges').doc(userId).get();
      if (!judgeDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      await judgeDoc.ref.update({
        password: newPassword,
        passwordChanged: true,
        passwordChangedAt: new Date(),
        firstTimeLogin: false
      });
    } else if (userType === 'dancer') {
      const memberDoc = await db.collection('club_members').doc(userId).get();
      if (!memberDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      await memberDoc.ref.update({
        password: newPassword,
        passwordChanged: true,
        passwordChangedAt: new Date(),
        firstTimeLogin: false
      });
    }
    
    console.log(`✅ Password reset for ${userType}: ${email} in club ${clubId}`);
    res.json({ success: true, message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get dancer's own attendance data
app.get('/api/dancer/attendance', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get the dancer from club_members
    const memberDoc = await db.collection('club_members').doc(userId).get();
    if (!memberDoc.exists) {
      return res.status(404).json({ error: 'Dancer not found' });
    }
    
    const member = memberDoc.data();
    
    // Get all events
    const eventsSnapshot = await db.collection('attendance_events').orderBy('date', 'desc').get();
    const events = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Get all attendance records for this dancer
    const recordsSnapshot = await db.collection('attendance_records')
      .where('dancerId', '==', userId)
      .get();
    
    const records = recordsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Get all absence requests for this dancer
    const requestsSnapshot = await db.collection('absence_requests')
      .where('dancerName', '==', member.name)
      .where('dancerLevel', '==', member.level)
      .get();
    
    const requests = requestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    res.json({
      dancer: {
        id: userId,
        name: member.name,
        level: member.level,
        email: member.email,
        phone: member.phone,
        shirtSize: member.shirtSize
      },
      events,
      records,
      requests
    });
  } catch (error) {
    console.error('Error fetching dancer attendance:', error);
    res.status(500).json({ error: error.message });
  }
});

// Attendance Management Endpoints

// Get single attendance event (public access)
app.get('/api/attendance/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const eventDoc = await db.collection('attendance_events').doc(id).get();
    
    if (!eventDoc.exists) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json({ id: eventDoc.id, ...eventDoc.data() });
  } catch (error) {
    console.error('Error fetching attendance event:', error);
    res.status(500).json({ error: 'Failed to fetch attendance event' });
  }
});

// Create attendance record (requires dancer authentication)
app.post('/api/attendance/records', authenticateToken, async (req, res) => {
  try {
    const { eventId, status } = req.body;
    const userId = req.user.id;
    const clubId = getClubId(req);
    
    // Validate required fields
    if (!eventId || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Verify user is a dancer
    if (req.user.role !== 'dancer') {
      return res.status(403).json({ error: 'Only dancers can submit attendance' });
    }
    
    // Verify event exists and get clubId from event
    const eventDoc = await db.collection('attendance_events').doc(eventId).get();
    if (!eventDoc.exists) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const eventData = eventDoc.data();
    const eventClubId = eventData.clubId || 'msu-dance-club';
    
    // Verify event belongs to same club as dancer
    if (eventClubId !== clubId) {
      return res.status(403).json({ error: 'Access denied: Event belongs to a different club' });
    }
    
    // Get dancer information from club_members
    const dancerDoc = await db.collection('club_members').doc(userId).get();
    if (!dancerDoc.exists) {
      return res.status(404).json({ error: 'Dancer not found' });
    }
    
    const dancerData = dancerDoc.data();
    const dancerName = dancerData.name;
    const dancerLevel = dancerData.level;
    
    // Calculate points based on status
    const points = status === 'present' ? (eventData.pointsValue || 1) : 
                   status === 'absent' ? -(eventData.pointsValue || 1) : 0;
    
    // Check if dancer already has a record for this event (filtered by clubId and dancerId)
    const existingRecord = await db.collection('attendance_records')
      .where('clubId', '==', clubId)
      .where('eventId', '==', eventId)
      .where('dancerId', '==', userId)
      .get();
    
    if (!existingRecord.empty) {
      // Update existing record
      const recordId = existingRecord.docs[0].id;
      await db.collection('attendance_records').doc(recordId).update({
        status,
        points: parseInt(points) || 0,
        updatedAt: new Date(),
        recordedBy: req.user.email || 'self-registration'
      });
      
      res.json({ id: recordId, message: 'Attendance updated successfully' });
    } else {
      // Create new record with clubId from event
      const recordData = {
        eventId,
        dancerId: userId, // Store dancer ID for better queries
        clubId: clubId, // Multi-tenant: get clubId from event
        dancerName: dancerName,
        dancerLevel: dancerLevel,
        status,
        points: parseInt(points) || 0,
        recordedAt: new Date(),
        recordedBy: req.user.email || 'self-registration'
      };
      
      const docRef = await db.collection('attendance_records').add(recordData);
      res.json({ id: docRef.id, message: 'Attendance recorded successfully' });
    }
  } catch (error) {
    console.error('Error creating attendance record:', error);
    res.status(500).json({ error: 'Failed to create attendance record' });
  }
});

// Get all attendance events
app.get('/api/attendance/events', authenticateToken, async (req, res) => {
  try {
    const clubId = getClubId(req);
    
    // Filter attendance events by clubId for multi-tenant isolation
    const eventsSnapshot = await db.collection('attendance_events')
      .where('clubId', '==', clubId)
      .orderBy('date', 'desc')
      .get();
    const events = eventsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.json(events);
  } catch (error) {
    console.error('Error fetching attendance events:', error);
    res.status(500).json({ error: 'Failed to fetch attendance events' });
  }
});

// Create new attendance event
app.post('/api/attendance/events', authenticateToken, async (req, res) => {
  try {
    const clubId = getClubId(req);
    const { name, date, type, pointsValue, description } = req.body;
    
    const eventData = {
      name,
      date: new Date(date),
      type, // 'combo', 'practice', 'bonding', 'fundraiser', 'homecoming'
      pointsValue: parseInt(pointsValue) || 1,
      description: description || '',
      clubId: clubId, // Multi-tenant: associate with user's club
      createdAt: new Date(),
      createdBy: req.user?.email || 'admin'
    };
    
    const docRef = await db.collection('attendance_events').add(eventData);
    res.json({ id: docRef.id, ...eventData });
  } catch (error) {
    console.error('Error creating attendance event:', error);
    res.status(500).json({ error: 'Failed to create attendance event' });
  }
});

// Delete attendance event
app.delete('/api/attendance/events/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const clubId = getClubId(req);
    
    // Verify event exists and belongs to user's club
    const eventDoc = await db.collection('attendance_events').doc(id).get();
    if (!eventDoc.exists) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const eventData = eventDoc.data();
    if (eventData.clubId && eventData.clubId !== clubId) {
      return res.status(403).json({ error: 'Access denied: Event belongs to a different club' });
    }
    
    // First, delete all attendance records for this event (filtered by clubId)
    const recordsSnapshot = await db.collection('attendance_records')
      .where('clubId', '==', clubId)
      .where('eventId', '==', id)
      .get();
    
    const deletePromises = recordsSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(deletePromises);
    
    console.log(`Deleted ${recordsSnapshot.docs.length} attendance records for event ${id} in club ${clubId}`);
    
    // Then delete the event itself
    await db.collection('attendance_events').doc(id).delete();
    
    console.log(`✅ Event deleted: ${id} from club ${clubId}`);
    res.json({ success: true, recordsDeleted: recordsSnapshot.docs.length });
  } catch (error) {
    console.error('Error deleting attendance event:', error);
    res.status(500).json({ error: 'Failed to delete attendance event' });
  }
});

// Delete club member
app.delete('/api/club-members/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const clubId = getClubId(req);
    
    // Verify member exists and belongs to user's club
    const memberDoc = await db.collection('club_members').doc(id).get();
    if (!memberDoc.exists) {
      return res.status(404).json({ error: 'Club member not found' });
    }
    
    const memberData = memberDoc.data();
    if (memberData.clubId && memberData.clubId !== clubId) {
      return res.status(403).json({ error: 'Access denied: Member belongs to a different club' });
    }
    
    // Delete all attendance records for this member (filtered by clubId)
    const recordsSnapshot = await db.collection('attendance_records')
      .where('clubId', '==', clubId)
      .where('dancerId', '==', id)
      .get();
    
    const deletePromises = recordsSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(deletePromises);
    
    console.log(`Deleted ${recordsSnapshot.docs.length} attendance records for member ${id} in club ${clubId}`);
    
    // Delete all absence requests for this member (filtered by clubId)
    if (memberDoc.exists) {
      const absenceRequestsSnapshot = await db.collection('absence_requests')
        .where('clubId', '==', clubId)
        .where('dancerName', '==', memberData.name)
        .where('dancerLevel', '==', memberData.level)
        .get();
      
      const deleteAbsencePromises = absenceRequestsSnapshot.docs.map(doc => doc.ref.delete());
      await Promise.all(deleteAbsencePromises);
      
      console.log(`Deleted ${absenceRequestsSnapshot.docs.length} absence requests for member ${id} in club ${clubId}`);
      
      // Delete all make-up submissions for this member (filtered by clubId)
      const makeUpSnapshot = await db.collection('make_up_submissions')
        .where('clubId', '==', clubId)
        .where('dancerName', '==', memberData.name)
        .where('dancerLevel', '==', memberData.level)
        .get();
      
      const deleteMakeUpPromises = makeUpSnapshot.docs.map(doc => doc.ref.delete());
      await Promise.all(deleteMakeUpPromises);
      
      console.log(`Deleted ${makeUpSnapshot.docs.length} make-up submissions for member ${id}`);
    }
    
    // Finally, delete the member
    await db.collection('club_members').doc(id).delete();
    
    console.log(`✅ Club member deleted: ${id}`);
    res.json({ 
      success: true, 
      recordsDeleted: recordsSnapshot.docs.length 
    });
  } catch (error) {
    console.error('Error deleting club member:', error);
    res.status(500).json({ error: 'Failed to delete club member' });
  }
});

// Get attendance records
app.get('/api/attendance/records', authenticateToken, async (req, res) => {
  try {
    const clubId = getClubId(req);
    
    // Filter attendance records by clubId for multi-tenant isolation
    const recordsSnapshot = await db.collection('attendance_records')
      .where('clubId', '==', clubId)
      .get();
    const records = recordsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.json(records);
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
});

// Create attendance record (admin manual entry)
app.post('/api/attendance/records/admin', authenticateToken, async (req, res) => {
  try {
    const clubId = getClubId(req);
    const { dancerId, eventId, status, points } = req.body;
    
    // Verify dancer and event belong to user's club
    const dancerDoc = await db.collection('club_members').doc(dancerId).get();
    if (dancerDoc.exists) {
      const dancerData = dancerDoc.data();
      if (dancerData.clubId && dancerData.clubId !== clubId) {
        return res.status(403).json({ error: 'Access denied: Dancer belongs to a different club' });
      }
    }
    
    const eventDoc = await db.collection('attendance_events').doc(eventId).get();
    if (eventDoc.exists) {
      const eventData = eventDoc.data();
      if (eventData.clubId && eventData.clubId !== clubId) {
        return res.status(403).json({ error: 'Access denied: Event belongs to a different club' });
      }
    }
    
    const recordData = {
      dancerId,
      eventId,
      status, // 'present', 'absent', 'excused'
      points: parseInt(points) || 0,
      clubId: clubId, // Multi-tenant: associate with user's club
      recordedAt: new Date(),
      recordedBy: req.user?.email || 'admin'
    };
    
    const docRef = await db.collection('attendance_records').add(recordData);
    res.json({ id: docRef.id, ...recordData });
  } catch (error) {
    console.error('Error creating attendance record:', error);
    res.status(500).json({ error: 'Failed to create attendance record' });
  }
});

// Update attendance record
app.put('/api/attendance/records/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const clubId = getClubId(req);
    const { status, points } = req.body;
    
    // Verify record exists and belongs to user's club
    const recordDoc = await db.collection('attendance_records').doc(id).get();
    if (!recordDoc.exists) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }
    
    const recordData = recordDoc.data();
    if (recordData.clubId && recordData.clubId !== clubId) {
      return res.status(403).json({ error: 'Access denied: Record belongs to a different club' });
    }
    
    await db.collection('attendance_records').doc(id).update({
      status,
      points: parseInt(points) || 0,
      updatedAt: new Date(),
      updatedBy: req.user?.email || 'admin'
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating attendance record:', error);
    res.status(500).json({ error: 'Failed to update attendance record' });
  }
});

// Get attendance summary for a specific month
app.get('/api/attendance/summary', authenticateToken, async (req, res) => {
  try {
    const clubId = getClubId(req);
    const { month, year } = req.query;
    
    // Get all club members (filtered by clubId)
    const membersSnapshot = await db.collection('club_members')
      .where('clubId', '==', clubId)
      .get();
    const members = membersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Get events for the specified month/year (filtered by clubId)
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const eventsSnapshot = await db.collection('attendance_events')
      .where('clubId', '==', clubId)
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .orderBy('date', 'asc')
      .get();
    
    const events = eventsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Get attendance records for the month (filtered by clubId)
    const recordsSnapshot = await db.collection('attendance_records')
      .where('clubId', '==', clubId)
      .where('recordedAt', '>=', startDate)
      .where('recordedAt', '<=', endDate)
      .get();
    
    const records = recordsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Calculate summary for each member
    const summary = members.map(member => {
      const memberRecords = records.filter(record => record.dancerId === member.id);
      const totalPoints = memberRecords.reduce((sum, record) => sum + (record.points || 0), 0);
      const attendanceCount = memberRecords.filter(record => record.status === 'present').length;
      const totalEvents = events.length;
      
      return {
        ...member,
        totalPoints,
        attendanceCount,
        totalEvents,
        attendanceRate: totalEvents > 0 ? (attendanceCount / totalEvents * 100).toFixed(1) : 0,
        records: memberRecords
      };
    });
    
    res.json({
      members: summary,
      events,
      month: parseInt(month),
      year: parseInt(year)
    });
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    res.status(500).json({ error: 'Failed to fetch attendance summary' });
  }
});

// Bulk update attendance for an event
app.post('/api/attendance/bulk-update', authenticateToken, async (req, res) => {
  try {
    const clubId = getClubId(req);
    const { eventId, attendanceData } = req.body;
    
    // Verify event exists and belongs to user's club
    const eventDoc = await db.collection('attendance_events').doc(eventId).get();
    if (!eventDoc.exists) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const event = eventDoc.data();
    if (event.clubId && event.clubId !== clubId) {
      return res.status(403).json({ error: 'Access denied: Event belongs to a different club' });
    }
    
    const pointsValue = event.pointsValue || 1;
    
    const batch = dbAdapter.batch();
    
    for (const [dancerId, status] of Object.entries(attendanceData)) {
      // Verify dancer belongs to user's club
      const dancerDoc = await db.collection('club_members').doc(dancerId).get();
      if (dancerDoc.exists) {
        const dancerData = dancerDoc.data();
        if (dancerData.clubId && dancerData.clubId !== clubId) {
          console.warn(`Skipping dancer ${dancerId} - belongs to different club`);
          continue;
        }
      }
      
      // Check if record already exists (filtered by clubId)
      const existingRecord = await db.collection('attendance_records')
        .where('clubId', '==', clubId)
        .where('dancerId', '==', dancerId)
        .where('eventId', '==', eventId)
        .get();
      
      if (existingRecord.empty) {
        // Create new record
        const recordRef = db.collection('attendance_records').doc();
        const points = status === 'present' ? pointsValue : (status === 'absent' ? -pointsValue : 0);
        
        batch.set(recordRef, {
          dancerId,
          eventId,
          clubId: clubId, // Multi-tenant: associate with user's club
          status,
          points,
          recordedAt: new Date(),
          recordedBy: req.user?.email || 'admin'
        });
      } else {
        // Update existing record
        const recordId = existingRecord.docs[0].id;
        const points = status === 'present' ? pointsValue : (status === 'absent' ? -pointsValue : 0);
        
        batch.update(db.collection('attendance_records').doc(recordId), {
          status,
          points,
          updatedAt: new Date(),
          updatedBy: req.user?.email || 'admin'
        });
      }
    }
    
    await batch.commit();
    res.json({ success: true });
  } catch (error) {
    console.error('Error bulk updating attendance:', error);
    res.status(500).json({ error: 'Failed to bulk update attendance' });
  }
});

// ABSENCE REQUESTS - Allow dancers to submit absence requests

// Submit absence request (public access)
app.post('/api/absence-requests', async (req, res) => {
  try {
    const { dancerName, dancerLevel, eventId, requestType, reason, proofUrl } = req.body;
    
    if (!dancerName || !dancerLevel || !eventId || !requestType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Get clubId from event
    const eventDoc = await db.collection('attendance_events').doc(eventId).get();
    if (!eventDoc.exists) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const eventData = eventDoc.data();
    const clubId = eventData.clubId || 'msu-dance-club'; // Get clubId from event
    
    const requestData = {
      dancerName,
      dancerLevel,
      eventId,
      clubId: clubId, // Multi-tenant: get clubId from event
      requestType, // 'missing' or 'excused'
      reason,
      proofUrl,
      status: 'pending',
      submittedAt: new Date(),
      verifiedAt: null,
      verifiedBy: null,
      finalPoints: null,
      reviewedStatus: null // 'approved-missing', 'approved-excused', 'partial-excused', 'denied-excused'
    };
    
    const docRef = await db.collection('absence_requests').add(requestData);
    res.json({ id: docRef.id, ...requestData });
  } catch (error) {
    console.error('Error submitting absence request:', error);
    res.status(500).json({ error: 'Failed to submit absence request' });
  }
});

// Submit make-up work for a missed practice
app.post('/api/make-up-submissions', makeUpUpload.single('makeUpFile'), async (req, res) => {
  try {
    const { absenceRequestId, eventId, dancerName, dancerLevel, sentToCoordinator } = req.body;
    
    // absenceRequestId is optional - make-up can be submitted for any missed practice
    if (!eventId || !dancerName || !dancerLevel) {
      return res.status(400).json({ error: 'Missing required fields: eventId, dancerName, and dancerLevel are required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Get clubId from event
    const eventDoc = await db.collection('attendance_events').doc(eventId).get();
    if (!eventDoc.exists) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const eventData = eventDoc.data();
    const clubId = eventData.clubId || 'msu-dance-club'; // Get clubId from event
    
    const makeUpData = {
      absenceRequestId: absenceRequestId || null, // Optional - make-up can be submitted without a request
      eventId,
      clubId: clubId, // Multi-tenant: get clubId from event
      dancerName,
      dancerLevel,
      makeUpUrl: `/uploads/make-up/${req.file.filename}`, // Store file path instead of base64
      makeUpPath: req.file.path,
      makeUpFilename: req.file.filename,
      makeUpOriginalName: req.file.originalname,
      makeUpMimeType: req.file.mimetype,
      makeUpSize: req.file.size,
      sentToCoordinator: sentToCoordinator === 'true' || sentToCoordinator === true,
      status: 'pending',
      submittedAt: new Date(),
      reviewedAt: null,
      reviewedBy: null,
      finalPoints: null,
      approved: false
    };
    
    const docRef = await db.collection('make_up_submissions').add(makeUpData);
    console.log('✅ Make-up submission created:', { id: docRef.id, dancerName, eventId, clubId });
    res.json({ id: docRef.id, ...makeUpData });
  } catch (error) {
    console.error('Error submitting make-up:', error);
    res.status(500).json({ error: error.message || 'Failed to submit make-up work' });
  }
});

// Get absence requests (admin only)
app.get('/api/absence-requests', authenticateToken, async (req, res) => {
  try {
    const clubId = getClubId(req);
    
    // Filter absence requests by clubId for multi-tenant isolation
    const snapshot = await db.collection('absence_requests')
      .where('clubId', '==', clubId)
      .orderBy('submittedAt', 'desc')
      .get();
    const requests = [];
    
    for (const doc of snapshot.docs) {
      const requestData = doc.data();
      
      // Get event details (verify it belongs to same club)
      const eventDoc = await db.collection('attendance_events').doc(requestData.eventId).get();
      const eventName = eventDoc.exists ? eventDoc.data().name : 'Unknown Event';
      
      requests.push({
        id: doc.id,
        ...requestData,
        eventName
      });
    }
    
    res.json(requests);
  } catch (error) {
    console.error('Error fetching absence requests:', error);
    res.status(500).json({ error: 'Failed to fetch absence requests' });
  }
});

// Verify absence request (admin only)
app.put('/api/absence-requests/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const clubId = getClubId(req);
    const { status, finalPoints, notes } = req.body; // status: 'approved', 'denied', 'partial'
    
    if (!['approved', 'denied', 'partial'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    // Get the request first to check its type and verify clubId
    const requestDoc = await db.collection('absence_requests').doc(id).get();
    if (!requestDoc.exists) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    const request = requestDoc.data();
    
    // Security check: verify request belongs to user's club
    if (request.clubId && request.clubId !== clubId) {
      return res.status(403).json({ error: 'Access denied: Request belongs to a different club' });
    }
    
    // Determine reviewed status based on request type
    const requestType = request.requestType;
    let reviewedStatus;
    
    if (requestType === 'missing') {
      // Missing requests can only be approved
      reviewedStatus = 'approved-missing';
    } else {
      // Excused requests can be approved, partial, or denied
      if (status === 'approved') {
        reviewedStatus = 'approved-excused';
      } else if (status === 'partial') {
        reviewedStatus = 'partial-excused';
      } else {
        reviewedStatus = 'denied-excused';
      }
    }
    
    // Calculate final points based on request type and status
    let calculatedPoints;
    if (requestType === 'missing') {
      calculatedPoints = -1; // Missing requests always -1
    } else {
      // Excused requests
      if (status === 'approved') {
        calculatedPoints = 0;
      } else if (status === 'partial') {
        calculatedPoints = 0;
      } else { // denied
        calculatedPoints = -1;
      }
    }
    
    const updateData = {
      status,
      verifiedAt: new Date(),
      verifiedBy: req.user?.email || 'admin',
      finalPoints: finalPoints !== undefined ? finalPoints : calculatedPoints,
      reviewedStatus
    };
    
    // Only add notes if provided
    if (notes !== undefined && notes !== null) {
      updateData.notes = notes;
    }
    
    await db.collection('absence_requests').doc(id).update(updateData);
    
    // Update or create attendance record based on status
    // Find club member by name and level (filtered by clubId)
    const membersSnapshot = await db.collection('club_members')
      .where('clubId', '==', clubId)
      .where('name', '==', request.dancerName)
      .where('level', '==', request.dancerLevel)
      .limit(1)
      .get();
    
    let dancerId = null;
    if (!membersSnapshot.empty) {
      dancerId = membersSnapshot.docs[0].id;
    }
    
    // Find or create attendance record
    let attendanceRecords;
    if (dancerId) {
      attendanceRecords = await db.collection('attendance_records')
        .where('clubId', '==', clubId)
        .where('eventId', '==', request.eventId)
        .where('dancerId', '==', dancerId)
        .get();
    } else {
      attendanceRecords = await db.collection('attendance_records')
        .where('clubId', '==', clubId)
        .where('eventId', '==', request.eventId)
        .where('dancerName', '==', request.dancerName)
        .where('dancerLevel', '==', request.dancerLevel)
        .get();
    }
    
    // Determine points and status based on reviewed status
    let points, statusLabel;
    
    if (reviewedStatus === 'approved-missing') {
      points = -1;
      statusLabel = 'excused-missing';
    } else if (reviewedStatus === 'approved-excused') {
      points = 0;
      statusLabel = 'excused-approved';
    } else if (reviewedStatus === 'partial-excused') {
      points = 0;
      statusLabel = 'excused-partial';
    } else { // denied-excused
      points = -1;
      statusLabel = 'excused-denied';
    }
    
    const recordData = {
      eventId: request.eventId,
      clubId: clubId, // Multi-tenant: ensure clubId is set
      dancerName: request.dancerName,
      dancerLevel: request.dancerLevel,
      status: statusLabel,
      points: points,
      recordedAt: new Date(),
      recordedBy: req.user?.email || 'admin',
      fromAbsenceRequest: true,
      requestStatus: status,
      requestReason: request.reason,
      requestType: requestType,
      reviewedStatus: reviewedStatus
    };
    
    if (dancerId) {
      recordData.dancerId = dancerId;
    }
    
    if (attendanceRecords.empty) {
      // Create new attendance record
      await db.collection('attendance_records').add(recordData);
    } else {
      // Update existing record
      const recordId = attendanceRecords.docs[0].id;
      await db.collection('attendance_records').doc(recordId).update({
        status: statusLabel,
        points: points,
        updatedAt: new Date(),
        updatedBy: req.user?.email || 'admin',
        fromAbsenceRequest: true,
        requestStatus: status,
        requestReason: request.reason,
        requestType: requestType,
        reviewedStatus: reviewedStatus
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error verifying absence request:', error);
    res.status(500).json({ error: 'Failed to verify absence request' });
  }
});

// Get make-up submissions (admin only)
app.get('/api/make-up-submissions', authenticateToken, async (req, res) => {
  try {
    const clubId = getClubId(req);
    
    // Filter make-up submissions by clubId for multi-tenant isolation
    const snapshot = await db.collection('make_up_submissions')
      .where('clubId', '==', clubId)
      .orderBy('submittedAt', 'desc')
      .get();
    const submissions = [];
    
    for (const doc of snapshot.docs) {
      const subData = doc.data();
      
      // Get absence request details (verify it belongs to same club)
      const absenceDoc = await db.collection('absence_requests').doc(subData.absenceRequestId).get();
      const absenceData = absenceDoc.exists ? absenceDoc.data() : null;
      
      // Get event details (verify it belongs to same club)
      const eventDoc = await db.collection('attendance_events').doc(subData.eventId).get();
      const eventName = eventDoc.exists ? eventDoc.data().name : 'Unknown Event';
      
      submissions.push({
        id: doc.id,
        ...subData,
        eventName,
        absenceRequest: absenceData
      });
    }
    
    res.json(submissions);
  } catch (error) {
    console.error('Error fetching make-up submissions:', error);
    res.status(500).json({ error: 'Failed to fetch make-up submissions' });
  }
});

// Approve/deny make-up submission (admin only)
app.put('/api/make-up-submissions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const clubId = getClubId(req);
    const { approved, pointsAwarded } = req.body;
    
    const submissionDoc = await db.collection('make_up_submissions').doc(id).get();
    if (!submissionDoc.exists) {
      return res.status(404).json({ error: 'Make-up submission not found' });
    }
    
    const submission = submissionDoc.data();
    
    // Security check: verify submission belongs to user's club
    if (submission.clubId && submission.clubId !== clubId) {
      return res.status(403).json({ error: 'Access denied: Submission belongs to a different club' });
    }
    
    // Update make-up submission status
    await db.collection('make_up_submissions').doc(id).update({
      approved,
      pointsAwarded: pointsAwarded || 0,
      reviewedAt: new Date(),
      reviewedBy: req.user?.email || 'admin',
      status: approved ? 'approved' : 'denied'
    });
    
    // If approved, update the corresponding attendance record to award points back
    // This works even if there's no absence request (make-up can be submitted without a request)
    if (approved) {
      // Try to get absence request if it exists (optional)
      let absenceData = null;
      if (submission.absenceRequestId) {
        const absenceDoc = await db.collection('absence_requests').doc(submission.absenceRequestId).get();
        if (absenceDoc.exists) {
          absenceData = absenceDoc.data();
        }
      }
      
      // Find the attendance record
      const membersSnapshot = await db.collection('club_members')
        .where('name', '==', submission.dancerName)
        .where('level', '==', submission.dancerLevel)
        .where('clubId', '==', clubId)
        .limit(1)
        .get();
      
      let dancerId = null;
      if (!membersSnapshot.empty) {
        dancerId = membersSnapshot.docs[0].id;
      }
      
      let attendanceRecords;
      if (dancerId) {
        attendanceRecords = await db.collection('attendance_records')
          .where('clubId', '==', clubId)
          .where('eventId', '==', submission.eventId)
          .where('dancerId', '==', dancerId)
          .get();
      } else {
        attendanceRecords = await db.collection('attendance_records')
          .where('clubId', '==', clubId)
          .where('eventId', '==', submission.eventId)
          .where('dancerName', '==', submission.dancerName)
          .where('dancerLevel', '==', submission.dancerLevel)
          .get();
      }
      
      // Calculate points to award based on original absence type (if available) or use provided points
      let pointsToAward = pointsAwarded || 0;
      
      // Update attendance record with make-up points
      const recordData = {
        makeUpApproved: true,
        makeUpPoints: pointsToAward,
        makeUpReviewedAt: new Date(),
        makeUpReviewedBy: req.user?.email || 'admin'
      };
      
      if (attendanceRecords.empty) {
        // Create new record with make-up info
        const newRecordData = {
          eventId: submission.eventId,
          clubId: clubId, // Multi-tenant: ensure clubId is set
          dancerName: submission.dancerName,
          dancerLevel: submission.dancerLevel,
          status: 'make-up-approved',
          points: pointsToAward,
          recordedAt: new Date(),
          recordedBy: 'admin',
          makeUpSubmissionId: id,
          ...recordData
        };
        if (dancerId) {
          newRecordData.dancerId = dancerId;
        }
        await db.collection('attendance_records').add(newRecordData);
      } else {
        // Update existing record
        const recordId = attendanceRecords.docs[0].id;
        await db.collection('attendance_records').doc(recordId).update({
          ...recordData,
          updatedAt: new Date()
        });
      }
    }
    
    console.log(`✅ Make-up submission ${approved ? 'approved' : 'denied'}:`, { id, pointsAwarded });
    res.json({ success: true });
  } catch (error) {
    console.error('Error reviewing make-up submission:', error);
    res.status(500).json({ error: 'Failed to review make-up submission' });
  }
});

// Get club members (sorted by score, highest first)
app.get('/api/club-members', authenticateToken, async (req, res) => {
  try {
    const clubId = getClubId(req);
    
    // Filter club members by clubId for multi-tenant isolation
    const snapshot = await db.collection('club_members')
      .where('clubId', '==', clubId)
      .get();
    const members = [];
    
    for (const doc of snapshot.docs) {
      const memberData = doc.data();
      
      // Club members already have scores and averageScore stored when transferred
      // Just use the stored data
      members.push({
        id: doc.id,
        name: memberData.name,
        auditionNumber: memberData.auditionNumber,
        email: memberData.email || '',
        phone: memberData.phone || '',
        shirtSize: memberData.shirtSize || '',
        group: memberData.dancerGroup || 'Unassigned', // Use correct column name
        auditionId: memberData.auditionId,
        auditionName: memberData.auditionName,
        auditionDate: memberData.auditionDate,
        averageScore: memberData.averageScore || 0,
        judgeCount: memberData.judgeCount || 0,
        scores: memberData.scores || {},
        level: memberData.level || memberData.assignedLevel || 'Level 4', // Include level
        assignedLevel: memberData.assignedLevel || 'Level 4', // Include assigned level
        previousMember: memberData.previousMember || '',
        previousLevel: memberData.previousLevel || ''
      });
    }
    
    // Sort by average score (highest first)
    members.sort((a, b) => b.averageScore - a.averageScore);
    
    // Add rank
    members.forEach((member, index) => {
      member.rank = index + 1;
    });
    
    console.log(`Found ${members.length} club members, sorted by score (highest first)`);
    res.json(members);
  } catch (error) {
    console.error('Error fetching club members:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get dancers with scores (for results/audition pages)
app.get('/api/dancers-with-scores', authenticateToken, async (req, res) => {
  try {
    const clubId = getClubId(req);
    const { auditionId } = req.query;
    
    // Verify audition belongs to user's club if auditionId provided
    if (auditionId) {
      const auditionDoc = await db.collection('auditions').doc(auditionId).get();
      if (auditionDoc.exists) {
        const auditionData = auditionDoc.data();
        if (auditionData.clubId && auditionData.clubId !== clubId) {
          return res.status(403).json({ error: 'Access denied: Audition belongs to a different club' });
        }
      }
    }
    
    // Filter by clubId first, then by auditionId if provided
    let dancersQuery = db.collection('dancers').where('clubId', '==', clubId);
    if (auditionId) {
      dancersQuery = dancersQuery.where('auditionId', '==', auditionId);
    }
    
    const dancersSnapshot = await dancersQuery.get();
    const dancers = [];
    
    for (const doc of dancersSnapshot.docs) {
      const dancerData = doc.data();
      
      // Skip dancers with missing required fields
      if (!dancerData.name || !dancerData.auditionNumber || 
          dancerData.name.trim() === '' || dancerData.auditionNumber.toString().trim() === '') {
        continue;
      }
      
      // Check if scores are embedded in dancer document first
      let scores = {};
      let averageScore = dancerData.overallScore || dancerData.averageScore || 0;
      
      // If dancer has scores array (score IDs), fetch individual scores from scores collection (filtered by clubId)
      if (dancerData.scores && Array.isArray(dancerData.scores) && dancerData.scores.length > 0) {
        const scoresSnapshot = await db.collection('scores')
          .where('clubId', '==', clubId) // Filter by clubId for security
          .where('dancerId', '==', doc.id)
          .get();
        
        let totalScore = 0;
        let judgeCount = 0;
      
      for (const scoreDoc of scoresSnapshot.docs) {
        const scoreData = scoreDoc.data();
        
        // Try to get judge name - check judgeName, then judgeEmail, then look up by judgeId
        let judgeName = scoreData.judgeName;
        
        if (!judgeName && scoreData.judgeId) {
          // Look up judge by ID in judges collection
          try {
            const judgeDoc = await db.collection('judges').doc(scoreData.judgeId).get();
            if (judgeDoc.exists) {
              judgeName = judgeDoc.data().name;
            }
          } catch (err) {
            console.log('Could not find judge:', scoreData.judgeId);
          }
        }
        
        if (!judgeName && scoreData.judgeEmail) {
          // Look up judge by email
          try {
            const judgeSnapshot = await db.collection('judges').where('email', '==', scoreData.judgeEmail).limit(1).get();
            if (!judgeSnapshot.empty) {
              judgeName = judgeSnapshot.docs[0].data().name;
            }
          } catch (err) {
            console.log('Could not find judge by email:', scoreData.judgeEmail);
          }
        }
        
        // Fallback to judge ID or "Unknown Judge"
        if (!judgeName) {
          judgeName = scoreData.judgeId || scoreData.judgeEmail || 'Unknown Judge';
        }
        
        // Handle both nested scores object and flat structure
        const scoreValues = scoreData.scores || scoreData;
        const kick = scoreValues.kick || 0;
        const jump = scoreValues.jump || 0;
        const turn = scoreValues.turn || 0;
        const performance = scoreValues.performance || 0;
        const execution = scoreValues.execution || 0;
        const technique = scoreValues.technique || 0;
        const total = kick + jump + turn + performance + execution + technique;
        
        scores[judgeName] = {
          kick: kick,
          jump: jump,
          turn: turn,
          performance: performance,
          execution: execution,
          technique: technique,
          total: total,
          comments: scoreData.comments || '',
          submittedAt: scoreData.submittedAt || scoreData.timestamp || null
        };
        
        if (total > 0) {
          totalScore += total;
          judgeCount++;
        }
      }
      
      // Calculate average with highest and lowest dropped (for 9 judges, use 7 scores)
      if (judgeCount > 2) {
        // Drop highest and lowest if we have more than 2 scores
        const allScores = Object.values(scores).map(s => s.total).filter(t => t > 0);
        if (allScores.length > 2) {
          allScores.sort((a, b) => a - b);
          // Remove lowest and highest
          allScores.shift(); // Remove lowest
          allScores.pop();   // Remove highest
          const sum = allScores.reduce((a, b) => a + b, 0);
          averageScore = sum / allScores.length;
        } else {
          averageScore = totalScore / judgeCount;
        }
      } else if (judgeCount > 0) {
        averageScore = totalScore / judgeCount;
      }
      }
      
      dancers.push({
        id: doc.id,
        name: dancerData.name,
        auditionNumber: parseInt(dancerData.auditionNumber) || 0,
        email: dancerData.email || '',
        phone: dancerData.phone || '',
        shirtSize: dancerData.shirtSize || '',
        group: dancerData.group || 'Unassigned',
        previousMember: dancerData.previousMember || '',
        previousLevel: dancerData.previousLevel || '',
        scores,
        averageScore: parseFloat(averageScore.toFixed(2)),
        hidden: dancerData.hidden || false
      });
    }
    
    // Sort by audition number
    dancers.sort((a, b) => a.auditionNumber - b.auditionNumber);
    
    // Add rank based on average score
    const sortedByScore = [...dancers].sort((a, b) => b.averageScore - a.averageScore);
    sortedByScore.forEach((dancer, index) => {
      const originalDancer = dancers.find(d => d.id === dancer.id);
      if (originalDancer) {
        originalDancer.rank = index + 1;
      }
    });
    
    console.log(`Returning ${dancers.length} dancers with scores`);
    res.json(dancers);
  } catch (error) {
    console.error('Error fetching dancers with scores:', error);
    res.status(500).json({ error: error.message });
  }
});

// Dancer management routes
app.get('/api/dancers', authenticateToken, async (req, res) => {
  try {
    const clubId = getClubId(req);
    
    // Filter dancers by clubId for multi-tenant isolation
    const snapshot = await db.collection('dancers')
      .where('clubId', '==', clubId)
      .get();
    const dancers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Filter out dancers with empty names or audition numbers (same logic as results)
    const validDancers = dancers.filter(dancer => 
      dancer.name && dancer.auditionNumber && dancer.name.trim() !== '' && dancer.auditionNumber.toString().trim() !== ''
    );
    
    console.log(`Found ${dancers.length} total dancers in club ${clubId}, ${validDancers.length} valid dancers`);
    res.json(validDancers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/dancers', authenticateToken, async (req, res) => {
  try {
    const clubId = getClubId(req);
    const { name, auditionNumber, email, phone, shirtSize, auditionId, previousMember, previousLevel } = req.body;
    
    // Validate required fields
    if (!name || !auditionNumber) {
      return res.status(400).json({ error: 'Name and audition number are required' });
    }
    
    // Verify audition belongs to user's club (if auditionId provided)
    if (auditionId) {
      const auditionDoc = await db.collection('auditions').doc(auditionId).get();
      if (auditionDoc.exists) {
        const auditionData = auditionDoc.data();
        if (auditionData.clubId && auditionData.clubId !== clubId) {
          return res.status(403).json({ error: 'Access denied: Audition belongs to a different club' });
        }
      }
    }
    
    // Check for duplicate audition number within the same audition and club
    let duplicateQuery = db.collection('dancers')
      .where('clubId', '==', clubId) // Filter by clubId first
      .where('auditionNumber', '==', auditionNumber.toString());
    
    if (auditionId) {
      duplicateQuery = duplicateQuery.where('auditionId', '==', auditionId);
    }
    
    const existingDancer = await duplicateQuery.get();
    
    if (!existingDancer.empty) {
      return res.status(400).json({ error: `Dancer with audition number ${auditionNumber} already exists in this audition` });
    }
    
    // Auto-assign group based on audition number
    const auditionNum = parseInt(auditionNumber);
    let autoGroup = 'Unassigned';
    if (!isNaN(auditionNum) && auditionNum > 0) {
      const groupNumber = Math.ceil(auditionNum / 5);
      autoGroup = `Group ${groupNumber}`;
    }
    
    const dancerData = {
      name: name.trim(),
      auditionNumber: auditionNumber.toString(),
      email: email ? email.trim() : '',
      phone: phone ? phone.trim() : '',
      clubId: clubId, // Multi-tenant: associate with user's club
      shirtSize: shirtSize || '',
      previousMember: previousMember || 'no',
      previousLevel: previousMember === 'yes' ? (previousLevel || null) : null,
      group: autoGroup,
      auditionId: auditionId || null,
      createdAt: new Date(),
      scores: []
    };
    
    const docRef = await db.collection('dancers').add(dancerData);
    res.json({ id: docRef.id, ...dancerData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update individual dancer
app.put('/api/dancers/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const clubId = getClubId(req);
    const updateData = req.body;
    
    // Verify dancer exists and belongs to user's club
    const dancerDoc = await db.collection('dancers').doc(id).get();
    if (!dancerDoc.exists) {
      return res.status(404).json({ error: 'Dancer not found' });
    }
    
    const dancerData = dancerDoc.data();
    if (dancerData.clubId && dancerData.clubId !== clubId) {
      return res.status(403).json({ error: 'Access denied: Dancer belongs to a different club' });
    }
    
    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.clubId; // Prevent clubId from being changed
    
    await db.collection('dancers').doc(id).update({
      ...updateData,
      updatedAt: new Date(),
      updatedBy: req.user.id
    });
    
    console.log(`Dancer ${id} updated by ${req.user.id} in club ${clubId}`);
    res.json({ message: 'Dancer updated successfully' });
  } catch (error) {
    console.error('Error updating dancer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Hide/Show dancer (only for admins, secretaries, president, vice president)
app.put('/api/dancers/:id/hide', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const clubId = getClubId(req);
    const { hidden } = req.body; // boolean
    
    // Verify dancer exists and belongs to user's club
    const dancerDoc = await db.collection('dancers').doc(id).get();
    if (!dancerDoc.exists) {
      return res.status(404).json({ error: 'Dancer not found' });
    }
    
    const dancerData = dancerDoc.data();
    if (dancerData.clubId && dancerData.clubId !== clubId) {
      return res.status(403).json({ error: 'Access denied: Dancer belongs to a different club' });
    }
    
    // Check permissions - get user's judge record to check role and position (filter by clubId)
    const judgesSnapshot = await db.collection('judges')
      .where('clubId', '==', clubId) // Filter by clubId for security
      .where('email', '==', req.user.email)
      .limit(1)
      .get();
    
    if (judgesSnapshot.empty) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    const judge = judgesSnapshot.docs[0].data();
    const userRole = judge.role;
    const userPosition = judge.position || '';
    
    // Check if user has permission: admin, secretary, President, or Vice President
    const isAdmin = userRole === 'admin';
    const isSecretary = userRole === 'secretary';
    const isPresident = userPosition === 'President';
    const isVicePresident = userPosition === 'Vice President';
    
    if (!isAdmin && !isSecretary && !isPresident && !isVicePresident) {
      return res.status(403).json({ error: 'Permission denied. Only admins, secretaries, president, and vice president can hide dancers.' });
    }
    
    // Update dancer hidden status
    await db.collection('dancers').doc(id).update({
      hidden: Boolean(hidden),
      hiddenAt: hidden ? new Date() : null,
      hiddenBy: hidden ? req.user.id : null,
      updatedAt: new Date(),
      updatedBy: req.user.id
    });
    
    console.log(`Dancer ${id} ${hidden ? 'hidden' : 'shown'} by ${req.user.id} (${userRole}, ${userPosition}) in club ${clubId}`);
    res.json({ message: `Dancer ${hidden ? 'hidden' : 'shown'} successfully` });
  } catch (error) {
    console.error('Error hiding/showing dancer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Deliberations routes
app.get('/api/deliberations/:auditionId', authenticateToken, async (req, res) => {
  try {
    const { auditionId } = req.params;
    const clubId = getClubId(req);
    
    // Verify audition belongs to user's club
    const auditionDoc = await db.collection('auditions').doc(auditionId).get();
    if (auditionDoc.exists) {
      const auditionData = auditionDoc.data();
      if (auditionData.clubId && auditionData.clubId !== clubId) {
        return res.status(403).json({ error: 'Access denied: Audition belongs to a different club' });
      }
    }
    
    // Get saved deliberations progress (filtered by clubId)
    const deliberationsSnapshot = await db.collection('deliberations')
      .where('clubId', '==', clubId)
      .where('auditionId', '==', auditionId)
      .get();
    
    if (deliberationsSnapshot.empty) {
      return res.json({ levelAssignments: {}, levelCounts: {} });
    }
    
    const deliberations = deliberationsSnapshot.docs[0].data();
    
    // Parse JSON strings if they exist
    const levelAssignments = deliberations.levelAssignments 
      ? (typeof deliberations.levelAssignments === 'string' 
          ? JSON.parse(deliberations.levelAssignments) 
          : deliberations.levelAssignments)
      : {};
    
    const levelCounts = deliberations.levelCounts 
      ? (typeof deliberations.levelCounts === 'string' 
          ? JSON.parse(deliberations.levelCounts) 
          : deliberations.levelCounts)
      : {};
    
    res.json({
      levelAssignments,
      levelCounts
    });
  } catch (error) {
    console.error('Error fetching deliberations:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/deliberations/:auditionId', authenticateToken, async (req, res) => {
  try {
    const { auditionId } = req.params;
    const clubId = getClubId(req);
    const { levelAssignments, levelCounts } = req.body;
    
    console.log(`Submitting deliberations for audition ${auditionId} in club ${clubId}`);
    console.log('Level assignments received:', levelAssignments);
    
    // Verify audition belongs to user's club
    const auditionDoc = await db.collection('auditions').doc(auditionId).get();
    if (!auditionDoc.exists) {
      return res.status(404).json({ error: 'Audition not found' });
    }
    
    const auditionData = auditionDoc.data();
    if (auditionData.clubId && auditionData.clubId !== clubId) {
      return res.status(403).json({ error: 'Access denied: Audition belongs to a different club' });
    }
    
    // Fetch dancers with scores using the same logic as /api/dancers-with-scores (filtered by clubId)
    const dancersSnapshot = await db.collection('dancers')
      .where('clubId', '==', clubId)
      .where('auditionId', '==', auditionId)
      .get();
    
    const dancers = [];
    for (const doc of dancersSnapshot.docs) {
      const dancerData = doc.data();
      
      // Skip dancers with missing required fields
      if (!dancerData.name || !dancerData.auditionNumber || 
          dancerData.name.trim() === '' || dancerData.auditionNumber.toString().trim() === '') {
        continue;
      }
      
      // Fetch scores from scores collection (filtered by clubId)
      const scoresSnapshot = await db.collection('scores')
        .where('clubId', '==', clubId)
        .where('dancerId', '==', doc.id)
        .get();
      
      let scores = {};
      let totalScore = 0;
      let judgeCount = 0;
      
      for (const scoreDoc of scoresSnapshot.docs) {
        const scoreData = scoreDoc.data();
        
        // Get judge name
        let judgeName = scoreData.judgeName;
        if (!judgeName && scoreData.judgeId) {
          try {
            const judgeDoc = await db.collection('judges').doc(scoreData.judgeId).get();
            if (judgeDoc.exists) {
              judgeName = judgeDoc.data().name;
            }
          } catch (err) {
            console.log('Could not find judge:', scoreData.judgeId);
          }
        }
        if (!judgeName && scoreData.judgeEmail) {
          try {
            const judgeSnapshot = await db.collection('judges').where('email', '==', scoreData.judgeEmail).limit(1).get();
            if (!judgeSnapshot.empty) {
              judgeName = judgeSnapshot.docs[0].data().name;
            }
          } catch (err) {
            console.log('Could not find judge by email:', scoreData.judgeEmail);
          }
        }
        if (!judgeName) {
          judgeName = scoreData.judgeId || scoreData.judgeEmail || 'Unknown Judge';
        }
        
        // Calculate score totals
        const scoreValues = scoreData.scores || scoreData;
        const kick = scoreValues.kick || 0;
        const jump = scoreValues.jump || 0;
        const turn = scoreValues.turn || 0;
        const performance = scoreValues.performance || 0;
        const execution = scoreValues.execution || 0;
        const technique = scoreValues.technique || 0;
        const total = kick + jump + turn + performance + execution + technique;
        
        scores[judgeName] = {
          kick: kick,
          jump: jump,
          turn: turn,
          performance: performance,
          execution: execution,
          technique: technique,
          total: total,
          comments: scoreData.comments || '',
          submittedAt: scoreData.submittedAt || scoreData.timestamp || null
        };
        
        if (total > 0) {
          totalScore += total;
          judgeCount++;
        }
      }
      
      // Calculate average with highest and lowest dropped (for 9 judges, use 7 scores)
      let averageScore = 0;
      if (judgeCount > 2) {
        const allScores = Object.values(scores).map(s => s.total).filter(t => t > 0);
        if (allScores.length > 2) {
          allScores.sort((a, b) => a - b);
          allScores.shift(); // Remove lowest
          allScores.pop();   // Remove highest
          const sum = allScores.reduce((a, b) => a + b, 0);
          averageScore = sum / allScores.length;
        } else {
          averageScore = totalScore / judgeCount;
        }
      } else if (judgeCount > 0) {
        averageScore = totalScore / judgeCount;
      }
      
      dancers.push({
        id: doc.id,
        name: dancerData.name,
        auditionNumber: parseInt(dancerData.auditionNumber) || 0,
        email: dancerData.email || '',
        phone: dancerData.phone || '',
        shirtSize: dancerData.shirtSize || '',
        group: dancerData.group || 'Unassigned',
        previousMember: dancerData.previousMember || '',
        previousLevel: dancerData.previousLevel || '',
        scores,
        averageScore: parseFloat(averageScore.toFixed(2))
      });
    }
    
    // Add rank based on average score
    const sortedByScore = [...dancers].sort((a, b) => b.averageScore - a.averageScore);
    sortedByScore.forEach((dancer, index) => {
      const originalDancer = dancers.find(d => d.id === dancer.id);
      if (originalDancer) {
        originalDancer.rank = index + 1;
      }
    });
    
    // Clear existing club members for this audition and club to avoid duplicates
    const existingMembers = await db.collection('club_members')
      .where('clubId', '==', clubId)
      .where('auditionId', '==', auditionId)
      .get();
    for (const memberDoc of existingMembers.docs) {
      await db.collection('club_members').doc(memberDoc.id).delete();
    }
    console.log(`Cleared ${existingMembers.size} existing club members for this audition in club ${clubId}`);
    
    // Transfer dancers to club members collection with level assignments
    const transferredCount = dancers.length;
    
    for (const dancer of dancers) {
      const assignedLevel = levelAssignments[dancer.id] || 'Level 4';
      
      const averageScore = dancer.averageScore || 0;
      
      console.log(`Processing dancer ${dancer.name}:`, {
        averageScore: averageScore,
        assignedLevel: assignedLevel
      });
      
      const clubMemberData = {
        id: String(dancer.id),
        name: String(dancer.name || ''),
        email: String(dancer.email || ''),
        phone: String(dancer.phone || ''),
        shirtSize: String(dancer.shirtSize || ''),
        auditionNumber: String(dancer.auditionNumber || ''),
        dancerGroup: String(dancer.group || ''),
        averageScore: Number(averageScore.toFixed(2)),
        rank: Number(dancer.rank) || 0,
        previousMember: String(dancer.previousMember || ''),
        previousLevel: String(dancer.previousLevel || ''),
        level: String(assignedLevel),
        assignedLevel: String(assignedLevel),
        clubId: clubId, // Multi-tenant: ensure clubId is set
        auditionId: String(auditionId),
        auditionName: String(auditionData.name || ''),
        auditionDate: String(auditionData.date || ''),
        transferredAt: new Date().toISOString(),
        transferredBy: String(req.user?.id || 'admin'),
        deliberationPhase: 1,
        overallScore: Number(averageScore.toFixed(2)),
        scores: dancer.scores || {}
      };
      
      // Create club member record with level assignment
      await db.collection('club_members').add(clubMemberData);
    }
    
    // Update audition status to completed
    await db.collection('auditions').doc(auditionId).update({
      status: 'completed',
      deliberationsCompletedAt: new Date().toISOString(),
      deliberationsCompletedBy: req.user.id || 'admin'
    });
    
    // Save deliberations progress
    await db.collection('deliberations').doc(auditionId).set({
      auditionId,
      clubId: clubId, // Multi-tenant: associate with user's club
      levelAssignments: JSON.stringify(levelAssignments),
      levelCounts: JSON.stringify(levelCounts),
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.id,
      submitted: true,
      submittedAt: new Date().toISOString()
    });
    
    console.log(`✅ Transferred ${transferredCount} dancers to club database with level assignments`);
    res.json({ 
      message: `Successfully transferred ${transferredCount} dancers to club database with level assignments`,
      count: transferredCount 
    });
  } catch (error) {
    console.error('Error submitting deliberations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Group assignment route
app.post('/api/dancers/assign-groups', authenticateToken, async (req, res) => {
  try {
    const { groupAssignments } = req.body; // Array of { dancerId, group }
    
    const batch = db.batch();
    
    for (const assignment of groupAssignments) {
      const dancerRef = db.collection('dancers').doc(assignment.dancerId);
      batch.update(dancerRef, { group: assignment.group });
    }
    
    await batch.commit();
    res.json({ message: 'Groups assigned successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Auto-assign groups by audition number range
app.post('/api/dancers/auto-assign-groups', authenticateToken, async (req, res) => {
  try {
    const { groupRanges } = req.body; // Array of { groupName, minNumber, maxNumber }
    
    const snapshot = await db.collection('dancers').get();
    const batch = db.batch();
    
    snapshot.docs.forEach(doc => {
      const dancer = doc.data();
      const auditionNum = parseInt(dancer.auditionNumber);
      
      for (const range of groupRanges) {
        if (auditionNum >= range.minNumber && auditionNum <= range.maxNumber) {
          batch.update(doc.ref, { group: range.groupName });
          break;
        }
      }
    });
    
    await batch.commit();
    res.json({ message: 'Groups auto-assigned successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/dancers/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    // Debug: Log the first few rows to see what we're getting
    console.log('Excel data sample:', data.slice(0, 3));
    console.log('Available columns:', Object.keys(data[0] || {}));

    const dancers = [];
    const duplicates = [];
    const errors = [];
    
    // Get existing audition numbers to check for duplicates
    const existingDancersSnapshot = await db.collection('dancers').get();
    const existingAuditionNumbers = new Set(
      existingDancersSnapshot.docs.map(doc => doc.data().auditionNumber)
    );

    for (const row of data) {
      // More flexible column name matching
      const name = row.Name || row.name || row['Dancer Name'] || row['DancerName'] || '';
      const auditionNumber = row['Audition Number'] || row['AuditionNumber'] || row.auditionNumber || row['Audition #'] || row['Audition#'] || '';
      const email = row.Email || row.email || row['Email Address'] || row['EmailAddress'] || '';
      const phone = row.Phone || row.phone || row['Phone Number'] || row['PhoneNumber'] || '';
      const shirtSize = row['Shirt Size'] || row['ShirtSize'] || row.shirtSize || row['T-Shirt Size'] || '';
      const groupFromFile = row.Group || row.group || row['Dance Group'] || row['DanceGroup'] || '';
      
      // Skip empty rows
      if (!name && !auditionNumber) {
        continue;
      }
      
      // Validate required fields
      if (!name || !auditionNumber) {
        errors.push(`Row skipped: Missing ${!name ? 'name' : 'audition number'}`);
        continue;
      }
      
      const auditionNumberStr = auditionNumber.toString();
      
      // Check for duplicate audition number
      if (existingAuditionNumbers.has(auditionNumberStr)) {
        duplicates.push({ name, auditionNumber: auditionNumberStr });
        continue;
      }
      
      // Add to set to prevent duplicates within the same upload
      existingAuditionNumbers.add(auditionNumberStr);
      
      // Auto-assign group based on audition number (unless specified in file)
      let assignedGroup = groupFromFile;
      if (!assignedGroup) {
        const auditionNum = parseInt(auditionNumberStr);
        if (!isNaN(auditionNum) && auditionNum > 0) {
          const groupNumber = Math.ceil(auditionNum / 5);
          assignedGroup = `Group ${groupNumber}`;
        } else {
          assignedGroup = 'Unassigned';
        }
      }
      
      const dancerData = {
        name: name.trim(),
        auditionNumber: auditionNumberStr,
        email: email ? email.trim() : '',
        phone: phone ? phone.trim() : '',
        shirtSize: shirtSize ? shirtSize.toString().trim() : '',
        group: assignedGroup,
        createdAt: new Date(),
        scores: []
      };
      
      try {
        const docRef = await db.collection('dancers').add(dancerData);
        dancers.push({ id: docRef.id, ...dancerData });
      } catch (error) {
        errors.push(`Failed to add ${name}: ${error.message}`);
      }
    }

    const response = {
      message: `Successfully uploaded ${dancers.length} dancers`,
      dancers,
      warnings: []
    };
    
    if (duplicates.length > 0) {
      response.warnings.push(
        `Skipped ${duplicates.length} duplicate(s): ${duplicates.map(d => `${d.name} (#${d.auditionNumber})`).join(', ')}`
      );
    }
    
    if (errors.length > 0) {
      response.warnings.push(...errors);
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Scoring routes
app.post('/api/scores', authenticateToken, async (req, res) => {
  try {
    const clubId = getClubId(req);
    const { dancerId, scores, judgeId, comments, auditionId } = req.body;
    
    console.log(`Judge ${req.user.id} submitting scores for dancer ${dancerId}:`, scores);
    
    // Verify dancer belongs to user's club (security check)
    const dancerDoc = await db.collection('dancers').doc(dancerId).get();
    if (!dancerDoc.exists) {
      return res.status(404).json({ error: 'Dancer not found' });
    }
    
    const dancerData = dancerDoc.data();
    if (dancerData.clubId && dancerData.clubId !== clubId) {
      return res.status(403).json({ error: 'Access denied: Dancer belongs to a different club' });
    }
    
    // Check if this judge has already submitted scores for this dancer (filtered by clubId)
    const existingScoresSnapshot = await db.collection('scores')
      .where('clubId', '==', clubId) // Filter by clubId for security
      .where('dancerId', '==', dancerId)
      .where('judgeId', '==', req.user.id)
      .get();
    
    // Check if there's a SUBMITTED score (not just a draft)
    const hasSubmittedScore = !existingScoresSnapshot.empty && 
                               existingScoresSnapshot.docs.some(doc => doc.data().submitted === true);
    
    if (hasSubmittedScore) {
      return res.status(400).json({ 
        error: 'You have already submitted scores for this dancer. Use unsubmit to make changes.' 
      });
    }
    
    // If there's an existing draft (submitted: false), update it
    // Otherwise create new score
    let docRef;
    const scoreData = {
      dancerId,
      auditionId: auditionId || dancerData.auditionId || null,
      clubId: clubId, // Multi-tenant: associate with user's club
      judgeId: req.user.id,
      judgeName: req.user.name || req.user.email || req.user.id,
      scores: {
        kick: scores.kick || 0,
        jump: scores.jump || 0,
        turn: scores.turn || 0,
        performance: scores.performance || 0,
        execution: scores.execution || 0,
        technique: scores.technique || 0
      },
      comments: comments || '',
      submitted: true,
      timestamp: new Date()
    };
    
    if (!existingScoresSnapshot.empty) {
      // Update existing draft score
      const existingDoc = existingScoresSnapshot.docs[0];
      await existingDoc.ref.update(scoreData);
      docRef = existingDoc.ref;
      console.log(`Score updated with ID: ${existingDoc.id}`);
    } else {
      // Create new score
      docRef = await db.collection('scores').add(scoreData);
      console.log(`Score saved with ID: ${docRef.id}`);
      
      // Update dancer's scores array only for new scores
      await db.collection('dancers').doc(dancerId).update({
        scores: admin.firestore.FieldValue.arrayUnion(docRef.id)
      });
    }

    // Clear cache for this audition's dancers when scores are submitted
    if (auditionId) {
      const cacheKey = `dancers_${clubId}_${auditionId}`;
      cache.del(cacheKey);
    }
    // Also clear generic cache
    const genericCacheKey = `dancers_${clubId}_*`;
    cache.keys().forEach(key => {
      if (key.startsWith(`dancers_${clubId}_`)) {
        cache.del(key);
      }
    });
    
    res.json({ id: docRef.id, ...scoreData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Auto-save draft scores (saves as draft, not submitted)
app.put('/api/scores/draft/:dancerId', authenticateToken, async (req, res) => {
  try {
    const { dancerId } = req.params;
    const clubId = getClubId(req);
    const { scores: scoreValues, comments, auditionId } = req.body;
    
    console.log(`Judge ${req.user.id} auto-saving draft scores for dancer ${dancerId}`);
    
    // Verify dancer belongs to user's club
    const dancerDoc = await db.collection('dancers').doc(dancerId).get();
    if (!dancerDoc.exists) {
      return res.status(404).json({ error: 'Dancer not found' });
    }
    
    const dancerData = dancerDoc.data();
    if (dancerData.clubId && dancerData.clubId !== clubId) {
      return res.status(403).json({ error: 'Access denied: Dancer belongs to a different club' });
    }
    
    // Check for existing score (draft or submitted)
    const existingScoresSnapshot = await db.collection('scores')
      .where('clubId', '==', clubId)
      .where('dancerId', '==', dancerId)
      .where('judgeId', '==', req.user.id)
      .get();
    
    const scoreData = {
      dancerId,
      auditionId: auditionId || dancerData.auditionId || null,
      clubId: clubId,
      judgeId: req.user.id,
      judgeName: req.user.name || req.user.email || req.user.id,
      scores: {
        kick: scoreValues?.kick || 0,
        jump: scoreValues?.jump || 0,
        turn: scoreValues?.turn || 0,
        performance: scoreValues?.performance || 0,
        execution: scoreValues?.execution || 0,
        technique: scoreValues?.technique || 0
      },
      comments: comments || '',
      submitted: false, // Always save as draft
      timestamp: new Date(),
      lastSaved: new Date() // Track when last auto-saved
    };
    
    if (!existingScoresSnapshot.empty) {
      // Update existing score (preserve submitted status if it was submitted)
      const existingDoc = existingScoresSnapshot.docs[0];
      const existingData = existingDoc.data();
      
      // Only update if not already submitted (don't overwrite submitted scores)
      if (!existingData.submitted) {
        await existingDoc.ref.update(scoreData);
        console.log(`✅ Draft score auto-saved for dancer ${dancerId}`);
        return res.json({ id: existingDoc.id, ...scoreData, message: 'Draft saved' });
      } else {
        // Already submitted, don't overwrite
        return res.json({ id: existingDoc.id, ...existingData, message: 'Already submitted, cannot save draft' });
      }
    } else {
      // Create new draft score
      const docRef = await db.collection('scores').add(scoreData);
      console.log(`✅ New draft score created for dancer ${dancerId}`);
      
      // Update dancer's scores array
      await db.collection('dancers').doc(dancerId).update({
        scores: admin.firestore.FieldValue.arrayUnion(docRef.id)
      });
      
      return res.json({ id: docRef.id, ...scoreData, message: 'Draft saved' });
    }
  } catch (error) {
    console.error('Error auto-saving draft scores:', error);
    res.status(500).json({ error: error.message });
  }
});

// Unsubmit scores route
app.put('/api/scores/unsubmit/:dancerId', authenticateToken, async (req, res) => {
  try {
    const { dancerId } = req.params;
    const clubId = getClubId(req);
    const judgeId = req.user.id;
    
    console.log(`Judge ${judgeId} unsubmitting scores for dancer ${dancerId}`);
    
    // Verify dancer belongs to user's club
    const dancerDoc = await db.collection('dancers').doc(dancerId).get();
    if (!dancerDoc.exists) {
      return res.status(404).json({ error: 'Dancer not found' });
    }
    
    const dancerData = dancerDoc.data();
    if (dancerData.clubId && dancerData.clubId !== clubId) {
      return res.status(403).json({ error: 'Access denied: Dancer belongs to a different club' });
    }
    
    // Find the score document for this judge and dancer (filtered by clubId)
    const scoresSnapshot = await db.collection('scores')
      .where('clubId', '==', clubId) // Filter by clubId for security
      .where('dancerId', '==', dancerId)
      .where('judgeId', '==', judgeId)
      .get();
    
    if (scoresSnapshot.empty) {
      return res.status(404).json({ error: 'No scores found for this dancer and judge' });
    }
    
    // Update the first (and should be only) score document
    const scoreDoc = scoresSnapshot.docs[0];
    await scoreDoc.ref.update({
      submitted: false,
      timestamp: new Date()
    });
    
    res.json({ message: 'Scores unsubmitted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get submission status for a judge (single dancer)
app.get('/api/scores/submission-status/:dancerId', authenticateToken, async (req, res) => {
  try {
    const { dancerId } = req.params;
    const judgeId = req.user.id;
    const clubId = getClubId(req);
    
    // Try to find scores by judgeId first, then by judgeName
    let scoresSnapshot = await db.collection('scores')
      .where('clubId', '==', clubId)
      .where('dancerId', '==', dancerId)
      .where('judgeId', '==', judgeId)
      .get();
    
    // If not found by judgeId, try by judgeName (for compatibility)
    if (scoresSnapshot.empty) {
      const judgeName = req.user.name || req.user.email || judgeId;
      scoresSnapshot = await db.collection('scores')
        .where('clubId', '==', clubId)
        .where('dancerId', '==', dancerId)
        .where('judgeName', '==', judgeName)
        .get();
    }
    
    if (scoresSnapshot.empty) {
      return res.json({ submitted: false, hasScores: false });
    }
    
    const scoreData = scoresSnapshot.docs[0].data();
    res.json({ 
      submitted: scoreData.submitted || false, 
      hasScores: true,
      scores: scoreData.scores,
      comments: scoreData.comments
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Batch get submission status for multiple dancers (OPTIMIZED)
app.post('/api/scores/submission-status/batch', authenticateToken, async (req, res) => {
  try {
    const { dancerIds } = req.body;
    const judgeId = req.user.id;
    const clubId = getClubId(req);
    
    if (!Array.isArray(dancerIds) || dancerIds.length === 0) {
      return res.json({});
    }
    
    // Batch fetch all scores for these dancers and this judge
    const statusMap = {};
    
    // Firestore 'in' queries are limited to 10 items, so we need to batch
    const scoreQueries = [];
    for (let i = 0; i < dancerIds.length; i += 10) {
      const batchIds = dancerIds.slice(i, i + 10);
      scoreQueries.push(
        db.collection('scores')
          .where('clubId', '==', clubId)
          .where('dancerId', 'in', batchIds)
          .where('judgeId', '==', judgeId)
          .get()
      );
    }
    
    const scoreResults = await Promise.all(scoreQueries);
    const allScores = scoreResults.flatMap(result => result.docs);
    
    // Group scores by dancerId
    const scoresByDancerId = {};
    for (const scoreDoc of allScores) {
      const scoreData = scoreDoc.data();
      const dancerId = scoreData.dancerId;
      if (!scoresByDancerId[dancerId]) {
        scoresByDancerId[dancerId] = [];
      }
      scoresByDancerId[dancerId].push(scoreData);
    }
    
    // Build response map
    for (const dancerId of dancerIds) {
      const dancerScores = scoresByDancerId[dancerId] || [];
      if (dancerScores.length === 0) {
        statusMap[dancerId] = { submitted: false, hasScores: false };
      } else {
        const scoreData = dancerScores[0]; // Take first score (should be only one per judge/dancer)
        statusMap[dancerId] = {
          submitted: scoreData.submitted || false,
          hasScores: true,
          scores: scoreData.scores,
          comments: scoreData.comments || ''
        };
      }
    }
    
    res.json(statusMap);
  } catch (error) {
    console.error('Error batch fetching submission status:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/scores/:dancerId', authenticateToken, async (req, res) => {
  try {
    const { dancerId } = req.params;
    const clubId = getClubId(req);
    
    // Verify dancer belongs to user's club
    const dancerDoc = await db.collection('dancers').doc(dancerId).get();
    if (dancerDoc.exists) {
      const dancerData = dancerDoc.data();
      if (dancerData.clubId && dancerData.clubId !== clubId) {
        return res.status(403).json({ error: 'Access denied: Dancer belongs to a different club' });
      }
    }
    
    // Filter scores by clubId for security
    const snapshot = await db.collection('scores')
      .where('clubId', '==', clubId)
      .where('dancerId', '==', dancerId)
      .get();
    
    const scores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(scores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Results and analytics
app.get('/api/results', authenticateToken, async (req, res) => {
  try {
    const clubId = getClubId(req);
    
    // Filter dancers by clubId for multi-tenant isolation
    const snapshot = await db.collection('dancers')
      .where('clubId', '==', clubId)
      .get();
    const dancers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log(`Found ${dancers.length} dancers in club ${clubId}`);
    
    const results = [];
    for (const dancer of dancers) {
      // Skip dancers with empty names or audition numbers
      if (!dancer.name || !dancer.auditionNumber) {
        console.log(`Skipping dancer with missing data:`, dancer);
        continue;
      }
      
      // Filter scores by clubId for security
      const scoresSnapshot = await db.collection('scores')
        .where('clubId', '==', clubId)
        .where('dancerId', '==', dancer.id)
        .get();
      
      const scores = scoresSnapshot.docs.map(doc => doc.data());
      
      if (scores.length > 0) {
        // Calculate averages with high/low dropping for 9 judges
        const calculateAverageWithDropping = (scoreArray) => {
          if (scoreArray.length === 0) {
            return 0;
          }
          if (scoreArray.length <= 2) {
            return scoreArray.reduce((sum, val) => sum + val, 0) / scoreArray.length;
          }
          
          // Sort scores
          const sortedScores = [...scoreArray].sort((a, b) => a - b);
          
          // Drop highest and lowest if we have more than 2 scores
          const trimmedScores = sortedScores.slice(1, -1);
          
          if (trimmedScores.length === 0) {
            return 0;
          }
          
          return trimmedScores.reduce((sum, val) => sum + val, 0) / trimmedScores.length;
        };

        // Calculate variance for judge scores (shows consistency)
        const calculateVariance = (scoreArray) => {
          if (scoreArray.length <= 1) {
            return 0;
          }
          
          const mean = scoreArray.reduce((sum, val) => sum + val, 0) / scoreArray.length;
          const squaredDiffs = scoreArray.map(score => Math.pow(score - mean, 2));
          const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / scoreArray.length;
          
          return variance;
        };

        // Extract scores for each category
        const kickScores = scores.map(s => s.scores.kick);
        const jumpScores = scores.map(s => s.scores.jump);
        const turnScores = scores.map(s => s.scores.turn);
        const performanceScores = scores.map(s => s.scores.performance);
        const executionScores = scores.map(s => s.scores.execution);
        const techniqueScores = scores.map(s => s.scores.technique);

        const averages = {
          kick: calculateAverageWithDropping(kickScores),
          jump: calculateAverageWithDropping(jumpScores),
          turn: calculateAverageWithDropping(turnScores),
          performance: calculateAverageWithDropping(performanceScores),
          execution: calculateAverageWithDropping(executionScores),
          technique: calculateAverageWithDropping(techniqueScores)
        };

        // Calculate variance for each category (shows judge consistency)
        const variances = {
          kick: calculateVariance(kickScores),
          jump: calculateVariance(jumpScores),
          turn: calculateVariance(turnScores),
          performance: calculateVariance(performanceScores),
          execution: calculateVariance(executionScores),
          technique: calculateVariance(techniqueScores)
        };
        
        // Total score out of 32 (kick 4 + jump 4 + turn 4 + performance 4 + execution 8 + technique 8)
        const totalAverage = averages.kick + averages.jump + averages.turn + averages.performance + averages.execution + averages.technique;
        
        // Calculate variance of total scores (shows overall judge consistency)
        const totalScores = scores.map(score => 
          score.scores.kick + score.scores.jump + score.scores.turn + score.scores.performance + score.scores.execution + score.scores.technique
        );
        const totalVariance = calculateVariance(totalScores);
        
        // Include individual judge scores for detailed breakdown
        const individualScores = scores.map(score => ({
          judgeId: score.judgeId,
          scores: score.scores,
          total: score.scores.kick + score.scores.jump + score.scores.turn + score.scores.performance + score.scores.execution + score.scores.technique,
          comments: score.comments || '',
          timestamp: score.timestamp || null,
          submitted: score.submitted || false
        }));
        
        results.push({
          ...dancer,
          averages,
          variances,
          totalAverage,
          totalVariance,
          scoreCount: scores.length,
          individualScores
        });
      } else {
        results.push({
          ...dancer,
          averages: null,
          totalAverage: 0,
          scoreCount: 0
        });
      }
    }
    
    // Sort by audition number (least to greatest)
    results.sort((a, b) => {
      const aNum = parseInt(a.auditionNumber) || 0;
      const bNum = parseInt(b.auditionNumber) || 0;
      return aNum - bNum;
    });
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete all dancers and scores route (MUST come before /:id route)
app.delete('/api/dancers/delete-all', authenticateToken, async (req, res) => {
  try {
    // Get all dancers
    const dancersSnapshot = await db.collection('dancers').get();
    
    // Get all scores
    const scoresSnapshot = await db.collection('scores').get();
    
    // Create batch for deletions
    const batch = db.batch();
    
    // Add all dancers to batch delete
    dancersSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Add all scores to batch delete
    scoresSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Commit the batch delete
    await batch.commit();
    
    res.json({ 
      message: `Successfully deleted ${dancersSnapshot.docs.length} dancers and ${scoresSnapshot.docs.length} scores` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete dancer route (MUST come after /delete-all route)
app.delete('/api/dancers/:id', authenticateToken, async (req, res) => {
  try {
    const dancerId = req.params.id;
    const clubId = getClubId(req);
    
    // Verify dancer exists and belongs to user's club
    const dancerDoc = await db.collection('dancers').doc(dancerId).get();
    if (!dancerDoc.exists) {
      return res.status(404).json({ error: 'Dancer not found' });
    }
    
    const dancerData = dancerDoc.data();
    if (dancerData.clubId && dancerData.clubId !== clubId) {
      return res.status(403).json({ error: 'Access denied: Dancer belongs to a different club' });
    }
    
    // Delete all scores for this dancer (filtered by clubId for security)
    const scoresSnapshot = await db.collection('scores')
      .where('clubId', '==', clubId)
      .where('dancerId', '==', dancerId)
      .get();
    
    const batch = dbAdapter.batch();
    scoresSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete the dancer
    await db.collection('dancers').doc(dancerId).delete();
    
    // Commit the batch delete for scores
    if (scoresSnapshot.docs.length > 0) {
      await batch.commit();
    }
    
    console.log(`Dancer ${dancerId} and ${scoresSnapshot.docs.length} scores deleted by ${req.user.id} from club ${clubId}`);
    res.json({ message: 'Dancer and all associated scores deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear all scores route (keeps dancers, removes all scores)
app.delete('/api/scores/clear-all', authenticateToken, async (req, res) => {
  try {
    const clubId = getClubId(req);
    
    // Get all scores for this club only
    const scoresSnapshot = await db.collection('scores')
      .where('clubId', '==', clubId)
      .get();
    
    if (scoresSnapshot.empty) {
      return res.json({ message: 'No scores to clear', count: 0 });
    }
    
    // Create batch for deletions (Firestore batch limit is 500)
    let deletedCount = 0;
    const scores = scoresSnapshot.docs;
    
    for (let i = 0; i < scores.length; i += 500) {
      const batch = dbAdapter.batch();
      const batchScores = scores.slice(i, i + 500);
      
      batchScores.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      deletedCount += batchScores.length;
    }
    
    console.log(`✅ Cleared ${deletedCount} scores for club ${clubId} by ${req.user.id}`);
    res.json({ 
      message: `Successfully cleared ${deletedCount} scores`,
      count: deletedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear all club members route
app.delete('/api/club-members/clear', authenticateToken, async (req, res) => {
  try {
    const clubId = getClubId(req);
    
    // Check if user is admin (only admins can clear data) - verify clubId match
    const judgeDoc = await db.collection('judges').doc(req.user.id).get();
    if (!judgeDoc.exists) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    const judge = judgeDoc.data();
    if (judge.clubId && judge.clubId !== clubId) {
      return res.status(403).json({ error: 'Access denied: Judge belongs to a different club' });
    }
    
    const isAdmin = judge.role === 'admin' || judge.role === 'secretary';
    
    if (!isAdmin) {
      return res.status(403).json({ error: 'Only admins can clear club members' });
    }
    
    console.log(`DELETE /api/club-members/clear called by ${req.user.id} for club ${clubId}`);
    
    // Get all club members for this club only
    const clubMembersSnapshot = await db.collection('club_members')
      .where('clubId', '==', clubId)
      .get();
    
    if (clubMembersSnapshot.empty) {
      return res.json({ message: 'No club members to clear', count: 0 });
    }
    
    // Batch delete all club members (Firestore batch limit is 500, so we may need multiple batches)
    let deletedCount = 0;
    const members = clubMembersSnapshot.docs;
    
    for (let i = 0; i < members.length; i += 500) {
      const batch = dbAdapter.batch();
      const batchMembers = members.slice(i, i + 500);
      batchMembers.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      deletedCount += batchMembers.length;
    }
    
    console.log(`✅ Cleared ${deletedCount} club members for club ${clubId} by ${req.user.id}`);
    res.json({ 
      message: `Successfully cleared ${deletedCount} club members`,
      count: deletedCount
    });
  } catch (error) {
    console.error('Error clearing club members:', error);
    res.status(500).json({ error: error.message });
  }
});

// Clear all auditions route
app.delete('/api/auditions/clear', authenticateToken, async (req, res) => {
  try {
    const clubId = getClubId(req);
    
    // Check if user is admin (only admins can clear data) - verify clubId match
    const judgeDoc = await db.collection('judges').doc(req.user.id).get();
    if (!judgeDoc.exists) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    const judge = judgeDoc.data();
    if (judge.clubId && judge.clubId !== clubId) {
      return res.status(403).json({ error: 'Access denied: Judge belongs to a different club' });
    }
    
    const isAdmin = judge.role === 'admin' || judge.role === 'secretary';
    
    if (!isAdmin) {
      return res.status(403).json({ error: 'Only admins can clear auditions' });
    }
    
    console.log(`DELETE /api/auditions/clear called by ${req.user.id} for club ${clubId}`);
    
    // Get all auditions for this club only
    const auditionsSnapshot = await db.collection('auditions')
      .where('clubId', '==', clubId)
      .get();
    
    if (auditionsSnapshot.empty) {
      return res.json({ message: 'No auditions to clear', count: 0 });
    }
    
    // Batch delete all auditions and related dancers/scores
    let deletedAuditions = 0;
    const auditions = auditionsSnapshot.docs;
    
    // Delete in batches (Firestore batch limit is 500)
    for (let i = 0; i < auditions.length; i += 500) {
      const batch = dbAdapter.batch();
      const batchAuditions = auditions.slice(i, i + 500);
      
      for (const auditionDoc of batchAuditions) {
        batch.delete(auditionDoc.ref);
        
        // Also delete all dancers for this audition (filtered by clubId)
        const dancersSnapshot = await db.collection('dancers')
          .where('clubId', '==', clubId)
          .where('auditionId', '==', auditionDoc.id)
          .get();
        
        dancersSnapshot.docs.forEach(dancerDoc => {
          batch.delete(dancerDoc.ref);
        });
        
        // Delete all scores for dancers in this audition (filtered by clubId)
        const scoresSnapshot = await db.collection('scores')
          .where('clubId', '==', clubId)
          .where('auditionId', '==', auditionDoc.id)
          .get();
        
        scoresSnapshot.docs.forEach(scoreDoc => {
          batch.delete(scoreDoc.ref);
        });
      }
      
      await batch.commit();
      deletedAuditions += batchAuditions.length;
    }
    
    console.log(`✅ Cleared ${deletedAuditions} auditions and associated data for club ${clubId} by ${req.user.id}`);
    res.json({ 
      message: `Successfully cleared ${deletedAuditions} auditions and associated data`,
      count: deletedAuditions
    });
  } catch (error) {
    console.error('Error clearing auditions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Full database reset route (clears everything except judges and settings)
app.delete('/api/database/reset', authenticateToken, async (req, res) => {
  try {
    const clubId = getClubId(req);
    
    // Check if user is admin (only admins can perform full reset) - verify clubId match
    const judgeDoc = await db.collection('judges').doc(req.user.id).get();
    if (!judgeDoc.exists) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    const judge = judgeDoc.data();
    if (judge.clubId && judge.clubId !== clubId) {
      return res.status(403).json({ error: 'Access denied: Judge belongs to a different club' });
    }
    
    const isAdmin = judge.role === 'admin' || judge.role === 'secretary';
    
    if (!isAdmin) {
      return res.status(403).json({ error: 'Only admins can perform full database reset' });
    }
    
    console.log(`⚠️ DELETE /api/database/reset called by ${req.user.id} for club ${clubId} - FULL RESET`);
    
    // Get all collections for this club only (filtered by clubId)
    const auditionsSnapshot = await db.collection('auditions')
      .where('clubId', '==', clubId)
      .get();
    const allDancersSnapshot = await db.collection('dancers')
      .where('clubId', '==', clubId)
      .get();
    const clubMembersSnapshot = await db.collection('club_members')
      .where('clubId', '==', clubId)
      .get();
    const allScoresSnapshot = await db.collection('scores')
      .where('clubId', '==', clubId)
      .get();
    const deliberationsSnapshot = await db.collection('deliberations')
      .where('clubId', '==', clubId)
      .get();
    const attendanceSnapshot = await db.collection('attendance_records')
      .where('clubId', '==', clubId)
      .get();
    const absenceRequestsSnapshot = await db.collection('absence_requests')
      .where('clubId', '==', clubId)
      .get();
    const makeUpSubmissionsSnapshot = await db.collection('make_up_submissions')
      .where('clubId', '==', clubId)
      .get();
    const videosSnapshot = await db.collection('audition_videos')
      .where('clubId', '==', clubId)
      .get();
    
    // Clear auditions in batches
    let deletedAuditions = 0;
    for (let i = 0; i < auditionsSnapshot.docs.length; i += 500) {
      const batch = dbAdapter.batch();
      auditionsSnapshot.docs.slice(i, i + 500).forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      deletedAuditions += Math.min(500, auditionsSnapshot.docs.length - i);
    }
    
    // Clear dancers in batches
    for (let i = 0; i < allDancersSnapshot.docs.length; i += 500) {
      const batch = dbAdapter.batch();
      allDancersSnapshot.docs.slice(i, i + 500).forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
    
    // Clear club members in batches
    for (let i = 0; i < clubMembersSnapshot.docs.length; i += 500) {
      const batch = dbAdapter.batch();
      clubMembersSnapshot.docs.slice(i, i + 500).forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
    
    // Clear scores in batches
    for (let i = 0; i < allScoresSnapshot.docs.length; i += 500) {
      const batch = dbAdapter.batch();
      allScoresSnapshot.docs.slice(i, i + 500).forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
    
    // Clear deliberations in batches
    for (let i = 0; i < deliberationsSnapshot.docs.length; i += 500) {
      const batch = dbAdapter.batch();
      deliberationsSnapshot.docs.slice(i, i + 500).forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
    
    // Clear attendance records in batches
    for (let i = 0; i < attendanceSnapshot.docs.length; i += 500) {
      const batch = dbAdapter.batch();
      attendanceSnapshot.docs.slice(i, i + 500).forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
    
    // Clear absence requests in batches
    for (let i = 0; i < absenceRequestsSnapshot.docs.length; i += 500) {
      const batch = dbAdapter.batch();
      absenceRequestsSnapshot.docs.slice(i, i + 500).forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
    
    // Clear make-up submissions in batches
    for (let i = 0; i < makeUpSubmissionsSnapshot.docs.length; i += 500) {
      const batch = dbAdapter.batch();
      makeUpSubmissionsSnapshot.docs.slice(i, i + 500).forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
    
    // Clear videos (delete files and database records)
    const fs = require('fs');
    const path = require('path');
    
    for (const videoDoc of videosSnapshot.docs) {
      const videoData = videoDoc.data();
      // Delete video file if it exists
      if (videoData.filename || videoData.videoPath) {
        const videoPath = path.join(__dirname, 'uploads', 'videos', videoData.filename || path.basename(videoData.videoPath || ''));
        try {
          if (fs.existsSync(videoPath)) {
            fs.unlinkSync(videoPath);
          }
        } catch (err) {
          console.warn(`Could not delete video file ${videoPath}:`, err.message);
        }
      }
    }
    
    // Delete video records in batches
    for (let i = 0; i < videosSnapshot.docs.length; i += 500) {
      const batch = dbAdapter.batch();
      videosSnapshot.docs.slice(i, i + 500).forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
    
    // NOTE: Judges and settings collections are PRESERVED
    
    console.log(`✅ Full database reset completed by ${req.user.id}`);
    res.json({ 
      message: 'Full database reset completed successfully. Judges and settings have been preserved.',
      deleted: {
        auditions: deletedAuditions,
        dancers: allDancersSnapshot.docs.length,
        clubMembers: clubMembersSnapshot.docs.length,
        scores: allScoresSnapshot.docs.length,
        deliberations: deliberationsSnapshot.docs.length,
        attendanceRecords: attendanceSnapshot.docs.length,
        absenceRequests: absenceRequestsSnapshot.docs.length,
        makeUpSubmissions: makeUpSubmissionsSnapshot.docs.length,
        videos: videosSnapshot.docs.length
      }
    });
  } catch (error) {
    console.error('Error performing full database reset:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export routes
app.get('/api/export/csv', authenticateToken, async (req, res) => {
  try {
    const clubId = getClubId(req);
    const results = await getResults(clubId);
    
    let csv = 'Name,Audition Number,Email,Phone,Shirt Size,Group,Kick,Jump,Turn,Performance,Execution,Technique,Total Score (32),Score Count\n';
    
    results.forEach(dancer => {
      const email = (dancer.email || '').replace(/,/g, ';'); // Replace commas in email
      const phone = (dancer.phone || '').replace(/,/g, ';'); // Replace commas in phone
      const shirtSize = (dancer.shirtSize || '').replace(/,/g, ';');
      
      if (dancer.averages) {
        csv += `${dancer.name},${dancer.auditionNumber},${email},${phone},${shirtSize},${dancer.group},${dancer.averages.kick.toFixed(2)},${dancer.averages.jump.toFixed(2)},${dancer.averages.turn.toFixed(2)},${dancer.averages.performance.toFixed(2)},${dancer.averages.execution.toFixed(2)},${dancer.averages.technique.toFixed(2)},${dancer.totalAverage.toFixed(2)},${dancer.scoreCount}\n`;
      } else {
        csv += `${dancer.name},${dancer.auditionNumber},${email},${phone},${shirtSize},${dancer.group},0,0,0,0,0,0,0,0\n`;
      }
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=dancescore-results.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/export/excel', authenticateToken, async (req, res) => {
  try {
    const clubId = getClubId(req);
    const results = await getResults(clubId);
    
    const worksheet = XLSX.utils.json_to_sheet(results.map(dancer => ({
      Name: dancer.name,
      'Audition Number': dancer.auditionNumber,
      Email: dancer.email || '',
      Phone: dancer.phone || '',
      'Shirt Size': dancer.shirtSize || '',
      Group: dancer.group,
      Kick: dancer.averages ? dancer.averages.kick.toFixed(2) : 0,
      Jump: dancer.averages ? dancer.averages.jump.toFixed(2) : 0,
      Turn: dancer.averages ? dancer.averages.turn.toFixed(2) : 0,
      Performance: dancer.averages ? dancer.averages.performance.toFixed(2) : 0,
      Execution: dancer.averages ? dancer.averages.execution.toFixed(2) : 0,
      Technique: dancer.averages ? dancer.averages.technique.toFixed(2) : 0,
      'Total Score (32)': dancer.totalAverage.toFixed(2),
      'Score Count': dancer.scoreCount
    })));
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=dancescore-results.xlsx');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to get results (filtered by clubId for multi-tenant support)
async function getResults(clubId) {
  // Filter dancers by clubId for multi-tenant isolation
  const snapshot = await db.collection('dancers')
    .where('clubId', '==', clubId)
    .get();
  const dancers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  const results = [];
  for (const dancer of dancers) {
    // Filter scores by clubId for security
    const scoresSnapshot = await db.collection('scores')
      .where('clubId', '==', clubId)
      .where('dancerId', '==', dancer.id)
      .get();
    
    const scores = scoresSnapshot.docs.map(doc => doc.data());
    
    if (scores.length > 0) {
      // Calculate averages with high/low dropping for 9 judges
      const calculateAverageWithDropping = (scoreArray) => {
        if (scoreArray.length === 0) {
          return 0;
        }
        if (scoreArray.length <= 2) {
          return scoreArray.reduce((sum, val) => sum + val, 0) / scoreArray.length;
        }
        
        // Sort scores
        const sortedScores = [...scoreArray].sort((a, b) => a - b);
        
        // Drop highest and lowest if we have more than 2 scores
        const trimmedScores = sortedScores.slice(1, -1);
        
        if (trimmedScores.length === 0) {
          return 0;
        }
        
        return trimmedScores.reduce((sum, val) => sum + val, 0) / trimmedScores.length;
      };

      // Extract scores for each category
      const kickScores = scores.map(s => s.scores.kick);
      const jumpScores = scores.map(s => s.scores.jump);
      const turnScores = scores.map(s => s.scores.turn);
      const performanceScores = scores.map(s => s.scores.performance);
      const executionScores = scores.map(s => s.scores.execution);
      const techniqueScores = scores.map(s => s.scores.technique);

      const averages = {
        kick: calculateAverageWithDropping(kickScores),
        jump: calculateAverageWithDropping(jumpScores),
        turn: calculateAverageWithDropping(turnScores),
        performance: calculateAverageWithDropping(performanceScores),
        execution: calculateAverageWithDropping(executionScores),
        technique: calculateAverageWithDropping(techniqueScores)
      };
      
      // Total score out of 32 (kick 4 + jump 4 + turn 4 + performance 4 + execution 8 + technique 8)
      const totalAverage = averages.kick + averages.jump + averages.turn + averages.performance + averages.execution + averages.technique;
      
      results.push({
        ...dancer,
        averages,
        totalAverage,
        scoreCount: scores.length
      });
    } else {
      results.push({
        ...dancer,
        averages: null,
        totalAverage: 0,
        scoreCount: 0
      });
    }
  }
  
  return results.sort((a, b) => b.totalAverage - a.totalAverage);
}

// Generate QR Code PDF for printing
app.get('/api/export/qr-code-pdf', authenticateToken, async (req, res) => {
  try {
    const clubId = getClubId(req);
    const { auditionId, auditionName } = req.query;
    
    // If auditionId is provided, verify it belongs to user's club
    let finalAuditionName = auditionName;
    if (auditionId) {
      const auditionDoc = await db.collection('auditions').doc(auditionId).get();
      if (auditionDoc.exists) {
        const auditionData = auditionDoc.data();
        if (auditionData.clubId && auditionData.clubId !== clubId) {
          return res.status(403).json({ error: 'Access denied: Audition belongs to a different club' });
        }
        // Use actual audition name if not provided in query
        if (!finalAuditionName && auditionData.name) {
          finalAuditionName = auditionData.name;
        }
      }
    }
    
    // Get club name from settings
    let clubName = 'MSU Dance Club'; // Default fallback
    try {
      const settingsDoc = await db.collection('settings').doc('audition_settings').get();
      if (settingsDoc.exists) {
        const settings = settingsDoc.data();
        if (settings.clubId === clubId && settings.appearanceSettings?.clubName) {
          clubName = settings.appearanceSettings.clubName;
        }
      }
    } catch (error) {
      console.error('Error fetching club name for PDF:', error);
      // Use default
    }
    
    // Get the registration URL from environment or construct it
    // Priority: CLIENT_URL env var > FRONTEND_URL env var > req.headers.origin > construct from request > localhost (dev only)
    let baseUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL;
    
    if (!baseUrl) {
      // Try to get from request origin
      baseUrl = req.headers.origin;
      
      // If still no baseUrl, construct from request
      if (!baseUrl) {
        const protocol = req.protocol || (req.secure ? 'https' : 'http');
        const host = req.get('host');
        if (host) {
          baseUrl = `${protocol}://${host}`;
        }
      }
    }
    
    // Fallback to localhost only in development
    if (!baseUrl) {
      baseUrl = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000';
    }
    
    const registrationUrl = auditionId 
      ? `${baseUrl}/register/${auditionId}`
      : `${baseUrl}/register`;
    
    console.log(`Generating QR code PDF for club ${clubId}:`, registrationUrl);
    
    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(registrationUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 400,
      margin: 2
    });
    
    // Create PDF document
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    const filename = finalAuditionName 
      ? `${finalAuditionName.replace(/\s+/g, '-')}-Registration-QR.pdf`
      : 'dancer-registration-qr-code.pdf';
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    
    // Pipe PDF to response
    doc.pipe(res);
    
    // Add Club header (dynamic club name from settings)
    doc.fontSize(32)
       .fillColor('#667eea')
       .text(clubName, { align: 'center' })
       .moveDown(0.3);
    
    // Add audition name if provided
    if (finalAuditionName) {
      doc.fontSize(20)
         .fillColor('#8b7fb8')
         .text(auditionName, { align: 'center' })
         .moveDown(0.5);
    }
    
    doc.fontSize(18)
       .fillColor('#495057')
       .text('Dancer Registration', { align: 'center' })
       .moveDown(0.3);
    
    doc.fontSize(14)
       .fillColor('#666')
       .text('Scan the QR Code to Register', { align: 'center' })
       .moveDown(1.5);
    
    // Add QR code
    const qrImageBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
    doc.image(qrImageBuffer, {
      fit: [300, 300],
      align: 'center'
    });
    
    doc.moveDown(2);
    
    // Add registration link
    doc.fontSize(12)
       .fillColor('#6c757d')
       .text('Registration Link:', { align: 'center' });
    
    doc.fontSize(11)
       .fillColor('#667eea')
       .text(registrationUrl, { align: 'center', link: registrationUrl })
       .moveDown(2);
    
    // Add instructions
    doc.fontSize(14)
       .fillColor('#495057')
       .text('How to Register:', { underline: true })
       .moveDown(0.5);
    
    doc.fontSize(11)
       .fillColor('#495057')
       .list([
         'Open your phone\'s camera app',
         'Point the camera at the QR code above',
         'Tap the notification that appears',
         'Fill out the registration form with all required information',
         'Submit the form',
         'Wait for confirmation message',
         'Proceed to the waiting area'
       ], { bulletRadius: 2 })
       .moveDown(1);
    
    // Add required fields
    doc.fontSize(14)
       .fillColor('#495057')
       .text('Required Information:', { underline: true })
       .moveDown(0.5);
    
    doc.fontSize(11)
       .fillColor('#495057')
       .list([
         'Full Name',
         'Audition Number (assigned at check-in)',
         'Email Address',
         'Phone Number',
         'Shirt Size (Small, Medium, Large, or XL)'
       ], { bulletRadius: 2 })
       .moveDown(1);
    
    // Add note about groups
    doc.fontSize(10)
       .fillColor('#856404')
       .text('Note: Groups are automatically assigned based on audition number (1-5 = Group 1, 6-10 = Group 2, etc.)', {
         align: 'center',
         width: 500
       });
    
    // Add footer
    doc.moveDown(2);
    doc.fontSize(9)
       .fillColor('#6c757d')
       .text('DanceScore Pro - Digital Audition Management System', { align: 'center' });
    
    // Finalize PDF
    doc.end();
    
  } catch (error) {
    console.error('Error generating QR code PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// File Management Endpoints
// Get all files organized by category (videos, make-up submissions, exports)
app.get('/api/files', authenticateToken, async (req, res) => {
  try {
    const clubId = getClubId(req);
    const fs = require('fs');
    const path = require('path');
    
    const files = {
      videos: [],
      makeUpSubmissions: [],
      archived: []
    };
    
    // Get all videos for this club
    try {
      const videosSnapshot = await db.collection('audition_videos')
        .where('clubId', '==', clubId)
        .get();
      
      for (const doc of videosSnapshot.docs) {
        const videoData = doc.data();
        const auditionDoc = await db.collection('auditions').doc(videoData.auditionId).get();
        const auditionName = auditionDoc.exists ? auditionDoc.data().name : 'Unknown Audition';
        
        files.videos.push({
          id: doc.id,
          type: 'video',
          name: videoData.originalName || videoData.filename || 'Unknown Video',
          filename: videoData.filename,
          size: videoData.size || 0,
          mimeType: videoData.mimeType || 'video/webm',
          createdAt: videoData.createdAt?.toDate?.() || videoData.createdAt,
          recordedAt: videoData.recordedAt?.toDate?.() || videoData.recordedAt,
          recordedBy: videoData.recordedByName || videoData.recordedBy || 'Unknown',
          auditionId: videoData.auditionId,
          auditionName: auditionName,
          group: videoData.group || 'Unknown Group',
          description: videoData.description || '',
          url: `/api/videos/${doc.id}/stream`,
          path: videoData.videoPath
        });
      }
      
      // Sort videos by recordedAt descending
      files.videos.sort((a, b) => {
        const aDate = new Date(a.recordedAt || a.createdAt).getTime();
        const bDate = new Date(b.recordedAt || b.createdAt).getTime();
        return bDate - aDate;
      });
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
    
    // Get all make-up submissions for this club
    try {
      const makeUpSnapshot = await db.collection('make_up_submissions')
        .where('clubId', '==', clubId)
        .get();
      
      for (const doc of makeUpSnapshot.docs) {
        const makeUpData = doc.data();
        const eventDoc = await db.collection('attendance_events').doc(makeUpData.eventId).get();
        const eventName = eventDoc.exists ? eventDoc.data().name : 'Unknown Event';
        
        files.makeUpSubmissions.push({
          id: doc.id,
          type: 'makeup',
          name: makeUpData.makeUpOriginalName || makeUpData.makeUpFilename || 'Unknown File',
          filename: makeUpData.makeUpFilename,
          size: makeUpData.makeUpSize || 0,
          mimeType: makeUpData.makeUpMimeType || 'application/pdf',
          createdAt: makeUpData.submittedAt?.toDate?.() || makeUpData.submittedAt,
          submittedBy: makeUpData.dancerName || 'Unknown',
          dancerLevel: makeUpData.dancerLevel || '',
          eventId: makeUpData.eventId,
          eventName: eventName,
          status: makeUpData.status || 'pending',
          url: makeUpData.makeUpUrl,
          path: makeUpData.makeUpPath
        });
      }
      
      // Sort make-up files by submittedAt descending
      files.makeUpSubmissions.sort((a, b) => {
        const aDate = new Date(a.createdAt).getTime();
        const bDate = new Date(b.createdAt).getTime();
        return bDate - aDate;
      });
    } catch (error) {
      console.error('Error fetching make-up submissions:', error);
    }
    
    // Get all archived items for this club
    try {
      let archivedSnapshot;
      try {
        archivedSnapshot = await db.collection('archived_files')
          .where('clubId', '==', clubId)
          .orderBy('archivedAt', 'desc')
          .get();
      } catch (orderByError) {
        // If orderBy fails (missing index), get without ordering and sort in memory
        console.warn('OrderBy failed for archived_files, sorting in memory:', orderByError.message);
        archivedSnapshot = await db.collection('archived_files')
          .where('clubId', '==', clubId)
          .get();
      }
      
      const archivedFiles = [];
      for (const doc of archivedSnapshot.docs) {
        const archivedData = doc.data();
        
        archivedFiles.push({
          id: doc.id,
          type: 'archived',
          name: archivedData.name || 'Archived Item',
          filename: archivedData.filename,
          size: archivedData.size || 0,
          mimeType: archivedData.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          createdAt: archivedData.archivedAt?.toDate?.() || archivedData.archivedAt,
          archivedAt: archivedData.archivedAt?.toDate?.() || archivedData.archivedAt,
          archivedBy: archivedData.archivedByName || archivedData.archivedBy || 'Unknown',
          itemType: archivedData.itemType || 'audition', // 'audition', 'data', etc.
          itemId: archivedData.itemId,
          itemName: archivedData.itemName,
          description: archivedData.description || '',
          url: archivedData.fileUrl,
          path: archivedData.filePath
        });
      }
      
      // Sort by archivedAt descending if orderBy didn't work
      archivedFiles.sort((a, b) => {
        const aDate = new Date(a.archivedAt || a.createdAt).getTime();
        const bDate = new Date(b.archivedAt || b.createdAt).getTime();
        return bDate - aDate;
      });
      
      files.archived = archivedFiles;
    } catch (error) {
      console.error('Error fetching archived files:', error);
      files.archived = [];
    }
    
    res.json(files);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a file (video or make-up submission)
app.delete('/api/files/:type/:id', authenticateToken, async (req, res) => {
  try {
    const { type, id } = req.params;
    const clubId = getClubId(req);
    const fs = require('fs');
    const path = require('path');
    
    if (type === 'video') {
      // Get video record first to verify clubId
      const videoDoc = await db.collection('audition_videos').doc(id).get();
      if (!videoDoc.exists) {
        return res.status(404).json({ error: 'Video not found' });
      }
      
      const videoData = videoDoc.data();
      
      // Security check: verify video belongs to user's club
      if (videoData.clubId && videoData.clubId !== clubId) {
        return res.status(403).json({ error: 'Access denied: Video belongs to a different club' });
      }
      
      // Delete video file from server
      const videoPath = path.join(__dirname, 'uploads', 'videos', videoData.filename || path.basename(videoData.videoPath || ''));
      if (fs.existsSync(videoPath)) {
        try {
          fs.unlinkSync(videoPath);
          console.log(`✅ Deleted video file: ${videoPath}`);
        } catch (fileError) {
          console.error('Error deleting video file:', fileError);
          // Continue with database deletion even if file deletion fails
        }
      }
      
      // Delete video record from database
      await db.collection('audition_videos').doc(id).delete();
      
      res.json({ message: 'Video deleted successfully' });
    } else if (type === 'makeup') {
      // Get make-up submission record first to verify clubId
      const makeUpDoc = await db.collection('make_up_submissions').doc(id).get();
      if (!makeUpDoc.exists) {
        return res.status(404).json({ error: 'Make-up submission not found' });
      }
      
      const makeUpData = makeUpDoc.data();
      
      // Security check: verify make-up submission belongs to user's club
      if (makeUpData.clubId && makeUpData.clubId !== clubId) {
        return res.status(403).json({ error: 'Access denied: Make-up submission belongs to a different club' });
      }
      
      // Delete make-up file from server
      const makeUpPath = path.join(__dirname, 'uploads', 'make-up', makeUpData.makeUpFilename || path.basename(makeUpData.makeUpPath || ''));
      if (fs.existsSync(makeUpPath)) {
        try {
          fs.unlinkSync(makeUpPath);
          console.log(`✅ Deleted make-up file: ${makeUpPath}`);
        } catch (fileError) {
          console.error('Error deleting make-up file:', fileError);
          // Continue with database deletion even if file deletion fails
        }
      }
      
      // Delete make-up submission record from database
      await db.collection('make_up_submissions').doc(id).delete();
      
      res.json({ message: 'Make-up submission deleted successfully' });
    } else {
      return res.status(400).json({ error: 'Invalid file type' });
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: error.message });
  }
});

// Archive an audition (exports data and stores in archives)
app.post('/api/archive/audition/:id', authenticateToken, async (req, res) => {
  try {
    const { id: auditionId } = req.params;
    const clubId = getClubId(req);
    const fs = require('fs');
    const path = require('path');
    
    // Verify audition exists and belongs to user's club
    const auditionDoc = await db.collection('auditions').doc(auditionId).get();
    if (!auditionDoc.exists) {
      return res.status(404).json({ error: 'Audition not found' });
    }
    
    const auditionData = auditionDoc.data();
    if (auditionData.clubId && auditionData.clubId !== clubId) {
      return res.status(403).json({ error: 'Access denied: Audition belongs to a different club' });
    }
    
    // Get all dancers for this audition
    const dancersSnapshot = await db.collection('dancers')
      .where('clubId', '==', clubId)
      .where('auditionId', '==', auditionId)
      .get();
    
    // Get all scores for these dancers
    const dancerIds = dancersSnapshot.docs.map(doc => doc.id);
    const allScores = [];
    
    if (dancerIds.length > 0) {
      // Firestore 'in' queries are limited to 10 items, so batch
      for (let i = 0; i < dancerIds.length; i += 10) {
        const batchIds = dancerIds.slice(i, i + 10);
        const scoresSnapshot = await db.collection('scores')
          .where('clubId', '==', clubId)
          .where('dancerId', 'in', batchIds)
          .get();
        allScores.push(...scoresSnapshot.docs.map(doc => doc.data()));
      }
    }
    
    // Calculate results (similar to getResults function)
    const results = [];
    for (const dancerDoc of dancersSnapshot.docs) {
      const dancer = { id: dancerDoc.id, ...dancerDoc.data() };
      const scores = allScores.filter(s => s.dancerId === dancer.id);
      
      if (scores.length > 0) {
        const calculateAverageWithDropping = (scoreArray) => {
          if (scoreArray.length === 0) return 0;
          if (scoreArray.length <= 2) {
            return scoreArray.reduce((sum, val) => sum + val, 0) / scoreArray.length;
          }
          const sortedScores = [...scoreArray].sort((a, b) => a - b);
          const trimmedScores = sortedScores.slice(1, -1);
          if (trimmedScores.length === 0) return 0;
          return trimmedScores.reduce((sum, val) => sum + val, 0) / trimmedScores.length;
        };
        
        const kickScores = scores.map(s => s.scores.kick);
        const jumpScores = scores.map(s => s.scores.jump);
        const turnScores = scores.map(s => s.scores.turn);
        const performanceScores = scores.map(s => s.scores.performance);
        const executionScores = scores.map(s => s.scores.execution);
        const techniqueScores = scores.map(s => s.scores.technique);
        
        const averages = {
          kick: calculateAverageWithDropping(kickScores),
          jump: calculateAverageWithDropping(jumpScores),
          turn: calculateAverageWithDropping(turnScores),
          performance: calculateAverageWithDropping(performanceScores),
          execution: calculateAverageWithDropping(executionScores),
          technique: calculateAverageWithDropping(techniqueScores)
        };
        
        const totalAverage = averages.kick + averages.jump + averages.turn + 
                           averages.performance + averages.execution + averages.technique;
        
        results.push({
          ...dancer,
          averages,
          totalAverage,
          scoreCount: scores.length
        });
      } else {
        results.push({
          ...dancer,
          averages: null,
          totalAverage: 0,
          scoreCount: 0
        });
      }
    }
    
    const sortedResults = results.sort((a, b) => b.totalAverage - a.totalAverage);
    
    // Create Excel file
    const worksheet = XLSX.utils.json_to_sheet(sortedResults.map(dancer => ({
      Name: dancer.name,
      'Audition Number': dancer.auditionNumber,
      Email: dancer.email || '',
      Phone: dancer.phone || '',
      'Shirt Size': dancer.shirtSize || '',
      Group: dancer.group,
      Kick: dancer.averages ? dancer.averages.kick.toFixed(2) : 0,
      Jump: dancer.averages ? dancer.averages.jump.toFixed(2) : 0,
      Turn: dancer.averages ? dancer.averages.turn.toFixed(2) : 0,
      Performance: dancer.averages ? dancer.averages.performance.toFixed(2) : 0,
      Execution: dancer.averages ? dancer.averages.execution.toFixed(2) : 0,
      Technique: dancer.averages ? dancer.averages.technique.toFixed(2) : 0,
      'Total Score (32)': dancer.totalAverage.toFixed(2),
      'Score Count': dancer.scoreCount
    })));
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
    
    // Ensure archives directory exists
    const archivesDir = path.join(__dirname, 'uploads', 'archives');
    if (!fs.existsSync(archivesDir)) {
      fs.mkdirSync(archivesDir, { recursive: true });
    }
    
    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const safeAuditionName = (auditionData.name || 'Audition').replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const filename = `archive-${safeAuditionName}-${timestamp}.xlsx`;
    const filePath = path.join(archivesDir, filename);
    
    // Write file (XLSX.writeFile works synchronously and writes to disk)
    XLSX.writeFile(workbook, filePath);
    
    const fileStats = fs.statSync(filePath);
    
    // Store archive metadata in database
    const archiveData = {
      clubId: clubId,
      itemType: 'audition',
      itemId: auditionId,
      itemName: auditionData.name || 'Unknown Audition',
      name: `Archive: ${auditionData.name || 'Unknown Audition'}`,
      filename: filename,
      filePath: filePath,
      fileUrl: `/uploads/archives/${filename}`,
      size: fileStats.size,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      archivedAt: new Date(),
      archivedBy: req.user.id,
      archivedByName: req.user.name || 'Unknown',
      description: `Archived audition data for ${auditionData.name || 'Unknown Audition'}`
    };
    
    const archiveRef = await db.collection('archived_files').add(archiveData);
    
    // Update audition status to archived
    await db.collection('auditions').doc(auditionId).update({
      status: 'archived',
      archivedAt: new Date(),
      archivedBy: req.user.id
    });
    
    res.json({ 
      id: archiveRef.id,
      message: 'Audition archived successfully',
      ...archiveData
    });
  } catch (error) {
    console.error('Error archiving audition:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Database status endpoint
app.get('/api/database-status', authenticateToken, (req, res) => {
  try {
    const status = {
      usingLocal: db.useLocal,
      databaseType: db.useLocal ? 'SQLite (Local)' : 'Firebase Firestore',
      timestamp: new Date().toISOString()
    };
    
    if (db.monitor) {
      status.monitoring = db.monitor.getStatus();
    }
    
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Organization Sign-Up (Public - No Auth Required)
// ============================================

// Public endpoint: Create new organization with first admin user
app.post('/api/organizations/signup', async (req, res) => {
  try {
    const { organizationName, organizationSlug, adminName, adminEmail, adminPassword, adminPosition } = req.body;
    
    // Validate required fields
    if (!organizationName || !organizationSlug || !adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-_]+$/;
    if (!slugRegex.test(organizationSlug)) {
      return res.status(400).json({ 
        error: 'Organization identifier must contain only lowercase letters, numbers, hyphens, and underscores' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    // Validate password length
    if (adminPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const slug = organizationSlug.toLowerCase().trim();
    
    // Check if organization with this slug already exists
    const existingClub = await db.collection('clubs').doc(slug).get();
    if (existingClub.exists) {
      return res.status(400).json({ error: 'An organization with this identifier already exists. Please choose a different one.' });
    }

    // Check if admin email already exists in any club
    const existingJudgeSnapshot = await db.collection('judges')
      .where('email', '==', adminEmail.toLowerCase().trim())
      .limit(1)
      .get();
    
    if (!existingJudgeSnapshot.empty) {
      return res.status(400).json({ error: 'This email is already registered with another organization' });
    }

    // Create new organization/club
    const clubData = {
      name: organizationName.trim(),
      slug: slug,
      createdAt: new Date(),
      active: true,
      isDefault: false,
      createdBy: 'signup',
      createdByEmail: adminEmail.toLowerCase().trim(),
      settings: {
        appearanceSettings: {
          clubName: organizationName.trim(),
          siteTitle: 'DanceScore Pro',
          primaryColor: '#B380FF',
          secondaryColor: '#FFB3D1',
          logoUrl: '',
          showLogoInHeader: true
        }
      }
    };
    
    await db.collection('clubs').doc(slug).set(clubData);
    
    // Create default settings document for the new organization
    const defaultSettings = {
      clubId: slug,
      scoringFormat: 'slider',
      editMode: false,
      customTexts: {
        attendanceSheetTitle: 'Attendance Sheet',
        pointSheetTitle: 'Point Sheet',
        missingPracticeLabel: 'Missing Practice',
        excusedAbsenceLabel: 'Excused Absence',
        requestButtonLabel: 'Request',
        submitRequestLabel: 'Submit Request',
        pendingLabel: 'Pending',
        approvedLabel: 'Approved',
        deniedLabel: 'Denied',
        makeUpSubmissionLabel: 'Make-Up Submissions',
        submitMakeUpLabel: 'Submit Make-Up Work',
        absenceRequestInstructions: 'Submit proof of your make-up work to earn points back for the missed practice.',
        absenceRequestsTabLabel: 'Absence Requests',
        makeUpSubmissionsTabLabel: 'Make-Up Submissions',
      },
      auditionSettings: {
        defaultGroupSize: 5,
        autoAssignGroups: false,
        requireMinimumJudges: true,
        minimumJudgesCount: 3,
        allowMultipleSessions: true,
        defaultStatus: 'draft',
      },
      scoringSettings: {
        scoreCategories: [
          { name: 'kick', label: 'Kick', maxScore: 4, enabled: true },
          { name: 'jump', label: 'Jump', maxScore: 4, enabled: true },
          { name: 'turn', label: 'Turn', maxScore: 4, enabled: true },
          { name: 'performance', label: 'Performance', maxScore: 4, enabled: true },
          { name: 'execution', label: 'Execution', maxScore: 8, enabled: true },
          { name: 'technique', label: 'Technique', maxScore: 8, enabled: true },
        ],
        totalPossibleScore: 32,
        allowDecimalScores: true,
        showScoreBreakdown: true,
      },
      dancerSettings: {
        requiredFields: ['name', 'auditionNumber', 'email', 'phone', 'shirtSize', 'previousMember'],
        shirtSizeOptions: ['XS', 'Small', 'Medium', 'Large', 'XL', 'XXL'],
        previousLevelOptions: ['Level 1', 'Level 2', 'Level 3', 'Level 4'],
        autoNumberingEnabled: false,
        autoNumberingStart: 1,
        allowSelfRegistration: true,
        requireEmailVerification: false,
        allowDuplicateAuditionNumbers: false,
      },
      attendanceSettings: {
        pointPerPractice: 1,
        excusedAbsencePoints: 0,
        unexcusedAbsencePoints: 0,
        makeUpWorkEnabled: true,
        makeUpWorkPointsMultiplier: 1.0,
        requiredMakeUpProof: true,
        maxPointsPerPractice: 1,
        attendanceTrackingEnabled: true,
      },
      videoSettings: {
        videoRecordingEnabled: true,
        maxVideoSizeMB: 500,
        allowedVideoFormats: ['webm', 'mp4', 'mov'],
        requireVideoDescription: false,
        autoGroupVideos: true,
        videoRetentionDays: 365,
        allowVideoDownload: true,
      },
      notificationSettings: {
        emailNotificationsEnabled: false,
        notifyOnNewDancer: false,
        notifyOnScoreSubmission: false,
        notifyOnAbsenceRequest: true,
        notifyOnMakeUpSubmission: true,
        adminEmail: adminEmail.toLowerCase().trim(),
        smtpConfigured: false,
      },
      appearanceSettings: {
        clubName: organizationName.trim(),
        siteTitle: 'DanceScore Pro',
        primaryColor: '#B380FF',
        secondaryColor: '#FFB3D1',
        logoUrl: '',
        showLogoInHeader: true,
        customFavicon: '',
      },
      systemSettings: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        firstDayOfWeek: 'Sunday',
        language: 'en',
        enableAnalytics: false,
        enableErrorReporting: true,
        sessionTimeoutMinutes: 60,
      },
      createdAt: new Date(),
      createdBy: 'signup',
    };
    
    // Create settings document for the new organization
    // Use club-specific document ID: settings_{slug}
    await db.collection('settings').doc(`settings_${slug}`).set(defaultSettings);
    
    // Create first admin user for this organization
    // Note: Using position field as password (matching existing login logic)
    const adminUserData = {
      name: adminName.trim(),
      email: adminEmail.toLowerCase().trim(),
      role: 'admin', // First user is always admin
      position: adminPassword, // Store password in position field (matching existing system)
      active: true,
      clubId: slug, // Associate with new organization
      createdAt: new Date(),
      createdBy: 'signup'
    };
    
    const adminUserRef = await db.collection('judges').add(adminUserData);
    const adminUserId = adminUserRef.id;
    
    console.log(`✅ New organization created: ${organizationName} (${slug}) by ${adminEmail}`);
    console.log(`✅ Admin user created: ${adminName} (${adminEmail}) for club ${slug}`);
    
    // Generate JWT token for the new admin user (auto-login)
    const token = jwt.sign(
      { 
        id: adminUserId, 
        email: adminEmail.toLowerCase().trim(), 
        role: 'admin', 
        name: adminName.trim(), 
        clubId: slug 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      token,
      user: {
        id: adminUserId,
        email: adminEmail.toLowerCase().trim(),
        role: 'admin',
        name: adminName.trim(),
        position: adminPosition || 'Administrator',
        clubId: slug,
        canAccessAdmin: true
      },
      organization: {
        id: slug,
        name: organizationName.trim(),
        slug: slug
      },
      message: 'Organization created successfully'
    });
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({ error: error.message || 'Failed to create organization. Please try again.' });
  }
});

// ============================================
// Club Management Endpoints
// ============================================

// Get all clubs (admin only - for now, only returns user's club)
app.get('/api/clubs', authenticateToken, async (req, res) => {
  try {
    const clubId = getClubId(req);
    
    // For now, only return the user's club
    // Later, can expand to return all clubs if user is super admin
    const clubDoc = await db.collection('clubs').doc(clubId).get();
    
    if (!clubDoc.exists) {
      return res.status(404).json({ error: 'Club not found' });
    }
    
    const clubData = clubDoc.data();
    
    // Verify user has access to this club
    if (clubData.clubId && clubData.clubId !== clubId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({
      id: clubDoc.id,
      ...clubData
    });
  } catch (error) {
    console.error('Error fetching club:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all clubs (for admin management - returns all clubs)
app.get('/api/clubs/all', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    // Only admins can see all clubs (for now, any admin)
    // Later can add super admin check
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admin only' });
    }
    
    const clubsSnapshot = await db.collection('clubs').get();
    const clubs = clubsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(clubs);
  } catch (error) {
    console.error('Error fetching all clubs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new club (admin only)
app.post('/api/clubs', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    // Only admins can create clubs
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admin only' });
    }
    
    const { name, slug } = req.body;
    
    // Validate required fields
    if (!name || !slug) {
      return res.status(400).json({ error: 'Club name and slug are required' });
    }
    
    // Validate slug format (alphanumeric, hyphens, underscores only)
    const slugRegex = /^[a-z0-9-_]+$/;
    if (!slugRegex.test(slug)) {
      return res.status(400).json({ 
        error: 'Slug must contain only lowercase letters, numbers, hyphens, and underscores' 
      });
    }
    
    // Check if club with this slug already exists
    const existingClub = await db.collection('clubs').doc(slug).get();
    if (existingClub.exists) {
      return res.status(400).json({ error: 'A club with this slug already exists' });
    }
    
    // Create new club
    const clubData = {
      name: name.trim(),
      slug: slug.toLowerCase().trim(),
      createdAt: new Date(),
      active: true,
      isDefault: false,
      createdBy: user.id,
      createdByEmail: user.email,
      settings: {
        appearanceSettings: {
          clubName: name.trim(),
          siteTitle: 'DanceScore Pro',
          primaryColor: '#B380FF',
          secondaryColor: '#FFB3D1',
          logoUrl: '',
          showLogoInHeader: true
        }
      }
    };
    
    await db.collection('clubs').doc(slug).set(clubData);
    
    // Create default settings document for the new club
    const defaultSettings = {
      clubId: slug,
      scoringFormat: 'slider',
      editMode: false,
      customTexts: {
        attendanceSheetTitle: 'Attendance Sheet',
        pointSheetTitle: 'Point Sheet',
        missingPracticeLabel: 'Missing Practice',
        excusedAbsenceLabel: 'Excused Absence',
        requestButtonLabel: 'Request',
        submitRequestLabel: 'Submit Request',
        pendingLabel: 'Pending',
        approvedLabel: 'Approved',
        deniedLabel: 'Denied',
      },
      auditionSettings: {
        defaultGroupSize: 5,
        autoAssignGroups: false,
        requireMinimumJudges: true,
        minimumJudgesCount: 3,
        allowMultipleSessions: true,
        defaultStatus: 'draft',
      },
      scoringSettings: {
        scoreCategories: [
          { name: 'kick', label: 'Kick', maxScore: 4, enabled: true },
          { name: 'jump', label: 'Jump', maxScore: 4, enabled: true },
          { name: 'turn', label: 'Turn', maxScore: 4, enabled: true },
          { name: 'performance', label: 'Performance', maxScore: 4, enabled: true },
          { name: 'execution', label: 'Execution', maxScore: 8, enabled: true },
          { name: 'technique', label: 'Technique', maxScore: 8, enabled: true },
        ],
        totalPossibleScore: 32,
        allowDecimalScores: true,
        showScoreBreakdown: true,
      },
      dancerSettings: {
        requiredFields: ['name', 'auditionNumber', 'email', 'phone', 'shirtSize', 'previousMember'],
        shirtSizeOptions: ['XS', 'Small', 'Medium', 'Large', 'XL', 'XXL'],
        previousLevelOptions: ['Level 1', 'Level 2', 'Level 3', 'Level 4'],
        autoNumberingEnabled: false,
        autoNumberingStart: 1,
        allowSelfRegistration: true,
        requireEmailVerification: false,
        allowDuplicateAuditionNumbers: false,
      },
      attendanceSettings: {
        pointPerPractice: 1,
        excusedAbsencePoints: 0,
        unexcusedAbsencePoints: 0,
        makeUpWorkEnabled: true,
        makeUpWorkPointsMultiplier: 1.0,
        requiredMakeUpProof: true,
        maxPointsPerPractice: 1,
        attendanceTrackingEnabled: true,
      },
      videoSettings: {
        videoRecordingEnabled: true,
        maxVideoSizeMB: 500,
        allowedVideoFormats: ['webm', 'mp4', 'mov'],
        requireVideoDescription: false,
        autoGroupVideos: true,
        videoRetentionDays: 365,
        allowVideoDownload: true,
      },
      notificationSettings: {
        emailNotificationsEnabled: false,
        notifyOnNewDancer: false,
        notifyOnScoreSubmission: false,
        notifyOnAbsenceRequest: true,
        notifyOnMakeUpSubmission: true,
        adminEmail: '',
        smtpConfigured: false,
      },
      appearanceSettings: {
        clubName: name.trim(),
        siteTitle: 'DanceScore Pro',
        primaryColor: '#B380FF',
        secondaryColor: '#FFB3D1',
        logoUrl: '',
        showLogoInHeader: true,
        customFavicon: '',
      },
      systemSettings: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        firstDayOfWeek: 'Sunday',
        language: 'en',
        enableAnalytics: false,
        enableErrorReporting: true,
        sessionTimeoutMinutes: 60,
      },
      createdAt: new Date(),
      createdBy: user.id,
    };
    
    // Create settings document for the new club
    // Use club-specific document ID: settings_{slug}
    await db.collection('settings').doc(`settings_${slug}`).set(defaultSettings);
    
    console.log(`✅ Created new club: ${name} (${slug})`);
    
    res.status(201).json({
      id: slug,
      ...clubData,
      message: 'Club created successfully'
    });
  } catch (error) {
    console.error('Error creating club:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update club (admin only)
app.put('/api/clubs/:id', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const clubId = getClubId(req);
    
    // Only admins can update clubs
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admin only' });
    }
    
    // Verify club exists and user has access
    const clubDoc = await db.collection('clubs').doc(id).get();
    if (!clubDoc.exists) {
      return res.status(404).json({ error: 'Club not found' });
    }
    
    const clubData = clubDoc.data();
    
    // Verify user has access to this club (must be their club or super admin)
    if (id !== clubId && !user.isSuperAdmin) {
      return res.status(403).json({ error: 'Access denied: Can only update your own club' });
    }
    
    const { name, active } = req.body;
    const updateData = {
      updatedAt: new Date(),
      updatedBy: user.id
    };
    
    if (name !== undefined) {
      updateData.name = name.trim();
      // Also update appearanceSettings.clubName in settings
      if (updateData.name) {
        const settingsDoc = await db.collection('settings').doc('audition_settings').get();
        if (settingsDoc.exists) {
          const settings = settingsDoc.data();
          if (settings.clubId === id) {
            await db.collection('settings').doc('audition_settings').update({
              'appearanceSettings.clubName': updateData.name
            });
          }
        }
      }
    }
    
    if (active !== undefined) {
      updateData.active = active;
    }
    
    await db.collection('clubs').doc(id).update(updateData);
    
    res.json({
      id: id,
      ...clubData,
      ...updateData,
      message: 'Club updated successfully'
    });
  } catch (error) {
    console.error('Error updating club:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get club by slug (public - for registration pages)
app.get('/api/clubs/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const clubDoc = await db.collection('clubs').doc(slug).get();
    
    if (!clubDoc.exists) {
      return res.status(404).json({ error: 'Club not found' });
    }
    
    const clubData = clubDoc.data();
    
    // Only return public information
    res.json({
      id: clubDoc.id,
      name: clubData.name,
      slug: clubData.slug,
      active: clubData.active
    });
  } catch (error) {
    console.error('Error fetching club by slug:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve React app for client-side routing (must be last, after all API routes)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    // Don't serve React app for API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`✅ Serving React app from client/build`);
  }
});
