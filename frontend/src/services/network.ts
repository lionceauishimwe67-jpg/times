const getBrowserApiOrigin = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:5000';
  }

  const protocol = window.location.protocol || 'http:';
  const hostname = window.location.hostname || 'localhost';
  return `${protocol}//${hostname}:5000`;
};

export const API_ORIGIN = process.env.REACT_APP_API_URL || getBrowserApiOrigin();
export const API_BASE = `${API_ORIGIN}/api`;
