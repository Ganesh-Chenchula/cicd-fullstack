
import { useEffect, useState } from "react";
import "./App.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function App() {
  const [status, setStatus] = useState("Checking API...");
  const [error, setError] = useState("");

  
useEffect(() => {
  const controller = new AbortController();

  async function checkBackend() {
    try {
      const response = await fetch(
        `${API_URL}/api/health/`,
        { signal: controller.signal }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setStatus(data.message);
      setError("");
    } catch (err) {
      if (err.name === "AbortError") return;

      setStatus("API unavailable");
      setError(
        "Unable to connect to Django. Check that the backend is running and the API URL is correct."
      );
    }
  }

  checkBackend();

  return () => controller.abort();
}, []);


  return (
    <main className="dashboard">
      <p className="eyebrow">DEVOPS TRAINING PROJECT</p>
      <h1>CI/CD Dashboard</h1>
      <p>React frontend connected to a Django REST API.</p>

      <section className="status-card">
        <h2>Backend status</h2>
        <p role="status">{status}</p>
        {error && <p role="alert">{error}</p>}
      </section>

      <p className="footer">
        Build • Test • Deploy
      </p>
    </main>
  );
}
