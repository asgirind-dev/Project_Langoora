// frontend/src/layouts/PublicLayout.jsx
import { Outlet } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import AnnouncementBanner from '../components/ui/AnnouncementBanner';

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-[#060d1f] text-white flex flex-col relative overflow-x-hidden">
      {/* 1. Navbar - Topmost Layer (z-50) */}
      <Navbar />

      {/* 2. Announcement Banner - Positioned right below the Navbar without blocking interactions */}
      <div className="fixed top-[68px] sm:top-[72px] left-0 right-0 z-40 w-full pointer-events-none">
        <div className="pointer-events-auto">
          <AnnouncementBanner variant="simple" />
        </div>
      </div>

      {/* 3. Main Outlet Page Content */}
      <main className="flex-1 relative">
        <Outlet />
      </main>

      {/* 4. Global Footer */}
      <Footer />
    </div>
  );
}