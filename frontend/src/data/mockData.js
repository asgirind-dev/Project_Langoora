export const examCategories = [
  { id: 1, name: 'JLPT', flag: '🇯🇵', color: 'from-red-500 to-pink-600', description: 'Japanese Language Proficiency Test', levels: ['N1','N2','N3','N4','N5'], students: 12400 },
  { id: 2, name: 'EPS-TOPIK', flag: '🇰🇷', color: 'from-blue-500 to-cyan-600', description: 'Employment Permit System Test', levels: ['Basic','Standard'], students: 9800 },
  { id: 3, name: 'TOPIK', flag: '🇰🇷', color: 'from-violet-500 to-indigo-600', description: 'Test of Proficiency in Korean', levels: ['TOPIK I'], students: 4500 }
];

export const topTutors = [
  { id: 1, name: 'Roshan Gunawardena', avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?w=80', exams: ['JLPT N5', 'JLPT N4', 'JLPT N3'], rating: 4.9, students: 1240, badge: 'Top Rated' },
  { id: 2, name: 'Chamila Jayasinghe', avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?w=80', exams: ['EPS-TOPIK', 'TOPIK I'], rating: 4.8, students: 980, badge: 'Rising Star' },
  { id: 3, name: 'Kasun Perera', avatar: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?w=80', exams: ['JLPT N2', 'JLPT N1'], rating: 4.9, students: 2100, badge: 'Top Rated' },
  { id: 4, name: 'Nilanthi Rathnayake', avatar: 'https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?w=80', exams: ['JLPT N5', 'JLPT N4'], rating: 4.7, students: 650, badge: 'Verified' },
  { id: 5, name: 'Dinesh De Silva', avatar: 'https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?w=80', exams: ['EPS-TOPIK'], rating: 4.8, students: 890, badge: 'Verified' },
];

export const featuredExams = [
  { id: 1, title: 'JLPT N2 Official Simulation Full Mock Exam', category: 'JLPT', level: 'N2', tutor: 'Kasun Perera', tutorAvatar: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?w=40', duration: '155 min', questions: 105, credits: 25, rating: 4.8, reviews: 342, difficulty: 'Advanced', thumbnail: 'https://images.pexels.com/photos/5427671/pexels-photo-5427671.jpeg?w=400', tag: 'Bestseller' },
  { id: 2, title: 'EPS-TOPIK Standard CBT Full Simulation Pack', category: 'EPS-TOPIK', level: 'Standard', tutor: 'Chamila Jayasinghe', tutorAvatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?w=40', duration: '50 min', questions: 40, credits: 20, rating: 4.7, reviews: 218, difficulty: 'Intermediate', thumbnail: 'https://images.pexels.com/photos/4144923/pexels-photo-4144923.jpeg?w=400', tag: 'Popular' },
  { id: 3, title: 'JLPT N5 Elementary Model Practice Paper', category: 'JLPT', level: 'N5', tutor: 'Nilanthi Rathnayake', tutorAvatar: 'https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?w=40', duration: '90 min', questions: 70, credits: 10, rating: 4.9, reviews: 124, difficulty: 'Beginner', thumbnail: 'https://images.pexels.com/photos/256395/pexels-photo-256395.jpeg?w=400', tag: 'Top Rated' },
  { id: 4, title: 'JLPT N4 Comprehensive Grammar & Listening Test', category: 'JLPT', level: 'N4', tutor: 'Roshan Gunawardena', tutorAvatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?w=40', duration: '100 min', questions: 80, credits: 15, rating: 4.6, reviews: 156, difficulty: 'Intermediate', thumbnail: 'https://images.pexels.com/photos/414294/pexels-photo-414294.jpeg?w=400', tag: 'New' },
  { id: 5, title: 'TOPIK I Standard Reading & Listening Evaluation', category: 'TOPIK', level: 'TOPIK I', tutor: 'Chamila Jayasinghe', tutorAvatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?w=40', duration: '100 min', questions: 70, credits: 15, rating: 4.8, reviews: 98, difficulty: 'Beginner', thumbnail: 'https://images.pexels.com/photos/301926/pexels-photo-301926.jpeg?w=400', tag: 'Popular' },
  { id: 6, title: 'JLPT N1 Advanced Master Level Simulation', category: 'JLPT', level: 'N1', tutor: 'Kasun Perera', tutorAvatar: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?w=40', duration: '170 min', questions: 115, credits: 30, rating: 4.9, reviews: 289, difficulty: 'Expert', thumbnail: 'https://images.pexels.com/photos/6238297/pexels-photo-6238297.jpeg?w=400', tag: 'Top Rated' }
];

export const testimonials = [
  { id: 1, name: 'Kavindu Perera', avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?w=60', role: 'Passed JLPT N2', text: 'Langoora\'s simulation exams were exactly like the real thing. I scored 142/180 on my first attempt!', rating: 5, exam: 'JLPT N2' },
  { id: 2, name: 'Dilini Rajapaksa', avatar: 'https://images.pexels.com/photos/3771120/pexels-photo-3771120.jpeg?w=60', role: 'EPS-TOPIK Certified', text: 'The listening section practice was incredibly helpful. Got my dream job in Korea within 3 months!', rating: 5, exam: 'EPS-TOPIK' },
  { id: 3, name: 'Tharaka Fernando', avatar: 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?w=60', role: 'Passed JLPT N4', text: 'The grammar banks and real-time listening setup allowed me to clear my N4 test with full confidence.', rating: 5, exam: 'JLPT N4' },
  { id: 4, name: 'Samantha Wijesinghe', avatar: 'https://images.pexels.com/photos/3763152/pexels-photo-3763152.jpeg?w=60', role: 'TOPIK I Cleared', text: 'The credit-based mock framework perfectly replicated the test room environment. Best platform ever!', rating: 5, exam: 'TOPIK I' },
];

export const studentPerformanceData = [
  { month: 'Jan', score: 62, target: 70 },
  { month: 'Feb', score: 68, target: 70 },
  { month: 'Mar', score: 71, target: 75 },
  { month: 'Apr', score: 74, target: 75 },
  { month: 'May', score: 78, target: 80 },
  { month: 'Jun', score: 82, target: 80 },
];

export const sectionScores = [
  { section: 'Grammar', score: 78, max: 100 },
  { section: 'Vocabulary', score: 85, max: 100 },
  { section: 'Listening', score: 70, max: 100 },
  { section: 'Reading', score: 88, max: 100 },
];

export const tutorRevenueData = [
  { month: 'Jan', revenue: 45000 },
  { month: 'Feb', revenue: 62000 },
  { month: 'Mar', revenue: 58000 },
  { month: 'Apr', revenue: 75000 },
  { month: 'May', revenue: 89000 },
  { month: 'Jun', revenue: 112000 },
];

export const adminStats = {
  totalUsers: 24680,
  activeStudents: 18920,
  activeTutors: 342,
  totalCreditsTransacted: 84500,
  pendingApprovals: 12,
  totalExams: 1847,
};

export const recentTransactions = [
  { id: 'TXN001', user: 'Kavindu Perera', exam: 'JLPT N2 Mock', credits: 25, date: '2026-06-10', status: 'completed' },
  { id: 'TXN002', user: 'Dilini Rajapaksa', exam: 'EPS-TOPIK Standard', credits: 20, date: '2026-06-10', status: 'completed' },
  { id: 'TXN003', user: 'Tharaka Fernando', exam: 'JLPT N4 Mock', credits: 15, date: '2026-06-09', status: 'completed' },
  { id: 'TXN004', user: 'Amara Bandara', exam: 'JLPT N1 Simulation', credits: 30, date: '2026-06-09', status: 'completed' },
  { id: 'TXN005', user: 'Nuwan Silva', exam: 'TOPIK I Standard', credits: 15, date: '2026-06-08', status: 'refunded' },
];

export const pendingTutors = [
  { id: 1, name: 'Akira Yamamoto', email: 'akira@example.com', exam: 'JLPT', university: 'University of Kelaniya', submitted: '2026-06-08', status: 'pending' },
  { id: 2, name: 'Soo-Jin Lee', email: 'soojin@example.com', exam: 'TOPIK', university: 'University of Colombo', submitted: '2026-06-07', status: 'pending' },
];

export const subscriptionPlans = [
  { id: 'free', name: 'Starter', price: 1500, credits: 30, color: 'gray', features: ['Allocated 30 Credits/month', 'Basic analytics room', 'Standard listening audio player'], popular: false },
  { id: 'pro', name: 'Premium Professional', price: 3500, credits: 80, color: 'blue', features: ['Allocated 80 Credits/month', 'Deep breakdown dashboard', 'Dynamic speed controllers', 'Category filter controls'], popular: true },
  { id: 'elite', name: 'Ultimate Elite', price: 5500, credits: 150, color: 'amber', features: ['Allocated 150 Credits/month', 'All expert exam rooms unlocked', 'Priority tutor review system', 'Full performance insights'], popular: false },
];