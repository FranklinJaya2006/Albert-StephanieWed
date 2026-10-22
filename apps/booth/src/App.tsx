import { useState } from "react";
import Admin from "./Admin";
import Booth from "./Booth";
import Welcome from "./Welcome";

function App() {
  const [username, setUsername] = useState<string | null>(null);

  if (window.location.pathname.startsWith("/admin")) return <Admin />;
  if (!username) return <Welcome onStart={setUsername} />;
  return <Booth username={username} onChangeName={() => setUsername(null)} />;
}

export default App;
