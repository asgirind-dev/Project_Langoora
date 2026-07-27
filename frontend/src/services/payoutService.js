// frontend/src/services/payoutService.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ============================================
// Add New Tutor Payout
// ============================================
export const createPayout = async (payoutData) => {
  try {
    const response = await axios.post(`${API_URL}/api/payouts/add-payout`, {
      tutorId: payoutData.tutorId || "0w5xyLtk90dfE2cdFlnvA47d0Iy2",
      tutorName: payoutData.tutorName || "Asgiri Perera",
      totalTokens: payoutData.totalTokens || 150,
      netPayout: payoutData.netPayout || 1200,
      bankName: payoutData.bankName || "Commercial Bank",
      accountNo: payoutData.accountNo || "8001234567"
    });

    if (response.data.success) {
      console.log("✅ Saved Payout ID:", response.data.payoutId);
      return response.data;
    }
  } catch (error) {
    console.error("❌ Error creating payout:", error);
    throw error;
  }
};

// ============================================
// Get All Payouts
// ============================================
export const getAllPayouts = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/payouts/get-all`);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching payouts:', error);
    throw error;
  }
};

// ============================================
// Get Active Tutors
// ============================================
export const getActiveTutors = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/payouts/active-tutors`);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching tutors:', error);
    throw error;
  }
};