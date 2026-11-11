import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, INVITE_PATH, weddingApi } from "../lib/weddingApi";
import { invitation } from "../data/invitation";

type EventKey = "reception";
type ScanResult = { duplicate: boolean; event: EventKey; scannedAt: string; reservation: { id: string; name: string; guests: number; pax?: number | null; table?: string } };
type Guest = { id: string; name: string; attending: string; event: string; guests: number; createdAt: string; receptionScannedAt: string | null; pax?: number | null; table?: string };
type GuestList = { entries: Guest[]; total: number; page: number; pageSize: number; summary: { reservations: number; expectedGuests: number; checkedInCards: number; admittedGuests: number } };
type PersonalInvitation = { id: string; token: string; name: string; maxGuests: number; createdAt: string; reservationId?: string | null; phone?: string; inviteSentAt?: string | null; pax?: number | null; table?: string };
const dateTime = (value: string) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Makassar" }).format(new Date(value));

function ScanPanel({ event, onExpired }: { event: EventKey; onExpired: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const controls = useRef<{ stop: () => void } | null>(null);
  const run = useRef(0);
  const pending = useRef(false);
  const [camera, setCamera] = useState(false);
  const [starting, setStarting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  useEffect(() => () => { run.current++; controls.current?.stop(); }, []);

  function stop() { run.current++; controls.current?.stop(); controls.current = null; setCamera(false); setStarting(false); }
  async function scan(value: string) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError(""); setResult(null); stop();
    try {
      const scanned = await weddingApi<ScanResult>("/admin/checkins", { method: "POST", body: JSON.stringify({ qr: value.trim(), event }) });
      setResult(scanned); setQr("");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) onExpired();
      setError((error as Error).message);
    } finally { pending.current = false; setBusy(false); }
  }
  async function start() {
    if (starting || camera || busy) return;
    const current = ++run.current;
    setError(""); setResult(null); setStarting(true);
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error("Camera scanning requires HTTPS (or localhost). You can paste the QR contents below instead.");
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      if (run.current !== current || !video.current) return;
      const reader = new BrowserQRCodeReader();
      const scanner = await reader.decodeFromConstraints({ video: { facingMode: "environment" }, audio: false }, video.current, (value) => {
        if (value && run.current === current) void scan(value.getText());
      });
      if (run.current !== current) { scanner.stop(); return; }
      controls.current = scanner; setCamera(true);
    } catch { if (run.current === current) setError("Unable to start the camera. Allow camera access and use HTTPS, or paste the QR contents below."); }
    finally { if (run.current === current) setStarting(false); }
  }
  return (
    <section className="admin-panel" aria-labelledby="scanner-title">
      <h2 id="scanner-title">Scan entrance card</h2>
      <p className="admin-muted">Entrance: <strong>{invitation[event].label}</strong> · {invitation[event].venue}</p>
      <div className={`scanner-view${camera || starting ? " scanner-active" : ""}`}>
        <video ref={video} muted playsInline aria-label="QR scanner camera" />
        {!camera && !starting && <span>Camera preview</span>}
      </div>
      <div className="admin-actions">
        <button type="button" disabled={busy || starting} onClick={camera ? stop : start}>{starting ? "Starting camera…" : camera ? "Stop camera" : "Start camera"}</button>
      </div>
      <form className="admin-form" onSubmit={(event) => { event.preventDefault(); void scan(qr); }}>
        <label>QR contents (manual entry)<textarea value={qr} maxLength={512} onChange={(event) => setQr(event.target.value)} placeholder="ASW:v1:…" rows={3} required /></label>
        <button type="submit" disabled={busy || !qr.trim()}>{busy ? "Checking card…" : "Check in guest"}</button>
      </form>
      {error && <div className="admin-alert admin-alert-error" role="alert">{error}</div>}
      {result && <div className={`admin-alert ${result.duplicate ? "admin-alert-warning" : "admin-alert-success"}`} role="status">
        <h3>{result.duplicate ? "Already checked in — do not admit again" : "Check-in confirmed"}</h3>
        <p>{result.reservation.name} · {result.reservation.guests} {result.reservation.guests === 1 ? "guest" : "guests"}</p>
        {(result.reservation.table || result.reservation.pax) && <p><strong>{result.reservation.table ? `Table: ${result.reservation.table}` : ""}{result.reservation.table && result.reservation.pax ? " · " : ""}{result.reservation.pax ? `${result.reservation.pax} pax` : ""}</strong></p>}
        <p>{invitation[result.event].label} · {dateTime(result.scannedAt)}</p>
        <small>ID: {result.reservation.id}</small>
      </div>}
      <p className="admin-muted">The camera stops after a scan. Press Start camera for the next guest. Each card checks in the whole reserved party once per event.</p>
    </section>
  );
}

