
import { useState } from "react";
import { MessageCircle, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../services/api";

export default function AuthPage({ mode, setMode }) {
  const { login, register } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isRegister = mode === "register";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (isRegister && password !== password2) {
      setError("Your passwords do not match.");
      return;
    }

    setBusy(true);

    try {
      if (isRegister) {
        await register({ username: username.trim(), password, password2 });
      } else {
        await login(username.trim(), password);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-art">
        <div className="auth-brand">
          <span className="brand-mark"><MessageCircle size={23} /></span>
          <span>NovaChat</span>
        </div>

        <div className="art-content">
          <span className="eyebrow">YOUR SPACE TO CONNECT</span>
          <h1>Conversations that feel closer.</h1>
          <p>A thoughtful space for your messages, people, and everyday moments.</p>

          <div className="preview-card">
            <div className="preview-avatar avatar-lavender">N</div>
            <div className="preview-copy">
              <strong>Your people, all together</strong>
              <span>Good conversations start here.</span>
            </div>
            <span className="online-dot" />
          </div>
          <div className="art-orb orb-one" />
          <div className="art-orb orb-two" />
        </div>

        <span className="auth-footer">A little closer, every day.</span>
      </section>

      <section className="auth-panel">
        <form className="auth-form" onSubmit={handleSubmit}>
          <span className="mobile-brand"><MessageCircle size={24} /> NovaChat</span>
          <span className="eyebrow">{isRegister ? "CREATE YOUR ACCOUNT" : "WELCOME BACK"}</span>
          <h2>{isRegister ? "Join the conversation." : "Good to see you."}</h2>
          <p className="muted">
            {isRegister
              ? "Create an account to start connecting."
              : "Sign in to pick up where you left off."}
          </p>

          {error && <div className="error-message" role="alert">{error}</div>}

          <label htmlFor="username">Username</label>
          <input
            id="username"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Enter your username"
            required
          />

          <label htmlFor="password">Password</label>
          <div className="password-wrap">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete={isRegister ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              className="icon-button password-toggle"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {isRegister && (
            <>
              <label htmlFor="password2">Confirm password</label>
              <input
                id="password2"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password2}
                onChange={(event) => setPassword2(event.target.value)}
                placeholder="Enter your password again"
                required
              />
            </>
          )}

          <button className="primary-button auth-submit" disabled={busy}>
            {busy
              ? "Please wait…"
              : isRegister ? "Create account" : "Sign in"}
            {!busy && <ArrowRight size={18} />}
          </button>

          <p className="auth-switch">
            {isRegister ? "Already have an account?" : "New to NovaChat?"}{" "}
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setError("");
                setMode(isRegister ? "login" : "register");
              }}
            >
              {isRegister ? "Sign in" : "Create an account"}
            </button>
          </p>
        </form>
      </section>
    </main>
  );
}
