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

// Function to send donation acceptance notification email
const sendDonationAcceptedEmail = async (donorEmail, donorName, donationDetails, ngoDetails) => {
  const { donationId, itemType, quantity } = donationDetails;
  const { ngoName, ngoPhone, ngoAddress } = ngoDetails;

  const emailText = `Dear ${donorName},\n\nGreat news! Your donation has been accepted by an NGO.\n\nDonation Details:\n- Donation ID: ${donationId}\n- Item Type: ${itemType}\n- Quantity: ${quantity}\n\nAccepted by:\n- NGO Name: ${ngoName}\n- Contact: ${ngoPhone}\n- Address: ${ngoAddress}\n\nThe NGO will coordinate with you for pickup arrangements.\n\nThank you for your generosity!\n\nBest regards,\nDaanSetu Team`;

  const emailOptions = {
    from: `"DaanSetu" <${process.env.EMAIL_USERNAME || 'noreply@daansetu.org'}>`,
    to: donorEmail,
    subject: 'Your Donation Has Been Accepted!',
    text: emailText,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4a90e2;">🎉 Donation Accepted!</h2>
        <p>Dear ${donorName},</p>
        <p>Great news! Your donation has been accepted by an NGO.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin-top: 0; color: #333;">Donation Details</h3>
          <p style="margin: 5px 0;"><strong>Donation ID:</strong> ${donationId}</p>
          <p style="margin: 5px 0;"><strong>Item Type:</strong> ${itemType}</p>
          <p style="margin: 5px 0;"><strong>Quantity:</strong> ${quantity}</p>
        </div>

        <div style="background-color: #e8f4f8; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin-top: 0; color: #333;">Accepted By</h3>
          <p style="margin: 5px 0;"><strong>NGO Name:</strong> ${ngoName}</p>
          <p style="margin: 5px 0;"><strong>Contact:</strong> ${ngoPhone}</p>
          <p style="margin: 5px 0;"><strong>Address:</strong> ${ngoAddress}</p>
        </div>

        <p>The NGO will coordinate with you for pickup arrangements.</p>
        <p>Thank you for your generosity! Your contribution makes a real difference.</p>
        
        <p>Best regards,<br>DaanSetu Team</p>
      </div>
    `
  };

  return sendEmail(emailOptions);
};

module.exports = {
  sendOtpEmail,
  sendResetEmail,
  sendDonationAcceptedEmail
};
