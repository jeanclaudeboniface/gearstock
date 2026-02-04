const PRODUCTION_API = 'https://gearstock-api-prod-c2e24df90ddd.herokuapp.com/api';
const DEV_API = 'http://localhost:5000/api';

// Detect production by checking the hostname
const isProduction = typeof window !== 'undefined' && 
  window.location.hostname !== 'localhost' && 
  window.location.hostname !== '127.0.0.1';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (isProduction ? PRODUCTION_API : DEV_API);
