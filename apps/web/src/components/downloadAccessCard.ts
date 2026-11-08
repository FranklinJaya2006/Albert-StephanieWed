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
  const W = 1188; // the card is 10% wider than the old 1080px; the content and photo header scale with it
  const Q = 418; // QR size (was 380)
  const DX = 64 + Q + 56; // left edge of the guest details beside the QR
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = 2400;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image downloads are unavailable in this browser.");
  ctx.fillStyle = "#fffdf7";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const photoH = Math.round(720 * W / 1080); // same proportions as before, just wider
  const scale = Math.max(W / photo.width, photoH / photo.height);
  const sw = W / scale, sh = photoH / scale;
  ctx.drawImage(photo, (photo.width - sw) / 2, (photo.height - sh) * .3, sw, sh, 0, 0, W, photoH);
  const shade = ctx.createLinearGradient(0, photoH / 3, 0, photoH);
  shade.addColorStop(0, "transparent"); shade.addColorStop(1, "rgba(24,30,36,.8)");
  ctx.fillStyle = shade; ctx.fillRect(0, 0, W, photoH);

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
  const top = photoH - 720; // the texts sit on the bottom of the photo, so they move down with it
  write("ENTRANCE ACCESS CARD", 64, 442 + top, W - 130, "600 27px Georgia", "#fffdf7");
  write(`${invitation.coverNames.groom} & ${invitation.coverNames.bride}`, 64, 535 + top, W - 130, "italic 68px Georgia", "#fffdf7", 76);
  write(event.label, 64, 661 + top, W - 130, "32px Georgia", "#fffdf7");
  let y = write(event.venue, 64, 792 + top, W - 130, "bold 38px Georgia", undefined, 48);
  y = write(event.address, 64, y + 12, W - 130, "28px Georgia", undefined, 38);
  y = write(`${event.date} · ${event.time}`, 64, y + 12, W - 130, "28px Georgia", undefined, 38);
  ctx.strokeStyle = "#ddd4c1"; ctx.beginPath(); ctx.moveTo(64, y + 18); ctx.lineTo(W - 64, y + 18); ctx.stroke();
  const rowY = y + 54;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qr, 64, rowY, Q, Q);
  let detailsY = write("Reserved for", DX, rowY + 45, W - 64 - DX, "28px Georgia", "#636a71");
  detailsY = write(reservation.name, DX, detailsY + 15, W - 64 - DX, "bold 40px Georgia", undefined, 48);
  detailsY = write("Pax", DX, detailsY + 28, W - 64 - DX, "28px Georgia", "#636a71");
  detailsY = write(`${reservation.pax ?? reservation.guests} pax`, DX, detailsY + 12, W - 64 - DX, "34px Georgia");
  if (reservation.table) {
    detailsY = write("Table", DX, detailsY + 22, W - 64 - DX, "28px Georgia", "#636a71");
    detailsY = write(reservation.table, DX, detailsY + 12, W - 64 - DX, "34px Georgia");
  }
  detailsY = write(event.label, DX, detailsY + 22, W - 64 - DX, "28px Georgia", "#4f5d6b");
  y = Math.max(rowY + Q, detailsY) + 65;
  y = write("Please show this QR code when arriving at the event venue.", 64, y, W - 130, "italic 29px Georgia", undefined, 42);
  y = write(`Reservation ID: ${reservation.id}`, 64, y + 30, W - 130, "24px Georgia", "#4f5d6b", 34);
  if (DEMO_MODE) y = write("PREVIEW CARD — NOT VALID FOR EVENT ADMISSION", 64, y + 20, W - 130, "23px Georgia", "#636a71", 32);
  const output = document.createElement("canvas"); output.width = W; output.height = y + 50;
  output.getContext("2d")!.drawImage(canvas, 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) => output.toBlob(value => value ? resolve(value) : reject(new Error("Unable to export your card.")), "image/png"));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = `entrance-access-${reservation.id}-${eventKey}.png`;
  document.body.append(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

