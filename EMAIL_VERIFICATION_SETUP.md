# Email Verification (2FA) Setup Guide

This guide explains how to set up and configure email verification (two-factor authentication) for DanceScore Pro.

## Overview

Email verification adds an extra layer of security to the login process. When enabled, users must:
1. Enter their email and password
2. Request a verification code sent to their email
3. Enter the verification code to complete login

This applies to **all user types**: Admin, E-board Members (Judges/Coordinators), and Dancers.

## Prerequisites

Before setting up email verification, you need:

1. **An email service provider** - Choose one of the following:
   - Gmail (with App Password)
   - SendGrid
   - AWS SES (Amazon Simple Email Service)
   - Mailgun
   - Any SMTP-compatible email service

2. **Admin access** to configure email addresses for users

## Step 1: Choose an Email Service Provider

### Option A: Gmail (Easiest for Development/Testing)

1. Enable 2-Step Verification on your Google account
2. Generate an App Password:
   - Go to [Google Account Settings](https://myaccount.google.com/)
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Save the 16-character password

### Option B: SendGrid (Recommended for Production)

1. Sign up at [SendGrid](https://sendgrid.com/)
2. Verify your sender email address
3. Create an API key with "Mail Send" permissions
4. Use the SMTP settings provided by SendGrid

### Option C: AWS SES (For Scalability)

1. Set up AWS SES in your AWS account
2. Verify your email domain or sender email
3. Get your SMTP credentials from AWS SES console

## Step 2: Configure Environment Variables

Add the following environment variables to your `.env` file in the `server` directory:

```bash
# Email Service Configuration
SMTP_HOST=smtp.gmail.com                    # Your SMTP server host
SMTP_PORT=587                               # SMTP port (587 for TLS, 465 for SSL)
SMTP_USER=your-email@gmail.com              # Your email address
SMTP_PASSWORD=your-app-password             # Your email password/app password
SMTP_FROM=DanceScore Pro <your-email@gmail.com>  # Display name and email
```

### Example Configurations:

**Gmail:**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=abcd efgh ijkl mnop  # Your 16-char app password
SMTP_FROM=DanceScore Pro <your-email@gmail.com>
```

**SendGrid:**
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM=DanceScore Pro <verified@yourdomain.com>
```

**AWS SES:**
```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com  # Use your region
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASSWORD=your-smtp-password
SMTP_FROM=DanceScore Pro <verified@yourdomain.com>
```

## Step 3: Test Email Configuration

After setting up environment variables, restart your server and check the console logs:

```
✅ Email service initialized successfully
```

If you see an error, check:
- All environment variables are set correctly
- Email service credentials are valid
- Firewall/security groups allow outbound SMTP connections

You can test the email connection by attempting to log in - if email verification is enabled, it will try to send a code.

## Step 4: Configure User Emails in Admin Dashboard

1. Log in as an admin
2. Navigate to **Settings** → **Security Settings**
3. Ensure **"Require Email Verification for Login"** is enabled
4. Go to **Users/Judges** section
5. For each user (admin, judge, coordinator), make sure they have a valid email address:
   - The email must match exactly what they use to log in
   - The email must be accessible by the user
6. For dancers, verify their emails in the **Point Sheet** or **Dancers** section

## Step 5: Enable Email Verification (Admin Settings)

1. Log in as admin
2. Go to **Settings** → **Security Settings**
3. Enable **"Require Email Verification for Login"**
4. Optionally configure:
   - **Code Expiry Time**: How long codes are valid (default: 10 minutes)
   - **Max Verification Attempts**: Maximum failed attempts before requiring new code (default: 5)

## Step 6: Deployment Considerations

### For Production Deployment:

1. **Never commit `.env` files** to version control
2. **Use environment variables** from your hosting platform:
   - Heroku: `heroku config:set SMTP_HOST=...`
   - AWS: Use AWS Systems Manager Parameter Store
   - Google Cloud: Use Secret Manager
   - Other platforms: Use their environment variable configuration

3. **Email Service Limits**:
   - Gmail: 500 emails/day (personal), 2000/day (Google Workspace)
   - SendGrid Free: 100 emails/day
   - AWS SES: Starts in sandbox mode (200 emails/day, verified emails only)

4. **Domain Verification** (Recommended):
   - Verify your domain with your email service
   - Use a custom "From" address (e.g., `noreply@yourdomain.com`)
   - This improves email deliverability and avoids spam filters

5. **Firestore Index** (Automatically Created):
   - The verification codes collection will automatically create indexes as needed
   - If you see index errors, go to Firestore Console → Indexes and create the suggested composite index

## Step 7: Troubleshooting

### Emails Not Sending

1. Check server logs for error messages
2. Verify all environment variables are set correctly
3. Test SMTP connection using the email service provider's test tool
4. Check spam/junk folders - verification emails might be filtered
5. Verify sender email is verified/authorized in your email service

### Codes Not Working

1. Check if code has expired (default: 10 minutes)
2. Verify user entered code correctly (6 digits)
3. Check if code was already used (codes are single-use)
4. Ensure email matches exactly (case-insensitive, but must match database)

### "Email service not configured" Error

- Check that all SMTP environment variables are set
- Restart the server after setting environment variables
- Verify no typos in environment variable names

## Security Best Practices

1. **Use App Passwords** (not your main account password) for email services
2. **Rotate credentials** regularly (every 90 days recommended)
3. **Monitor email logs** for suspicious activity
4. **Set appropriate expiry times** - 10 minutes is a good balance
5. **Limit verification attempts** to prevent brute force attacks
6. **Use HTTPS** in production to protect verification codes in transit
7. **Regularly clean up expired codes** from the database (optional cleanup job)

## Disabling Email Verification

If you need to temporarily disable email verification:

1. Log in as admin
2. Go to **Settings** → **Security Settings**
3. Disable **"Require Email Verification for Login"**
4. Users can now log in without verification codes

**Note:** This should only be done temporarily for troubleshooting. Re-enable as soon as possible.

## API Endpoints

### Public Endpoints (No Authentication Required):

- `GET /api/auth/verification-required/:clubId?` - Check if verification is required for a club
- `POST /api/auth/send-verification-code` - Request a verification code
- `POST /api/auth/verify-code` - Verify a code and complete login

### Request Examples:

**Check if verification required:**
```bash
GET /api/auth/verification-required/msu-dance-club
```

**Send verification code:**
```bash
POST /api/auth/send-verification-code
{
  "email": "user@example.com",
  "userType": "judge",  // or "admin", "eboard", "dancer"
  "clubId": "msu-dance-club"
}
```

**Verify code:**
```bash
POST /api/auth/verify-code
{
  "email": "user@example.com",
  "code": "123456",
  "userType": "judge",
  "password": "UserPosition",  // Password will be verified after code verification
  "clubId": "msu-dance-club"
}
```

## Support

If you encounter issues:

1. Check server logs for detailed error messages
2. Verify email service credentials
3. Test SMTP connection separately
4. Check Firestore database for stored verification codes
5. Review environment variable configuration

For additional help, check the application logs or contact your system administrator.
