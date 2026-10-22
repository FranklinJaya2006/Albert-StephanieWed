import { BrowserRouter } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Onboarding from './pages/Onboarding'
import Rsvp from './pages/Rsvp'
import FlowerReveal from './components/FlowerReveal'
import { invitation } from './data/invitation'

function App() {
  const [opened, setOpened] = useState(false)
  const [blooming, setBlooming] = useState(false)
  const [scrollRequest, setScrollRequest] = useState(0)
  useEffect(() => {
    if (!blooming) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [blooming])
  useEffect(() => {
    if (!opened) return
    let scrollFrame = 0
    const frame = requestAnimationFrame(() => {
      scrollFrame = requestAnimationFrame(() => {
        const content = document.getElementById('invitation-content')
        if (content) window.scrollTo({
          top: window.scrollY + content.getBoundingClientRect().top,
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        })
      })
    })
    return () => { cancelAnimationFrame(frame); cancelAnimationFrame(scrollFrame) }
  }, [opened, scrollRequest])
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
          <Onboarding onOpen={() => {
            setOpened(true)
            setBlooming(true)
            setScrollRequest((value) => value + 1)
          }} />
          {opened && <Rsvp ready={!blooming} />}
          {blooming && <FlowerReveal onComplete={() => setBlooming(false)} />}
        </main>
      </div>
    </BrowserRouter>
  )
}
export default App
