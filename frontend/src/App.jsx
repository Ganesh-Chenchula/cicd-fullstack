
import { useState } from "react";
import { MessageCircle, ShieldCheck } from "lucide-react";
import { useAuth } from "./context/AuthContext";
import AuthPage from "./components/AuthPage";
import ChatPage from "./components/ChatPage";

export default function App() {
  const { user, loading } = useAuth();
  const [authMode, setAuthMode] = useState("login");

  if (loading) {
    return (
      <main className="loading-screen">
        <div className="brand-mark"><MessageCircle size={26} /></div>
        <h2>NovaChat</h2>
        <div className="loading-line" />
        <p>Connecting your conversations…</p>
      </main>
    );
  }

  if (!user) {
    return <AuthPage mode={authMode} setMode={setAuthMode} />;
  }

  return (
    <div className="app-shell">
      <div className="security-note">
        <ShieldCheck size={14} /> Your workspace is ready
      </div>
      <ChatPage />
    </div>
  );
}
