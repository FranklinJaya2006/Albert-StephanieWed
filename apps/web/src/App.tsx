import { BrowserRouter } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import Onboarding from './pages/Onboarding'
import Rsvp from './pages/Rsvp'
import MusicToggle from './components/MusicToggle'
import FlowerReveal from './components/FlowerReveal'
import { invitation } from './data/invitation'

function App() {
  const [opened, setOpened] = useState(false)
  const [blooming, setBlooming] = useState(false)
  const [finished, setFinished] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  // The invitation is built (hidden) shortly after the cover appears, with its photos fetched, so
  // none of that work lands in the middle of the opening animation.
  const [mounted, setMounted] = useState(false)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => {
      setMounted(true)
      const { groom, bride, loveStory, portraits } = invitation.photos
      for (const src of [groom, bride, loveStory, ...portraits]) {
        if (src) new Image().src = src
      }
    }, 300)
    return () => window.clearTimeout(id)
  }, [])
  useEffect(() => {
    if (!blooming) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [blooming])
  const jumpToInvitation = () => {
    const content = document.getElementById('invitation-content')
    if (content) window.scrollTo({ top: window.scrollY + content.getBoundingClientRect().top, behavior: 'instant' })
  }
  // Called once the opening backdrop fully covers the cover: the invitation is laid out and the
  // page jumps to it while nobody can see, then the backdrop fades out onto it. Also called when
  // the animation ends: with reduced motion both finish in the same instant; otherwise a repeat
  // is a no-op.
  const reveal = () => {
    flushSync(() => setShown(true))
    jumpToInvitation()
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
          <Onboarding opened={opened} onOpen={() => {
            // Pressing the button is the tap that lets the browser start the song.
            void audioRef.current?.play().catch(() => {})
            setOpened(true)
            setBlooming(true)
          }} />
          {(mounted || opened) && <Rsvp shown={shown} ready={!blooming} />}
          {mounted && !finished && <FlowerReveal active={blooming} onCovered={reveal} onComplete={() => { reveal(); setBlooming(false); setFinished(true) }} />}
          {invitation.music && (
            <>
              <audio ref={audioRef} src={invitation.music} loop preload="auto" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
              {opened && <MusicToggle playing={playing} onToggle={() => { const a = audioRef.current; if (a) void (a.paused ? a.play().catch(() => {}) : a.pause()) }} />}
            </>
          )}
        </main>
      </div>
    </BrowserRouter>
  )
}
export default App