function InvitationManager({ onExpired, invitationUrl }: { onExpired: () => void; invitationUrl?: string }) {
  const [entries, setEntries] = useState<PersonalInvitation[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let live = true;
    weddingApi<PersonalInvitation[]>("/admin/invitations").then((items) => { if (live) { setEntries(items); setError(""); } }).catch((error: Error) => {
      if (!live) return;
      if (error instanceof ApiError && error.status === 401) onExpired();
      setError(error.message);
    });
    return () => { live = false; };
  }, [onExpired, refresh]);
  function link(token: string) {
    const url = new URL(invitationUrl ?? import.meta.env.BASE_URL, window.location.origin);
    url.pathname = `${url.pathname.replace(/\/?$/, "/")}${INVITE_PATH}/${encodeURIComponent(token)}`;
    return url.href;
  }
  return <details className="admin-invitation-manager">
    <summary>Personal invitation links</summary>
    <p className="admin-muted">Create one link per guest or family. Each link accepts one RSVP, including a declined response. Reopening it shows the original confirmation and access cards.</p>
    <form className="admin-filters" onSubmit={async (event) => {
      event.preventDefault(); if (busy) return;
      const form = event.currentTarget, input = new FormData(form); setBusy(true); setError("");
      try {
        const entry = await weddingApi<PersonalInvitation>("/admin/invitations", { method: "POST", body: JSON.stringify({ name: String(input.get("name") ?? "").trim(), maxGuests: Number(input.get("maxGuests")), phone: String(input.get("phone") ?? "").trim(), table: String(input.get("table") ?? "").trim(), pax: input.get("pax") ? Number(input.get("pax")) : undefined }) });
        setEntries((current) => [entry, ...current].slice(0, 100)); form.reset();
      } catch (error) { setError((error as Error).message); }
      finally { setBusy(false); }
    }}>
      <label>Guest / family name<input name="name" maxLength={120} required /></label>
      <label>WhatsApp number (optional)<input name="phone" inputMode="tel" maxLength={30} placeholder="08…" /></label>
      <label>Pax (optional)<input name="pax" type="number" min={1} max={20} inputMode="numeric" /></label>
      <label>Table name (optional)<input name="table" maxLength={60} /></label>
      <label>Maximum party size<select name="maxGuests" defaultValue="2">{[1,2,3,4,5].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      <button disabled={busy}>{busy ? "Creating…" : "Create invitation"}</button>
      <button type="button" onClick={() => setRefresh((value) => value + 1)}>Refresh links</button>
    </form>
    {error && <p role="alert">{error}</p>}
    <div className="admin-personal-links">{entries.map((entry) => <article key={entry.id}>
      <strong>{entry.name}</strong><span>{entry.maxGuests} maximum · {entry.reservationId ? "RSVP submitted" : "Awaiting RSVP"}{entry.inviteSentAt ? " · Invite sent" : ""}{entry.table ? ` · ${entry.table}` : ""}{entry.pax ? ` · ${entry.pax} pax` : ""}</span>
      <label>Personal link<input value={link(entry.token)} readOnly onFocus={(event) => event.target.select()} /></label>
      <a href={link(entry.token)} target="_blank" rel="noreferrer">Open invitation ↗</a>
    </article>)}</div>
    <p className="admin-muted">Showing the latest 100 links. Keep these links private.</p>
  </details>;
}

