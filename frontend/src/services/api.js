
import axios from "axios";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  "https://novachat-backend-l5jy.onrender.com"
).replace(/\/+$/, "");

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Keep the CSRF token in memory because the frontend
// cannot read a host-only cookie belonging to the backend.
let csrfToken = null;

api.interceptors.request.use((config) => {
  const method = (config.method || "get").toLowerCase();

  if (!["get", "head", "options", "trace"].includes(method)) {
    config.headers = config.headers || {};

    if (csrfToken) {
      config.headers["X-CSRFToken"] = csrfToken;
    }
  }

  return config;
});

export const endpoints = {
  csrf: "/chat/csrf/",
  register: "/chat/register/",
  login: "/chat/login/",
  logout: "/chat/logout/",
  me: "/chat/me/",
  users: "/chat/users/",
  conversations: "/chat/conversations/",
};

export async function initializeCsrf() {
  const response = await api.get(endpoints.csrf);

  csrfToken = response.data?.csrfToken || null;

  if (!csrfToken) {
    throw new Error(
      "Could not initialize the CSRF token. Check the backend CSRF endpoint."
    );
  }

  return response.data;
}

export async function loginUser(credentials) {
  await initializeCsrf();

  const response = await api.post(endpoints.login, {
    username: credentials.username.trim(),
    password: credentials.password,
  });

  return response.data;
}

export async function getCurrentUser() {
  const response = await api.get(endpoints.me);
  return response.data;
}

export async function logoutUser() {
  await initializeCsrf();

  const response = await api.post(endpoints.logout);
  return response.data;
}

export async function registerUser(payload) {
  await initializeCsrf();

  const response = await api.post(endpoints.register, payload);
  return response.data;
}

export function getErrorMessage(error) {
  const data = error?.response?.data;
  const status = error?.response?.status;

  if (typeof data === "string") {
    if (/<html|<!doctype html/i.test(data)) {
      return `Server returned HTTP ${
        status || "error"
      }. Check the backend URL and Django routes.`;
    }

    return data;
  }

  if (data?.detail) return data.detail;
  if (data?.message) return data.message;

  if (data && typeof data === "object") {
    return Object.entries(data)
      .map(([field, value]) => {
        const message = Array.isArray(value)
          ? value.join(", ")
          : String(value);

        return `${field}: ${message}`;
      })
      .join(" · ");
  }

  return error?.message || "Something went wrong. Please try again.";
}

export default api;
