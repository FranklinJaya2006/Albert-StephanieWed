import { useEffect, useState } from "react";

function getRemaining(target: Date) {
  const diff = Math.max(0, target.getTime() - Date.now());
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function Countdown({ target }: { target: string }) {
  const targetDate = new Date(target);
  const [remaining, setRemaining] = useState(() => getRemaining(targetDate));

  useEffect(() => {
    const targetDate = new Date(target);
    const id = setInterval(() => setRemaining(getRemaining(targetDate)), 1000);
    return () => clearInterval(id);
  }, [target]);

  const units: [string, number][] = [
    ["Days", remaining.days],
    ["Hours", remaining.hours],
    ["Mins", remaining.minutes],
    ["Secs", remaining.seconds],
  ];

  return (
    <div className="countdown">
      {units.map(([label, value]) => (
        <div className="countdown-unit" key={label}>
          <span className="countdown-value">{String(value).padStart(2, "0")}</span>
          <span className="countdown-label">{label}</span>
        </div>
      ))}
    </div>
  );
}

export default Countdown;
