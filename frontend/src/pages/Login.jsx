import { useState } from "react";
import { LockKeyhole, Mail, MessageCircle, Eye, EyeOff } from "lucide-react";
import { loginUser, getCurrentUser } from "../services/api";
import "../styles/Auth.css";

export default function Login({ onAuthenticated, onSwitch }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await loginUser({ username: username.trim(), password });
      const user = await getCurrentUser();
      onAuthenticated(user?.user ?? user);
    } catch (err) {
      setError(err.message || "Unable to log in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-showcase">
        <div className="auth-brand">
          <span className="brand-mark"><MessageCircle size={23} /></span>
          <span>NovaChat</span>
        </div>

        <div className="auth-showcase-content">
          <span className="eyebrow">YOUR PEOPLE. YOUR SPACE.</span>
          <h1>Good conversations make every day better.</h1>
          <p>
            Connect with people, share ideas, and keep every conversation
            in one place.
          </p>
          <div className="showcase-bubbles">
            <span>👋</span><span>💬</span><span>✨</span>
          </div>
        </div>

        <p className="auth-footnote">Private conversations. Real connections.</p>
      </section>

      <section className="auth-form-side">
        <form className="auth-card" onSubmit={handleSubmit}>
          <span className="auth-mobile-logo"><MessageCircle size={25} /></span>
          <p className="auth-kicker">WELCOME BACK</p>
          <h2>Sign in</h2>
          <p className="auth-subtitle">Enter your details to continue.</p>

          {error && <div className="auth-error" role="alert">{error}</div>}

          <label htmlFor="login-username">Username</label>
          <div className="auth-input-wrap">
            <Mail size={18} />
            <input
              id="login-username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter your username"
              required
            />
          </div>

          <label htmlFor="login-password">Password</label>
          <div className="auth-input-wrap">
            <LockKeyhole size={18} />
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
            />
            <button
              className="password-toggle"
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button className="auth-submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <p className="auth-switch">
            Don't have an account?{" "}
            <button type="button" onClick={onSwitch}>Create account</button>
          </p>
        </form>
      </section>
    </main>
  );
}