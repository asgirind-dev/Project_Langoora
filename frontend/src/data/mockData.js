export const examCategories = [
  { id: 1, name: 'JLPT', flag: '🇯🇵', color: 'from-red-500 to-pink-600', description: 'Japanese Language Proficiency Test', levels: ['N1','N2','N3','N4','N5'], students: 12400 },
  { id: 2, name: 'EPS-TOPIK', flag: '🇰🇷', color: 'from-blue-500 to-cyan-600', description: 'Employment Permit System Test', levels: ['Basic','Standard'], students: 9800 }
];

export const topTutors = [
  { id: 1, name: 'Hiroshi Tanaka', avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?w=80', exams: ['JLPT N1', 'JLPT N2'], rating: 4.9, students: 1240, earnings: 'LKR 485,000', badge: 'Top Rated' },
  { id: 2, name: 'Min-Ji Park', avatar: 'https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?w=80', exams: ['EPS-TOPIK', 'TOPIK II'], rating: 4.8, students: 980, earnings: 'LKR 392,000', badge: 'Rising Star' },
  { id: 3, name: 'Sarah Williams', avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?w=80', exams: ['IELTS Academic', 'TOEFL'], rating: 4.9, students: 2100, earnings: 'LKR 720,000', badge: 'Expert' },
  { id: 4, name: 'Li Wei', avatar: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?w=80', exams: ['HSK 5', 'HSK 6'], rating: 4.7, students: 650, earnings: 'LKR 280,000', badge: 'Verified' },
  { id: 5, name: 'James Carter', avatar: 'https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?w=80', exams: ['GRE', 'SAT'], rating: 4.8, students: 890, earnings: 'LKR 340,000', badge: 'Top Rated' },
];

export const featuredExams = [
  { id: 1, title: 'JLPT N2 Full Mock Exam 2024', category: 'JLPT', level: 'N2', tutor: 'Hiroshi Tanaka', tutorAvatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?w=40', duration: '105 min', questions: 108, price: 2500, originalPrice: 4000, rating: 4.8, reviews: 342, difficulty: 'Intermediate', thumbnail: 'https://images.pexels.com/photos/5427671/pexels-photo-5427671.jpeg?w=400', tag: 'Bestseller' },
  { id: 2, title: 'EPS-TOPIK Standard Full Simulation', category: 'EPS-TOPIK', level: 'Standard', tutor: 'Min-Ji Park', tutorAvatar: 'https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?w=40', duration: '70 min', questions: 80, price: 1800, originalPrice: 3000, rating: 4.7, reviews: 218, difficulty: 'Intermediate', thumbnail: 'https://images.pexels.com/photos/4144923/pexels-photo-4144923.jpeg?w=400', tag: 'Popular' },
  { id: 3, title: 'IELTS Academic Band 7+ Strategy', category: 'IELTS', level: 'Academic', tutor: 'Sarah Williams', tutorAvatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?w=40', duration: '180 min', questions: 120, price: 3500, originalPrice: 5500, rating: 4.9, reviews: 891, difficulty: 'Advanced', thumbnail: 'https://images.pexels.com/photos/256395/pexels-photo-256395.jpeg?w=400', tag: 'Top Rated' },
  { id: 4, title: 'HSK Level 5 Comprehensive Mock', category: 'HSK', level: 'Level 5', tutor: 'Li Wei', tutorAvatar: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?w=40', duration: '125 min', questions: 100, price: 2200, originalPrice: 3500, rating: 4.6, reviews: 156, difficulty: 'Advanced', thumbnail: 'https://images.pexels.com/photos/4144294/pexels-photo-4144294.jpeg?w=400', tag: 'New' },
  { id: 5, title: 'GRE Verbal + Quant Full Test', category: 'GRE', level: 'Full', tutor: 'James Carter', tutorAvatar: 'https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?w=40', duration: '230 min', questions: 160, price: 4500, originalPrice: 7000, rating: 4.8, reviews: 445, difficulty: 'Expert', thumbnail: 'https://images.pexels.com/photos/301926/pexels-photo-301926.jpeg?w=400', tag: 'Bestseller' },
  { id: 6, title: 'SAT Math Section Full Practice', category: 'SAT', level: 'Math', tutor: 'James Carter', tutorAvatar: 'https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?w=40', duration: '80 min', questions: 58, price: 1500, originalPrice: 2500, rating: 4.7, reviews: 289, difficulty: 'Intermediate', thumbnail: 'https://images.pexels.com/photos/6238297/pexels-photo-6238297.jpeg?w=400', tag: 'Popular' },
];

export const testimonials = [
  { id: 1, name: 'Kavindu Perera', avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?w=60', role: 'Passed JLPT N2', text: 'Langoora\'s simulation exams were exactly like the real thing. I scored 142/180 on my first attempt!', rating: 5, exam: 'JLPT N2' },
  { id: 2, name: 'Dilini Rajapaksa', avatar: 'https://images.pexels.com/photos/3771120/pexels-photo-3771120.jpeg?w=60', role: 'EPS-TOPIK Certified', text: 'The listening section practice was incredibly helpful. Got my dream job in Korea within 3 months!', rating: 5, exam: 'EPS-TOPIK' },
  { id: 3, name: 'Tharaka Fernando', avatar: 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?w=60', role: 'IELTS Band 7.5', text: 'The analytics dashboard helped me identify my weak areas. Improved from Band 6 to 7.5 in 8 weeks.', rating: 5, exam: 'IELTS' },
  { id: 4, name: 'Samantha Wijesinghe', avatar: 'https://images.pexels.com/photos/3763152/pexels-photo-3763152.jpeg?w=60', role: 'GRE 325/340', text: 'The timed mock exams perfectly replicated exam pressure. Best platform I\'ve used for GRE prep.', rating: 5, exam: 'GRE' },
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
  { section: 'Writing', score: 65, max: 100 },
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
  totalRevenue: 18420000,
  pendingApprovals: 12,
  totalExams: 1847,
};

export const recentTransactions = [
  { id: 'TXN001', user: 'Kavindu Perera', exam: 'JLPT N2 Mock', amount: 2500, date: '2024-06-10', status: 'completed' },
  { id: 'TXN002', user: 'Dilini Rajapaksa', exam: 'EPS-TOPIK Standard', amount: 1800, date: '2024-06-10', status: 'completed' },
  { id: 'TXN003', user: 'Tharaka Fernando', exam: 'IELTS Academic', amount: 3500, date: '2024-06-09', status: 'pending' },
  { id: 'TXN004', user: 'Amara Bandara', exam: 'GRE Full Test', amount: 4500, date: '2024-06-09', status: 'completed' },
  { id: 'TXN005', user: 'Nuwan Silva', exam: 'HSK Level 5', amount: 2200, date: '2024-06-08', status: 'refunded' },
];

export const pendingTutors = [
  { id: 1, name: 'Akira Yamamoto', email: 'akira@example.com', exam: 'JLPT', university: 'University of Kelaniya', submitted: '2024-06-08', status: 'pending' },
  { id: 2, name: 'Soo-Jin Lee', email: 'soojin@example.com', exam: 'TOPIK', university: 'University of Colombo', submitted: '2024-06-07', status: 'pending' },
  { id: 3, name: 'Emma Thompson', email: 'emma@example.com', exam: 'IELTS', university: 'University of Peradeniya', submitted: '2024-06-06', status: 'pending' },
];

export const subscriptionPlans = [
  { id: 'free', name: 'Free', price: 0, color: 'gray', features: ['3 free mock exams/month', 'Basic performance analytics', 'Community access'], popular: false },
  { id: 'pro', name: 'Pro', price: 1499, color: 'blue', features: ['Unlimited mock exams', 'Advanced analytics & insights', 'All exam categories', 'Priority support', 'Offline access', 'Certificates'], popular: true },
  { id: 'elite', name: 'Elite', price: 2999, color: 'amber', features: ['Everything in Pro', '1-on-1 tutor sessions (2/month)', 'Personalized study plan', 'Guaranteed score improvement', 'Premium exam bundles', 'Career guidance'], popular: false },
];
