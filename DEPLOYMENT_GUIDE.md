# Deployment Guide for DanceScore Pro

## 🚀 Quick Deployment Steps

### Step 1: Security Hardening

1. **Generate Strong JWT Secret**
   ```bash
   openssl rand -base64 32
   ```
   Copy the output and update `server/.env`:
   ```bash
   JWT_SECRET=<your-generated-secret>
   ```

2. **Verify .gitignore**
   - Ensure `.env` is in `.gitignore`
   - Ensure `service-account-key.json` is in `.gitignore`
   - Never commit these files!

3. **Review Environment Variables**
   - All secrets should be in `.env` (not hardcoded)
   - Use different credentials for production
   - Remove default fallbacks in production code

### Step 2: Build Client

```bash
cd client
npm install
npm run build
```

Verify `client/build/` directory is created.

### Step 3: Test Everything

Run through the testing checklist in `PRE_DEPLOYMENT_CHECKLIST.md`:
- [ ] All login flows work
- [ ] Email verification works
- [ ] All features functional
- [ ] Multi-tenant isolation verified

### Step 4: Choose Hosting Platform

#### Option A: Heroku (Easiest)

1. **Install Heroku CLI**
   ```bash
   brew install heroku/brew/heroku  # macOS
   ```

2. **Create Heroku App**
   ```bash
   heroku login
   heroku create your-app-name
   ```

3. **Set Environment Variables**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set JWT_SECRET=<your-strong-secret>
   heroku config:set SMTP_HOST=smtp.gmail.com
   heroku config:set SMTP_PORT=587
   heroku config:set SMTP_USER=your-email@gmail.com
   heroku config:set SMTP_PASSWORD=<your-app-password>
   heroku config:set SMTP_FROM="DanceScore Pro <your-email@gmail.com>"
   ```

4. **Deploy**
   ```bash
   git init  # If not already a git repo
   git add .
   git commit -m "Initial deployment"
   heroku git:remote -a your-app-name
   git push heroku main
   ```

#### Option B: Vercel (Frontend) + Railway/Render (Backend)

**Frontend (Vercel):**
1. Connect GitHub repo to Vercel
2. Set build command: `cd client && npm install && npm run build`
3. Set output directory: `client/build`
4. Add environment variables in Vercel dashboard

**Backend (Railway/Render):**
1. Connect GitHub repo
2. Set root directory: `server`
3. Set start command: `npm start`
4. Add environment variables in dashboard

#### Option C: AWS/Google Cloud/Azure

See platform-specific documentation for:
- VM/Container setup
- Environment variable configuration
- SSL certificate setup
- Load balancer configuration

### Step 5: Database Setup

1. **Create Production Firebase Project**
   - Go to Firebase Console
   - Create new project (separate from dev)
   - Enable Firestore
   - Download new service account key

2. **Set Up Firestore**
   - Create Firestore database
   - Set security rules (see below)
   - Create required indexes

3. **Security Rules Example:**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Allow read/write if user's clubId matches document's clubId
       match /{document=**} {
         allow read, write: if request.auth != null && 
           resource.data.clubId == request.auth.token.clubId;
       }
     }
   }
   ```

### Step 6: Post-Deployment

1. **Verify Deployment**
   - [ ] Site loads correctly
   - [ ] HTTPS is enabled
   - [ ] Can log in
   - [ ] Email verification works
   - [ ] All features functional

2. **Set Up Monitoring**
   - Error tracking (Sentry, LogRocket, etc.)
   - Uptime monitoring
   - Performance monitoring

3. **Backup Strategy**
   - Automated Firestore backups
   - Regular database exports
   - Configuration backups

---

## 🔒 Production Security Checklist

- [ ] HTTPS enabled (SSL certificate)
- [ ] Strong JWT secret (32+ characters, random)
- [ ] Environment variables set (not hardcoded)
- [ ] `.env` file not committed to git
- [ ] Service account keys not committed
- [ ] CORS configured for production domain only
- [ ] Rate limiting implemented
- [ ] Error messages don't expose sensitive info
- [ ] Logs don't contain passwords/secrets
- [ ] Firestore security rules configured
- [ ] Regular security updates (npm audit)

---

## 📊 Monitoring & Maintenance

### Regular Tasks

- **Weekly:**
  - Review error logs
  - Check for failed login attempts
  - Monitor email delivery rates

- **Monthly:**
  - Update dependencies (`npm audit fix`)
  - Review security logs
  - Backup verification

- **Quarterly:**
  - Security audit
  - Performance review
  - User feedback review

---

## 🆘 Troubleshooting Deployment

### Common Issues

1. **"Email service not configured"**
   - Check environment variables are set
   - Verify SMTP credentials are correct
   - Check server logs for specific errors

2. **"Database connection failed"**
   - Verify Firebase service account key
   - Check Firestore is enabled
   - Verify security rules allow access

3. **"CORS errors"**
   - Update CORS settings for production domain
   - Verify allowed origins match your domain

4. **"Build fails"**
   - Check Node.js version matches
   - Verify all dependencies install
   - Check for TypeScript errors

---

## 📞 Support Resources

- Firebase Documentation: https://firebase.google.com/docs
- Node.js Deployment: https://nodejs.org/en/docs/guides/nodejs-docker-webapp/
- Security Best Practices: https://owasp.org/www-project-top-ten/
