# Audition Safeguards & Best Practices

This document outlines safeguards to ensure auditions run smoothly and prevent data loss.

## Table of Contents
1. [Pre-Submission Validation](#pre-submission-validation)
2. [Transaction Safety](#transaction-safety)
3. [Data Integrity Checks](#data-integrity-checks)
4. [Error Handling & Recovery](#error-handling--recovery)
5. [Audit Logging](#audit-logging)
6. [Backup & Recovery](#backup--recovery)
7. [Operational Safeguards](#operational-safeguards)
8. [Monitoring & Alerts](#monitoring--alerts)

---

## Pre-Submission Validation

### 1. Validate Before Submitting Deliberations
**Problem**: Submitting deliberations without ensuring all required data exists can cause partial transfers.

**Solution**: Add a pre-submission validation endpoint that checks:
- All dancers have required fields (name, auditionNumber)
- All dancers have at least one submitted score
- All expected judges have submitted scores
- No missing `auditionId` on scores
- All scores are properly linked to dancers

**Implementation**:
```javascript
// GET /api/auditions/:id/validate-submission
app.get('/api/auditions/:id/validate-submission', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const clubId = getClubId(req);
  
  const validation = {
    isValid: true,
    errors: [],
    warnings: [],
    stats: {}
  };
  
  // Check dancers
  const dancersSnapshot = await db.collection('dancers')
    .where('clubId', '==', clubId)
    .where('auditionId', '==', id)
    .get();
  
  validation.stats.totalDancers = dancersSnapshot.size;
  
  for (const doc of dancersSnapshot.docs) {
    const dancer = doc.data();
    
    // Check required fields
    if (!dancer.name || !dancer.auditionNumber) {
      validation.isValid = false;
      validation.errors.push(`Dancer ${doc.id} missing name or auditionNumber`);
    }
    
    // Check scores
    const scoresSnapshot = await db.collection('scores')
      .where('clubId', '==', clubId)
      .where('dancerId', '==', doc.id)
      .where('auditionId', '==', id)
      .where('submitted', '==', true)
      .get();
    
    if (scoresSnapshot.empty) {
      validation.isValid = false;
      validation.errors.push(`Dancer ${dancer.name} (#${dancer.auditionNumber}) has no submitted scores`);
    }
    
    // Check for missing auditionId
    const scoresWithMissingAuditionId = scoresSnapshot.docs.filter(
      scoreDoc => !scoreDoc.data().auditionId
    );
    if (scoresWithMissingAuditionId.length > 0) {
      validation.warnings.push(`Dancer ${dancer.name} has ${scoresWithMissingAuditionId.length} scores missing auditionId`);
    }
  }
  
  res.json(validation);
});
```

### 2. Validate Score Ranges
**Problem**: Invalid scores (negative, too high) can cause calculation errors.

**Solution**: Add validation when scores are submitted:
```javascript
const validateScore = (score, fieldName) => {
  if (typeof score !== 'number' || isNaN(score)) {
    throw new Error(`${fieldName} must be a number`);
  }
  if (score < 0 || score > 10) {
    throw new Error(`${fieldName} must be between 0 and 10`);
  }
  return true;
};
```

### 3. Check Audition Status Before Operations
**Problem**: Performing operations on inactive/completed auditions can cause confusion.

**Solution**: Add status checks before critical operations:
```javascript
// Before submitting scores
const auditionDoc = await db.collection('auditions').doc(auditionId).get();
if (!auditionDoc.exists || auditionDoc.data().status !== 'active') {
  return res.status(400).json({ 
    error: 'Cannot submit scores: Audition is not active' 
  });
}
```

---

## Transaction Safety

### 4. Use Firestore Transactions for Critical Operations
**Problem**: Partial failures can leave data in inconsistent states.

**Solution**: Wrap critical operations in transactions, especially:
- Score submission (update dancer's scores array + create score document)
- Deliberations submission (transfer multiple dancers atomically)
- Audition deletion (delete audition + dancers + scores atomically)

**Implementation**:
```javascript
// Example: Atomic score submission
app.post('/api/scores', authenticateToken, async (req, res) => {
  try {
    await db.runTransaction(async (transaction) => {
      // Read dancer document
      const dancerRef = db.collection('dancers').doc(dancerId);
      const dancerDoc = await transaction.get(dancerRef);
      
      if (!dancerDoc.exists) {
        throw new Error('Dancer not found');
      }
      
      // Create score document
      const scoreRef = db.collection('scores').doc();
      transaction.set(scoreRef, scoreData);
      
      // Update dancer's scores array
      transaction.update(dancerRef, {
        scores: admin.firestore.FieldValue.arrayUnion(scoreRef.id)
      });
      
      return { scoreId: scoreRef.id };
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Transaction failed:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### 5. Batch Operations with Error Handling
**Problem**: Large batch operations can fail partway through.

**Solution**: Process in smaller batches with rollback capability:
```javascript
async function transferDancersWithRollback(dancers, levelAssignments, auditionId) {
  const transferred = [];
  const errors = [];
  
  try {
    for (const dancer of dancers) {
      try {
        const memberRef = await db.collection('club_members').add({
          ...clubMemberData,
          auditionId: auditionId
        });
        transferred.push({ dancerId: dancer.id, memberId: memberRef.id });
      } catch (error) {
        errors.push({ dancerId: dancer.id, error: error.message });
        // Continue with next dancer instead of failing completely
      }
    }
    
    if (errors.length > 0) {
      console.error(`⚠️ ${errors.length} dancers failed to transfer:`, errors);
      // Optionally: Rollback all transfers if too many failed
      if (errors.length > dancers.length * 0.1) { // More than 10% failed
        throw new Error('Too many transfer failures, rolling back');
      }
    }
    
    return { transferred, errors };
  } catch (error) {
    // Rollback: Delete all transferred members
    for (const { memberId } of transferred) {
      await db.collection('club_members').doc(memberId).delete();
    }
    throw error;
  }
}
```

---

## Data Integrity Checks

### 6. Verify Data After Critical Operations
**Problem**: Operations can appear successful but data might not be saved correctly.

**Solution**: Always verify after writes (already partially implemented):
```javascript
// After creating score, verify it exists
const savedDoc = await docRef.get();
if (!savedDoc.exists) {
  throw new Error('Score was not created - verification failed');
}

// Verify all required fields are present
const savedData = savedDoc.data();
const requiredFields = ['dancerId', 'auditionId', 'judgeId', 'submitted'];
for (const field of requiredFields) {
  if (!savedData[field]) {
    throw new Error(`Required field ${field} is missing in saved document`);
  }
}
```

### 7. Data Consistency Checks
**Problem**: Orphaned records or broken references can cause issues.

**Solution**: Add periodic consistency checks:
```javascript
// GET /api/admin/check-data-consistency
app.get('/api/admin/check-data-consistency', authenticateToken, async (req, res) => {
  const clubId = getClubId(req);
  const issues = [];
  
  // Check for scores without auditionId
  const scoresWithoutAuditionId = await db.collection('scores')
    .where('clubId', '==', clubId)
    .where('auditionId', '==', null)
    .get();
  
  if (!scoresWithoutAuditionId.empty) {
    issues.push({
      type: 'scores_missing_auditionId',
      count: scoresWithoutAuditionId.size,
      severity: 'high'
    });
  }
  
  // Check for dancers without auditionId
  const dancersWithoutAuditionId = await db.collection('dancers')
    .where('clubId', '==', clubId)
    .where('auditionId', '==', null)
    .get();
  
  if (!dancersWithoutAuditionId.empty) {
    issues.push({
      type: 'dancers_missing_auditionId',
      count: dancersWithoutAuditionId.size,
      severity: 'medium'
    });
  }
  
  // Check for orphaned scores (score references dancer that doesn't exist)
  const allScores = await db.collection('scores')
    .where('clubId', '==', clubId)
    .get();
  
  for (const scoreDoc of allScores.docs) {
    const scoreData = scoreDoc.data();
    const dancerDoc = await db.collection('dancers').doc(scoreData.dancerId).get();
    if (!dancerDoc.exists) {
      issues.push({
        type: 'orphaned_score',
        scoreId: scoreDoc.id,
        dancerId: scoreData.dancerId,
        severity: 'high'
      });
    }
  }
  
  res.json({ issues, timestamp: new Date().toISOString() });
});
```

### 8. Prevent Duplicate Submissions
**Problem**: Accidental double-submission can create duplicate records.

**Solution**: Add idempotency keys or check for existing records:
```javascript
// Add idempotency check to deliberations submission
const existingSubmission = await db.collection('deliberations')
  .where('auditionId', '==', id)
  .where('submitted', '==', true)
  .get();

if (!existingSubmission.empty) {
  return res.status(400).json({ 
    error: 'Deliberations have already been submitted for this audition',
    submittedAt: existingSubmission.docs[0].data().submittedAt
  });
}
```

---

## Error Handling & Recovery

### 9. Comprehensive Error Logging
**Problem**: Generic errors don't provide enough context for debugging.

**Solution**: Log detailed context with errors:
```javascript
catch (error) {
  const errorContext = {
    timestamp: new Date().toISOString(),
    endpoint: req.path,
    method: req.method,
    userId: req.user?.id,
    clubId: getClubId(req),
    params: req.params,
    body: req.body,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    }
  };
  
  console.error('❌ Error with full context:', JSON.stringify(errorContext, null, 2));
  
  // Optionally: Send to error tracking service (Sentry, etc.)
  
  res.status(500).json({ 
    error: 'An error occurred',
    errorId: errorContext.timestamp, // For tracking
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message
  });
}
```

### 10. Retry Logic for Transient Failures
**Problem**: Network issues or temporary Firestore unavailability can cause failures.

**Solution**: Add retry logic with exponential backoff:
```javascript
async function retryOperation(operation, maxRetries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Check if error is retryable
      if (error.code === 14 || error.code === 'UNAVAILABLE' || error.code === 'DEADLINE_EXCEEDED') {
        const waitTime = delay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`⚠️ Retry attempt ${attempt}/${maxRetries} after ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        throw error; // Non-retryable error
      }
    }
  }
}

// Usage:
await retryOperation(async () => {
  return await db.collection('scores').add(scoreData);
});
```

### 11. Graceful Degradation
**Problem**: If one part of the system fails, the entire operation fails.

**Solution**: Design operations to continue even if non-critical parts fail:
```javascript
// When submitting deliberations, continue even if some dancers fail
for (const dancer of dancers) {
  try {
    await transferDancerToClubMembers(dancer, levelAssignments);
  } catch (error) {
    console.error(`Failed to transfer ${dancer.name}:`, error);
    // Log but continue with other dancers
    failedTransfers.push({ dancer, error });
  }
}

// Report partial success
res.json({
  success: true,
  transferred: transferredCount,
  failed: failedTransfers.length,
  failedDancers: failedTransfers
});
```

---

## Audit Logging

### 12. Comprehensive Audit Trail
**Problem**: No way to track what happened if something goes wrong.

**Solution**: Log all critical operations to an audit collection:
```javascript
async function logAuditEvent(eventType, details, userId, clubId) {
  try {
    await db.collection('audit_logs').add({
      eventType, // 'score_submitted', 'deliberations_submitted', 'audition_deleted', etc.
      details,
      userId,
      clubId,
      timestamp: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    console.error('Failed to log audit event:', error);
  }
}

// Usage in score submission:
await logAuditEvent('score_submitted', {
  dancerId,
  auditionId,
  judgeId: req.user.id,
  scoreId: docRef.id
}, req.user.id, clubId);
```

### 13. Operation History
**Problem**: No way to see what changes were made and when.

**Solution**: Track changes to critical documents:
```javascript
// When updating audition status, log the change
await db.collection('auditions').doc(id).update({
  status,
  statusHistory: admin.firestore.FieldValue.arrayUnion({
    status,
    changedAt: new Date(),
    changedBy: req.user.id
  })
});
```

---

## Backup & Recovery

### 14. Pre-Operation Backups
**Problem**: No way to recover if a critical operation goes wrong.

**Solution**: Create snapshots before major operations:
```javascript
async function createAuditionSnapshot(auditionId, clubId) {
  const snapshot = {
    auditionId,
    clubId,
    timestamp: new Date(),
    dancers: [],
    scores: []
  };
  
  // Snapshot dancers
  const dancersSnapshot = await db.collection('dancers')
    .where('clubId', '==', clubId)
    .where('auditionId', '==', auditionId)
    .get();
  
  for (const doc of dancersSnapshot.docs) {
    snapshot.dancers.push({ id: doc.id, data: doc.data() });
  }
  
  // Snapshot scores
  const scoresSnapshot = await db.collection('scores')
    .where('clubId', '==', clubId)
    .where('auditionId', '==', auditionId)
    .get();
  
  for (const doc of scoresSnapshot.docs) {
    snapshot.scores.push({ id: doc.id, data: doc.data() });
  }
  
  // Save snapshot
  await db.collection('audition_snapshots').add(snapshot);
  
  return snapshot;
}

// Before submitting deliberations:
const snapshot = await createAuditionSnapshot(id, clubId);
console.log(`📸 Created snapshot before deliberations submission`);
```

### 15. Automatic Backups
**Problem**: Data loss can occur without backups.

**Solution**: Schedule regular backups (using Cloud Functions or cron):
```javascript
// POST /api/admin/backup-audition/:id
app.post('/api/admin/backup-audition/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const clubId = getClubId(req);
  
  const backup = await createAuditionSnapshot(id, clubId);
  
  // Optionally: Export to Cloud Storage
  // await exportToCloudStorage(backup);
  
  res.json({ 
    success: true, 
    backupId: backup.id,
    timestamp: backup.timestamp 
  });
});
```

---

## Operational Safeguards

### 16. Rate Limiting
**Problem**: Too many requests can overwhelm the system or cause accidental duplicate submissions.

**Solution**: Add rate limiting to critical endpoints:
```javascript
const rateLimit = require('express-rate-limit');

const scoreSubmissionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute per IP
  message: 'Too many score submissions, please slow down'
});

app.post('/api/scores', authenticateToken, scoreSubmissionLimiter, async (req, res) => {
  // ... existing code
});
```

### 17. Request Timeout Handling
**Problem**: Long-running operations can timeout.

**Solution**: Set appropriate timeouts and handle them gracefully:
```javascript
// For long operations, use background jobs or streaming responses
app.post('/api/auditions/:id/submit-deliberations', authenticateToken, async (req, res) => {
  // Set longer timeout for this endpoint
  req.setTimeout(300000); // 5 minutes
  
  try {
    // ... existing code
  } catch (error) {
    if (error.code === 'ETIMEDOUT') {
      return res.status(504).json({ 
        error: 'Operation timed out. Please check if it completed and retry if needed.' 
      });
    }
    throw error;
  }
});
```

### 18. Connection Health Checks
**Problem**: Database connection issues can cause silent failures.

**Solution**: Add health check endpoint:
```javascript
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {}
  };
  
  // Check Firestore connection
  try {
    await db.collection('_health').limit(1).get();
    health.checks.firestore = 'connected';
  } catch (error) {
    health.status = 'unhealthy';
    health.checks.firestore = `error: ${error.message}`;
  }
  
  // Check Firebase Admin
  try {
    admin.app();
    health.checks.firebaseAdmin = 'initialized';
  } catch (error) {
    health.status = 'unhealthy';
    health.checks.firebaseAdmin = `error: ${error.message}`;
  }
  
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});
```

---

## Monitoring & Alerts

### 19. Data Quality Monitoring
**Problem**: Data quality issues can accumulate unnoticed.

**Solution**: Add monitoring endpoints:
```javascript
// GET /api/admin/audition-health/:id
app.get('/api/admin/audition-health/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const clubId = getClubId(req);
  
  const health = {
    auditionId: id,
    timestamp: new Date().toISOString(),
    issues: [],
    stats: {}
  };
  
  // Count dancers
  const dancersCount = await db.collection('dancers')
    .where('clubId', '==', clubId)
    .where('auditionId', '==', id)
    .get();
  health.stats.dancers = dancersCount.size;
  
  // Count scores
  const scoresCount = await db.collection('scores')
    .where('clubId', '==', clubId)
    .where('auditionId', '==', id)
    .where('submitted', '==', true)
    .get();
  health.stats.submittedScores = scoresCount.size;
  
  // Check for dancers without scores
  for (const dancerDoc of dancersCount.docs) {
    const scoresForDancer = await db.collection('scores')
      .where('clubId', '==', clubId)
      .where('dancerId', '==', dancerDoc.id)
      .where('auditionId', '==', id)
      .where('submitted', '==', true)
      .get();
    
    if (scoresForDancer.empty) {
      health.issues.push({
        type: 'dancer_without_scores',
        dancerId: dancerDoc.id,
        dancerName: dancerDoc.data().name
      });
    }
  }
  
  health.status = health.issues.length === 0 ? 'healthy' : 'needs_attention';
  
  res.json(health);
});
```

### 20. Alert on Critical Failures
**Problem**: Critical failures might go unnoticed.

**Solution**: Add alerting for critical operations:
```javascript
async function sendAlert(severity, message, details) {
  // Log to console (always)
  console.error(`🚨 ALERT [${severity}]: ${message}`, details);
  
  // In production, send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Send to email, Slack, PagerDuty, etc.
    // await sendToSlack(severity, message, details);
  }
}

