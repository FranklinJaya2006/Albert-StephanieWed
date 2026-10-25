// Placeholder wedding content — replace names/dates/venues here.
// Photos: drop files into apps/web/public/photos/ and set the paths below (e.g. "/photos/cover.jpg").
// An empty string renders a tinted placeholder in the palette color.

// Photo paths are plain file names (a leading slash is fine). This prefixes the site's base path so
// they also work when the site is served from a subfolder (GitHub Pages).
const asset = (file: string) =>
  !file || /^https?:\/\//.test(file) ? file : `${import.meta.env.BASE_URL}${file.replace(/^\//, "")}`;

export const invitation = {
  // Background song, played when the guest opens the invitation. See public/music/README.md.
  // "" = no music. Example: asset("music/lagu.mp3")
  music: asset("https://invitato.net/template-danielpriscilla/static/bg-sound-0ded40bc34f135715c0b9e85d808518b.mp3"),
  initials: { first: "A", second: "S" },
  // Nama tampilan halaman pembuka; bebas berbeda dari nama lengkap di bawah.
  coverNames: { groom: "Albert", bride: "Stephanie" },
  desktopMessage: "Marriage is the quiet promise to keep choosing each other — through every season, in every little moment, for a lifetime.",
  groom: {
    name: "Albert Jaya",
    parentsLabel: "The Son of",
    father: "Mr. Rusli Jaya",
    mother: "Mrs. Vani Yap",
    instagram: "@albertjaya_",
  },
  bride: {
    name: "Stephanie Likadinata",
    parentsLabel: "The Daughter of",
    father: "Mr. Yusuf Likadinata",
    mother: "Mrs. Ingrid K.",
    instagram: "@bride",
  },
  quote: {
    text: "So they are no longer two, but one. Therefore what God has joined together, let no one separate.",
    source: "Matthew 19:6",
  },
  hashtag: "#ASwedding",
  story:
    "Tell your story here — how you met, and the journey that brought the two of you to this day.",
  // Local time — drives the countdown.
  eventDateTime: "2026-11-29T09:30:00+08:00",
  ceremony: {
    label: "Holy Matrimony",
    date: "Saturday, 29 November 2026",
    time: "09.30 WITA",
    venue: "Gereja Mawar Sharon",
    address: "Jl. Metro Tj. Bunga No. 02, Makassar",
    mapsQuery: "?q=GMS+Makassar+Barat",
  },
  reception: {
    label: "Reception",
    date: "Saturday, 29 November 2026",
    time: "18.00 WITA",
    venue: "New Bambuden (Bambuden III), 2th Floor",
    address: "Jl. G. Latimojong No. 62, Makassar",
    mapsQuery: "?q=Bambuden+3+(New+Bambuden)",
  },
  photos: {
    loveStory: asset("Portrait-web.jpg"),
    desktop: asset("couple-cutout-web.jpg"),
    cover: asset("couple-cutout-web.jpg"),
    groom: asset("Groom-web.jpg"),
    bride: asset("Bride-web.jpg"),
    // Foto vertikal (2:3), 4 foto: kiri-kanan, lalu baris berikutnya. "" = placeholder sampai file ada.
    portraits: [asset("Gallery1-web.jpg"), asset("Gallery2-web.jpg"), asset(""), asset("")],
  },
};


