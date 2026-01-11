# Pre-Deployment Security & Testing Checklist

## 🔒 Security Checklist

### 1. Environment Variables & Secrets

- [ ] **JWT Secret Changed**
  - Current: `your-super-secret-jwt-key-change-this-in-production`
  - Action: Generate a strong, random secret (at least 32 characters)
  - Location: `server/.env` → `JWT_SECRET`
  - Generate: `openssl rand -base64 32`

- [ ] **SMTP Credentials Secured**
  - [ ] App Password is stored in `.env` (not hardcoded)
  - [ ] `.env` file is in `.gitignore` (verify it's not committed)
  - [ ] Production SMTP credentials are different from development
  - [ ] Consider using environment variable management (Heroku Config Vars, AWS Secrets Manager, etc.)

- [ ] **Firebase Service Account Key**
  - [ ] `service-account-key.json` is in `.gitignore`
  - [ ] Never commit service account keys to version control
  - [ ] Use environment variables for Firebase credentials in production

- [ ] **Database Credentials**
  - [ ] No hardcoded database URLs or passwords
  - [ ] All database access uses environment variables

### 2. Authentication & Authorization

- [ ] **Email Verification Enabled**
  - [ ] Tested and working for all user types (Admin, E-board, Dancer)
  - [ ] Verification codes expire correctly (10 minutes default)
  - [ ] Failed verification attempts are limited

- [ ] **Password Security**
  - [ ] Admin/Judge passwords (positions) are strong
  - [ ] Dancer passwords (levels) are appropriate for the use case
  - [ ] Consider implementing password complexity requirements for admins

- [ ] **JWT Token Security**
  - [ ] Tokens expire (currently 24h - consider shorter for production)
  - [ ] Tokens are validated on every request
  - [ ] `clubId` is embedded in tokens for multi-tenant isolation

- [ ] **API Endpoint Security**
  - [ ] All sensitive endpoints require authentication (`authenticateToken` middleware)
  - [ ] Admin-only endpoints check `canAccessAdmin` or role
  - [ ] Multi-tenant filtering (`clubId`) is enforced on all queries

### 3. Data Security

- [ ] **Multi-Tenant Isolation**
  - [ ] All database queries filter by `clubId`
  - [ ] Users can only access data from their organization
  - [ ] No cross-organization data leakage possible

- [ ] **Input Validation**
  - [ ] All user inputs are validated
  - [ ] SQL injection prevention (using parameterized queries if applicable)
  - [ ] XSS prevention (React escapes by default, but verify)
  - [ ] File upload validation (file types, sizes)

- [ ] **Sensitive Data**
  - [ ] Email addresses are properly protected
  - [ ] Personal information (phone numbers, etc.) is secured
  - [ ] No sensitive data in logs or error messages

### 4. HTTPS & Network Security

- [ ] **HTTPS Enabled**
  - [ ] SSL/TLS certificate configured
  - [ ] All HTTP traffic redirects to HTTPS
  - [ ] Secure cookies (if using)

- [ ] **CORS Configuration**
  - [ ] CORS is properly configured for production domain
  - [ ] No wildcard CORS (`*`) in production
  - [ ] Only allow specific origins

- [ ] **Rate Limiting**
  - [ ] Consider implementing rate limiting for login attempts
  - [ ] Rate limit for verification code requests
  - [ ] Prevent brute force attacks

### 5. Error Handling

- [ ] **No Sensitive Info in Errors**
  - [ ] Error messages don't expose database structure
  - [ ] Stack traces not shown to users in production
  - [ ] Generic error messages for authentication failures

- [ ] **Logging**
  - [ ] Security events are logged (failed logins, unauthorized access)
  - [ ] Logs don't contain sensitive information
  - [ ] Log rotation and retention policies

---

## ✅ Functionality Testing Checklist

### Authentication & Login

- [ ] **Admin Login**
  - [ ] Can log in with email + position
  - [ ] Email verification code is sent
  - [ ] Can enter verification code and complete login
  - [ ] Redirects to Admin Dashboard

- [ ] **E-board Member Login**
  - [ ] Can log in with email + position
  - [ ] Email verification works
  - [ ] View selection works (Judge vs Coordinator)
  - [ ] Can access both views if authorized

- [ ] **Dancer Login**
  - [ ] Can log in with email + level
  - [ ] Email verification works
  - [ ] Can view attendance sheet
  - [ ] Can submit absence requests

- [ ] **Role Selection**
  - [ ] Landing page shows Login/Sign-up options
  - [ ] Role type selection works (Dancer/E-board/Admin)
  - [ ] Navigation between login types works

### Core Features

- [ ] **Audition Management**
  - [ ] Create new auditions
  - [ ] Add judges to auditions
  - [ ] Dancer registration works
  - [ ] Scoring works
  - [ ] Deliberations transfer to club members

- [ ] **Attendance & Points**
  - [ ] Create attendance events
  - [ ] Take attendance
  - [ ] Points calculate correctly
  - [ ] Absence requests work
  - [ ] Make-up submissions work
  - [ ] Point adjustments work

- [ ] **Multi-Tenant**
  - [ ] Organization sign-up works
  - [ ] Data isolation between organizations
  - [ ] Settings are organization-specific
  - [ ] Users can only see their organization's data

### Settings & Configuration

- [ ] **Security Settings**
  - [ ] Email verification toggle works
  - [ ] Test configuration button works
  - [ ] Settings save correctly

- [ ] **Appearance Settings**
  - [ ] Club name displays correctly
  - [ ] Colors and branding work
  - [ ] Logo displays (if uploaded)

- [ ] **Other Settings**
  - [ ] Scoring format changes work
  - [ ] Custom text updates work
  - [ ] All settings categories save correctly

---

## 🚀 Deployment Preparation

### 1. Environment Setup

- [ ] **Production Environment Variables**
  ```bash
  # Required for production:
  NODE_ENV=production
  PORT=5001 (or your hosting platform's port)
  JWT_SECRET=<strong-random-32-char-secret>
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USER=your-production-email@gmail.com
  SMTP_PASSWORD=<production-app-password>
  SMTP_FROM=DanceScore Pro <your-production-email@gmail.com>
  ```

- [ ] **Firebase Configuration**
  - [ ] Production Firebase project created (separate from dev)
  - [ ] Service account key for production
  - [ ] Firestore security rules configured
  - [ ] Firebase indexes created (if needed)

### 2. Build & Dependencies

- [ ] **Client Build**
  ```bash
  cd client
  npm run build
  # Verify build succeeds without errors
  ```

- [ ] **Server Dependencies**
  ```bash
  cd server
  npm install --production
  # Verify all dependencies install correctly
  ```

- [ ] **Production Dependencies Only**
  - [ ] Remove dev dependencies from production
  - [ ] Verify `package.json` has correct scripts

### 3. File Structure

- [ ] **Uploads Directory**
  - [ ] `server/uploads/` exists
  - [ ] `server/uploads/videos/` exists
  - [ ] Proper permissions set
  - [ ] Consider cloud storage (AWS S3, Google Cloud Storage) for production

- [ ] **Static Files**
  - [ ] Client build output configured
  - [ ] Static assets served correctly

### 4. Database

- [ ] **Firestore Setup**
  - [ ] Production Firestore database created
  - [ ] Security rules configured
  - [ ] Indexes created for all queries
  - [ ] Backup strategy in place

- [ ] **Data Migration**
  - [ ] Test data migration process
  - [ ] Verify `clubId` is set on all existing data
  - [ ] Multi-tenant isolation verified

### 5. Hosting Platform Setup

**For Heroku:**
- [ ] Heroku app created
- [ ] Environment variables set via `heroku config:set`
- [ ] Buildpacks configured
- [ ] Procfile created
- [ ] Database addon configured

**For AWS/Google Cloud/Azure:**
- [ ] VM/Container configured
- [ ] Environment variables set
- [ ] SSL certificate configured
- [ ] Load balancer configured (if needed)
- [ ] Auto-scaling configured (if needed)

**For Vercel/Netlify:**
- [ ] Frontend deployment configured
- [ ] Backend API routes configured
- [ ] Environment variables set
- [ ] Custom domain configured

---

## 🔍 Security Audit Commands

Run these commands to verify security:

```bash
# 1. Check for hardcoded secrets
cd /Users/gracemazzola/dancescore-pro
grep -r "password\|secret\|key" --include="*.js" --include="*.ts" --include="*.tsx" server/ client/src/ | grep -v "node_modules" | grep -v ".env" | grep -v "SMTP_PASSWORD\|JWT_SECRET" | grep -i "=.*['\"].*['\"]"

# 2. Check .env is in .gitignore
grep -q "\.env" .gitignore && echo "✅ .env in .gitignore" || echo "❌ .env NOT in .gitignore"

# 3. Check service account key is in .gitignore
grep -q "service-account-key.json" .gitignore && echo "✅ service-account-key.json in .gitignore" || echo "❌ service-account-key.json NOT in .gitignore"

# 4. Check for console.log with sensitive data
grep -r "console.log.*password\|console.log.*secret\|console.log.*token" --include="*.js" --include="*.ts" server/ | grep -v "node_modules"

# 5. Verify no .env file is committed
git ls-files | grep "\.env" && echo "❌ .env file is committed!" || echo "✅ No .env files committed"
```

---

## 📋 Pre-Deployment Testing Script

Create a test script to verify everything works:

```bash
# Test all critical endpoints
# 1. Health check
curl http://localhost:5001/api/health

# 2. Test email configuration
curl -X POST http://localhost:5001/api/auth/test-email-config

# 3. Test verification required check
curl http://localhost:5001/api/auth/verification-required

# 4. Test settings endpoint (requires auth)
# ... etc
```

---

## 🎯 Deployment Steps

1. **Final Security Check**
   - [ ] Run security audit commands above
   - [ ] Review all environment variables
   - [ ] Verify no secrets in code

2. **Final Testing**
   - [ ] Test all user flows end-to-end
   - [ ] Test with multiple organizations (multi-tenant)
   - [ ] Test error scenarios
   - [ ] Test on different browsers

3. **Backup**
   - [ ] Backup current database
   - [ ] Backup configuration files
   - [ ] Document current setup

4. **Deploy**
   - [ ] Deploy to staging first (if available)
   - [ ] Test staging thoroughly
   - [ ] Deploy to production
   - [ ] Monitor logs for errors

5. **Post-Deployment**
   - [ ] Verify production site works
   - [ ] Test login flows
   - [ ] Monitor error logs
   - [ ] Set up monitoring/alerts

---

## 📝 Important Notes

- **Never commit `.env` files** - They contain sensitive credentials
- **Use different credentials for production** - Don't reuse dev credentials
- **Enable HTTPS** - Required for secure authentication
- **Set up monitoring** - Track errors, performance, security events
- **Regular backups** - Automate database backups
- **Update dependencies** - Keep packages updated for security patches

---

## 🆘 If Something Goes Wrong

1. **Check server logs** - Look for error messages
2. **Check environment variables** - Verify all are set correctly
3. **Test email service** - Use "Test Configuration" button
4. **Verify database connection** - Check Firebase connection
5. **Review security rules** - Ensure Firestore rules allow access
6. **Check CORS settings** - Verify allowed origins match your domain
