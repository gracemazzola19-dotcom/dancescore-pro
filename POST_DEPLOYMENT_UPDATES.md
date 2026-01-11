# Post-Deployment Updates & Maintenance Guide

## ✅ Yes, You Can Update After Deployment!

You can absolutely come back and make adjustments after deployment. Here's how:

## 🔄 Update Workflow

### Step 1: Make Changes Locally

1. **Edit files** in your local development environment
2. **Test changes** locally first
3. **Run tests** to verify everything works

### Step 2: Commit Changes

```bash
cd /Users/gracemazzola/dancescore-pro

# Stage your changes
git add .

# Commit with descriptive message
git commit -m "Description of what you changed"

# Push to your repository (if using Git)
git push origin main
```

### Step 3: Deploy Updates

**For Heroku:**
```bash
# Push to Heroku (automatic deployment)
git push heroku main

# OR if you need to update environment variables
heroku config:set VARIABLE_NAME=new_value

# Restart the app
heroku restart
```

**For Vercel + Railway/Render:**
- Changes pushed to GitHub automatically trigger deployment
- Or use their dashboard to trigger manual deployment

**For Other Platforms:**
- Follow your platform's deployment process
- Usually: `git push` or upload files via dashboard

## 🔧 Common Post-Deployment Adjustments

### 1. Update Settings (Via Admin Dashboard)

**No code deployment needed!** These can be changed anytime:

- ✅ **Security Settings**
  - Toggle email verification on/off
  - Adjust code expiry time
  - Change max verification attempts

- ✅ **Appearance Settings**
  - Change club name
  - Update colors
  - Change logo
  - Customize text labels

- ✅ **Other Settings**
  - Scoring format
  - Attendance point values
  - Video settings
  - Notification preferences

**How:** Just log in as admin → Settings → Make changes → Save

### 2. Update User Data (Via Admin Dashboard)

- ✅ Add/edit/delete judges/admins
- ✅ Add/edit/delete dancers
- ✅ Update email addresses
- ✅ Change user roles

**How:** Admin Dashboard → Judges/Dancers tabs → Make changes

### 3. Update Code (Requires Deployment)

**Examples:**
- Fix bugs
- Add new features
- Update security
- Change UI/UX

**Process:**
1. Make changes locally
2. Test locally
3. Commit to git
4. Deploy to production

## 🔄 Deployment Strategies

### Option A: Direct Update (Simple)

```bash
# Make your changes locally
# Test them
git add .
git commit -m "Fixed bug in attendance tracking"
git push heroku main  # Deploys immediately
```

### Option B: Staging Environment (Recommended)

**Better for production:** Deploy to staging first, then production

1. **Create staging app:**
   ```bash
   heroku create your-app-staging
   ```

2. **Deploy to staging first:**
   ```bash
   git push heroku-staging main
   ```

3. **Test on staging**

4. **If good, deploy to production:**
   ```bash
   git push heroku main
   ```

## 🛠️ Making Updates Safely

### Best Practices

1. **Always test locally first**
   ```bash
   # Test your changes
   cd server && npm start
   cd client && npm start
   ```

2. **Run security audit before deploying**
   ```bash
   ./security-audit.sh
   ```

3. **Run deployment tests**
   ```bash
   ./test-deployment.sh
   ```

4. **Backup before major changes**
   - Export Firestore data
   - Backup configuration files

5. **Deploy during low-traffic times** (if possible)

6. **Monitor after deployment**
   - Check server logs
   - Test critical features
   - Watch for errors

## 🔍 What Can You Update Without Redeploying?

### ✅ Can Update Without Code Deployment:

- **All Settings** (via Admin Dashboard)
  - Security settings
  - Appearance settings
  - Scoring settings
  - Attendance settings
  - Custom text labels

- **User Data** (via Admin Dashboard)
  - Judge/admin accounts
  - Dancer information
  - Email addresses
  - User roles

- **Database Content** (via Admin Dashboard)
  - Auditions
  - Attendance records
  - Scores
  - Absence requests

- **Environment Variables** (via hosting platform)
  - SMTP settings
  - JWT secret (requires server restart)
  - Feature flags

