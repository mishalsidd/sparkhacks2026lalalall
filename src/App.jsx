import { useEffect, useMemo, useState } from "react";
import clubsData from "./clubs.json";
import vendorsData from "./vendors.json";
import requestsData from "./requests.json";

/**
 * Simple localStorage hook (so hearts + registered clubs persist across refresh)
 */
function useLocalStorageState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore
    }
  }, [key, value]);

  return [value, setValue];
}

function normalize(s) {
  return (s ?? "").toString().trim().toLowerCase();
}

function matchesQuery(club, q) {
  if (!q) return true;
  const fields = [
    club.name,
    club.description,
    ...(club.interests || []),
    ...(club.vibes || []),
    ...(club.collab_needs || []),
  ]
    .join(" ")
    .toLowerCase();

  return fields.includes(q);
}

function clubMatchesSelectedTags(club, selectedTags) {
  if (!selectedTags || selectedTags.length === 0) return true;

  const bag = new Set(
    [
      ...(club.interests || []),
      ...(club.vibes || []),
      ...(club.collab_needs || []),
    ].map((t) => normalize(t))
  );

  return selectedTags.some((t) => bag.has(normalize(t)));
}

function pickRandomUnique(arr, n) {
  const copy = [...arr];
  // Fisher-Yates shuffle
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

export default function App() {
  const [heartedIds, setHeartedIds] = useLocalStorageState("heartedClubIds", []);
  const [search, setSearch] = useState("");
  const [discoverMode, setDiscoverMode] = useState("clubs"); // clubs | vendors | requests
  const [activeClub, setActiveClub] = useState(null);

  const [userClubs, setUserClubs] = useLocalStorageState("userClubs", []);
  const allClubs = [...clubsData, ...userClubs];
  const allVendors = vendorsData;

  // ✅ Requests state (seed + user-added)
  const [userRequests, setUserRequests] = useLocalStorageState("userRequests", []);
  const allRequests = [...requestsData, ...userRequests];
  const [isRequestOpen, setIsRequestOpen] = useState(false);

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  const [selectedTags, setSelectedTags] = useState([]);

  const clubById = new Map(allClubs.map((c) => [c.id, c]));
  const heartedClubs = heartedIds.map((id) => clubById.get(id)).filter(Boolean);

  const q = normalize(search);

  const DISCOVER_TAGS = useMemo(
    () => [
      "technology",
      "women",
      "sports",
      "service",
      "business",
      "engineering",
      "creative",
      "culture",
      "career",
      "health",
      "computer science",
      "math",
      "cybersecurity",
    ],
    []
  );

  const [themeTags] = useState(() =>
    pickRandomUnique(DISCOVER_TAGS, Math.min(10, DISCOVER_TAGS.length))
  );

  const discoverItems = useMemo(() => {
    // CLUBS
    if (discoverMode === "clubs") {
      return allClubs
        .filter((club) => clubMatchesSelectedTags(club, selectedTags))
        .filter((club) => matchesQuery(club, q));
    }

    // VENDORS
    if (discoverMode === "vendors") {
      return allVendors.filter((vendor) => {
        if (!q) return true;

        const fields = [
          vendor.name,
          vendor.description,
          ...(vendor.services || []),
          ...(vendor.vibes || []),
          ...(vendor.tags || []),
          ...(vendor.availability || []),
          vendor.price_range,
        ]
          .join(" ")
          .toLowerCase();

        return fields.includes(q);
      });
    }

    // ✅ REQUESTS
    if (discoverMode === "requests") {
      return allRequests.filter((req) => {
        if (!q) return true;

        const fields = [
          req.club_name,
          req.title,
          req.description,
          ...(req.needs || []),
          req.budget,
          req.date,
          req.time_window,
        ]
          .join(" ")
          .toLowerCase();

        return fields.includes(q);
      });
    }

    return [];
  }, [discoverMode, allClubs, allVendors, allRequests, selectedTags, q]);

  function toggleHeart(id) {
    setHeartedIds((prev) => {
      const has = prev.includes(id);
      if (has) return prev.filter((x) => x !== id);
      return [id, ...prev];
    });
  }

  function addClub(newClub) {
    setUserClubs((prev) => [newClub, ...prev]);
    setIsRegisterOpen(false);
  }

  // ✅ add request (saved in localStorage)
  function addRequest(newReq) {
    setUserRequests((prev) => [newReq, ...prev]);
    setIsRequestOpen(false);
  }

  function toggleTag(tag) {
    setSelectedTags((prev) => {
      const has = prev.some((t) => normalize(t) === normalize(tag));
      if (has) return prev.filter((t) => normalize(t) !== normalize(tag));
      return [tag, ...prev];
    });
  }

  function clearFilters() {
    setSelectedTags([]);
    setSearch("");
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>UIC Club Spotlight</h1>
          <p style={styles.subtitle}>
            Discover orgs fairly. ❤️ the ones you want on your home screen.
          </p>
        </div>

        <div style={styles.searchWrap}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clubs, vibes, collabs… (ex: business, cricket, networking)"
            style={styles.search}
          />
          {(search || selectedTags.length) ? (
            <button onClick={clearFilters} style={styles.clearBtn}>
              Clear
            </button>
          ) : null}
        </div>
      </header>

      {/* Small register button row */}
      <div style={styles.topActions}>
        <button style={styles.smallBtn} onClick={() => setIsRegisterOpen(true)}>
          ➕ Register a Club
        </button>
      </div>

      <main style={styles.grid}>
        {/* LEFT: Your Clubs */}
        <section style={styles.panel}>
          <div style={styles.panelHeader}>
            <h2 style={styles.h2}>❤️ Your Clubs</h2>
            <span style={styles.countPill}>{heartedClubs.length}</span>
          </div>

          {heartedClubs.length === 0 ? (
            <p style={styles.muted}>Heart a club to pin it here.</p>
          ) : (
            <div style={styles.list}>
              {heartedClubs.map((club) => (
                <ClubTile
                  key={club.id}
                  club={club}
                  hearted
                  onToggleHeart={toggleHeart}
                  onOpenProfile={() => setActiveClub(club)}
                />
              ))}
            </div>
          )}
        </section>

        {/* RIGHT: Discover (tags + results) */}
        <section style={styles.panel}>
          <div style={styles.panelHeader}>
            <h2 style={styles.h2}>🔍 Discover</h2>
            <span style={styles.countPill}>{discoverItems.length}</span>
          </div>

          {/* ✅ Toggle: what you're discovering */}
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {["clubs", "vendors", "requests"].map((m) => {
              const active = discoverMode === m;
              const label = m === "clubs" ? "Clubs" : m === "vendors" ? "Vendors" : "Requests";

              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDiscoverMode(m)}
                  style={{
                    ...styles.chip,
                    background: active ? "#eaf2ff" : "white",
                    borderColor: active ? "#3d8cfb" : "#ddd",
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* ✅ Post request button (only on Requests tab) */}
          {discoverMode === "requests" && (
            <div style={{ marginTop: 10 }}>
              <button style={styles.smallBtn} onClick={() => setIsRequestOpen(true)}>
                ➕ Post a Request
              </button>
            </div>
          )}

          {discoverMode === "clubs" && (
            <>
              <p style={styles.muted}>
                Pick a theme to explore (these rotate). You can also search.
              </p>

              <div style={styles.chipsWrap}>
                {themeTags.map((tag) => {
                  const active = selectedTags.some(
                    (t) => normalize(t) === normalize(tag)
                  );

                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      style={{
                        ...styles.chip,
                        background: active ? "#eaf2ff" : "white",
                        borderColor: active ? "#3d8cfb" : "#ddd",
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {selectedTags.length ? (
            <p style={styles.filterLine}>
              Filtering by:{" "}
              <span style={styles.filterTags}>{selectedTags.join(", ")}</span>
            </p>
          ) : null}

          {discoverItems.length === 0 ? (
            <p style={styles.muted}>
              (No matches yet — try a different tag or search.)
            </p>
          ) : (
            <div style={styles.list}>
              {discoverMode === "clubs" &&
                discoverItems.map((club) => (
                  <ClubTile
                    key={club.id}
                    club={club}
                    hearted={heartedIds.includes(club.id)}
                    onToggleHeart={toggleHeart}
                  />
                ))}

              {discoverMode === "vendors" &&
                discoverItems.map((vendor) => (
                  <VendorTile key={vendor.id} vendor={vendor} />
                ))}

              {discoverMode === "requests" &&
                discoverItems.map((req) => (
                  <RequestTile key={req.id} req={req} />
                ))}
            </div>
          )}
        </section>
      </main>

      {/* ✅ Register Modal */}
      {isRegisterOpen ? (
        <Modal onClose={() => setIsRegisterOpen(false)}>
          <div style={styles.modalHeader}>
            <h2 style={{ margin: 0, fontSize: 18 }}>➕ Register a New Club</h2>
            <button onClick={() => setIsRegisterOpen(false)} style={styles.xBtn}>
              ✕
            </button>
          </div>
          <p style={styles.modalSubtext}>Add your org to the directory. Saved locally for demo.</p>

          <NewClubForm
            existingIds={new Set(allClubs.map((c) => c.id))}
            onAddClub={addClub}
            onCancel={() => setIsRegisterOpen(false)}
          />
        </Modal>
      ) : null}

      {/* ✅ Request Modal */}
      {isRequestOpen ? (
        <Modal onClose={() => setIsRequestOpen(false)}>
          <div style={styles.modalHeader}>
            <h2 style={{ margin: 0, fontSize: 18 }}>➕ Post a Vendor Request</h2>
            <button onClick={() => setIsRequestOpen(false)} style={styles.xBtn}>
              ✕
            </button>
          </div>
          <p style={styles.modalSubtext}>Saved locally for demo.</p>

          <NewRequestForm
            existingIds={new Set(allRequests.map((r) => r.id))}
            onAddRequest={addRequest}
            onCancel={() => setIsRequestOpen(false)}
          />
        </Modal>
      ) : null}

      <footer style={styles.footer}>
        <span style={styles.footerText}>
          MVP dataset: seed UIC orgs + user-added clubs • Hearts saved locally (no backend yet)
        </span>
      </footer>
    </div>
  );
}

function ClubTile({ club, hearted, onToggleHeart }) {
  return (
    <article style={styles.card}>
      <div style={styles.cardTop}>
        <div style={{ flex: 1 }}>
          <div style={styles.cardTitleRow}>
            <h3 style={styles.cardTitle}>{club.name}</h3>
          </div>
          <p style={styles.cardDesc}>{club.description}</p>
        </div>

        <button
          onClick={() => onToggleHeart(club.id)}
          style={{
            ...styles.heartBtn,
            background: hearted ? "#ffe7ef" : "white",
          }}
          title={hearted ? "Unheart" : "Heart"}
          aria-label={hearted ? "Unheart club" : "Heart club"}
        >
          {hearted ? "❤️" : "🤍"}
        </button>
      </div>

      <div style={styles.tagsArea}>
        <TagRow label="Interests" items={club.interests} />
        <TagRow label="Vibes" items={club.vibes} />
        <TagRow label="Collab" items={club.collab_needs} />
      </div>

      {club.contact ? (
        <a href={club.contact} target="_blank" rel="noreferrer" style={styles.link}>
          Contact →
        </a>
      ) : (
        <span style={styles.noLink}>No contact link provided</span>
      )}
    </article>
  );
}

function VendorTile({ vendor }) {
  return (
    <article style={styles.card}>
      <h3 style={styles.cardTitle}>{vendor.name}</h3>
      <p style={styles.cardDesc}>{vendor.description}</p>

      <div style={styles.tagsArea}>
        <TagRow label="Services" items={vendor.services} />
        <TagRow label="Vibes" items={vendor.vibes} />
        <TagRow label="Tags" items={vendor.tags} />
        <TagRow label="Avail" items={vendor.availability} />
      </div>

      {vendor.contact ? (
        <a href={vendor.contact} target="_blank" rel="noreferrer" style={styles.link}>
          Contact →
        </a>
      ) : (
        <span style={styles.noLink}>No contact link provided</span>
      )}
    </article>
  );
}

function RequestTile({ req }) {
  return (
    <article style={styles.card}>
      <h3 style={styles.cardTitle}>{req.title}</h3>
      <p style={styles.cardDesc}>
        <b>{req.club_name}</b> — {req.description}
      </p>

      <div style={styles.tagsArea}>
        <TagRow label="Needs" items={req.needs} />
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
        <div>
          <b>Budget:</b> {req.budget || "N/A"}
        </div>
        <div>
          <b>Date:</b> {req.date || "N/A"}
        </div>
        <div>
          <b>Time:</b> {req.time_window || "N/A"}
        </div>
      </div>

      {req.contact ? (
        <a href={req.contact} target="_blank" rel="noreferrer" style={styles.link}>
          Contact →
        </a>
      ) : (
        <span style={styles.noLink}>No contact link provided</span>
      )}
    </article>
  );
}

function TagRow({ label, items }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={styles.tagRow}>
      <span style={styles.tagLabel}>{label}:</span>
      <div style={styles.tagWrap}>
        {items.map((t) => (
          <span key={`${label}-${t}`} style={styles.tag}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Simple modal overlay */
function Modal({ children, onClose }) {
  return (
    <div style={styles.overlay} onMouseDown={onClose}>
      <div style={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function NewClubForm({ existingIds, onAddClub, onCancel }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [interests, setInterests] = useState("");
  const [vibes, setVibes] = useState("");
  const [collabNeeds, setCollabNeeds] = useState("");
  const [contact, setContact] = useState("");

  function nextId() {
    let id = Math.floor(Math.random() * 1000000) + 1000;
    while (existingIds.has(id)) id++;
    return id;
  }

  function handleSubmit(e) {
    e.preventDefault();

    const cleanName = name.trim();
    if (!cleanName) return;

    const newClub = {
      id: nextId(),
      name: cleanName,
      description: description.trim() || "No description provided yet.",
      interests: interests.split(",").map((s) => s.trim()).filter(Boolean),
      vibes: vibes.split(",").map((s) => s.trim()).filter(Boolean),
      collab_needs: collabNeeds.split(",").map((s) => s.trim()).filter(Boolean),
      contact: contact.trim(),
    };

    onAddClub(newClub);

    setName("");
    setDescription("");
    setInterests("");
    setVibes("");
    setCollabNeeds("");
    setContact("");
  }

  return (
    <form onSubmit={handleSubmit} style={styles.formGrid}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Club name (required)"
        style={styles.input}
      />

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Short description"
        rows={3}
        style={styles.textarea}
      />

      <input
        value={interests}
        onChange={(e) => setInterests(e.target.value)}
        placeholder="Interests (comma separated) e.g. tech, business, cricket"
        style={styles.input}
      />

      <input
        value={vibes}
        onChange={(e) => setVibes(e.target.value)}
        placeholder="Vibes (comma separated) e.g. chill, professional"
        style={styles.input}
      />

      <input
        value={collabNeeds}
        onChange={(e) => setCollabNeeds(e.target.value)}
        placeholder="Collab needs (comma separated) e.g. speakers, sponsorship"
        style={styles.input}
      />

      <input
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        placeholder="Contact link (optional)"
        style={styles.input}
      />

      <div style={styles.modalActions}>
        <button type="button" onClick={onCancel} style={styles.secondaryBtn}>
          Cancel
        </button>
        <button type="submit" style={styles.primaryBtn}>
          Add Club
        </button>
      </div>

      <p style={styles.formHint}>Saved locally for demo. In production, this would submit to a database.</p>
    </form>
  );
}

function NewRequestForm({ existingIds, onAddRequest, onCancel }) {
  const [clubName, setClubName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [needs, setNeeds] = useState("");
  const [budget, setBudget] = useState("$$");
  const [date, setDate] = useState("");
  const [timeWindow, setTimeWindow] = useState("");
  const [contact, setContact] = useState("");

  function nextId() {
    let id = Math.floor(Math.random() * 1000000) + 300;
    while (existingIds.has(id)) id++;
    return id;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!clubName.trim() || !title.trim()) return;

    const newReq = {
      id: nextId(),
      club_name: clubName.trim(),
      title: title.trim(),
      description: description.trim() || "No description provided yet.",
      needs: needs.split(",").map((s) => s.trim()).filter(Boolean),
      budget: budget.trim(),
      date: date.trim(),
      time_window: timeWindow.trim(),
      contact: contact.trim(),
    };

    onAddRequest(newReq);

    setClubName("");
    setTitle("");
    setDescription("");
    setNeeds("");
    setBudget("$$");
    setDate("");
    setTimeWindow("");
    setContact("");
  }

  return (
    <form onSubmit={handleSubmit} style={styles.formGrid}>
      <input
        value={clubName}
        onChange={(e) => setClubName(e.target.value)}
        placeholder="Club name (required)"
        style={styles.input}
      />

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Request title (required)"
        style={styles.input}
      />

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Details (how many people, what you need, etc.)"
        rows={3}
        style={styles.textarea}
      />

      <input
        value={needs}
        onChange={(e) => setNeeds(e.target.value)}
        placeholder="Needs (comma separated) e.g. chai, halal, photography"
        style={styles.input}
      />

      <input
        value={budget}
        onChange={(e) => setBudget(e.target.value)}
        placeholder="Budget e.g. $, $$, $$$"
        style={styles.input}
      />

      <input
        value={date}
        onChange={(e) => setDate(e.target.value)}
        placeholder="Date (optional) e.g. 2026-03-10"
        style={styles.input}
      />

      <input
        value={timeWindow}
        onChange={(e) => setTimeWindow(e.target.value)}
        placeholder="Time window (optional) e.g. 6pm–10pm"
        style={styles.input}
      />

      <input
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        placeholder="Contact link (optional)"
        style={styles.input}
      />

      <div style={styles.modalActions}>
        <button type="button" onClick={onCancel} style={styles.secondaryBtn}>
          Cancel
        </button>
        <button type="submit" style={styles.primaryBtn}>
          Post
        </button>
      </div>
    </form>
  );
}

const styles = {
  page: {
    width: "100%",
    minHeight: "100vh",
    margin: 0,
    padding: 20,
    boxSizing: "border-box",
    color: "#111827",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
  },

  header: {
    display: "flex",
    flexWrap: "wrap",
    gap: 16,
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: { margin: 0, fontSize: 32 },
  subtitle: { margin: "8px 0 0 0", color: "#3d8cfb" },

  topActions: {
    display: "flex",
    justifyContent: "flex-end",
    marginBottom: 14,
  },
  smallBtn: {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid #ddd",
    background: "white",
    color: "#111827",
    cursor: "pointer",
    fontSize: 12,
  },

  searchWrap: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    minWidth: 320,
    flex: 1,
    justifyContent: "flex-end",
  },
  search: {
    width: "100%",
    maxWidth: 520,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #ddd",
    outline: "none",
    background: "white",
    color: "#111827",
  },
  clearBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    color: "#111827",
    border: "1px solid #ddd",
    background: "white",
    cursor: "pointer",
  },

  // ✅ 2 columns now
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1.6fr",
    gap: 16,
    alignItems: "start",
  },

  panel: {
    border: "1px solid #eee",
    borderRadius: 16,
    padding: 14,
    background: "#fff",
  },

  panelHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  h2: { margin: 0, fontSize: 18 },
  countPill: {
    fontSize: 12,
    padding: "4px 8px",
    borderRadius: 999,
    border: "1px solid #eee",
    background: "#fafafa",
  },
  muted: { margin: "10px 0 0 0", color: "#666" },

  chipsWrap: {
    marginTop: 10,
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid #ddd",
    background: "white",
    cursor: "pointer",
    fontSize: 12,
    color: "black",
  },
  filterLine: { margin: "10px 0 0 0", fontSize: 12, color: "#666" },
  filterTags: { color: "#111827", fontWeight: 600 },

  list: { marginTop: 12, display: "grid", gap: 12 },

  card: {
    border: "1px solid #e7e7e7",
    borderRadius: 16,
    padding: 14,
    background: "white",
  },
  cardTop: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  cardTitleRow: { display: "flex", alignItems: "center", gap: 8 },
  cardTitle: { margin: 0, fontSize: 16 },
  cardDesc: { margin: "6px 0 0 0", color: "#555", lineHeight: 1.35 },

  heartBtn: {
    border: "1px solid #ddd",
    borderRadius: 999,
    padding: "8px 10px",
    cursor: "pointer",
    fontSize: 16,
    lineHeight: 1,
    outline: "none",
  },

  tagsArea: { marginTop: 12, display: "grid", gap: 8 },
  tagRow: { display: "flex", gap: 10, alignItems: "flex-start" },
  tagLabel: { fontSize: 12, color: "#666", width: 70 },
  tagWrap: { display: "flex", flexWrap: "wrap", gap: 6 },
  tag: {
    fontSize: 12,
    padding: "4px 8px",
    borderRadius: 999,
    border: "1px solid #eee",
    background: "#fafafa",
  },

  link: {
    display: "inline-block",
    marginTop: 12,
    color: "#3d8cfb",
    textDecoration: "none",
  },
  noLink: { display: "inline-block", marginTop: 12, color: "#999", fontSize: 12 },

  // Modal styles
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 9999,
  },
  modal: {
    width: "100%",
    maxWidth: 560,
    background: "white",
    borderRadius: 16,
    border: "1px solid #eee",
    padding: 14,
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  xBtn: {
    border: "1px solid #ddd",
    background: "white",
    color: "#111827",
    borderRadius: 10,
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: 12,
  },
  modalSubtext: { margin: "10px 0 0 0", color: "#666" },

  // Register form styles
  formGrid: { marginTop: 12, display: "grid", gap: 10 },
  input: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #ddd",
    background: "white",
    color: "#111827",
    outline: "none",
  },
  textarea: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #ddd",
    background: "white",
    color: "#111827",
    outline: "none",
    resize: "vertical",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 6,
  },
  primaryBtn: {
    padding: "9px 12px",
    borderRadius: 12,
    border: "1px solid #3d8cfb",
    background: "#3d8cfb",
    color: "white",
    cursor: "pointer",
    fontWeight: 600,
  },
  secondaryBtn: {
    padding: "9px 12px",
    borderRadius: 12,
    border: "1px solid #ddd",
    background: "white",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 600,
  },

  formHint: { margin: 0, fontSize: 12, color: "#666" },

  footer: { marginTop: 18, paddingTop: 10, borderTop: "1px solid #eee" },
  footerText: { color: "#888", fontSize: 12 },
};
