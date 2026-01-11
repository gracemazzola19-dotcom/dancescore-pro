# Firestore Index Setup Guide

## Collection IDs to Use

### For Absence Requests:
**Collection ID:** `absence_requests`

**Index Fields:**
1. `clubId` - Ascending
2. `submittedAt` - Descending

---

### For Make-Up Submissions:
**Collection ID:** `make_up_submissions`

**Index Fields:**
1. `clubId` - Ascending
2. `submittedAt` - Descending

---

## Step-by-Step: Creating the Index

### Option 1: Using the Error Link (Easiest)

1. **If you see an error with a link:**
   - Click the link in the error message
   - It will open Firebase Console with the index pre-filled
   - Click "Create Index"
   - Wait 1-2 minutes

### Option 2: Manual Creation in Firebase Console

1. **Go to Firebase Console:**
   - https://console.firebase.google.com
   - Select your project

2. **Navigate to Firestore:**
   - Click "Firestore Database" in left menu
   - Click "Indexes" tab (at top)

3. **Click "Create Index"**

4. **For Absence Requests Index:**
   - **Collection ID:** `absence_requests`
   - **Query scope:** Collection
   - **Fields to index:**
     - Field: `clubId`, Order: **Ascending** ⬆️
     - Field: `submittedAt`, Order: **Descending** ⬇️
   - Click "Create"

5. **For Make-Up Submissions Index:**
   - **Collection ID:** `make_up_submissions`
   - **Query scope:** Collection
   - **Fields to index:**
     - Field: `clubId`, Order: **Ascending** ⬆️
     - Field: `submittedAt`, Order: **Descending** ⬇️
   - Click "Create"

6. **Wait for indexes to build:**
   - Status will show "Building..." (1-2 minutes)
   - When complete, status changes to "Enabled" ✅

---

## Important Notes

✅ **Collection IDs are EXACT:**
- `absence_requests` (with underscore, lowercase)
- `make_up_submissions` (with underscores, lowercase)

✅ **Field Names are EXACT:**
- `clubId` (camelCase)
- `submittedAt` (camelCase)

✅ **Order Matters:**
- `clubId` must be **Ascending** (⬆️)
- `submittedAt` must be **Descending** (⬇️)

---

## Quick Reference

### Index 1: Absence Requests
```
Collection ID: absence_requests
Fields:
  - clubId: Ascending
  - submittedAt: Descending
```

### Index 2: Make-Up Submissions
```
Collection ID: make_up_submissions
Fields:
  - clubId: Ascending
  - submittedAt: Descending
```

---

**After creating indexes, wait 1-2 minutes for them to build, then refresh your app!** 🚀
