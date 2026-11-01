import { invitation } from "../data/invitation";
import type { Reservation } from "../lib/weddingApi";
import { DEMO_MODE } from "../lib/weddingApi";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The card image could not be loaded. Please try again."));
    image.src = src;
  });
}

export async function downloadAccessCard(reservation: Reservation, eventKey: "ceremony" | "reception", qrImage: string) {
  const [photo, qr] = await Promise.all([loadImage(invitation.photos.accessCard), loadImage(qrImage)]);
  const event = invitation[eventKey];
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 2400;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image downloads are unavailable in this browser.");
  ctx.fillStyle = "#fffdf7";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const scale = Math.max(1080 / photo.width, 720 / photo.height);
  const sw = 1080 / scale, sh = 720 / scale;
  ctx.drawImage(photo, (photo.width - sw) / 2, (photo.height - sh) * .3, sw, sh, 0, 0, 1080, 720);
  const shade = ctx.createLinearGradient(0, 240, 0, 720);
  shade.addColorStop(0, "transparent"); shade.addColorStop(1, "rgba(24,30,36,.8)");
  ctx.fillStyle = shade; ctx.fillRect(0, 0, 1080, 720);

  function write(text: string, x: number, y: number, width: number, font: string, color = "#2b333b", lineHeight = 40) {
    ctx!.font = font; ctx!.fillStyle = color;
    const lines: string[] = []; let line = "";
    for (const word of text.split(/\s+/)) {
      if (ctx!.measureText(`${line} ${word}`.trim()).width > width && line) { lines.push(line); line = ""; }
      for (const letter of (line ? " " : "") + word) {
        if (ctx!.measureText(line + letter).width > width) { lines.push(line); line = ""; }
        line += letter;
      }
    }
    if (line) lines.push(line);
    lines.forEach((value, index) => ctx!.fillText(value, x, y + index * lineHeight));
    return y + lines.length * lineHeight;
  }
  write("ENTRANCE ACCESS CARD", 64, 442, 950, "600 27px Georgia", "#fffdf7");
  write(`${invitation.coverNames.groom} & ${invitation.coverNames.bride}`, 64, 535, 950, "italic 68px Georgia", "#fffdf7", 76);
  write(event.label, 64, 661, 950, "32px Georgia", "#fffdf7");
  let y = write(event.venue, 64, 792, 950, "bold 38px Georgia", undefined, 48);
  y = write(event.address, 64, y + 12, 950, "28px Georgia", undefined, 38);
  y = write(`${event.date} · ${event.time}`, 64, y + 12, 950, "28px Georgia", undefined, 38);
  ctx.strokeStyle = "#ddd4c1"; ctx.beginPath(); ctx.moveTo(64, y + 18); ctx.lineTo(1016, y + 18); ctx.stroke();
  const rowY = y + 54;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qr, 64, rowY, 380, 380);
  let detailsY = write("Reserved for", 500, rowY + 45, 510, "28px Georgia", "#636a71");
  detailsY = write(reservation.name, 500, detailsY + 15, 510, "bold 40px Georgia", undefined, 48);
  detailsY = write("Admission", 500, detailsY + 28, 510, "28px Georgia", "#636a71");
  detailsY = write(`${reservation.guests} ${reservation.guests === 1 ? "guest" : "guests"}`, 500, detailsY + 12, 510, "34px Georgia");
  detailsY = write(event.label, 500, detailsY + 22, 510, "28px Georgia", "#4f5d6b");
  y = Math.max(rowY + 380, detailsY) + 65;
  y = write("Please show this QR code when arriving at the event venue.", 64, y, 950, "italic 29px Georgia", undefined, 42);
  y = write(`Reservation ID: ${reservation.id}`, 64, y + 30, 950, "24px Georgia", "#4f5d6b", 34);
  if (DEMO_MODE) y = write("PREVIEW CARD — NOT VALID FOR EVENT ADMISSION", 64, y + 20, 950, "23px Georgia", "#636a71", 32);
  const output = document.createElement("canvas"); output.width = 1080; output.height = y + 50;
  output.getContext("2d")!.drawImage(canvas, 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) => output.toBlob(value => value ? resolve(value) : reject(new Error("Unable to export your card.")), "image/png"));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = `entrance-access-${reservation.id}-${eventKey}.png`;
  document.body.append(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

