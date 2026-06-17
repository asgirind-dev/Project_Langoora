import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext'; 
import AppRoutes from "./router/routes.jsx";

const App = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider> 
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;