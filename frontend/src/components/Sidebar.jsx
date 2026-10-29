import { useState } from "react";
import {
  MessageCircle,
  Users,
  Plus,
  Search,
  PanelLeftClose,
} from "lucide-react";
import ConversationList from "./ConversationList";
import UserList from "./UserList";
import ProfileMenu from "./ProfileMenu";

export default function Sidebar({
  user,
  conversations,
  users,
  activeConversation,
  onSelectConversation,
  onStartDirect,
  onCreateConversation,
  onLogout,
  theme,
  onToggleTheme,
  mobileOpen,
  onCloseMobile,
}) {
  const [tab, setTab] = useState("chats");
  const [search, setSearch] = useState("");

  const filteredConversations = conversations.filter((conversation) => {
    const name =
      conversation.name ||
      conversation.title ||
      conversation.other_username ||
      "";

    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <>
      {mobileOpen && (
        <button
          className="mobile-sidebar-backdrop"
          aria-label="Close sidebar"
          onClick={onCloseMobile}
        />
      )}

      <aside className={`sidebar ${mobileOpen ? "sidebar-mobile-open" : ""}`}>
        <div className="sidebar-brand">
          <span className="brand-mark"><MessageCircle size={21} /></span>
          <span>NovaChat</span>
          <button
            className="icon-button sidebar-close-mobile"
            aria-label="Close sidebar"
            onClick={onCloseMobile}
          >
            <PanelLeftClose size={19} />
          </button>
        </div>

        <div className="sidebar-heading">
          <div>
            <h2>Messages</h2>
            <p>Your conversations, together.</p>
          </div>
          <button
            className="primary-icon-button"
            title="Create group or channel"
            aria-label="Create conversation"
            onClick={onCreateConversation}
          >
            <Plus size={19} />
          </button>
        </div>

        <div className="sidebar-search">
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search conversations"
            aria-label="Search conversations"
          />
        </div>

        <div className="sidebar-tabs">
          <button
            className={tab === "chats" ? "selected" : ""}
            onClick={() => setTab("chats")}
            type="button"
          >
            <MessageCircle size={16} />
            Chats
          </button>
          <button
            className={tab === "people" ? "selected" : ""}
            onClick={() => setTab("people")}
            type="button"
          >
            <Users size={16} />
            People
          </button>
        </div>

        <div className="sidebar-content">
          {tab === "chats" ? (
            <ConversationList
              conversations={filteredConversations}
              currentUser={user}
              activeId={activeConversation?.id}
              onSelect={(conversation) => {
                onSelectConversation(conversation);
                onCloseMobile();
              }}
            />
          ) : (
            <UserList
              users={users}
              currentUser={user}
              onMessage={(person) => {
                onStartDirect(person);
                onCloseMobile();
              }}
            />
          )}
        </div>

        <div className="sidebar-bottom">
          <ProfileMenu
            user={user}
            onLogout={onLogout}
            theme={theme}
            onToggleTheme={onToggleTheme}
          />
        </div>
      </aside>
    </>
  );
}