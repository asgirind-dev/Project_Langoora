import axios from 'axios';

const API_URL = 'http://localhost:5000/api/exams';

/**
 * 🔐 Helper: Get fresh token from Firebase
 */
const getFreshToken = async () => {
  try {
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error('No user logged in');
    }

    const token = await user.getIdToken(true);
    localStorage.setItem('token', token);
    return token;
  } catch (error) {
    console.error('Failed to get fresh token:', error);
    throw error;
  }
};

/**
 * 🔐 Helper: Get auth config with token
 */
const getAuthConfig = async () => {
  let token = localStorage.getItem('token');

  if (!token) {
    token = await getFreshToken();
  }

  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
};

/**
 * 💾 1. Create New Exam
 */
export const createTutorExam = async (examPayload) => {
  try {
    const config = await getAuthConfig();
    const response = await axios.post(
      `${API_URL}/create`,
      examPayload,
      config
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || {
      message: 'Failed to commit exam blueprint layer.'
    };
  }
};

/**
 * 📊 2. Get All Tutor Exams
 */
export const getTutorExams = async () => {
  try {
    const config = await getAuthConfig();
    const response = await axios.get(
      `${API_URL}/tutor-exams`,
      config
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || {
      message: 'Failed to fetch tutor exams.'
    };
  }
};

/**
 * 📊 3. Get Exam by ID
 */
export const getExamById = async (examId) => {
  try {
    const config = await getAuthConfig();
    const response = await axios.get(
      `${API_URL}/${examId}`,
      config
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || {
      message: 'Failed to fetch exam details.'
    };
  }
};

/**
 * 🗑️ 4. Delete Exam
 */
export const deleteExam = async (examId) => {
  try {
    const config = await getAuthConfig();
    const response = await axios.delete(
      `${API_URL}/${examId}`,
      config
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || {
      message: 'Failed to delete exam.'
    };
  }
};

/**
 * 📝 5. Update Exam Status
 */
export const updateExamStatus = async (examId, status) => {
  try {
    const config = await getAuthConfig();
    const response = await axios.put(
      `${API_URL}/${examId}/status`,
      { status },
      config
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || {
      message: 'Failed to update exam status.'
    };
  }
};

/**
 * 🎵 📷 6. Upload Asset
 */
export const uploadExamAsset = async (fileBlob) => {
  try {
    let token = localStorage.getItem('token');

    if (!token) {
      token = await getFreshToken();
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000;
      if (Date.now() >= exp) {
        console.log('Token expired, getting fresh one...');
        token = await getFreshToken();
      }
    } catch (e) {
      token = await getFreshToken();
    }

    const formData = new FormData();
    formData.append('file', fileBlob);

    const response = await axios.post(`${API_URL}/upload-asset`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;

  } catch (error) {
    console.error('❌ Upload error:', error.response?.data || error.message);

    if (error.response?.status === 401) {
      try {
        const token = await getFreshToken();
        const formData = new FormData();
        formData.append('file', fileBlob);

        const response = await axios.post(`${API_URL}/upload-asset`, formData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });
        return response.data;
      } catch (retryError) {
        throw retryError.response?.data || {
          message: 'Upload failed after token refresh. Please login again.'
        };
      }
    }

    throw error.response?.data || {
      message: error.message || 'Asset streaming pipeline rejected.'
    };
  }
};

/**
 * 🗑️ 7. Delete Asset from Cloudinary
 */
export const deleteExamAsset = async (fileUrl) => {
  try {
    const config = await getAuthConfig();
    const response = await axios.post(
      `${API_URL}/delete-asset`,
      { fileUrl },
      config
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || {
      message: 'Failed to delete asset from cloud.'
    };
  }
};
/**
 * 📋 Get pending exams for quality audits
 */
export const getPendingExams = async () => {
  try {
    const config = await getAuthConfig();
    const response = await axios.get(
      `${API_URL}/quality/pending`,
      config
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || {
      message: 'Failed to fetch pending exams.'
    };
  }
};

/**
 * ✅ Approve exam (publish)
 */
export const approveExam = async (examId) => {
  try {
    const config = await getAuthConfig();
    const response = await axios.post(
      `${API_URL}/quality/approve/${examId}`,
      {},
      config
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || {
      message: 'Failed to approve exam.'
    };
  }
};

/**
 * ❌ Reject exam with feedback
 */
export const rejectExam = async (examId, feedback) => {
  try {
    const config = await getAuthConfig();
    const response = await axios.post(
      `${API_URL}/quality/reject/${examId}`,
      { feedback },
      config
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || {
      message: 'Failed to reject exam.'
    };
  }
};
