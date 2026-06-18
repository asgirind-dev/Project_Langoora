const { db } = require('../config/firebase');

// ==========================================
// 1. READ: Firebase එකෙන් සියලුම විභාග ලබා ගැනීම
// ==========================================
const getStudentExams = async (req, res) => {
  try {
    // Firestore එකේ 'student_exams' කියන collection එකෙන් ඩේටා කියවීම
    const snapshot = await db.collection('student_exams').get();
    const examsList = [];
    
    snapshot.forEach(doc => {
      // Firebase එකේ ඇත්තම Document ID එක 'id' එක විදිහට මෙතනින් ගන්නවා
      examsList.push({ id: doc.id, ...doc.data() }); 
    });
    
    return res.status(200).json(examsList);
  } catch (error) {
    console.error("Firebase Fetch Error:", error);
    return res.status(500).json({ message: 'Error fetching exams', error: error.message });
  }
};

// ==========================================
// 2. DELETE: Firebase එකෙන් අදාළ විභාගය මකා දැමීම (කලින් ලියපු එක)
// ==========================================
const deleteStudentExam = async (req, res) => {
  try {
    const examDocId = req.params.id; // Frontend එකෙන් එන Document ID එක

    // Firestore එකේ 'student_exams' collection එකට reference එකක් ගැනීම
    const examRef = db.collection('student_exams').doc(examDocId);
    const doc = await examRef.get();

    // එහෙම Document එකක් database එකේ නැත්නම් error එකක් දෙනවා
    if (!doc.exists) {
      return res.status(404).json({ message: 'Exam not found in database' });
    }

    // Firestore එකෙන් document එක සම්පූර්ණයෙන්ම මකා දැමීම
    await examRef.delete();

    return res.status(200).json({ message: 'Exam successfully deleted from database!' });
  } catch (error) {
    console.error("Firebase Delete Error:", error);
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Functions දෙකම එක පාර export කරනවා
module.exports = {
  getStudentExams,
  deleteStudentExam
};