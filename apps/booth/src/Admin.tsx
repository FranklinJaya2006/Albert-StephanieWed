import { useEffect, useState } from "react";
import { FILTERS, type FilterId } from "./filters";

type BoothPhoto = { id: string; username: string; filter: FilterId; createdAt: string; url: string };

const timeFormat = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Makassar",
});

// Private page for the couple/organizer: /admin?key=<BOOTH_ADMIN_KEY>
function Admin() {
  const [key, setKey] = useState(() => new URLSearchParams(window.location.search).get("key") ?? "");
  const [photos, setPhotos] = useState<BoothPhoto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async (adminKey: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/booth/photos?key=${encodeURIComponent(adminKey)}`);
      if (res.status === 401) {
        setPhotos(null);
        setError("Wrong admin key.");
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      setPhotos(await res.json());
    } catch {
      setError("Couldn't load the photos. Is the backend running?");
    }
  };

  // Auto-load once with the key from the URL; later loads come from the form or Refresh.
  useEffect(() => {
    if (key) load(key);
  }, []);

  if (!photos) {
    return (
      <main className="screen admin-login">
        <h1 className="title">Booth Photos</h1>
        <form
          className="name-form"
          onSubmit={(e) => {
            e.preventDefault();
            load(key);
          }}
        >
          <label htmlFor="admin-key">Admin key</label>
          <input id="admin-key" type="password" value={key} onChange={(e) => setKey(e.target.value)} required />
          <button type="submit" className="button">
            Show Photos
          </button>
          {error && <p className="send-error" role="alert">{error}</p>}
        </form>
      </main>
    );
  }

  return (
    <main className="admin">
      <header className="admin-header">
        <h1 className="title">Booth Photos</h1>
        <p>
          {photos.length} photo{photos.length === 1 ? "" : "s"}
        </p>
        <button type="button" className="link-button" onClick={() => load(key)}>
          Refresh
        </button>
      </header>
      {photos.length === 0 ? (
        <p className="lead">No photos yet.</p>
      ) : (
        <ul className="admin-grid">
          {photos.map((p) => {
            const src = `${p.url}?key=${encodeURIComponent(key)}`;
            return (
              <li key={p.id} className="admin-card">
                <a href={src} target="_blank" rel="noreferrer">
                  <img src={src} alt={`Photo by ${p.username}`} loading="lazy" />
                </a>
                <p className="admin-name">{p.username}</p>
                <p className="admin-meta">
                  {FILTERS.find((f) => f.id === p.filter)?.label ?? p.filter} ·{" "}
                  {timeFormat.format(new Date(p.createdAt))}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

export default Admin;
