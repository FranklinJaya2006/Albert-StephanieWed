import { useEffect, useRef, useState } from "react";
import { FILTERS, WARM_PREVIEW_CSS, applyWarmFilm, drawFrame, loadFrameFonts, type FilterId } from "./filters";

type Stage = "camera" | "review" | "sending" | "done";

const OUTPUT_WIDTH = 1080;
const ASPECT = 3 / 4; // width / height of the saved photo

function cameraErrorMessage(err: unknown) {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    return "The camera only works over a secure (https) link. Please scan the QR code again.";
  }
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError") {
    return "Camera access was blocked. Allow camera access in your browser settings, then try again.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No camera was found on this device.";
  return "We couldn't open the camera. Please try again.";
}

function Booth({ username, onChangeName }: { username: string; onChangeName: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [filter, setFilter] = useState<FilterId>("frame");
  const [stage, setStage] = useState<Stage>("camera");
  const [photo, setPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // The stream only lives while the camera screen is shown; switching away releases the camera.
  useEffect(() => {
    if (stage !== "camera") return;
    let stream: MediaStream | undefined;
    let cancelled = false;
    setCameraError(null);
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1440 }, height: { ideal: 1920 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
      } catch (err) {
        if (!cancelled) setCameraError(cameraErrorMessage(err));
      }
    })();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [facing, stage]);

  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas || filter !== "frame" || stage !== "camera") return;
    let active = true;
    const draw = async () => {
      await loadFrameFonts();
      if (!active) return;
      const dpr = window.devicePixelRatio || 1;
      const { clientWidth: w, clientHeight: h } = canvas;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      drawFrame(ctx, w, h);
    };
    draw();
    const observer = new ResizeObserver(() => draw());
    observer.observe(canvas);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [filter, stage]);

  const capture = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    await loadFrameFonts();

    // Center-crop to 3:4 — the same crop object-fit: cover shows in the preview.
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    let sx = 0, sy = 0, sw = vw, sh = vh;
    if (vw / vh > ASPECT) {
      sw = vh * ASPECT;
      sx = (vw - sw) / 2;
    } else {
      sh = vw / ASPECT;
      sy = (vh - sh) / 2;
    }
    const w = Math.round(Math.min(OUTPUT_WIDTH, sw));
    const h = Math.round(w / ASPECT);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (facing === "user") {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (filter === "color") applyWarmFilm(ctx, w, h);
    else drawFrame(ctx, w, h);

    setPhoto(canvas.toDataURL("image/jpeg", 0.88));
    setStage("review");
  };

  const send = async () => {
    setStage("sending");
    setSendError(null);
    try {
      const res = await fetch("/api/booth/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, filter, image: photo }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStage("done");
    } catch {
      setSendError("Your photo couldn't be sent. Check your connection and try again.");
      setStage("review");
    }
  };

  const retake = () => {
    setPhoto(null);
    setStage("camera");
  };

  if (stage === "done") {
    return (
      <main className="screen done">
        <p className="eyebrow">Saved</p>
        <h1 className="names">Thank you, {username}!</h1>
        <p className="lead">Your photo is in. We'll pick our favourite shot after the celebration.</p>
        <button type="button" className="button" onClick={retake}>
          Take Another
        </button>
      </main>
    );
  }

  return (
    <main className="screen booth">
      <header className="booth-header">
        <span>
          Hi, <strong>{username}</strong>
        </span>
        <button type="button" className="link-button" onClick={onChangeName}>
          Change name
        </button>
      </header>

      <div className="viewfinder">
        {stage === "camera" ? (
          <>
            <video
              ref={videoRef}
              className={facing === "user" ? "mirrored" : undefined}
              style={{ filter: filter === "color" ? WARM_PREVIEW_CSS : undefined }}
              playsInline
              muted
            />
            {filter === "frame" && <canvas ref={overlayRef} className="frame-overlay" aria-hidden="true" />}
            {cameraError && <p className="camera-error" role="alert">{cameraError}</p>}
          </>
        ) : (
          photo && <img src={photo} alt="Your photo" />
        )}
      </div>

      {stage === "camera" ? (
        <>
          <div className="filter-picker" role="radiogroup" aria-label="Filter">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={filter === f.id}
                className={`filter-option${filter === f.id ? " selected" : ""}`}
                onClick={() => setFilter(f.id)}
              >
                <span className="filter-label">{f.label}</span>
                <span className="filter-hint">{f.hint}</span>
              </button>
            ))}
          </div>
          <div className="controls">
            <button
              type="button"
              className="icon-button"
              aria-label="Switch camera"
              onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 7h3l2-2h6l2 2h3v12H4z" />
                <path d="M9 12a3 3 0 0 1 5-2.2M15 13a3 3 0 0 1-5 2.2" />
                <path d="M14 8v2h2M10 16v-2H8" />
              </svg>
            </button>
            <button
              type="button"
              className="shutter"
              aria-label="Take photo"
              disabled={!!cameraError}
              onClick={capture}
            />
            <span className="icon-button-spacer" aria-hidden="true" />
          </div>
        </>
      ) : (
        <div className="review-actions">
          {sendError && <p className="send-error" role="alert">{sendError}</p>}
          <button type="button" className="button button-ghost" onClick={retake} disabled={stage === "sending"}>
            Retake
          </button>
          <button type="button" className="button" onClick={send} disabled={stage === "sending"}>
            {stage === "sending" ? "Sending…" : "Send Photo"}
          </button>
        </div>
      )}
    </main>
  );
}

export default Booth;
