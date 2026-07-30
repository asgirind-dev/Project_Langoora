// frontend/src/utils/examStorage.js

const STORAGE_KEY_PREFIX = 'langoora_exam_';

/**
 * ✅ Save exam progress to localStorage
 * @param {string} examId - Exam ID
 * @param {object} data - Progress data { answers, partIndex, qIndex, timeLeft, attemptId }
 * @returns {boolean} - Success status
 */
export const saveExamToLocalStorage = (examId, data) => {
  try {
    const key = `${STORAGE_KEY_PREFIX}${examId}`;
    const payload = {
      ...data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
    return false;
  }
};

/**
 * ✅ Get exam progress from localStorage
 * @param {string} examId - Exam ID
 * @returns {object|null} - Progress data or null if not found/expired
 */
export const getExamFromLocalStorage = (examId) => {
  try {
    const key = `${STORAGE_KEY_PREFIX}${examId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    
    const data = JSON.parse(raw);
    
    // Only return if less than 1 hour old
    if (Date.now() - data.timestamp > 3600000) {
      localStorage.removeItem(key);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('Failed to get from localStorage:', err);
    return null;
  }
};

/**
 * ✅ Clear exam progress from localStorage
 * @param {string} examId - Exam ID
 * @returns {boolean} - Success status
 */
export const clearExamFromLocalStorage = (examId) => {
  try {
    const key = `${STORAGE_KEY_PREFIX}${examId}`;
    localStorage.removeItem(key);
    return true;
  } catch (err) {
    console.error('Failed to clear localStorage:', err);
    return false;
  }
};

/**
 * ✅ Check if localStorage has exam data
 * @param {string} examId - Exam ID
 * @returns {boolean} - True if data exists
 */
export const hasExamInLocalStorage = (examId) => {
  return !!getExamFromLocalStorage(examId);
};

/**
 * ✅ Get exam progress from localStorage (alias for getExamFromLocalStorage)
 * @param {string} examId - Exam ID
 * @returns {object|null} - Progress data or null
 */
export const getExamProgress = getExamFromLocalStorage;

/**
 * ✅ Save exam progress to localStorage (alias for saveExamToLocalStorage)
 * @param {string} examId - Exam ID
 * @param {object} data - Progress data
 * @returns {boolean} - Success status
 */
export const saveExamProgress = saveExamToLocalStorage;

/**
 * ✅ Clear exam progress from localStorage (alias for clearExamFromLocalStorage)
 * @param {string} examId - Exam ID
 * @returns {boolean} - Success status
 */
export const clearExamProgress = clearExamFromLocalStorage;