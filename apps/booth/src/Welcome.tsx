import { useState } from "react";
import { booth } from "./config";

function Welcome({ onStart }: { onStart: (username: string) => void }) {
  const [name, setName] = useState("");

  return (
    <main className="screen welcome">
      <p className="eyebrow">The Wedding of</p>
      <h1 className="names">{booth.coupleNames}</h1>
      <p className="date">{booth.dateLabel}</p>
      <div className="divider" aria-hidden="true" />
      <h2 className="title">Photo Booth</h2>
      <p className="lead">
        Snap a moment with us! Enter your name so we know who took the best shot.
      </p>
      <form
        className="name-form"
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = name.trim();
          if (trimmed) onStart(trimmed);
        }}
      >
        <label htmlFor="username">Your name</label>
        <input
          id="username"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          autoComplete="name"
          placeholder="e.g. Budi Santoso"
          required
        />
        <button type="submit" className="button">
          Open Camera
        </button>
      </form>
    </main>
  );
}

export default Welcome;
