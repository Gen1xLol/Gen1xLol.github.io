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

function WheelScrollSmoother() {
  useEffect(() => {
    const scrollingElement = document.scrollingElement
    if (!scrollingElement) return

    let targetY = scrollingElement.scrollTop
    let frameId = null
    const originalScrollBehavior = scrollingElement.style.scrollBehavior
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    function canScrollWithinTarget(target, deltaY) {
      let node = target instanceof Element ? target : null
      while (node && node !== document.body && node !== document.documentElement) {
        const style = getComputedStyle(node)
        const scrollable = /(auto|scroll|overlay)/.test(style.overflowY)
        if (scrollable && node.scrollHeight > node.clientHeight) {
          const atTop = node.scrollTop <= 0
          const atBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 1
          if ((deltaY < 0 && !atTop) || (deltaY > 0 && !atBottom)) return true
        }
        node = node.parentElement
      }
      return false
    }

    function animate() {
      const currentY = scrollingElement.scrollTop
      const nextY = currentY + (targetY - currentY) * 0.38
      if (Math.abs(targetY - currentY) < 0.5) {
        scrollingElement.scrollTop = targetY
        frameId = null
        scrollingElement.style.scrollBehavior = originalScrollBehavior
        return
      }
      scrollingElement.scrollTop = nextY
      frameId = requestAnimationFrame(animate)
    }

    function handleWheel(event) {
      if (reduceMotion.matches || event.ctrlKey || event.metaKey || event.deltaX !== 0) return
      if (canScrollWithinTarget(event.target, event.deltaY)) return

      const scale = event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? window.innerHeight
          : 1
      const delta = event.deltaY * scale
      const maxY = Math.max(0, scrollingElement.scrollHeight - window.innerHeight)
      const nextTarget = Math.min(maxY, Math.max(0, (frameId === null ? scrollingElement.scrollTop : targetY) + delta))
      if (nextTarget === scrollingElement.scrollTop && frameId === null) return

      event.preventDefault()
      targetY = nextTarget
      if (frameId === null) {
        scrollingElement.style.scrollBehavior = 'auto'
        frameId = requestAnimationFrame(animate)
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      window.removeEventListener('wheel', handleWheel)
      if (frameId !== null) cancelAnimationFrame(frameId)
      scrollingElement.style.scrollBehavior = originalScrollBehavior
    }
  }, [])

  return null
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
      <WheelScrollSmoother />
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
