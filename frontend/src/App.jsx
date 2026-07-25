// frontend/src/App.jsx
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext'; 
import AppRoutes from "./router/routes.jsx";
import { useMaintenanceCheck } from './hooks/useMaintenanceCheck';
import MaintenancePage from './components/common/MaintenancePage.jsx';
import SessionTimeoutManager from './components/common/SessionTimeoutManager';

const AppContent = () => {
  const { isMaintenance, checking } = useMaintenanceCheck();

  if (checking) {
    return (
      <div className="min-h-screen bg-[#080d1a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (isMaintenance) {
    return <MaintenancePage />;
  }

  // ✅ Wrap AppRoutes with SessionTimeoutManager
  return (
    <SessionTimeoutManager>
      <AppRoutes />
    </SessionTimeoutManager>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider> 
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;