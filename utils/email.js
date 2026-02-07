const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;

// Create OAuth2 client
const createTransporter = async () => {
  // For development/testing, you can use a simpler setup
  if (process.env.NODE_ENV === 'development') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USERNAME || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASSWORD || 'your-app-password'
      }
    });
  }

  // Production OAuth2 setup
  const oauth2Client = new OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });

  const accessToken = await new Promise((resolve, reject) => {
    oauth2Client.getAccessToken((err, token) => {
      if (err) {
        console.error('Error getting access token:', err);
        reject("Failed to create access token");
      }
      resolve(token);
    });
  });

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.EMAIL_USERNAME,
      accessToken,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN
    }
  });
};

// Function to send email
const sendEmail = async (emailOptions) => {
  try {
    const transporter = await createTransporter();
    await transporter.sendMail(emailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Function to send OTP email
const sendOtpEmail = async (email, otp) => {
  const emailText = `Dear DaanSetu user,\n\nYou have requested a One Time Password (OTP) for your login password recreation.\n\nYour OTP is: ${otp}\n\nThis OTP is valid for 10 minutes.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nDaanSetu Team`;

  const emailOptions = {
    from: `"DaanSetu" <${process.env.EMAIL_USERNAME || 'noreply@daansetu.org'}>`,
    to: email,
    subject: 'Your DaanSetu Password Reset OTP',
    text: emailText,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4a90e2;">Password Reset Request</h2>
        <p>Dear DaanSetu user,</p>
        <p>You have requested a One Time Password (OTP) for your login password recreation.</p>
        <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; color: #333;">
          ${otp}
        </div>
        <p>This OTP is valid for 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br>DaanSetu Team</p>
      </div>
    `
  };

  return sendEmail(emailOptions);
};

// Function to send password reset email
const sendResetEmail = async (email, resetLink) => {
  const emailText = `Dear DaanSetu user,\n\nYou have requested to reset your password.\n\nPlease click the following link to reset your password:\n\n${resetLink}\n\nThis link is valid for 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nDaanSetu Team`;

  const emailOptions = {
    from: `"DaanSetu" <${process.env.EMAIL_USERNAME || 'noreply@daansetu.org'}>`,
    to: email,
    subject: 'Reset Your DaanSetu Password',
    text: emailText,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4a90e2;">Password Reset Request</h2>
        <p>Dear DaanSetu user,</p>
        <p>You have requested to reset your password.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #4a90e2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
        </div>
        <p>This link is valid for 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br>DaanSetu Team</p>
      </div>
    `
  };

  return sendEmail(emailOptions);
};

module.exports = {
  sendOtpEmail,
  sendResetEmail
};
