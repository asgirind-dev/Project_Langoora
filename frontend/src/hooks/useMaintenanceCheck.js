// frontend/src/hooks/useMaintenanceCheck.js
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export function useMaintenanceCheck() {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        // Check a public endpoint that returns maintenance status
        const response = await axios.get('/api/system-settings/security');
        if (response.data?.data?.maintenanceMode === true) {
          setIsMaintenance(true);
          navigate('/maintenance');
        } else {
          setIsMaintenance(false);
        }
      } catch (error) {
        // If error, assume no maintenance
        setIsMaintenance(false);
      } finally {
        setChecking(false);
      }
    };

    checkMaintenance();

    // Check every 30 seconds
    const interval = setInterval(checkMaintenance, 30000);
    return () => clearInterval(interval);
  }, [navigate]);

  return { isMaintenance, checking };
}