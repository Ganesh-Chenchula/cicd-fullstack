
import { useState } from "react";
import {
  ChevronDown,
  LogOut,
  Moon,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import { getUsername, getAvatarLetter } from "../utils/messageUtils";

export default function ProfileMenu({
  user,
  onLogout,
  theme,
  onToggleTheme,
}) {
  const [open, setOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const username = getUsername(user);
  const displayName =
    user?.display_name ||
    user?.full_name ||
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    username;

  const avatar = user?.avatar_url || user?.profile_picture || "";

  return (
    <div className="profile-menu-wrap">
      {open && (
        <button
          className="menu-dismiss"
          aria-label="Close account menu"
          onClick={() => setOpen(false)}
        />
      )}

      <button
        type="button"
        className="profile-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="avatar profile-avatar">
          {avatar ? (
            <img src={avatar} alt={`${displayName}'s profile`} />
          ) : (
            getAvatarLetter(displayName)
          )}
        </span>

        <span className="profile-trigger-copy">
          <strong>{displayName}</strong>
          <small>@{username}</small>
        </span>

        <ChevronDown size={16} />
      </button>

      {open && (
        <div className="profile-dropdown">
          <div className="profile-dropdown-heading">
            <span className="avatar">
              {avatar ? (
                <img src={avatar} alt="" />
              ) : (
                getAvatarLetter(displayName)
              )}
            </span>

            <span>
              <strong>{displayName}</strong>
              <small>@{username}</small>
            </span>
          </div>

          <button
            type="button"
            className="dropdown-action"
            onClick={() => {
              setShowProfile(true);
              setOpen(false);
            }}
          >
            <UserRound size={17} />
            <span>View profile</span>
          </button>

          <button
            type="button"
            className="dropdown-action"
            onClick={onToggleTheme}
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            <span>{theme === "dark" ? "Light theme" : "Dark theme"}</span>
          </button>

          <div className="dropdown-divider" />

          <button
            type="button"
            className="dropdown-action danger-action"
            onClick={onLogout}
          >
            <LogOut size={17} />
            <span>Log out</span>
          </button>
        </div>
      )}

      {showProfile && (
        <div className="profile-modal-backdrop" onClick={() => setShowProfile(false)}>
          <section
            className="profile-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="icon-button profile-modal-close"
              aria-label="Close profile"
              onClick={() => setShowProfile(false)}
            >
              <X size={19} />
            </button>

            <div className="profile-modal-avatar">
              {avatar ? (
                <img src={avatar} alt="" />
              ) : (
                getAvatarLetter(displayName)
              )}
            </div>

            <h2 id="profile-title">{displayName}</h2>
            <p className="profile-modal-username">@{username}</p>

            {user?.email && (
              <div className="profile-detail">
                <span>Email</span>
                <strong>{user.email}</strong>
              </div>
            )}

            {user?.bio && (
              <div className="profile-detail">
                <span>About</span>
                <strong>{user.bio}</strong>
              </div>
            )}

            <p className="profile-modal-note">
              Account information supplied by NovaChat.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
