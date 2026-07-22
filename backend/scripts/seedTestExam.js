// ─── Simple import that works with all versions ────────────────────────
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// ─── Initialize Firebase Admin ──────────────────────────────────────────
function initializeFirebase() {
  try {
    // Find the service account key
    const possiblePaths = [
      path.join(__dirname, '../firebase-key.json'),
      path.join(__dirname, '../serviceAccountKey.json'),
      path.join(process.cwd(), 'firebase-key.json'),
      path.join(process.cwd(), 'serviceAccountKey.json'),
    ];

    let serviceAccountPath = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        serviceAccountPath = p;
        break;
      }
    }

    if (!serviceAccountPath) {
      console.error('❌ Firebase service account key not found.');
      console.log('📁 Please place firebase-key.json in the backend folder.');
      return null;
    }

    console.log(`📁 Using service account: ${path.basename(serviceAccountPath)}`);
    
    // Read the service account file
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    // Check if already initialized
    if (admin.apps && admin.apps.length > 0) {
      console.log('✅ Firebase Admin already initialized');
      return admin;
    }

    // Initialize with the service account
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    console.log('✅ Firebase Admin initialized successfully');
    return admin;

  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error.message);
    return null;
  }
}

// Initialize Firebase
const initializedAdmin = initializeFirebase();

if (!initializedAdmin) {
  console.error('❌ Could not initialize Firebase. Exiting.');
  process.exit(1);
}

// Get Firestore instance
const db = admin.firestore();

// ─── Audio URL for Listening Section ────────────────────────────────────
const LISTENING_AUDIO_URL = 'https://res.cloudinary.com/akarwtly/video/upload/v1784199997/langoora/audio/gjo87n2xnghram8fmvis.mp3';

// ─── Thumbnail URL ──────────────────────────────────────────────────────
const THUMBNAIL_URL = 'https://images.pexels.com/photos/11075249/pexels-photo-11075249.jpeg?w=400&h=200&fit=crop';

// ─── Test Exam Data ──────────────────────────────────────────────────────
const TEST_EXAM = {
  metadata: {
    title: 'JLPT N5 Full Mock Test - Paper 01',
    category_id: 'jlpt',
    level_id: 'n5',
    duration_minutes: 60,
    description: 'Complete JLPT N5 practice test with Vocabulary, Grammar, and Listening sections.',
    status: 'active',
    thumbnail: THUMBNAIL_URL,
    tutor_id: 'mock_tutor_id',
    tutor_name: 'Test Tutor',
    isModernExam: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sections: [
      { name: 'Vocabulary', questions: 5, time: 20, audio_url: null },
      { name: 'Grammar', questions: 5, time: 20, audio_url: null },
      { name: 'Listening', questions: 5, time: 20, audio_url: LISTENING_AUDIO_URL }
    ]
  },

  problems: {
    problem_01: {
      problem_number: 1,
      section: 'Vocabulary',
      problem_title: 'Kanji Reading - Vocabulary 1',
      total_sub_questions: 3,
      sub_questions: [
        {
          sub_number: 1,
          text: 'Choose the correct reading for the highlighted Kanji: きのうの夜はおそくまで 【仕事】 をしました。',
          options: ['しこと', 'しごと', 'ちこと', 'ちごと'],
          correct_answer_index: 1,
          explanation: 'The Kanji 【仕事】 means "work" or "job". Its correct reading is "しごと" (shigoto).',
          image_url: null,
          audio_url: null,
        },
        {
          sub_number: 2,
          text: 'Choose the correct reading for the highlighted Kanji: 【学校】 に行きます。',
          options: ['がっこう', 'かっこう', 'がくこう', 'かくこう'],
          correct_answer_index: 0,
          explanation: '【学校】 means "school". Its correct reading is "がっこう" (gakkou).',
          image_url: null,
          audio_url: null,
        },
        {
          sub_number: 3,
          text: 'Choose the correct meaning of the word: たべもの',
          options: ['Drink', 'Food', 'Book', 'House'],
          correct_answer_index: 1,
          explanation: 'たべもの (tabemono) means "food".',
          image_url: null,
          audio_url: null,
        }
      ]
    },

    problem_02: {
      problem_number: 2,
      section: 'Vocabulary',
      problem_title: 'Kanji Reading - Vocabulary 2',
      total_sub_questions: 2,
      sub_questions: [
        {
          sub_number: 1,
          text: 'Choose the correct reading for: 先生',
          options: ['せんせい', 'せんせ', 'しんせい', 'しんせ'],
          correct_answer_index: 0,
          explanation: '先生 (sensei) means "teacher".',
          image_url: null,
          audio_url: null,
        },
        {
          sub_number: 2,
          text: 'Select the correct meaning: くるま',
          options: ['Car', 'Train', 'Bicycle', 'Bus'],
          correct_answer_index: 0,
          explanation: 'くるま (kuruma) means "car".',
          image_url: null,
          audio_url: null,
        }
      ]
    },

    problem_03: {
      problem_number: 3,
      section: 'Grammar',
      problem_title: 'Particles - Grammar 1',
      total_sub_questions: 3,
      sub_questions: [
        {
          sub_number: 1,
          text: 'Choose the correct particle: わたし ___ がくせい です。',
          options: ['は', 'が', 'を', 'に'],
          correct_answer_index: 0,
          explanation: 'The particle は (wa) is used to mark the topic of the sentence.',
          image_url: null,
          audio_url: null,
        },
        {
          sub_number: 2,
          text: 'Choose the correct particle: ほん ___ よんで います。',
          options: ['を', 'が', 'に', 'で'],
          correct_answer_index: 0,
          explanation: 'The particle を (wo) marks the direct object of the verb.',
          image_url: null,
          audio_url: null,
        },
        {
          sub_number: 3,
          text: 'Choose the correct particle: きょうしつ ___ います。',
          options: ['に', 'が', 'を', 'で'],
          correct_answer_index: 0,
          explanation: 'The particle に (ni) indicates the location where someone/something exists.',
          image_url: null,
          audio_url: null,
        }
      ]
    },

    problem_04: {
      problem_number: 4,
      section: 'Grammar',
      problem_title: 'Verb Forms - Grammar 2',
      total_sub_questions: 2,
      sub_questions: [
        {
          sub_number: 1,
          text: 'Choose the correct past tense: たべます → ___',
          options: ['たべない', 'たべる', 'たべた', 'たべて'],
          correct_answer_index: 2,
          explanation: 'たべます (tabemasu) past tense is たべた (tabeta).',
          image_url: null,
          audio_url: null,
        },
        {
          sub_number: 2,
          text: 'Choose the correct negative form: いきます → ___',
          options: ['いかない', 'いきない', 'いきません', 'いかないです'],
          correct_answer_index: 0,
          explanation: 'いきます (ikimasu) negative form is いかない (ikanai).',
          image_url: null,
          audio_url: null,
        }
      ]
    },

    problem_05: {
      problem_number: 5,
      section: 'Listening',
      problem_title: 'Listening Comprehension 1',
      total_sub_questions: 3,
      sub_questions: [
        {
          sub_number: 1,
          text: 'What is the speaker talking about? (Listen to the audio)',
          options: ['Weather', 'Food', 'School', 'Work'],
          correct_answer_index: 0,
          explanation: 'The speaker is talking about the weather forecast.',
          image_url: null,
          audio_url: null,
        },
        {
          sub_number: 2,
          text: 'Where is the conversation taking place? (Listen to the audio)',
          options: ['Restaurant', 'Station', 'School', 'Hospital'],
          correct_answer_index: 1,
          explanation: 'The conversation is at the train station.',
          image_url: null,
          audio_url: null,
        },
        {
          sub_number: 3,
          text: 'What time is the meeting? (Listen to the audio)',
          options: ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM'],
          correct_answer_index: 1,
          explanation: 'The meeting is scheduled for 10:00 AM.',
          image_url: null,
          audio_url: null,
        }
      ]
    },

    problem_06: {
      problem_number: 6,
      section: 'Listening',
      problem_title: 'Listening Comprehension 2',
      total_sub_questions: 2,
      sub_questions: [
        {
          sub_number: 1,
          text: 'Who is the speaker addressing? (Listen to the audio)',
          options: ['Students', 'Teachers', 'Parents', 'Staff'],
          correct_answer_index: 0,
          explanation: 'The speaker is talking to students.',
          image_url: null,
          audio_url: null,
        },
        {
          sub_number: 2,
          text: 'What is the main topic? (Listen to the audio)',
          options: ['Exam results', 'School trip', 'Homework', 'Club activities'],
          correct_answer_index: 3,
          explanation: 'The main topic is about club activities.',
          image_url: null,
          audio_url: null,
        }
      ]
    }
  }
};

