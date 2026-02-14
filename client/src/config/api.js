// src/config/api.js

const API_BASE_URL = "http://localhost:5000";

export const apiEndpoints = {
  // 🔹 Auth endpoints
  signup: `${API_BASE_URL}/api/auth/signup`,
  login: `${API_BASE_URL}/api/auth/login`,
  userInfo: `${API_BASE_URL}/api/users/me`,
  updateProfile: `${API_BASE_URL}/api/users/profile`,
  getUserProfile: (userId) => `${API_BASE_URL}/api/users/${userId}`,

  // 🔹 Transaction endpoints
  transferMoney: `${API_BASE_URL}/api/transactions/transfer`,
  depositMoney: `${API_BASE_URL}/api/transactions/deposit`,
  withdrawMoney: `${API_BASE_URL}/api/transactions/withdraw`,
  completeTransaction: `${API_BASE_URL}/api/transactions/complete`,
  transactions: (userId) => `${API_BASE_URL}/api/transactions/${userId}`, // ✔ Correct

  // 🔹 Search recipients
  searchRecipients: `${API_BASE_URL}/api/transactions/search-recipients`, // ✔ Use this route only

  // 🔹 Voice endpoints
  registerVoice: `${API_BASE_URL}/api/voice/register`,
  generateSecurityQuestion: `${API_BASE_URL}/api/voice-captcha/generate-question`,
  verifyVoiceCaptcha: `${API_BASE_URL}/api/voice-captcha/verify`,
};

// 👇 Do NOT export API_BASE_URL unless specifically needed elsewhere
export default apiEndpoints;
