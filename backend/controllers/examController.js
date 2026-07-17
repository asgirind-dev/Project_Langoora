const { db, storage } = require("../config/firebase");
const cloudinary = require("cloudinary").v2;

/**
 * 🚀 1. Create a New Exam Blueprint and Nest Questions Sub-collection (Tutor Action)
 */
const createExam = async (req, res) => {
  try {
    const {
      title,
      category_id,
      level_id,
      duration_minutes,
      description,
      status,
      sections,
      questions,
      thumbnail,
    } = req.body;

    if (!title || !category_id || !level_id || !duration_minutes) {
      return res.status(400).json({
        success: false,
        message: "Core metadata parameters are missing.",
      });
    }

    const cleanExamId = `exam_${category_id}_${level_id}_${Date.now()}`;
    const examRef = db.collection("exams").doc(cleanExamId);

    const examMetadata = {
      title: title.trim(),
      category_id,
      level_id,
      duration_minutes: Number(duration_minutes),
      description: description ? description.trim() : "",
      status: status || "draft",
      sections: sections || [],
      thumbnail: thumbnail || null,
      total_questions: questions ? questions.length : 0,
      tutor_id: req.user?.id || "mock_tutor_id",
      tutor_name: req.user?.name || "Expert Tutor",
      isModernExam: true,
      created_at: new Date().toISOString(),
    };

    await examRef.set(examMetadata);

    if (questions && questions.length > 0) {
      const batch = db.batch();

      questions.forEach((q, index) => {
        const questionId = `q_${String(index + 1).padStart(2, "0")}`;
        const questionRef = examRef.collection("questions").doc(questionId);

        batch.set(questionRef, {
          question_number: index + 1,
          section: q.section,
          type: q.type || "mcq",
          text: q.text ? q.text.trim() : "",
          options: q.options || [],
          correct_answer_index: q.correct !== undefined ? Number(q.correct) : 0,
          explanation: q.explanation ? q.explanation.trim() : "",
          audio_url: q.audio_url || null,
          image_url: q.image_url || null,
        });
      });

      await batch.commit();
    }

    return res.status(201).json({
      success: true,
      message:
        "Exam architecture deployed and structured inside node repositories.",
      examId: cleanExamId,
    });
  } catch (error) {
    console.error("Exam Creation Core Runtime Exception:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server failed to execute blueprint commit.",
    });
  }
};

/**
 * 📊 2. Fetch All Student Exam Attempts
 */
const getStudentExams = async (req, res) => {
  try {
    const snapshot = await db.collection("student_exams").get();
    const examsList = [];

    snapshot.forEach((doc) => {
      examsList.push({ id: doc.id, ...doc.data() });
    });

    return res.status(200).json(examsList);
  } catch (error) {
    console.error("Firebase Fetch Error:", error);
    return res
      .status(500)
      .json({ message: "Error fetching exams", error: error.message });
  }
};

/**
 * 🎵 📷 3. Upload Asset to Cloudinary via Direct Memory Stream Buffer
 */
const uploadAsset = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file detected in request buffer.",
      });
    }

    cloudinary.config({
      cloud_name: "akarwtly",
      api_key: "533185996121573",
      api_secret: "ZkxUf2UUNBinoJhCgf02gQop-ns",
    });

    const fileType = req.file.mimetype.split("/")[0];
    let folderPath = "langoora/images";
    let resourceType = "image";

    if (fileType === "audio") {
      folderPath = "langoora/audio";
      resourceType = "video";
    }

    const uploadStream = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: folderPath,
            resource_type: resourceType,
            public_id: `${Date.now()}_${req.file.originalname.split(".")[0].replace(/\s+/g, "_")}`,
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          },
        );
        stream.end(req.file.buffer);
      });
    };

    const cloudinaryResult = await uploadStream();

    return res.status(200).json({
      success: true,
      message:
        "Asset uploaded successfully to Cloudinary CDN server infrastructure.",
      fileUrl: cloudinaryResult.secure_url,
    });
  } catch (error) {
    console.error("Cloudinary Asset Upload Runtime Exception:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server failed to execute cloud asset streaming.",
      error: error.message,
    });
  }
};

/**
 * 🗑️ 4. Delete Asset from Cloudinary CDN Server
 */
