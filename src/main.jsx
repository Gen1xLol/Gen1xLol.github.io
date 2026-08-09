import React, { useEffect, useRef } from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import QA from './pages/QA.jsx'
import Gifs from './pages/Gifs.jsx'
import FontMaker from './pages/FontMaker.jsx'
import MyFont from './pages/MyFont.jsx'
import Man from './pages/Man.jsx'
import './index.css'

const MAN_KEY = 'man-page-access-unlocked'
const TIMES = 3
const MAN_UNLOCK_CHANCE = 1 / 50

function getHashPath() {
  return window.location.hash.replace(/^#/, '') || '/'
}

function getStoredManAccess() {
  if (typeof window === 'undefined') return false
  return window.sessionStorage.getItem(MAN_KEY) === 'true'
}

function setStoredManAccess(unlocked) {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(MAN_KEY, unlocked ? 'true' : 'false')
}

function BackForwardRedirectHandler() {
  const lastHashRef = useRef(getHashPath())
  const pairRef = useRef({ pageA: null, pageB: null, lastWasA: null, backAndForthCount: 0 })
  const isRedirectingRef = useRef(false)

  useEffect(() => {
    function handleHashChange() {
      const newHash = getHashPath()
      const prevHash = lastHashRef.current
      if (newHash === prevHash) return

      if (newHash === '/man') {
        if (!getStoredManAccess()) {
          isRedirectingRef.current = true
          window.location.hash = '#/'
          lastHashRef.current = '/'
          return
        }

        setStoredManAccess(false)
      }

      if (isRedirectingRef.current) {
        isRedirectingRef.current = false
      } else {
        const pair = pairRef.current

        if (newHash === '/man' || prevHash === '/man') {
          pair.pageA = null
          pair.pageB = null
          pair.lastWasA = null
          pair.backAndForthCount = 0
        } else if (!pair.pageA && !pair.pageB) {
          pair.pageA = prevHash
          pair.pageB = newHash
          pair.lastWasA = newHash === pair.pageA
          pair.backAndForthCount = 0
        } else if (newHash === pair.pageA || newHash === pair.pageB) {
          const isA = newHash === pair.pageA
          const didAlternate = pair.lastWasA === null ? true : isA !== pair.lastWasA

          if (didAlternate) {
            pair.lastWasA = isA
            pair.backAndForthCount += 1

            if (pair.backAndForthCount >= TIMES && Math.random() < MAN_UNLOCK_CHANCE) {
              setStoredManAccess(true)
              console.log("yes!")
              window.location.hash = '#/man'
              return
            } else {
              console.log("nope!")
            }
          } else {
            pair.pageA = prevHash
            pair.pageB = newHash
            pair.lastWasA = newHash === pair.pageA
            pair.backAndForthCount = 0
          }
        } else {
          pair.pageA = prevHash
          pair.pageB = newHash
          pair.lastWasA = newHash === pair.pageA
          pair.backAndForthCount = 0
        }
      }

      lastHashRef.current = newHash
    }

    window.addEventListener('hashchange', handleHashChange)
    handleHashChange()
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  return null
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <BackForwardRedirectHandler />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/q&a" element={<QA />} />
        <Route path="/88x31" element={<Gifs />} />
        <Route path="/fontmaker" element={<FontMaker />} />
        <Route path="/myfont" element={<MyFont />} />
        <Route path="/man" element={<Man />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>,
)