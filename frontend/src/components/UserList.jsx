import { Search, MessageCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { getAvatarLetter, getUsername } from "../utils/messageUtils";

export default function UserList({ users, currentUser, onMessage }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return users.filter((user) => {
      if (String(user.id) === String(currentUser?.id)) return false;

      return getUsername(user)
        .toLowerCase()
        .includes(query.trim().toLowerCase());
    });
  }, [users, currentUser, query]);

  return (
    <div className="people-panel">
      <div className="people-search">
        <Search size={17} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search usernames"
          aria-label="Search usernames"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-list">
          <span>No users found</span>
        </div>
      ) : (
        filtered.map((person) => {
          const username = getUsername(person);

          return (
            <div className="person-row" key={person.id}>
              <span className="avatar">
                {person.avatar_url ? (
                  <img src={person.avatar_url} alt="" />
                ) : (
                  getAvatarLetter(username)
                )}
              </span>

              <span className="person-copy">
                <strong>{username}</strong>
                <small>
                  {person.is_online ? "Online" : "Offline"}
                </small>
              </span>

              <button
                type="button"
                className="icon-button"
                aria-label={`Message ${username}`}
                title={`Message ${username}`}
                onClick={() => onMessage(person)}
              >
                <MessageCircle size={18} />
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}