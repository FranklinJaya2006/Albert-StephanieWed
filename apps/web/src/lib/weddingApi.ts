export type Reservation = { id: string; token: string; name: string; attending: "yes" | "no"; event: string; guests: number; createdAt: string; pax?: number | null; table?: string };
export type Wish = { id: string; name: string; message: string; createdAt: string };
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";
export const RESERVATION_STORAGE_KEY = DEMO_MODE ? "albert-stephanie:demo-reservation-token" : "albert-stephanie:reservation-token";
// The n8n webhook base, e.g. https://n8n.example.com/webhook (no trailing slash). See n8n/README.md.
const N8N_BASE = String(import.meta.env.VITE_N8N_WEBHOOK_BASE ?? "").replace(/\/+$/, "");
const ADMIN_KEY_STORAGE = "albert-stephanie:admin-key";
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}
export function newRequestKey() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(24)), (value) => value.toString(16).padStart(2, "0")).join("");
}

function adminKey() {
  try { return sessionStorage.getItem(ADMIN_KEY_STORAGE); } catch { return null; }
}
function setAdminKey(value: string | null) {
  try { if (value) sessionStorage.setItem(ADMIN_KEY_STORAGE, value); else sessionStorage.removeItem(ADMIN_KEY_STORAGE); } catch { /* The key then lasts only for this call. */ }
}

// The pages talk in REST-like paths; n8n has two webhooks that take an { action, ... } body.
type Call = { admin?: boolean; payload: Record<string, unknown> } | { local: unknown };
function toCall(path: string, method: string, body: Record<string, unknown>): Call | null {
  const [pathname, query = ""] = path.split("?");
  const token = decodeURIComponent(pathname.split("/")[2] ?? "");
  if (pathname === "/reservation-options") return { local: { allowUninvited: false } };
  if (pathname.startsWith("/invitations/")) return { payload: { action: "invitation", token } };
  if (pathname === "/reservations" && method === "POST") return { payload: { ...body, action: "rsvp" } };
  if (pathname.startsWith("/reservations/")) return { payload: { action: "reservation", token } };
  if (pathname === "/wishes") return { payload: method === "POST" ? { ...body, action: "wish-add" } : { action: "wishes-list" } };
  if (pathname === "/admin/session") return { admin: true, payload: { action: "admin-check" } };
  if (pathname === "/admin/invitations") return { admin: true, payload: method === "POST" ? { ...body, action: "admin-add-guest" } : { action: "admin-guests" } };
  if (pathname === "/admin/checkins") return { admin: true, payload: { ...body, action: "checkin" } };
  if (pathname === "/admin/reservations") return { admin: true, payload: { ...Object.fromEntries(new URLSearchParams(query)), action: "admin-reservations" } };
  return null;
}

async function callWebhook<T>(admin: boolean, payload: Record<string, unknown>, signal?: AbortSignal | null): Promise<T> {
  if (!N8N_BASE) throw new ApiError("The reservation service is not set up yet. Set VITE_N8N_WEBHOOK_BASE and rebuild the site.", 503);
  const key = admin ? adminKey() : null;
  if (admin && !key) throw new ApiError("Please sign in.", 401);
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 20000);
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  try {
    const response = await fetch(`${N8N_BASE}/${admin ? "wedding-admin" : "wedding"}`, {
      method: "POST",
      signal: controller.signal,
      credentials: "omit",
      headers: { "Content-Type": "application/json", ...(key ? { "X-Admin-Key": key } : {}) },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => null);
    if (controller.signal.aborted) throw new ApiError("The request timed out. Please try again; the same submission ID will be reused.", 0);
    if (admin && (response.status === 401 || response.status === 403)) {
      setAdminKey(null);
      throw new ApiError("Incorrect admin key, or the session ended. Please sign in again.", 401);
    }
    if (!response.ok || body === null) throw new ApiError(body?.error ?? "The reservation service is unavailable. Please try again later.", response.status);
    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(controller.signal.aborted ? "The request timed out. Please try again; the same submission ID will be reused." : "Cannot reach the server. Check your connection and try again.", 0);
  } finally {
    window.clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

export async function weddingApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (DEMO_MODE) {
    const { demoApi } = await import("./demoApi");
    return demoApi<T>(path, options);
  }
  const method = (options.method ?? "GET").toUpperCase();
  const pathname = path.split("?")[0];
  // The admin "session" is just the admin key kept for this browser tab.
  if (pathname === "/admin/logout") { setAdminKey(null); return { ok: true } as T; }
  if (pathname === "/login") {
    const key = String((JSON.parse(String(options.body ?? "{}")) as { key?: unknown }).key ?? "").trim();
    if (!key) throw new ApiError("Enter the admin key.", 400);
    setAdminKey(key);
    try { return await callWebhook<T>(true, { action: "admin-check" }, options.signal); }
    catch (error) { setAdminKey(null); throw error; }
  }
  let body: Record<string, unknown> = {};
  try { body = options.body ? JSON.parse(String(options.body)) : {}; } catch { /* A malformed body is sent as empty and rejected by n8n. */ }
  const call = toCall(path, method, body);
  if (!call) throw new ApiError("Unknown request.", 404);
  if ("local" in call) return call.local as T;
  return callWebhook<T>(Boolean(call.admin), call.payload, options.signal);
}
// A guest's personal link is /AlbertStephanie/<token>. The older ?invite=<token> form keeps working.
export const INVITE_PATH = "AlbertStephanie";
export function inviteTokenFromPath(): string | null {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, "/");
  const path = window.location.pathname;
  if (!path.toLowerCase().startsWith((base + INVITE_PATH + "/").toLowerCase())) return null;
  const token = decodeURIComponent(path.slice(base.length + INVITE_PATH.length + 1).split("/")[0] ?? "");
  return token || null;
}
export function savedReservationToken() {
  const query = new URLSearchParams(window.location.search).get("reservation");
  if (query) return query;
  if (new URLSearchParams(window.location.search).has("invite") || inviteTokenFromPath()) return null;
  try { return localStorage.getItem(RESERVATION_STORAGE_KEY); } catch { return null; }
}
