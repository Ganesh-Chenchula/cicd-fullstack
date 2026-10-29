
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://192.168.1.7:8000";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

function getCookie(name) {
  const prefix = `${name}=`;

  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(prefix));

  return cookie
    ? decodeURIComponent(cookie.slice(prefix.length))
    : null;
}

api.interceptors.request.use((config) => {
  const method = (config.method || "get").toLowerCase();

  if (!["get", "head", "options", "trace"].includes(method)) {
    const csrfToken = getCookie("csrftoken");

    if (csrfToken) {
      config.headers = config.headers || {};
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

export function getErrorMessage(error) {
  const data = error?.response?.data;
  const status = error?.response?.status;

  if (typeof data === "string") {
    if (/<html|<!doctype html/i.test(data)) {
      return `Server returned HTTP ${status || "error"}. Check the backend URL and Django routes.`;
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