### ❌ Requires Code Deployment:

- **Code changes** (bug fixes, new features)
- **UI changes** (React components)
- **API endpoint changes**
- **Security updates**
- **Database schema changes** (usually)

## 📝 Update Checklist

Before deploying updates:

- [ ] Test changes locally
- [ ] Run `./security-audit.sh`
- [ ] Run `./test-deployment.sh`
- [ ] Update version number (if applicable)
- [ ] Update CHANGELOG.md (optional but recommended)
- [ ] Backup database (for major changes)
- [ ] Commit changes to git
- [ ] Deploy to staging (if available)
- [ ] Test on staging
- [ ] Deploy to production
- [ ] Monitor logs for errors
- [ ] Test critical features
- [ ] Verify email verification still works

## 🚨 Rollback Plan

If something goes wrong after deployment:

### Quick Rollback (Heroku)

```bash
# View recent releases
heroku releases

# Rollback to previous version
heroku rollback v123  # Replace v123 with version number
```

### Manual Rollback

1. **Revert code changes:**
   ```bash
   git revert HEAD  # Revert last commit
   git push heroku main
   ```

2. **Restore environment variables:**
   ```bash
   heroku config:set VARIABLE_NAME=old_value
   heroku restart
   ```

3. **Restore database** (if needed):
   - Import from backup
   - Or manually fix data via Admin Dashboard

## 🔐 Updating Security Settings

### Change Email Verification Settings

1. Log in as admin
2. Go to Settings → Security & Authentication Settings
3. Toggle email verification on/off
4. Adjust expiry time or max attempts
5. Click "Test Configuration" if needed
6. **No deployment needed!**

### Update SMTP Credentials

1. Get new credentials (if needed)
2. Update on hosting platform:
   ```bash
   heroku config:set SMTP_PASSWORD=new-app-password
   heroku restart
   ```
3. Test in Admin Dashboard

### Update JWT Secret (Rare - Only if compromised)

⚠️ **Warning:** This will log out all users!

```bash
# Generate new secret
openssl rand -base64 32

# Update on hosting platform
heroku config:set JWT_SECRET=new-secret

# Restart server
heroku restart
```

## 📊 Monitoring Updates

After deploying updates:

1. **Check Server Logs:**
   ```bash
   heroku logs --tail
   # OR
   tail -f /tmp/server.log  # Local
   ```

2. **Test Critical Features:**
   - Login with email verification
   - Admin dashboard access
   - Key features (attendance, scoring, etc.)

3. **Monitor Errors:**
   - Check error tracking service (if set up)
   - Review server logs
   - Check browser console

4. **User Feedback:**
   - Monitor for user-reported issues
   - Check email for error reports

## 🔄 Continuous Updates

### Regular Maintenance

**Weekly:**
- Check for security updates: `npm audit`
- Review error logs
- Monitor email delivery

**Monthly:**
- Update dependencies: `npm update`
- Security audit: `./security-audit.sh`
- Review and update settings as needed

**Quarterly:**
- Major dependency updates
- Security review
- Performance optimization

## 💡 Tips for Smooth Updates

1. **Use Git branches** for major features:
   ```bash
   git checkout -b feature/new-feature
   # Make changes
   git commit -m "Added new feature"
   git checkout main
   git merge feature/new-feature
   git push heroku main
   ```

2. **Keep a changelog** of what you've updated

3. **Test in a staging environment** before production

4. **Communicate updates** to users if major changes

5. **Schedule maintenance windows** for major updates

## 🆘 Need Help?

If updates break something:

1. **Check logs** for error messages
2. **Rollback** to previous version
3. **Review changes** you made
4. **Test locally** to reproduce issue
5. **Fix and redeploy**

---

## Summary

✅ **Yes, you can update after deployment!**

- Settings and user data: Update anytime via Admin Dashboard (no deployment)
- Code changes: Make locally, test, commit, deploy
- Environment variables: Update via hosting platform dashboard
- Always test before deploying to production
- Keep backups of important data
- Monitor after updates

**Your site is fully maintainable and updatable!** 🎉
