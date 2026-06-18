import HandTracker from './components/HandTracker'
import { Analytics } from '@vercel/analytics/react'

function App() {
  return (
    <>
      <HandTracker />
      <Analytics />
    </>
  )
}

export default App
