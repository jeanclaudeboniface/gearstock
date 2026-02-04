const PRODUCTION_API = 'https://gearstock-api-prod-c2e24df90ddd.herokuapp.com/api';
const DEV_API = 'http://localhost:5000/api';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? PRODUCTION_API : DEV_API);
