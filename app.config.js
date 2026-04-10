window.CAMPUSBOOK_CONFIG = {
  apiBase:
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? "http://localhost:5002/api"
      : "https://unicentri-backend.onrender.com"
};
