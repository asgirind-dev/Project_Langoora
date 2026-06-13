import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, LogOut, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function DashboardSidebar({ navItems, basePath }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-[#060d1f] border-r border-slate-200 dark:border-white/10 flex flex-col z-30 transition-colors duration-200">
      
      {/* Branding Area */}
      <div className="p-5 border-b border-slate-200 dark:border-white/10">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/10">
            <BookOpen size={15} className="text-white" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-blue-200 bg-clip-text text-transparent">
            Langoora
          </span>
        </Link>
      </div>

      {/* User Session Profile */}
      {user && (
        <div className="p-5 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm shadow-md shadow-cyan-500/10">
              {user.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{user.name || 'User'}</p>
              <p className="text-xs text-slate-500 dark:text-gray-400 truncate font-mono">{user.email || ''}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map(item => {
            const fullPath = item.path === '' ? basePath : `${basePath}/${item.path}`;
            const isActive = item.path === '' 
              ? location.pathname === basePath 
              : location.pathname.startsWith(fullPath);

            return (
              <li key={item.label}>
                <Link
                  to={fullPath}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 font-semibold shadow-sm'
                      : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <item.icon 
                    size={18} 
                    className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-gray-500 group-hover:text-slate-600 dark:group-hover:text-gray-300'} 
                  />
                  <span className="text-sm font-medium">{item.label}</span>
                  {isActive && <ChevronRight size={14} className="ml-auto text-blue-600 dark:text-blue-400" />}
                </Link>
              </li> 
            );
          })}
        </ul>
      </nav>

      {/* Logout Footer Component */}
      <div className="p-4 border-t border-slate-200 dark:border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-slate-500 dark:text-gray-400 hover:text-rose-600 dark:hover:text-red-400 hover:bg-rose-50 dark:hover:bg-red-500/10 transition-all duration-200 font-medium"
        >
          <LogOut size={18} />
          <span className="text-sm">Log Out</span>
        </button>
      </div>
    </aside>
  );
}