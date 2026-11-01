import { ApiError, newRequestKey, type Reservation, type Wish } from "./weddingApi";

type DemoReservation = Reservation & { requestKey: string };
type DemoWish = Wish & { requestKey: string };
type DemoData = { reservations: DemoReservation[]; wishes: DemoWish[] };
const storageKey = `albert-stephanie:pages-demo:v1:${import.meta.env.BASE_URL}`;
let memory: DemoData = { reservations: [], wishes: [] };
function read(): DemoData {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    if (data && Array.isArray(data.reservations) && Array.isArray(data.wishes)) {
      memory = {
        reservations: data.reservations.filter((item: DemoReservation) => item && typeof item.id === "string" && typeof item.token === "string" && typeof item.name === "string" && ["yes", "no"].includes(item.attending)).slice(0, 100),
        wishes: data.wishes.filter((item: DemoWish) => item && typeof item.id === "string" && typeof item.name === "string" && typeof item.message === "string").slice(0, 100),
      };
    }
  } catch { /* Use session memory if local storage is blocked. */ }
  return memory;
}
function save(data: DemoData) {
  memory = data;
  try { localStorage.setItem(storageKey, JSON.stringify(data)); } catch { /* The demo remains usable for this page session. */ }
}
export async function demoApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const data = read();
  const method = options.method ?? "GET";
  if (path === "/reservation-options") return { allowUninvited: true } as T;
  if (path === "/wishes" && method === "GET") return data.wishes as T;
  if (path.startsWith("/invitations/")) throw new ApiError("You can try the form directly in this preview; no personal invitation is required.", 404);
  if (path.startsWith("/reservations/") && method === "GET") {
    const saved = data.reservations.find((entry) => entry.token === decodeURIComponent(path.slice("/reservations/".length)));
    if (!saved) throw new ApiError("This preview card is not saved in this browser. You can submit the form again.", 404);
    return saved as T;
  }
  if (path === "/reservations" && method === "POST") {
    const input = JSON.parse(String(options.body ?? "{}"));
    const name = typeof input.name === "string" ? input.name.trim() : "";
    if (!name || name.length > 120 || !["yes", "no"].includes(input.attending) || typeof input.requestKey !== "string") throw new ApiError("Please enter your name and attendance.", 400);
    if (input.attending === "yes" && (!["both", "ceremony", "reception"].includes(input.event) || !Number.isInteger(input.guests) || input.guests < 1 || input.guests > 5)) throw new ApiError("Please select an event and between 1 and 5 guests.", 400);
    const existing = data.reservations.find((entry) => entry.requestKey === input.requestKey);
    if (existing) return existing as T;
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (value) => value.toString(16).padStart(2, "0")).join("");
    const entry: DemoReservation = { id: newRequestKey(), token, name, attending: input.attending, event: input.attending === "yes" ? input.event : "", guests: input.attending === "yes" ? input.guests : 0, createdAt: new Date().toISOString(), requestKey: input.requestKey };
    save({ ...data, reservations: [entry, ...data.reservations].slice(0, 100) });
    return entry as T;
  }
  if (path === "/wishes" && method === "POST") {
    const input = JSON.parse(String(options.body ?? "{}"));
    const name = typeof input.name === "string" ? input.name.trim() : "";
    const message = typeof input.message === "string" ? input.message.trim() : "";
    if (!name || name.length > 120 || !message || message.length > 2000 || typeof input.requestKey !== "string") throw new ApiError("Please enter a name and a wish of up to 2,000 characters.", 400);
    const existing = data.wishes.find((entry) => entry.requestKey === input.requestKey);
    if (existing) return existing as T;
    const entry: DemoWish = { id: newRequestKey(), name, message, createdAt: new Date().toISOString(), requestKey: input.requestKey };
    save({ ...data, wishes: [entry, ...data.wishes].slice(0, 100) });
    return entry as T;
  }
  throw new ApiError("Organizer sign-in and live check-in are available only on the server-hosted site, not in this static preview.", 503);
}