// Usage:
try {
  await submitDeliberations();
} catch (error) {
  await sendAlert('critical', 'Deliberations submission failed', {
    auditionId,
    error: error.message,
    stack: error.stack
  });
  throw error;
}
```

---

## Implementation Priority

### High Priority (Implement First)
1. ✅ Pre-submission validation (#1)
2. ✅ Transaction safety for score submission (#4)
3. ✅ Verify data after writes (#6)
4. ✅ Comprehensive error logging (#9)
5. ✅ Audit logging (#12)

### Medium Priority
6. Data consistency checks (#7)
7. Retry logic (#10)
8. Pre-operation backups (#14)
9. Health checks (#18)
10. Data quality monitoring (#19)

### Low Priority (Nice to Have)
11. Rate limiting (#16)
12. Operation history (#13)
13. Automatic backups (#15)
14. Alerting (#20)

---

## Quick Wins

These can be implemented immediately with minimal code changes:

1. **Add validation before deliberations submission** - Prevents submitting incomplete data
2. **Verify writes after operations** - Already partially done, expand it
3. **Add detailed error logging** - Improves debugging significantly
4. **Add health check endpoint** - Helps monitor system status
5. **Add data consistency check endpoint** - Helps identify issues early

---

## Testing Safeguards

Before implementing, test each safeguard:
1. **Unit tests** - Test validation logic
2. **Integration tests** - Test with real Firestore
3. **Failure injection** - Test error handling paths
4. **Load tests** - Test under high load
5. **Recovery tests** - Test backup/restore procedures

---

## Notes

- Some safeguards may require additional dependencies (e.g., `express-rate-limit`)
- Consider performance impact of additional checks
- Balance safety with user experience (don't make operations too slow)
- Document all safeguards in code comments
- Review and update safeguards as the system evolves
