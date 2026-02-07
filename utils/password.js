const zxcvbn = require('zxcvbn');

// Password validation rules
const MIN_PASSWORD_STRENGTH = 2; // 0-4 scale (0=weak, 4=strong)
const MIN_PASSWORD_LENGTH = 8;

const validatePassword = (password) => {
  // Check minimum length
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
    };
  }

  // Check password strength using zxcvbn
  const result = zxcvbn(password);
  
  if (result.score < MIN_PASSWORD_STRENGTH) {
    return {
      valid: false,
      message: 'Password is too weak. Try adding more complexity or length.',
      suggestions: result.feedback.suggestions
    };
  }

  return { valid: true };
};

// Generate a secure random OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

module.exports = {
  validatePassword,
  generateOTP
};
