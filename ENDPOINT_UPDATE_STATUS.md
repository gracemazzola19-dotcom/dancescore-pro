# Multi-Tenant Endpoint Update Status

## Overview
This document tracks which API endpoints have been updated for multi-tenant support (adding clubId filtering) and which still need updating.

## Pattern for Updates

### For GET endpoints (reading data):
```javascript
const clubId = getClubId(req);
// Add .where('clubId', '==', clubId) to all queries
const snapshot = await db.collection('collection_name')
  .where('clubId', '==', clubId)
  .get();
```

### For POST endpoints (creating data):
```javascript
const clubId = getClubId(req);
const data = {
  ...req.body,
  clubId: clubId, // Always include clubId
  // ... other fields
};
await db.collection('collection_name').add(data);
```

### For PUT/DELETE endpoints (updating/deleting):
```javascript
const clubId = getClubId(req);
// Verify record belongs to user's club first
const doc = await db.collection('collection_name').doc(id).get();
if (!doc.exists) return res.status(404).json({ error: 'Not found' });
const data = doc.data();
if (data.clubId && data.clubId !== clubId) {
  return res.status(403).json({ error: 'Access denied' });
}
// Then proceed with update/delete
```

## ✅ Updated Endpoints (Critical Path)

### Authentication & Settings
- ✅ `POST /api/auth/login` - Added clubId to JWT token
- ✅ `POST /api/auth/dancer-login` - Added clubId to JWT token
- ✅ `GET /api/settings` - Added clubId filtering
- ✅ `PUT /api/settings` - Added clubId to settings
- ✅ `GET /api/user/permissions` - Added clubId verification

### Auditions
- ✅ `GET /api/auditions` - Added clubId filtering
- ✅ `GET /api/auditions/:id` - Added clubId verification
- ✅ `GET /api/auditions/:id/dancers` - Added clubId filtering
- ✅ `POST /api/auditions` - Added clubId to new auditions
- ✅ `PUT /api/auditions/:id/status` - Added clubId verification
- ✅ `DELETE /api/auditions/:id` - Added clubId verification
- ✅ `POST /api/auditions/:id/save-deliberations` - Added clubId verification
- ✅ `POST /api/auditions/:id/lock-scores` - Added clubId filtering

### Judges
- ✅ `GET /api/judges` - Added clubId filtering
- ✅ `POST /api/judges` - Added clubId to new judges
- ✅ `PUT /api/judges/:id/status` - Added clubId verification
- ✅ `DELETE /api/judges/:id` - Added clubId verification

### Dancers
- ✅ `GET /api/dancers` - Added clubId filtering
- ✅ `POST /api/dancers` - Added clubId to new dancers
- ✅ `GET /api/dancers-with-scores` - Added clubId filtering
- ✅ `PUT /api/dancers/:id` - Added clubId verification
- ✅ `PUT /api/dancers/:id/hide` - Added clubId verification
- ✅ `DELETE /api/dancers/:id` - Added clubId verification

### Scores
- ✅ `POST /api/scores` - Added clubId to new scores, verification
- ✅ `PUT /api/scores/unsubmit/:dancerId` - Added clubId filtering
- ✅ `GET /api/scores/:dancerId` - Added clubId filtering
- ✅ `GET /api/scores/submission-status/:dancerId` - Added clubId filtering (via unsubmit endpoint)

### Results & Club Members
- ✅ `GET /api/results` - Added clubId filtering
- ✅ `GET /api/club-members` - Added clubId filtering

### Deliberations
- ✅ `GET /api/deliberations/:auditionId` - Added clubId filtering
- ✅ `POST /api/deliberations/:auditionId` - Added clubId verification and to records

### Videos
- ✅ `POST /api/auditions/:id/videos` - Added clubId to video records
- ✅ `GET /api/auditions/:id/videos` - Added clubId filtering
- ✅ `GET /api/videos/:id/stream` - Added clubId verification
- ✅ `DELETE /api/videos/:id` - Added clubId verification

## ⚠️ Needs Update (Important)