const deleteAsset = async (req, res) => {
  try {
    const { fileUrl } = req.body;

    if (!fileUrl) {
      return res.status(400).json({
        success: false,
        message: "File URL is required for deletion.",
      });
    }

    cloudinary.config({
      cloud_name: "akarwtly",
      api_key: "533185996121573",
      api_secret: "ZkxUf2UUNBinoJhCgf02gQop-ns",
    });

    const urlParts = fileUrl.split("/");
    const fileWithExtension = urlParts[urlParts.length - 1];
    const publicIdWithoutExt = fileWithExtension.split(".")[0];

    const isAudio = fileUrl.includes("/audio/");
    const folderPath = isAudio ? "langoora/audio" : "langoora/images";
    const publicId = `${folderPath}/${publicIdWithoutExt}`;
    const resourceType = isAudio ? "video" : "image";

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    if (result.result === "ok") {
      return res.status(200).json({
        success: true,
        message: "Asset successfully deleted from Cloudinary repository.",
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Cloudinary could not find or delete the asset.",
        cloudinaryResult: result,
      });
    }
  } catch (error) {
    console.error("Cloudinary Asset Deletion Runtime Exception:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server failed to execute cloud asset deletion.",
      error: error.message,
    });
  }
};

/**
 * 🗑️ 5. Delete a Student Exam Attempt Node
 */
const deleteStudentExam = async (req, res) => {
  try {
    const examDocId = req.params.id;
    const examRef = db.collection("student_exams").doc(examDocId);
    const doc = await examRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Exam not found in database" });
    }

    await examRef.delete();
    return res
      .status(200)
      .json({ message: "Exam successfully deleted from database!" });
  } catch (error) {
    console.error("Firebase Delete Error:", error);
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
};

/**
 * 🔍 6. Fetch All Exams Pending Quality Audit
 */
const getPendingAudits = async (req, res) => {
  try {
    const examsRef = db.collection("exams");
    const snapshot = await examsRef
      .where("status", "==", "pending_audit")
      .get();

    if (snapshot.empty) {
      return res.status(200).json({ success: true, data: [] });
    }

    const pendingExams = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      pendingExams.push({
        id: doc.id,
        title: data.title,
        level: data.level_id,
        price: data.price || 0,
        createdAt: data.created_at
          ? { seconds: Math.floor(new Date(data.created_at).getTime() / 1000) }
          : null,
        ...data,
      });
    });

    return res.status(200).json({ success: true, data: pendingExams });
  } catch (error) {
    console.error("Error fetching pending audits:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch audit queue.",
      error: error.message,
    });
  }
};

/**
 * ❓ 7. Fetch nested questions sub-collection for a specific exam
 */
const getExamQuestions = async (req, res) => {
  try {
    const { examId } = req.params;
    const questionsRef = db
      .collection("exams")
      .doc(examId)
      .collection("questions");
    const snapshot = await questionsRef.orderBy("question_number").get();

    const questions = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      questions.push({
        id: doc.id,
        questionText: data.text,
        options: data.options,
        correctOptionIndex: data.correct_answer_index,
        explanation: data.explanation || "",
      });
    });

    return res.status(200).json({ success: true, data: questions });
  } catch (error) {
    console.error(`Error fetching questions for exam ${examId}:`, error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch exam questions." });
  }
};

/**
 * ✍️ 8. Update Exam Audit Status (Publish or Reject to Draft)
 */
const updateExamStatus = async (req, res) => {
  try {
    const { examId } = req.params;
    const { status } = req.body;

    if (!["published", "draft"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status update requested." });
    }

    const examRef = db.collection("exams").doc(examId);
    const doc = await examRef.get();

    if (!doc.exists) {
      return res
        .status(404)
        .json({ success: false, message: "Exam package not found." });
    }

    await examRef.update({ status });

    return res.status(200).json({
      success: true,
      message: `Exam successfully ${status === "published" ? "published live" : "reverted to draft mode"}.`,
    });
  } catch (error) {
    console.error("Error updating exam status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to execute status transition.",
    });
  }
};

// 🌟 ALL FUNCTIONS CONSOLIDATED AND EXPORTED SAFELY HERE
module.exports = {
  createExam,
  getStudentExams,
  uploadAsset,
  deleteAsset,
  deleteStudentExam,
  getPendingAudits,
  getExamQuestions,
  updateExamStatus,
};