// ─── Insert Exam into Firestore ────────────────────────────────────────

async function insertTestExam() {
  try {
    const examId = `exam_jlpt_n5_${Date.now()}`;
    console.log(`📝 Creating test exam with ID: ${examId}`);

    const examRef = db.collection('exams').doc(examId);
    
    let totalQuestions = 0;
    for (const [_, problemData] of Object.entries(TEST_EXAM.problems)) {
      totalQuestions += problemData.sub_questions.length;
    }

    await examRef.set({
      ...TEST_EXAM.metadata,
      total_questions: totalQuestions,
      total_problems: Object.keys(TEST_EXAM.problems).length
    });
    console.log(`✅ Exam metadata created`);
    console.log(`   📍 Listening audio URL: ${LISTENING_AUDIO_URL}`);
    console.log(`   🖼️ Thumbnail: ${THUMBNAIL_URL}`);

    const batch = db.batch();
    
    for (const [problemId, problemData] of Object.entries(TEST_EXAM.problems)) {
      const problemRef = examRef.collection('problems').doc(problemId);
      
      batch.set(problemRef, {
        problem_number: problemData.problem_number,
        section: problemData.section,
        problem_title: problemData.problem_title || '',
        total_sub_questions: problemData.sub_questions.length,
        example: null,
        explanation: null,
        created_at: new Date().toISOString(),
      });
      
      for (const subQ of problemData.sub_questions) {
        const subQRef = problemRef.collection('sub_questions').doc(`sub_${String(subQ.sub_number).padStart(2, '0')}`);
        batch.set(subQRef, {
          sub_number: subQ.sub_number,
          text: subQ.text,
          options: subQ.options,
          correct_answer_index: subQ.correct_answer_index,
          explanation: subQ.explanation || '',
          image_url: subQ.image_url || null,
          audio_url: subQ.audio_url || null,
          created_at: new Date().toISOString(),
        });
      }
      
      console.log(`   ✅ ${problemId} created with ${problemData.sub_questions.length} sub-questions`);
    }
    
    await batch.commit();
    console.log(`✅ All problems and sub-questions created`);

    console.log('\n🎉 Test exam created successfully!');
    console.log(`📋 Exam ID: ${examId}`);
    console.log(`🔗 Start URL: http://localhost:5173/exam/${examId}/take`);
    console.log(`📊 Total Questions: ${totalQuestions}`);

    return examId;

  } catch (error) {
    console.error('❌ Error inserting test exam:', error);
    throw error;
  }
}

// ─── Run the Script ─────────────────────────────────────────────────────

if (require.main === module) {
  insertTestExam()
    .then(() => {
      console.log('\n✅ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { insertTestExam };