### Dancers
- ⚠️ `PUT /api/dancers/:id` - Add clubId verification
- ⚠️ `PUT /api/dancers/:id/hide` - Add clubId verification
- ⚠️ `DELETE /api/dancers/:id` - Add clubId verification
- ⚠️ `DELETE /api/dancers/delete-all` - Add clubId filtering
- ⚠️ `POST /api/dancers/assign-groups` - Add clubId filtering
- ⚠️ `POST /api/dancers/auto-assign-groups` - Add clubId filtering
- ⚠️ `POST /api/dancers/upload` - Add clubId to uploaded dancers

### Auditions (Advanced Operations)
- ⚠️ `POST /api/auditions/:id/submit-deliberations` - Partially updated (needs complete refactor to use direct DB queries instead of fetch)

### Attendance
- ⚠️ `GET /api/attendance/events` - Add clubId filtering
- ⚠️ `POST /api/attendance/events` - Add clubId to new events
- ⚠️ `DELETE /api/attendance/events/:id` - Add clubId verification
- ⚠️ `GET /api/attendance/events/:id` - Add clubId verification
- ⚠️ `GET /api/attendance/records` - Add clubId filtering
- ⚠️ `POST /api/attendance/records` - Add clubId to records
- ⚠️ `POST /api/attendance/records/admin` - Add clubId to records
- ⚠️ `PUT /api/attendance/records/:id` - Add clubId verification
- ⚠️ `GET /api/attendance/summary` - Add clubId filtering
- ⚠️ `POST /api/attendance/bulk-update` - Add clubId filtering

### Absence Requests & Make-Up
- ⚠️ `POST /api/absence-requests` - Add clubId to requests (may need dancer lookup)
- ⚠️ `GET /api/absence-requests` - Add clubId filtering
- ⚠️ `PUT /api/absence-requests/:id` - Add clubId verification
- ⚠️ `POST /api/make-up-submissions` - Add clubId to submissions
- ⚠️ `GET /api/make-up-submissions` - Add clubId filtering
- ⚠️ `PUT /api/make-up-submissions/:id` - Add clubId verification

### Club Members
- ⚠️ `DELETE /api/club-members/:id` - Add clubId verification

### Data Management (Admin Only)
- ⚠️ `DELETE /api/club-members/clear` - Add clubId filtering (should only clear current club's data)
- ⚠️ `DELETE /api/auditions/clear` - Add clubId filtering
- ⚠️ `DELETE /api/database/reset` - Add clubId filtering (should only reset current club's data)
- ⚠️ `DELETE /api/scores/clear-all` - Add clubId filtering

### Exports
- ⚠️ `GET /api/export/csv` - Add clubId filtering
- ⚠️ `GET /api/export/excel` - Add clubId filtering
- ⚠️ `GET /api/export/qr-code-pdf` - Add clubId filtering

## 📋 Public/Unauthenticated Endpoints (Special Cases)

These endpoints may need special handling:

- `GET /api/auditions/:id/public` - Public endpoint, may not need clubId (or use subdomain/slug)
- `POST /api/register` - Dancer registration, needs clubId (how do we determine which club?)
- `GET /api/attendance/events/:id` - May be public for QR code scanning
- `POST /api/attendance/records` - May be public for QR code scanning

## 🔍 Endpoints That May Not Need Updates

- `GET /api/health` - Health check, no data access
- `GET /api/database-status` - Database status, may need clubId filtering if showing data

## Priority Order for Remaining Updates

1. **High Priority** (Core Functionality):
   - Judges (PUT/DELETE)
   - Dancers (PUT/DELETE/hide)
   - Videos (all operations)
   - Deliberations

2. **Medium Priority** (Important Features):
   - Attendance operations
   - Absence requests & make-up
   - Data management endpoints

3. **Low Priority** (Nice to Have):
   - Exports
   - Public endpoints (may need special design)

## Notes

- All endpoints should use `getClubId(req)` helper function
- Always verify clubId matches for update/delete operations (security)
- For bulk operations, filter by clubId before processing
- Public endpoints may need alternative approach (subdomain, club slug, etc.)
