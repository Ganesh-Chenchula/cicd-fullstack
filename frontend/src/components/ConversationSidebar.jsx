
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  MessageCircle,
  LogOut,
  Users,
  X,
  RefreshCw,
} from "lucide-react";

import { api, endpoints, getErrorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";

function displayName(person) {
  return (
    person?.display_name ||
    person?.username ||
    "Unknown user"
  );
}

function avatarLetter(person) {
  return displayName(person).slice(0, 1).toUpperCase();
}

function getMemberIds(conversation) {
  const members = conversation?.members || [];

  return members.map((member) =>
    typeof member === "object" ? member.id : member
  );
}

export default function ConversationSidebar({
  activeId,
  onSelect,
  onConversationCreated,
}) {
  const { user, logout } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [people, setPeople] = useState([]);
  const [query, setQuery] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [startingUserId, setStartingUserId] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);

    try {
      const response = await api.get(endpoints.conversations);
      const data = response.data;

      setConversations(
        Array.isArray(data) ? data : data?.results ?? []
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  const loadPeople = useCallback(async () => {
    setLoadingPeople(true);

    try {
      const response = await api.get(endpoints.users);
      const data = response.data;

      const list = Array.isArray(data)
        ? data
        : data?.results ?? [];

      setPeople(
        list.filter(
          (person) => String(person.id) !== String(user?.id)
        )
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingPeople(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadConversations();
    loadPeople();
  }, [loadConversations, loadPeople]);

  const filteredPeople = useMemo(() => {
    const search = query.trim().toLowerCase();

    if (!search) return people;

    return people.filter((person) => {
      const username = person.username?.toLowerCase() || "";
      const name = displayName(person).toLowerCase();

      return username.includes(search) || name.includes(search);
    });
  }, [people, query]);

  function getConversationTitle(conversation) {
    if (conversation.name) return conversation.name;

    const otherMember = (conversation.members || []).find(
      (member) => {
        const id =
          typeof member === "object" ? member.id : member;

        return String(id) !== String(user?.id);
      }
    );

    if (typeof otherMember === "object" && otherMember) {
      return displayName(otherMember);
    }

    return "Conversation";
  }

  async function startConversation(person) {
    if (!person?.id || startingUserId !== null) return;

    setError("");
    setStartingUserId(person.id);

    try {
      const existing = conversations.find((conversation) => {
        const ids = getMemberIds(conversation).map(String);

        return (
          ids.length === 2 &&
          ids.includes(String(user?.id)) &&
          ids.includes(String(person.id))
        );
      });

      if (existing) {
        onSelect(existing);
        setShowNew(false);
        return;
      }

      // This payload must match ConversationSerializer.create().
      const response = await api.post(endpoints.conversations, {
        kind: "direct",
        member_ids: [person.id],
        participant_ids: [person.id],
      });

      const created = response.data;

      setConversations((current) => {
        const alreadyExists = current.some(
          (item) => String(item.id) === String(created.id)
        );

        return alreadyExists
          ? current
          : [created, ...current];
      });

      onConversationCreated?.(created);
      onSelect(created);
      setShowNew(false);
      setQuery("");

      await loadConversations();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setStartingUserId(null);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    setError("");

    try {
      await logout();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <div className="sidebar-brand">
          <span className="brand-mark">
            <MessageCircle size={21} />
          </span>
          <span>NovaChat</span>
        </div>

        <button
          type="button"
          className="icon-button"
          onClick={() => {
            setShowNew((current) => !current);
            setError("");
          }}
          aria-label={showNew ? "Close new chat" : "New chat"}
          title={showNew ? "Close" : "New chat"}
        >
          {showNew ? <X size={19} /> : <Plus size={20} />}
        </button>
      </header>

      <div className="sidebar-user">
        <div className="avatar avatar-lavender">
          {avatarLetter(user)}
        </div>

        <div className="sidebar-user-info">
          <strong>{displayName(user)}</strong>
          <span>My account</span>
        </div>

        <button
          type="button"
          className="icon-button logout-button"
          onClick={handleLogout}
          disabled={loggingOut}
          title="Log out"
          aria-label="Log out"
        >
          <LogOut size={17} />
        </button>
      </div>

      <div className="conversation-heading">
        <div>
          <h2>{showNew ? "Start a chat" : "Messages"}</h2>
          <span>
            {showNew
              ? "Find people to connect with"
              : "Your conversations"}
          </span>
        </div>

        {!showNew && (
          <span className="count-pill">
            {conversations.length}
          </span>
        )}
      </div>

      <div className="search-field sidebar-search">
        <Search size={17} />

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search people..."
          aria-label="Search people"
        />

        {query && (
          <button
            type="button"
            className="icon-button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {error && (
        <div className="inline-error" role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setError("");
              loadPeople();
              loadConversations();
            }}
          >
            Try again
          </button>
        </div>
      )}

      {showNew ? (
        <section className="new-chat-panel">
          <h3>
            <Users size={17} />
            People
          </h3>

          {loadingPeople ? (
            <p className="empty-hint">Loading people...</p>
          ) : filteredPeople.length === 0 ? (
            <p className="empty-hint">
              {query
                ? "No matching users found."
                : "No other users are registered yet."}
            </p>
          ) : (
            <div className="user-search-results">
              {filteredPeople.map((person) => (
                <button
                  type="button"
                  key={person.id}
                  className="user-result"
                  disabled={startingUserId !== null}
                  onClick={() => startConversation(person)}
                >
                  {person.avatar_url ? (
                    <img
                      className="avatar people-avatar-image"
                      src={person.avatar_url}
                      alt=""
                    />
                  ) : (
                    <span className="avatar">
                      {avatarLetter(person)}
                    </span>
                  )}

                  <span className="user-result-text">
                    <strong>{displayName(person)}</strong>
                    <small>@{person.username}</small>
                  </span>

                  {startingUserId === person.id ? (
                    <RefreshCw size={16} className="spin-icon" />
                  ) : (
                    <Plus size={17} />
                  )}
                </button>
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          <div className="conversation-list">
            {loadingConversations ? (
              <p className="empty-hint">
                Loading conversations...
              </p>
            ) : conversations.length === 0 ? (
              <div className="empty-conversations">
                <span className="empty-icon">
                  <MessageCircle size={24} />
                </span>

                <strong>No conversations yet</strong>
                <p>Select someone below to start chatting.</p>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowNew(true)}
                >
                  <Plus size={16} />
                  New chat
                </button>
              </div>
            ) : (
              conversations.map((conversation) => {
                const title = getConversationTitle(conversation);

                const lastMessage =
                  conversation.last_message?.content ||
                  conversation.last_message?.text ||
                  "Start a conversation";

                return (
                  <button
                    type="button"
                    key={conversation.id}
                    className={`conversation-item ${
                      String(activeId) === String(conversation.id)
                        ? "active"
                        : ""
                    }`}
                    onClick={() => onSelect(conversation)}
                  >
                    <span className="avatar conversation-avatar">
                      {title.slice(0, 1).toUpperCase()}
                    </span>

                    <span className="conversation-copy">
                      <strong>{title}</strong>
                      <small>{lastMessage}</small>
                    </span>

                    {Number(conversation.unread_count) > 0 && (
                      <span className="unread-badge">
                        {conversation.unread_count}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          <div className="people-section">
            <div className="people-section-heading">
              <h3>People</h3>
              <button
                type="button"
                className="text-button"
                onClick={() => setShowNew(true)}
              >
                See all
              </button>
            </div>

            {loadingPeople ? (
              <p className="empty-hint">Loading people...</p>
            ) : filteredPeople.length === 0 ? (
              <p className="empty-hint">
                {query
                  ? "No matching people."
                  : "No other users found."}
              </p>
            ) : (
              <div className="people-list">
                {filteredPeople.slice(0, 6).map((person) => (
                  <button
                    type="button"
                    key={person.id}
                    className="user-result"
                    disabled={startingUserId !== null}
                    onClick={() => startConversation(person)}
                  >
                    {person.avatar_url ? (
                      <img
                        className="avatar people-avatar-image"
                        src={person.avatar_url}
                        alt=""
                      />
                    ) : (
                      <span className="avatar">
                        {avatarLetter(person)}
                      </span>
                    )}

                    <span className="user-result-text">
                      <strong>{displayName(person)}</strong>
                      <small>@{person.username}</small>
                    </span>

                    {startingUserId === person.id ? (
                      <RefreshCw size={16} className="spin-icon" />
                    ) : (
                      <Plus size={17} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
