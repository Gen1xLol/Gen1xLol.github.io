import { useEffect, useRef, useState } from 'react'

const OFFSET_X = 14
const OFFSET_Y = -36
const LERP = 0.12

function lerp(a, b, t) {
  return a + (b - a) * t
}

export default function MouseTooltip({ targetRef, text }) {
  const tipRef = useRef(null)
  const [opacity, setOpacity] = useState(0)
  const mouse = useRef({ x: 0, y: 0 })
  const cur = useRef({ x: 0, y: 0 })
  const visible = useRef(false)
  const rafId = useRef(null)

  useEffect(() => {
    function animate() {
      cur.current.x = lerp(cur.current.x, mouse.current.x, LERP)
      cur.current.y = lerp(cur.current.y, mouse.current.y, LERP)
      if (tipRef.current) {
        tipRef.current.style.transform = `translate(${cur.current.x + OFFSET_X}px, ${cur.current.y + OFFSET_Y}px)`
      }
      if (visible.current) rafId.current = requestAnimationFrame(animate)
    }

    function onMouseMove(e) {
      mouse.current.x = e.clientX
      mouse.current.y = e.clientY
    }

    function onEnter(e) {
      mouse.current.x = e.clientX
      mouse.current.y = e.clientY
      cur.current.x = mouse.current.x
      cur.current.y = mouse.current.y
      visible.current = true
      setOpacity(1)
      rafId.current = requestAnimationFrame(animate)
    }

    function onLeave() {
      visible.current = false
      setOpacity(0)
      cancelAnimationFrame(rafId.current)
    }

    document.addEventListener('mousemove', onMouseMove)
    const el = targetRef.current
    el?.addEventListener('mouseenter', onEnter)
    el?.addEventListener('mouseleave', onLeave)

    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      el?.removeEventListener('mouseenter', onEnter)
      el?.removeEventListener('mouseleave', onLeave)
      cancelAnimationFrame(rafId.current)
    }
  }, [targetRef])

  return (
    <div
      id="mouse-tooltip"
      ref={tipRef}
      style={{ opacity }}
    >
      {text}
    </div>
  )
}
