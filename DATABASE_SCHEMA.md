# Database Schema for DanceScore Pro

## Firebase Firestore Collections

### 1. Dancers Collection (`dancers`)

**Document Structure:**
```json
{
  "id": "auto-generated-id",
  "name": "string",
  "auditionNumber": "string",
  "group": "string",
  "createdAt": "timestamp",
  "scores": ["array of score document IDs"]
}
```

**Example Document:**
```json
{
  "id": "dancer_001",
  "name": "Jane Doe",
  "auditionNumber": "001",
  "group": "Group 1",
  "createdAt": "2024-01-15T10:30:00Z",
  "scores": ["score_001", "score_002"]
}
```

### 2. Scores Collection (`scores`)

**Document Structure:**
```json
{
  "id": "auto-generated-id",
  "dancerId": "string (reference to dancer)",
  "judgeId": "string (reference to judge)",
  "scores": {
    "kick": "number (0-4)",
    "jump": "number (0-4)",
    "turn": "number (0-4)",
    "performance": "number (0-4)",
    "execution": "number (0-8)",
    "technique": "number (0-8)"
  },
  "comments": "string (optional)",
  "timestamp": "timestamp"
}
```

**Example Document:**
```json
{
  "id": "score_001",
  "dancerId": "dancer_001",
  "judgeId": "judge_001",
  "scores": {
    "kick": 3.5,
    "jump": 3.0,
    "turn": 3.5,
    "performance": 3.0,
    "execution": 6.5,
    "technique": 7.0
  },
  "comments": "Great technique, needs more expression",
  "timestamp": "2024-01-15T11:00:00Z"
}
```

### 3. Users Collection (`users`) - Optional for extended user management

**Document Structure:**
```json
{
  "id": "auto-generated-id",
  "email": "string",
  "role": "string (judge|admin)",
  "name": "string",
  "createdAt": "timestamp",
  "lastLogin": "timestamp"
}
```

## Database Rules (Firestore Security Rules)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Dancers collection - readable by all authenticated users
    match /dancers/{document} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        request.auth.token.role == 'admin';
    }
    
    // Scores collection - judges can write, admins can read
    match /scores/{document} {
      allow read: if request.auth != null && 
        request.auth.token.role in ['admin', 'judge'];
      allow write: if request.auth != null && 
        request.auth.token.role == 'judge';
    }
    
    // Users collection - admin only
    match /users/{document} {
      allow read, write: if request.auth != null && 
        request.auth.token.role == 'admin';
    }
  }
}
```

## Sample Data

### Sample Dancers
```json
[
  {
    "name": "Emma Johnson",
    "auditionNumber": "001",
    "group": "Group 1"
  },
  {
    "name": "Michael Chen",
    "auditionNumber": "002", 
    "group": "Group 1"
  },
  {
    "name": "Sarah Williams",
    "auditionNumber": "003",
    "group": "Group 1"
  },
  {
    "name": "David Rodriguez",
    "auditionNumber": "004",
    "group": "Group 1"
  },
  {
    "name": "Lisa Thompson",
    "auditionNumber": "005",
    "group": "Group 1"
  },
  {
    "name": "James Wilson",
    "auditionNumber": "006",
    "group": "Group 2"
  },
  {
    "name": "Maria Garcia",
    "auditionNumber": "007",
    "group": "Group 2"
  },
  {
    "name": "Robert Brown",
    "auditionNumber": "008",
    "group": "Group 2"
  }
]
```

### Sample Scores
```json
[
  {
    "dancerId": "dancer_001",
    "judgeId": "judge_001",
    "scores": {
      "kick": 3.5,
      "jump": 3.0,
      "turn": 3.5,
      "performance": 3.0,
      "execution": 6.5,
      "technique": 7.0
    },
    "comments": "Excellent technique and stage presence"
  },
  {
    "dancerId": "dancer_002",
    "judgeId": "judge_001", 
    "scores": {
      "kick": 2.5,
      "jump": 2.0,
      "turn": 2.5,
      "performance": 2.0,
      "execution": 5.5,
      "technique": 6.0
    },
    "comments": "Good technique, needs work on performance"
  }
]
```

## Indexes Required

For optimal performance, create these composite indexes in Firestore:

1. **Scores Collection:**
   - `dancerId` (Ascending) + `timestamp` (Descending)
   - `judgeId` (Ascending) + `timestamp` (Descending)

2. **Dancers Collection:**
   - `group` (Ascending) + `auditionNumber` (Ascending)

## Scoring System

### Categories and Point Values
- **Kick**: 0-4 points
- **Jump**: 0-4 points  
- **Turn**: 0-4 points
- **Performance**: 0-4 points
- **Execution**: 0-8 points
- **Technique**: 0-8 points
- **Total**: 0-32 points

### 9-Judge System
- Designed for 9 judges total
- **High/Low Dropping**: Highest and lowest scores are dropped
- **Average Calculation**: Remaining 7 scores are averaged
- **Fallback**: If fewer than 3 judges, all scores are averaged

## Data Validation

### Frontend Validation
- Score values must be within category limits (kick/jump/turn/performance: 0-4, execution/technique: 0-8)
- Audition numbers must be unique within a group
- Required fields: name, auditionNumber, group

### Backend Validation
- JWT token validation for all protected routes
- Role-based access control
- Data type validation
- Duplicate score prevention (one score per judge per dancer)

## Backup Strategy

1. **Automated Backups:** Enable Firestore automated backups
2. **Export Scripts:** Create scripts to export data to JSON/CSV
3. **Version Control:** Track schema changes in version control
4. **Data Migration:** Plan for schema evolution over time
