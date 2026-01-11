const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Email service configuration
// This will be configured via environment variables for deployment
let transporter = null;

// Initialize email transporter
function initializeEmailService() {
  // Check if email service is configured
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const smtpFrom = process.env.SMTP_FROM || smtpUser;

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
    console.warn('⚠️  Email service not configured. Email verification will not work until SMTP settings are configured.');
    console.warn('   Required environment variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD');
    return false;
  }

  try {
    // For Gmail, use the service option which handles authentication better
    if (smtpHost === 'smtp.gmail.com') {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: smtpUser,
          pass: smtpPassword.replace(/\s/g, ''), // Remove spaces from app password
        },
      });
    } else {
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: smtpPort === '465', // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      });
    }

    console.log('✅ Email service initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Error initializing email service:', error);
    return false;
  }
}

// Generate a 6-digit verification code
function generateVerificationCode() {
  return crypto.randomInt(100000, 999999).toString();
}

// Send verification code email
async function sendVerificationCode(email, code, userName = 'User') {
  if (!transporter) {
    const initialized = initializeEmailService();
    if (!initialized) {
      throw new Error('Email service is not configured. Please contact your administrator.');
    }
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'DanceScore Pro - Verification Code',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .code { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; color: #667eea; margin: 20px 0; letter-spacing: 5px; border-radius: 5px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>DanceScore Pro</h1>
            <p>Verification Code</p>
          </div>
          <div class="content">
            <p>Hello ${userName},</p>
            <p>You requested a verification code to log in to DanceScore Pro. Use the code below to complete your login:</p>
            <div class="code">${code}</div>
            <div class="warning">
              <strong>⚠️ Security Notice:</strong> This code will expire in 10 minutes. If you did not request this code, please ignore this email or contact your administrator.
            </div>
            <p>This code is valid for 10 minutes only. Do not share this code with anyone.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from DanceScore Pro. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
DanceScore Pro - Verification Code

Hello ${userName},

You requested a verification code to log in to DanceScore Pro. Use the code below to complete your login:

${code}

⚠️ Security Notice: This code will expire in 10 minutes. If you did not request this code, please ignore this email or contact your administrator.

This code is valid for 10 minutes only. Do not share this code with anyone.

This is an automated message from DanceScore Pro. Please do not reply to this email.
    `.trim(),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
}

// Test email connection
async function testEmailConnection() {
  if (!transporter) {
    return { success: false, error: 'Email service not initialized' };
  }

  try {
    await transporter.verify();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  initializeEmailService,
  generateVerificationCode,
  sendVerificationCode,
  testEmailConnection,
};
