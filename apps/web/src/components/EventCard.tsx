type EventCardProps = {
  label: string;
  date: string;
  time: string;
  venue: string;
  address: string;
  mapsQuery: string;
};

function EventCard({ label, date, time, venue, address, mapsQuery }: EventCardProps) {
  return (
    <div className="event-card">
      <h3 className="event-label">{label}</h3>
      <p className="event-date">{date}</p>
      <p className="event-time">{time}</p>
      <p className="event-venue">{venue}</p>
      <p className="event-address">{address}</p>
      <a
        className="event-link"
        href={`https://maps.google.com/?q=${encodeURIComponent(mapsQuery)}`}
        target="_blank"
        rel="noreferrer"
      >
        View Location
      </a>
    </div>
  );
}

export default EventCard;