function GuestsPanel({ onExpired, invitationUrl }: { onExpired: () => void; invitationUrl?: string }) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [event, setEvent] = useState("all");
  const [attendance, setAttendance] = useState("all");
  const [status, setStatus] = useState("all");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<GuestList | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    const params = new URLSearchParams({ search: query, event, attendance, status, date, page: String(page) });
    weddingApi<GuestList>(`/admin/reservations?${params}`).then((data) => { if (live) { setData(data); setError(""); } }).catch((error: Error) => {
      if (!live) return;
      if (error instanceof ApiError && error.status === 401) onExpired();
      setError(error.message);
    }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [query, event, attendance, status, date, page, refresh, onExpired]);
  function filter(set: (value: string) => void, value: string) { set(value); setPage(1); setLoading(true); }
  return <section className="admin-panel" aria-labelledby="guest-list-title">
    <h2 id="guest-list-title">Reservations & check-ins</h2>
    <InvitationManager invitationUrl={invitationUrl} onExpired={onExpired} />
    {data && <div className="admin-stats">
      <div><strong>{data.summary.reservations}</strong><span>Reservations</span></div>
      <div><strong>{data.summary.expectedGuests}</strong><span>Expected guests</span></div>
      <div><strong>{data.summary.checkedInCards}</strong><span>Checked-in cards</span></div>
      <div><strong>{data.summary.admittedGuests}</strong><span>Admissions across events</span></div>
    </div>}
    <form className="admin-filters" onSubmit={(event) => { event.preventDefault(); filter(setQuery, search.trim()); setRefresh((value) => value + 1); }}>
      <label>Search name or ID<input value={search} maxLength={120} onChange={(event) => setSearch(event.target.value)} /></label>
      <label>Event<select value={event} onChange={(e) => filter(setEvent, e.target.value)}><option value="all">All events</option><option value="reception">Reception</option></select></label>
      <label>Attendance<select value={attendance} onChange={(e) => filter(setAttendance, e.target.value)}><option value="all">All responses</option><option value="yes">Attending</option><option value="no">Unable to attend</option></select></label>
      <label>Check-in<select value={status} onChange={(e) => filter(setStatus, e.target.value)}><option value="all">All statuses</option><option value="checked-in">Checked in</option><option value="not-checked-in">Not checked in</option></select></label>
      <label>Submitted date (UTC)<input type="date" value={date} onChange={(e) => filter(setDate, e.target.value)} /></label>
      <button type="submit">Search / Refresh</button>
    </form>
    {error && <p role="alert" className="admin-alert admin-alert-error">{error}</p>}
    {loading && <p role="status">Loading guest list…</p>}
    {!loading && data && <>
      <p className="admin-muted">{data.total} matching reservations · timestamps shown in WITA</p>
      <div className="admin-table-wrap"><table>
        <thead><tr><th>Guest</th><th>RSVP</th><th>Party</th><th>Table</th><th>Reception</th><th>Submitted</th></tr></thead>
        <tbody>{data.entries.map((entry) => <tr key={entry.id}>
          <td><strong>{entry.name}</strong><small>{entry.id}</small></td>
          <td>{entry.attending === "yes" ? "Attending" : "Declined"}</td><td>{entry.guests}{entry.pax ? ` / ${entry.pax} pax` : ""}</td><td>{entry.table || "—"}</td>
          <td>{entry.receptionScannedAt ? <span className="admin-checked">✓ {dateTime(entry.receptionScannedAt)}</span> : ["both", "reception"].includes(entry.event) ? "Not checked in" : "—"}</td>
          <td>{dateTime(entry.createdAt)}</td>
        </tr>)}</tbody>
      </table></div>
      {!data.entries.length && <p>No reservations match these filters.</p>}
      <div className="admin-actions"><button disabled={page === 1} onClick={() => { setPage(page - 1); setLoading(true); }}>Previous</button><span>Page {page} / {Math.max(1, Math.ceil(data.total / data.pageSize))}</span><button disabled={page * data.pageSize >= data.total} onClick={() => { setPage(page + 1); setLoading(true); }}>Next</button></div>
    </>}
  </section>;
}

export default function Admin({ invitationUrl }: { invitationUrl?: string }) {
  const [signedIn, setSignedIn] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("scan");
  const event: EventKey = "reception"; // the only event
  useEffect(() => {
    let live = true;
    weddingApi("/admin/session").then(() => { if (live) setSignedIn(true); }).catch(() => {}).finally(() => { if (live) setChecking(false); });
    return () => { live = false; };
  }, []);
  const expired = useCallback(() => { setSignedIn(false); setError("Your session has expired. Please sign in again."); }, []);
  return <main className="wedding-admin">
    <header className="admin-header"><div><p>ALBERT & STEPHANIE</p><h1>Guest reception desk</h1></div>{signedIn && <button onClick={async () => { try { await weddingApi("/admin/logout", { method: "POST" }); setSignedIn(false); } catch (e) { setError((e as Error).message); } }}>Sign out</button>}</header>
    {checking ? <p role="status">Checking your session…</p> : !signedIn ? <section className="admin-login admin-panel">
      <h2>Organizer sign-in</h2><p>Enter the admin key to scan access cards and manage the guest list.</p>
      <form className="admin-form" onSubmit={async (e) => {
        e.preventDefault(); if (busy) return; const form = new FormData(e.currentTarget); setBusy(true); setError("");
        try { await weddingApi("/login", { method: "POST", body: JSON.stringify({ key: form.get("key") }) }); setSignedIn(true); }
        catch (error) { setError((error as Error).message); } finally { setBusy(false); }
      }}><label>Admin key<input name="key" type="password" autoComplete="current-password" maxLength={256} required /></label><button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button></form>
      {error && <p className="admin-alert admin-alert-error" role="alert">{error}</p>}
    </section> : <>
      <nav className="admin-tabs" aria-label="Admin sections"><button aria-pressed={tab === "scan"} onClick={() => setTab("scan")}>Scan QR</button><button aria-pressed={tab === "guests"} onClick={() => setTab("guests")}>Guest List</button></nav>
      {error && <p role="alert">{error}</p>}
      {tab === "scan" ? <><ScanPanel key={event} event={event} onExpired={expired} /></> : <GuestsPanel invitationUrl={invitationUrl} onExpired={expired} />}
    </>}
  </main>;
}
