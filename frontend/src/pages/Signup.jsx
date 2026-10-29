import { useState } from "react";
import { LockKeyhole, Mail, UserRound, MessageCircle } from "lucide-react";
import { registerUser, loginUser, getCurrentUser } from "../services/api";
import "../styles/Auth.css";

export default function Signup({ onAuthenticated, onSwitch }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await registerUser({
        username: username.trim(),
        email: email.trim(),
        password,
        password2: confirmPassword,
      });

      // Register endpoints sometimes create a session, sometimes do not.
      try {
        await loginUser({ username: username.trim(), password });
      } catch {
        // If registration already authenticated the user, session check succeeds.
      }

      const user = await getCurrentUser();
      onAuthenticated(user?.user ?? user);
    } catch (err) {
      setError(err.message || "Unable to create the account.");
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
          <span className="eyebrow">A BETTER WAY TO CONNECT</span>
          <h1>Your next great conversation starts here.</h1>
          <p>
            Create your account and bring your conversations together
            in a space built for connection.
          </p>
          <div className="showcase-bubbles">
            <span>💜</span><span>🌎</span><span>🚀</span>
          </div>
        </div>

        <p className="auth-footnote">A space for the conversations that matter.</p>
      </section>

      <section className="auth-form-side">
        <form className="auth-card" onSubmit={handleSubmit}>
          <span className="auth-mobile-logo"><MessageCircle size={25} /></span>
          <p className="auth-kicker">GET STARTED</p>
          <h2>Create account</h2>
          <p className="auth-subtitle">Join NovaChat in a few simple steps.</p>

          {error && <div className="auth-error" role="alert">{error}</div>}

          <label htmlFor="signup-username">Username</label>
          <div className="auth-input-wrap">
            <UserRound size={18} />
            <input
              id="signup-username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Choose a username"
              required
            />
          </div>

          <label htmlFor="signup-email">Email</label>
          <div className="auth-input-wrap">
            <Mail size={18} />
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <label htmlFor="signup-password">Password</label>
          <div className="auth-input-wrap">
            <LockKeyhole size={18} />
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
              required
            />
          </div>

          <label htmlFor="signup-confirm">Confirm password</label>
          <div className="auth-input-wrap">
            <LockKeyhole size={18} />
            <input
              id="signup-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Enter your password again"
              required
            />
          </div>

          <button className="auth-submit" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </button>

          <p className="auth-switch">
            Already registered?{" "}
            <button type="button" onClick={onSwitch}>Sign in</button>
          </p>
        </form>
      </section>
    </main>
  );
}