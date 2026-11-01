import Admin from "../../web/src/pages/Admin";

export default function App() {
  const invitationUrl = new URL("/invitation", window.location.origin);
  if (import.meta.env.DEV) {
    invitationUrl.port = "5173";
    invitationUrl.pathname = "/";
  }
  return <Admin invitationUrl={invitationUrl.href} />;
}
