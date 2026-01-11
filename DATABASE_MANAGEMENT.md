# DanceScore Pro - Database Management

This document explains how to manage and clean up the DanceScore Pro database for end of season maintenance.

## 🧹 Database Cleanup Scripts

### 1. Command Line Scripts

Located in `/server/scripts/`, these scripts provide comprehensive database management:

#### `database-cleanup.js` - Main Management Script

```bash
# Show current database status
node scripts/database-cleanup.js status

# Clear all club members (dancers)
node scripts/database-cleanup.js clear-club-members

# Clear all auditions
node scripts/database-cleanup.js clear-auditions

# Clear all deliberations
node scripts/database-cleanup.js clear-deliberations

# Full reset (clears everything except judges and settings)
node scripts/database-cleanup.js full-reset

# Show help
node scripts/database-cleanup.js help
```

#### `clear-club-members.js` - Simple Club Members Cleanup

```bash
# Clear all club members with detailed output
node scripts/clear-club-members.js
```

### 2. Admin Dashboard Interface

The Admin Dashboard now includes a **Database Management** section in the Settings tab with buttons for:

- **Clear Club Members** - Removes all dancers while preserving auditions, judges, and settings
- **Clear Auditions** - Removes all auditions while preserving other data
- **Full Reset** - Clears everything except judges and settings

## 🎯 End of Season Cleanup

### Recommended Process:

1. **Backup Data** (if needed)
2. **Clear Club Members** - Remove all dancers from the current season
3. **Preserve Auditions** - Keep audition templates for next season
4. **Preserve Judges** - Keep judge accounts and settings
5. **Preserve Settings** - Keep system configuration

### Command Line Example:

```bash
# Check current status
node scripts/database-cleanup.js status

# Clear club members for end of season
node scripts/database-cleanup.js clear-club-members

# Verify cleanup
node scripts/database-cleanup.js status
```

### Admin Dashboard Example:

1. Go to Admin Dashboard
2. Click on "Settings" tab
3. Scroll to "Database Management" section
4. Click "Clear Club Members"
5. Confirm the action

## ⚠️ Important Notes

- **These actions cannot be undone** - Always backup important data first
- **Club Members** = All dancers who auditioned
- **Auditions** = Audition events and their data
- **Deliberations** = Judge deliberations and level assignments
- **Judges** = Judge accounts (preserved during cleanup)
- **Settings** = System configuration (preserved during cleanup)

## 🔧 Technical Details

### Database Tables:

- `dancers` - Club members/dancers
- `auditions` - Audition events
- `deliberations` - Deliberation data
- `judges` - Judge accounts
- `settings` - System settings

### What Gets Preserved:

- Judge accounts and login credentials
- System settings and configuration
- Scoring format preferences
- Database schema and structure

### What Gets Cleared:

- All dancer/club member data
- All audition data (if selected)
- All deliberation data (if selected)

## 🚀 Quick Start

For a typical end of season cleanup:

```bash
# 1. Check what's in the database
node scripts/database-cleanup.js status

# 2. Clear club members
node scripts/database-cleanup.js clear-club-members

# 3. Verify cleanup
node scripts/database-cleanup.js status
```

The system will be ready for the next season with clean club member data while preserving all system configuration and judge accounts.



