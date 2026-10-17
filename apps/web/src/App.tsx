import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Gallery from './pages/Gallery'
import Onboarding from './pages/Onboarding'
import Rsvp from './pages/Rsvp'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Onboarding />} />
        <Route path="/rsvp" element={<Rsvp />} />
        <Route path="/gallery" element={<Gallery />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
