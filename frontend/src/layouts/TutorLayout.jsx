import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { LayoutDashboard, BookOpen, PlusCircle, DollarSign, BarChart2, Star, User } from 'lucide-react';
import DashboardSidebar from '../components/layout/DashboardSidebar';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = 'http://localhost:5000/api/tutors';

const navItems = [
  { label: 'Dashboard', path: '', icon: LayoutDashboard },
  { label: 'My Exams', path: '/exams', icon: BookOpen },
  { label: 'Create Exam', path: '/create', icon: PlusCircle },
  { label: 'Earnings', path: '/earnings', icon: DollarSign },
  { label: 'Analytics', path: '/analytics', icon: BarChart2 },
  { label: 'Reviews', path: '/reviews', icon: Star },
  { label: 'Profile', path: '/profile', icon: User },
];

export default function TutorLayout() {
  const { user } = useAuth();
  const [profilePic, setProfilePic] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;

    fetch(`${API_BASE_URL}/${user.uid}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data) {
          // Backend එකෙන් එන්න පුළුවන් ඕනෑම key එකක් capture කරයි
          const imgUrl = res.data.profilePicUrl || res.data.profilePic || res.data.photoURL || res.data.profile_picture;
          if (imgUrl) setProfilePic(imgUrl);
        }
      })
      .catch(err => console.error("Error fetching tutor profile pic:", err));
  }, [user]);

  // Sidebar එකේ Component එක මොන Key එකෙන් image එක ඉල්ලුවත් වැඩකරන විදිහට pass කිරීම
  const activeImage = profilePic || user?.profilePicUrl || user?.photoURL || user?.avatar;

  const updatedUser = { 
    ...user, 
    profilePicUrl: activeImage,
    profilePic: activeImage,
    photoURL: activeImage,
    avatar: activeImage
  };

  return (
    <div className="min-h-screen bg-[#060d1f] text-white flex">
      <DashboardSidebar navItems={navItems} basePath="/tutor" user={updatedUser} />
      <main className="flex-1 ml-64 min-h-screen overflow-x-hidden">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
} 