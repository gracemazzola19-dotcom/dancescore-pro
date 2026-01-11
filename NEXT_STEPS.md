# Next Steps - Multi-Tenant Feature Completion

## 🎯 Current Status

✅ **Phase 1: Foundation (COMPLETE)**
- Database migration with clubId
- All API endpoints updated for multi-tenant filtering
- Authentication includes clubId in JWT tokens
- Data isolation fully implemented

## 📋 Recommended Next Steps

### Step 1: Replace Hardcoded "MSU Dance Club" with Dynamic Club Name ⚡ **HIGH PRIORITY**

**Why this first?** This is the most visible change and makes the app truly customizable per club.

**What needs to change:**
- Replace hardcoded "MSU Dance Club" text in 6 frontend components
- Use `appearanceSettings.clubName` from the club's settings
- Update PDF generation to use dynamic club name

**Files to update:**
1. `client/src/components/Login.tsx` - Line 91
2. `client/src/components/JudgeDashboard.tsx` - Line 430
3. `client/src/components/AdminDashboard.tsx` - Line 608
4. `client/src/components/DancerRegistration.tsx` - Line 88
5. `client/src/components/DancerLogin.tsx` - Line 42
6. `client/src/components/RecordingView.tsx` - Line 239
7. `server/index.js` - Line 4428 (PDF generation)

**Implementation:**
- Fetch club name from settings on component load
- Display dynamic club name in headers
- Default to "MSU Dance Club" if not set

**Estimated Time:** 1-2 hours

---

### Step 2: Club Management UI ⚡ **HIGH PRIORITY**

**Why this is important:** This enables the core vision - allowing clubs to create their own instances.

**Features to build:**

#### A. Club Creation (Admin Only)
- New endpoint: `POST /api/clubs`
- Create new club with:
  - Club name
  - Club slug (unique identifier)
  - Initial admin user
- Validate slug uniqueness
- Create default settings for new club

#### B. Club Settings Page
- Update existing Settings tab in Admin Dashboard
- Make club name editable
- Add club slug display (non-editable after creation)
- Club branding settings (logo, colors)

#### C. Club Switching (Optional - if user belongs to multiple clubs)
- Display current club in header
- Dropdown to switch clubs (if user has access)
- Re-authenticate or update token when switching

**Files to create:**
- `client/src/components/ClubManagement.tsx` (new component)

**Files to update:**
- `server/index.js` - Add club management endpoints
- `client/src/components/AdminDashboard.tsx` - Add Club Management tab

**Estimated Time:** 4-6 hours

---

### Step 3: Public Registration Enhancement ⚡ **MEDIUM PRIORITY**

**Current Issue:** Public registration (`/api/register`) doesn't know which club to assign the dancer to.

**Solutions:**

**Option A: Club Slug in URL (Recommended)**
- URL format: `/register/{clubSlug}` or `/register/{clubSlug}/{auditionId}`
- Lookup club by slug
- Assign dancer to that club's audition

**Option B: Club Selection on Registration Page**
- Display club selection dropdown on registration page
- User selects their club before registering
- Assign dancer to selected club

**Option C: Subdomain-based (Advanced)**
- Use subdomains: `msudc.dancescorepro.com`, `otherclub.dancescorepro.com`
- Extract club from subdomain
- Requires DNS configuration

**Recommended:** Option A (URL-based) is simplest and most flexible.

**Files to update:**
- `client/src/components/DancerRegistration.tsx` - Accept clubSlug from URL
- `server/index.js` - Update `/api/register` endpoint to accept clubSlug or auditionId
- `server/index.js` - Lookup club from audition or slug
- `client/src/App.tsx` - Add route for `/register/:clubSlug/:auditionId?`

**Estimated Time:** 2-3 hours

---

### Step 4: Data Export/Import for "Download" Feature ⚡ **MEDIUM PRIORITY**

**This is the "download" feature you originally wanted:**

**Export Functionality:**
- New endpoint: `GET /api/export/club-data`
- Export all club data as JSON:
  - Auditions
  - Dancers
  - Scores
  - Settings
  - Videos (links or metadata)
  - Club members
  - Attendance records
- Generate downloadable file

**Import Functionality:**
- New endpoint: `POST /api/import/club-data`
- Accept exported JSON file
- Validate data structure
- Create new club from imported data
- Import all data to new club (with new IDs)

**Standalone Package:**
- Create deployment package (ZIP file)
- Include:
  - Full application code
  - Database setup scripts
  - Installation instructions
  - Sample data (from export)

**Files to create:**
- `server/scripts/export-club-data.js`
- `server/scripts/import-club-data.js`
- `docs/DEPLOYMENT_GUIDE.md`

**Files to update:**
- `server/index.js` - Add export/import endpoints

**Estimated Time:** 6-8 hours

---

### Step 5: Testing & Documentation ⚡ **ONGOING**

**Testing Checklist:**
- [ ] Test club creation
- [ ] Test club name changes
- [ ] Test public registration with club slug
- [ ] Test data export
- [ ] Test data import
- [ ] Test club isolation (create 2 clubs, verify data separation)
- [ ] Test club switching (if implemented)
- [ ] Test all existing features still work

**Documentation:**
- [ ] Update README with multi-tenant setup
- [ ] Create club management guide
- [ ] Create export/import guide
- [ ] Update deployment documentation

---

## 🎯 Recommended Order

**Immediate (Do First):**
1. ✅ Replace hardcoded "MSU Dance Club" (30 min - makes it visible)

**Short Term (This Week):**
2. ✅ Club Management UI (4-6 hours - enables core feature)
3. ✅ Public Registration Enhancement (2-3 hours - makes it usable)

**Medium Term (Next Week):**
4. ✅ Data Export/Import (6-8 hours - enables "download" feature)

**Ongoing:**
5. ✅ Testing & Documentation (ongoing)

---

## 🚀 Quick Start: Step 1 Implementation

**To replace hardcoded "MSU Dance Club" right now:**

1. **Fetch club name from settings** in each component
2. **Use `appearanceSettings.clubName`** from the club's settings
3. **Fallback to "MSU Dance Club"** if settings not loaded

**Pattern to follow:**
```typescript
// In component
const [clubName, setClubName] = useState('MSU Dance Club');

useEffect(() => {
  // Fetch settings and extract club name
  const fetchClubName = async () => {
    try {
      const response = await api.get('/api/settings');
      const clubName = response.data.appearanceSettings?.clubName || 'MSU Dance Club';
      setClubName(clubName);
    } catch (error) {
      console.error('Error fetching club name:', error);
      // Keep default
    }
  };
  fetchClubName();
}, []);
```

---

## 💡 What Makes Sense to Do Next?

Based on your original request: *"hypothetically i would want a club to be able to download this site a create a new database for their club"*

**The most logical next steps are:**

1. **Step 1** - Replace hardcoded club name (quick win, makes it customizable)
2. **Step 2** - Club Management UI (enables club creation - core feature)
3. **Step 4** - Export/Import (enables the "download" feature you wanted)

**Should I start with Step 1 (Replace hardcoded club name)?**

This is the fastest way to see visible changes and makes the app truly customizable per club. Then we can move to club creation and the export/import features.
