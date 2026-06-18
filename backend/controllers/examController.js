const { db } = require('../config/firebase');


const getStudentExams = async (req, res) => {
  try {
    
    const snapshot = await db.collection('student_exams').get();
    const examsList = [];
    
    snapshot.forEach(doc => {
      
      examsList.push({ id: doc.id, ...doc.data() }); 
    });
    
    return res.status(200).json(examsList);
  } catch (error) {
    console.error("Firebase Fetch Error:", error);
    return res.status(500).json({ message: 'Error fetching exams', error: error.message });
  }
};




const deleteStudentExam = async (req, res) => {
  try {
    const examDocId = req.params.id; 

    
    const examRef = db.collection('student_exams').doc(examDocId);
    const doc = await examRef.get();

    
    if (!doc.exists) {
      return res.status(404).json({ message: 'Exam not found in database' });
    }

   
    await examRef.delete();

    return res.status(200).json({ message: 'Exam successfully deleted from database!' });
  } catch (error) {
    console.error("Firebase Delete Error:", error);
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
};


module.exports = {
  getStudentExams,
  deleteStudentExam
};