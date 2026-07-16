import axios from 'axios';

const API_URL = 'http://localhost:5000/api/exams';

/**
 * 🔐 Helper: Get fresh token from Firebase
 */
const getFreshToken = async () => {
  try {
    // Firebase Auth instance එකෙන් fresh token එකක් ගන්න
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('No user logged in');
    }
    
    // Fresh token එකක් ගන්න
    const token = await user.getIdToken(true); // 👈 true = force refresh
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
  
  // Token එක නැත්නම් හෝ expired නම් fresh එකක් ගන්න
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
 * 🔗 1. Fetch Active Language Schema
 */
export const fetchActiveExamSchema = async () => {
  try {
    const config = await getAuthConfig();
    const response = await axios.get(
      'http://localhost:5000/api/languages/active-schema', 
      config
    );
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      // Token expired, try to refresh
      const token = await getFreshToken();
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      };
      const response = await axios.get(
        'http://localhost:5000/api/languages/active-schema', 
        config
      );
      return response.data;
    }
    throw error.response?.data || { 
      message: 'Failed to mirror target registry matrix.' 
    };
  }
};

/**
 * 💾 2. Create New Exam
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
    if (error.response?.status === 401) {
      // Token expired, try to refresh
      const token = await getFreshToken();
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      };
      const response = await axios.post(
        `${API_URL}/create`, 
        examPayload, 
        config
      );
      return response.data;
    }
    throw error.response?.data || { 
      message: 'Failed to commit exam blueprint layer.' 
    };
  }
};

/**
 * 🎵 📷 3. Upload Asset (Audio/Image)
 */
export const uploadExamAsset = async (fileBlob) => {
  try {
    // First, try to get a fresh token
    let token = localStorage.getItem('token');
    
    if (!token) {
      token = await getFreshToken();
    }
    
    // Check if token is expired
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000;
      if (Date.now() >= exp) {
        console.log('Token expired, getting fresh one...');
        token = await getFreshToken();
      }
    } catch (e) {
      // Invalid token format, get fresh one
      token = await getFreshToken();
    }

    const formData = new FormData();
    formData.append('file', fileBlob);

    console.log('📤 Uploading file with token:', {
      name: fileBlob.name,
      type: fileBlob.type,
      size: fileBlob.size,
      tokenLength: token.length
    });

    const response = await axios.post(`${API_URL}/upload-asset`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;

  } catch (error) {
    console.error('❌ Upload error:', error.response?.data || error.message);
    
    // If 401, try one more time with fresh token
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
 * 🗑️ 4. Delete Asset from Cloudinary
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
 * 📊 5. Get Student Exams
 */
export const getStudentExams = async () => {
  try {
    const config = await getAuthConfig();
    const response = await axios.get(
      `${API_URL}/student-exams`,
      config
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { 
      message: 'Failed to fetch student exams.' 
    };
  }
};

/**
 * 🗑️ 6. Delete Student Exam
 */
export const deleteStudentExam = async (examId) => {
  try {
    const config = await getAuthConfig();
    const response = await axios.delete(
      `${API_URL}/student-exams/${examId}`,
      config
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { 
      message: 'Failed to delete exam.' 
    };
  }
};