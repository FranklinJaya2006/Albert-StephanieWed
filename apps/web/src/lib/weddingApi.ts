export type Reservation = { id: string; token: string; name: string; attending: "yes" | "no"; event: string; guests: number; createdAt: string };
export type Wish = { id: string; name: string; message: string; createdAt: string };
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";
export const RESERVATION_STORAGE_KEY = DEMO_MODE ? "albert-stephanie:demo-reservation-token" : "albert-stephanie:reservation-token";
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}
export function newRequestKey() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(24)), (value) => value.toString(16).padStart(2, "0")).join("");
}
export async function weddingApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (DEMO_MODE) {
    const { demoApi } = await import("./demoApi");
    return demoApi<T>(path, options);
  }
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 20000);
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) controller.abort();
  try {
    const response = await fetch(`/api/wedding${path}`, { ...options, signal: controller.signal, credentials: "same-origin", headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers } });
    const body = await response.json().catch(() => null);
    if (controller.signal.aborted) throw new ApiError("The request timed out. Please try again; the same submission ID will be reused.", 0);
    if (!response.ok || !body) throw new ApiError(body?.error ?? "The reservation service is unavailable. Please try again later.", response.status);
    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(controller.signal.aborted ? "The request timed out. Please try again; the same submission ID will be reused." : "Cannot reach the server. Check your connection and try again.", 0);
  } finally {
    window.clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
}
export function savedReservationToken() {
  const query = new URLSearchParams(window.location.search).get("reservation");
  if (query) return query;
  if (new URLSearchParams(window.location.search).has("invite")) return null;
  try { return localStorage.getItem(RESERVATION_STORAGE_KEY); } catch { return null; }
}
