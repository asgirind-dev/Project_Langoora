import axios from "axios";

export const API_URL = "http://localhost:5000/api/exams";


/**
 * 🔐 Helper: Get fresh token from Firebase
 */
const getFreshToken = async () => {
  try {
    const { getAuth } = await import("firebase/auth");
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error("No user logged in");
    }

    const token = await user.getIdToken(true);
    localStorage.setItem("token", token);
    return token;
  } catch (error) {
    console.error("Failed to get fresh token:", error);
    throw error;
  }
};

/**
 * 🔐 Helper: Get auth config with token
 */
const getAuthConfig = async () => {
  let token = localStorage.getItem("token");

  if (!token) {
    token = await getFreshToken();
  }

  return {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
};

/**
 * 🎯 Dedicated axios instance for the JSON exam endpoints (create, read,
 * update, draft, status, delete). authMiddleware.js returns 401 with
 * `{ success: false, message: 'Not authorized, token validation failed.' }`
 * for an expired/invalid token — this response interceptor catches that
 * (and any other 401/403), silently refreshes the Firebase ID token via
 * `getIdToken(true)`, and retries the original request exactly once.
 *
 * If the refresh itself fails (e.g. the Firebase session is fully gone,
 * not just the short-lived ID token), the rejected error is tagged with
 * `isAuthExpired: true` so callers — specifically CreateExamPage.jsx's
 * save handlers — can trigger the session-expired safety net instead of
 * treating it as a generic failure.
 *
 * NOTE: uploadExamAsset() below intentionally does NOT use this instance.
 * It already has its own working 401-retry path, and touching it risks
 * the Cloudinary upload logic, which must stay exactly as-is.
 */
const apiClient = axios.create();

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const isAuthError = status === 401 || status === 403;

    if (isAuthError && originalRequest && !originalRequest._retriedAfterRefresh) {
      originalRequest._retriedAfterRefresh = true;
      try {
        const freshToken = await getFreshToken();
        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${freshToken}`
        };
        return apiClient(originalRequest);
      } catch (refreshError) {
        error.isAuthExpired = true;
        return Promise.reject(error);
      }
    }

    if (isAuthError) {
      // Already retried once (via the branch above) and still failing.
      error.isAuthExpired = true;
    }

    return Promise.reject(error);
  }
);

/**
 * 🔐 Helper: fold `error.isAuthExpired` (set by the interceptor above)
 * into whatever payload a catch block is about to throw, without
 * changing the shape callers already rely on (`.success`, `.message`).
 */
const toServiceError = (error, fallback) => ({
  ...(error.response?.data || fallback),
  isAuthExpired: !!error.isAuthExpired
});

/**
 * 💾 1. Create New Exam
 */
export const createTutorExam = async (examPayload) => {
  try {
    const config = await getAuthConfig();
    const response = await axios.post(`${API_URL}/create`, examPayload, config);
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: "Failed to commit exam blueprint layer.",
      }
    );
  }
};

/**
 * 📊 2. Get All Tutor Exams
 */
export const getTutorExams = async () => {
  try {
    const config = await getAuthConfig();
    const response = await axios.get(`${API_URL}/tutor-exams`, config);
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: "Failed to fetch tutor exams.",
      }
    );
  }
};

/**
 * 📊 3. Get Exam by ID
 */
export const getExamById = async (examId) => {
  try {
    const config = await getAuthConfig();
    const response = await axios.get(`${API_URL}/${examId}`, config);
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: "Failed to fetch exam details.",
      }
    );
  }
};

/**
 * 🗑️ 4. Delete Exam
 */
export const deleteExam = async (examId) => {
  try {
    const config = await getAuthConfig();
    const response = await axios.delete(`${API_URL}/${examId}`, config);
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: "Failed to delete exam.",
      }
    );
  }
};

/**
 * ♻️ Recycle Bin: Get all soft-deleted exams
 */
export const getRecycleBinExams = async () => {
  try {
    const config = await getAuthConfig();
    const response = await axios.get(`${API_URL}/recycle-bin`, config);
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: "Failed to fetch recycle bin exams.",
      }
    );
  }
};

/**
 * ♻️ Recycle Bin: Restore a soft-deleted exam
 */
export const restoreExam = async (examId) => {
  try {
    const config = await getAuthConfig();
    const response = await apiClient.put(
      `${API_URL}/${examId}/restore`,
      {},
      config,
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: "Failed to restore exam.",
      }
    );
  }
};

/**
 * 🗑️ Recycle Bin: Permanently delete an exam
 */
export const permanentDeleteExam = async (examId) => {
  try {
    const config = await getAuthConfig();
    const response = await apiClient.delete(
      `${API_URL}/${examId}/permanent`,
      config,
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: "Failed to permanently delete exam.",
      }
    );
  }
};

/**
 * 📝 5. Update Exam Status
 */
export const updateExamStatus = async (examId, status) => {
  try {
    const config = await getAuthConfig();
    const response = await apiClient.put(
      `${API_URL}/${examId}/status`,
      { status },
      config,
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: "Failed to update exam status.",
      }
    );
  }
};

/**
 * 📝 6. Update Exam Draft (Auto-save)
 */
export const updateExamDraft = async (examId, draftData) => {
  try {
    const config = await getAuthConfig();
    const response = await apiClient.put(
      `${API_URL}/${examId}/draft`,
      draftData,
      config,
    );
    return response.data;
  } catch (error) {
    console.error(
      "Update Exam Draft Error:",
      error.response?.data || error.message,
    );
    throw (
      error.response?.data || {
        message: "Failed to update exam draft.",
      }
    );
  }
};

/**
 * 📝 7. Update Existing Exam (Full Update)
 */
export const updateExam = async (examId, examPayload) => {
  try {
    const config = await getAuthConfig();
    const response = await apiClient.put(
      `${API_URL}/${examId}`,
      examPayload,
      config,
    );
    return response.data;
  } catch (error) {
    console.error("Update Exam Error:", error.response?.data || error.message);
    throw (
      error.response?.data || {
        message: "Failed to update exam.",
      }
    );
  }
};

/**
 * 🎵 📷 8. Upload Asset
 */
export const uploadExamAsset = async (fileBlob, paperId = null) => {
  try {
    let token = localStorage.getItem("token");

    if (!token) {
      token = await getFreshToken();
    }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const exp = payload.exp * 1000;
      if (Date.now() >= exp) {
        console.log("Token expired, getting fresh one...");
        token = await getFreshToken();
      }
    } catch (e) {
      token = await getFreshToken();
    }

    const formData = new FormData();
    formData.append("file", fileBlob);

    const response = await axios.post(`${API_URL}/upload-asset`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  } catch (error) {
    console.error("❌ Upload error:", error.response?.data || error.message);

    if (error.response?.status === 401) {
      try {
        const token = await getFreshToken();
        const formData = new FormData();
        formData.append("file", fileBlob);

        const response = await axios.post(`${API_URL}/upload-asset`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
        return response.data;
      } catch (retryError) {
        throw (
          retryError.response?.data || {
            message: "Upload failed after token refresh. Please login again.",
          }
        );
      }
    }

    throw (
      error.response?.data || {
        message: error.message || "Asset streaming pipeline rejected.",
      }
    );
  }
};

/**
 * 🗑️ 9. Delete Asset from Cloudinary
 */
export const deleteExamAsset = async (fileUrl) => {
  try {
    const config = await getAuthConfig();
    const response = await apiClient.post(
      `${API_URL}/delete-asset`,
      { fileUrl },
      config,
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: "Failed to delete asset from cloud.",
      }
    );
  }
};

// ============================================================
// ✅ QUALITY AUDITS FUNCTIONS (from your branch)
// ============================================================

/**
 * 📋 Get pending exams for quality audits
 */
export const getPendingExams = async () => {
  try {
    const config = await getAuthConfig();
    const response = await axios.get(`${API_URL}/quality/pending`, config);
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: "Failed to fetch pending exams.",
      }
    );
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
      config,
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: "Failed to approve exam.",
      }
    );
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
      config,
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: "Failed to reject exam.",
      }
    );
  }
};