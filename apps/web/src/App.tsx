import { BrowserRouter } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Onboarding from './pages/Onboarding'
import Rsvp from './pages/Rsvp'
import FlowerReveal from './components/FlowerReveal'
import { invitation } from './data/invitation'

function App() {
  const [opened, setOpened] = useState(false)
  const [blooming, setBlooming] = useState(false)
  useEffect(() => {
    if (!blooming) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [blooming])
  // Called once the opening backdrop fully covers the cover, so the jump to the invitation is
  // never seen: the page moves while hidden, then the backdrop fades out onto the invitation.
  // Also called when the animation ends: with reduced motion both finish in the same instant,
  // and a repeat jump is a no-op otherwise.
  const jumpToInvitation = () => {
    const content = document.getElementById('invitation-content')
    if (content) window.scrollTo({ top: window.scrollY + content.getBoundingClientRect().top, behavior: 'instant' })
  }
  return (
    <BrowserRouter>
      <div className="invitation-layout">
        <aside className="desktop-photo-panel" aria-label="Albert dan Stephanie">
          <div className="desktop-photo-image" style={{ backgroundImage: `url(${invitation.photos.desktop})` }} aria-hidden="true" />
          <div className="desktop-photo-copy">
            <p className="desktop-photo-eyebrow">The Wedding of</p>
            <h2 className="desktop-photo-names"><span>{invitation.coverNames.groom} &amp;</span><span>{invitation.coverNames.bride}</span></h2>
            <p className="desktop-photo-message">{invitation.desktopMessage}</p>
            <p className="desktop-photo-hashtag">{invitation.hashtag}</p>
          </div>
        </aside>
        <main className="invitation-page-panel">
          <Onboarding opening={blooming} onOpen={() => {
            setOpened(true)
            setBlooming(true)
          }} />
          {opened && <Rsvp ready={!blooming} />}
          {blooming && <FlowerReveal onCovered={jumpToInvitation} onComplete={() => { jumpToInvitation(); setBlooming(false) }} />}
        </main>
      </div>
    </BrowserRouter>
  )
}
export default App
