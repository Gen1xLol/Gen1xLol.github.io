import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ExternalIcon from '../components/ExternalIcon.jsx'
import MouseTooltip from '../components/MouseTooltip.jsx'
import argentinaFlag from '../argentina.png'
import THOUGHTS from '../thoughts.js'
import '../home.css'

function calcAge() {
  const birth = new Date(Date.UTC(2010, 2, 16, 15, 27, 0))
  const now = new Date()
  let y = now.getUTCFullYear() - birth.getUTCFullYear()
  const m = now.getUTCMonth() - birth.getUTCMonth()
  if (m < 0 || (m === 0 && now.getUTCDate() < birth.getUTCDate())) y--
  return y
}

function ThoughtBubble({ text }) {
  const containerRef = useRef(null)
  const [circles, setCircles] = useState([])
  const [tailDots, setTailDots] = useState([])
  const [size, setSize] = useState({ width: 0, height: 0 })

  const isShake = typeof text === 'string' && text.startsWith('[shake]')
  const cleanText = isShake ? text.replace(/^\[shake\]\s*/, '') : text

  useEffect(() => {
    if (!containerRef.current) return

    function calculateLobes() {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const width = rect.width
      const height = rect.height

      if (width === 0 || height === 0) return

      setSize({ width, height })

      const newCircles = []

      const cap = Math.min(width, height) / 2
      const straightW = Math.max(0, width - height)

      const topLen = straightW
      const rightArcLen = Math.PI * cap
      const bottomLen = straightW
      const leftArcLen = Math.PI * cap
      const perimeter = topLen + rightArcLen + bottomLen + leftArcLen

      const count = Math.max(14, Math.ceil(perimeter / 9))

      for (let i = 0; i < count; i++) {
        const d = (i / count) * perimeter
        let x, y, nx, ny

        if (d < topLen) {
          x = cap + d
          y = 0
          nx = 0; ny = -1
        } else if (d < topLen + rightArcLen) {
          const a = (d - topLen) / cap - Math.PI / 2
          x = width - cap + cap * Math.cos(a)
          y = cap + cap * Math.sin(a)
          nx = Math.cos(a); ny = Math.sin(a)
        } else if (d < topLen + rightArcLen + bottomLen) {
          const t = d - topLen - rightArcLen
          x = width - cap - t
          y = height
          nx = 0; ny = 1
        } else {
          const t = d - topLen - rightArcLen - bottomLen
          const a = t / cap + Math.PI / 2
          x = cap + cap * Math.cos(a)
          y = cap + cap * Math.sin(a)
          nx = Math.cos(a); ny = Math.sin(a)
        }

        const rBase = Math.max(9, cap * 0.46)
        const r = rBase + Math.random() * rBase * 0.5
        const inset = rBase * 0.2
        const delay = Math.random() * 3
        newCircles.push({ x: x - nx * inset, y: y - ny * inset, r: r * 1.3, coreR: r * 1.15, delay })
      }

      setCircles(newCircles)

      const midY = height / 2
      const bigR = Math.max(8, cap * 0.5)
      const baseInset = Math.max(4, Math.min(width, height) * 0.14)
      const bigOverlap = bigR * 0.55 + baseInset
      setTailDots([
        { x: -(bigR - bigOverlap) - bigR, y: midY, r: bigR, coreR: bigR * 0.85, delay: 0.1, big: true },
        { x: -34 + baseInset * 0.6, y: midY, r: 6.5, coreR: 5.5, delay: 0.3 },
        { x: -50 + baseInset * 0.6, y: midY, r: 5, coreR: 4.2, delay: 0.5 },
      ])
    }

    calculateLobes()

    const ro = new ResizeObserver(() => calculateLobes())
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [text])

  return (
    <div className="thought-bubble-wrapper fade-in" style={{ animationDelay: '0.6s' }}>
      <div className="thought-bubble-procedural" ref={containerRef}>
        {size.width > 0 && (
          <svg
            className="cloud-gradient-svg"
            width={size.width + 40}
            height={size.height + 40}
            viewBox={`${-20} ${-20} ${size.width + 40} ${size.height + 40}`}
          >
            <defs>
              <linearGradient id="cloudFill" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#4c2f8c" />
                <stop offset="45%" stopColor="#2f1c5e" />
                <stop offset="100%" stopColor="#170f33" />
              </linearGradient>
              <mask id="cloudMask" maskUnits="userSpaceOnUse" x={-70} y={-70} width={size.width + 140} height={size.height + 140}>
                <rect
                  x={Math.max(4, Math.min(size.width, size.height) * 0.14)}
                  y={Math.max(4, Math.min(size.width, size.height) * 0.14)}
                  width={Math.max(0, size.width - Math.max(4, Math.min(size.width, size.height) * 0.14) * 2)}
                  height={Math.max(0, size.height - Math.max(4, Math.min(size.width, size.height) * 0.14) * 2)}
                  rx="9999" ry="9999"
                  fill="white"
                />
                {circles.map((c, i) => (
                  <circle key={`lobe-core-${i}`} cx={c.x} cy={c.y} r={c.coreR} fill="white" />
                ))}
                {circles.map((c, i) => (
                  <circle key={`lobe-${i}`} className="cloud-mask-lobe" cx={c.x} cy={c.y} r={c.r} fill="white"
                    style={{ animationDelay: `${c.delay}s` }} />
                ))}
                {tailDots.map((d, i) => (
                  <circle key={`dot-core-${i}`} cx={d.x} cy={d.y} r={d.coreR} fill="white" />
                ))}
                {tailDots.map((d, i) => (
                  <circle
                    key={`dot-${i}`}
                    className={`cloud-mask-dot${d.big ? ' cloud-mask-dot-big' : ''}`}
                    cx={d.x} cy={d.y} r={d.r} fill="white"
                    style={{ animationDelay: `${d.delay}s`, transformOrigin: d.big ? `${d.x + d.r}px ${d.y}px` : undefined }}
                  />
                ))}
              </mask>
            </defs>
            <rect
              x={-70} y={-70}
              width={size.width + 140}
              height={size.height + 140}
              fill="url(#cloudFill)"
              mask="url(#cloudMask)"
            />
          </svg>
        )}

        <span className="thought-text">
          {isShake
            ? cleanText.split('').map((char, i) => (
                <span
                  key={i}
                  className="shake-char"
                  style={{
                    animationDelay: `${-((i * 0.11) % 0.3)}s`,
                    animationDuration: `${0.26 + ((i % 4) * 0.04)}s`
                  }}
                >
                  {char === ' ' ? '\u00A0' : char}
                </span>
              ))
            : text}
        </span>
      </div>
    </div>
  )
}

export default function Home() {
  const [age, setAge] = useState('—')
  const [projects, setProjects] = useState([])
  const [thought] = useState(() => THOUGHTS[Math.floor(Math.random() * THOUGHTS.length)])
  const spanishTipRef = useRef(null)

  useEffect(() => {
    setAge(calcAge())

    fetch('/projects.json')
      .then(r => r.json())
      .then(data => setProjects(data))
      .catch(() => setProjects(null))
  }, [])

  function handleSpanishTipClick() {
    alert('Translation:\nget me out of latin america')
  }

  function scrollToSection(e, id) {
    e.preventDefault()
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <>
      <header>
        <div className="header-inner">
          <a className="site-name" href="#">gen1x</a>
          <nav>
            <Link to="/88x31">88x31</Link>
			<a href="https://gen1xlol.github.io/Jarona-TTS" target="_blank" rel="noopener">Jarona TTS</a>
			<Link to="/fontmaker">Draw-A-Font</Link>
			<Link to="/myfont">My Font</Link>
          </nav>
        </div>
      </header>

      <main>
        <div className="intro">
          <p className="intro-label">hey, i'm</p>
          <div className="title-with-thought">
            <h1 className="fade-in" style={{ animationDelay: '0.6s' }}>
              <span className="float-char" style={{ animationDelay: '0s' }}>G</span>
              <span className="float-char" style={{ animationDelay: '0.15s' }}>e</span>
              <span className="float-char" style={{ animationDelay: '0.3s' }}>n</span>
              <em className="float-char" style={{ animationDelay: '0.45s' }}>1</em>
              <em className="float-char" style={{ animationDelay: '0.6s' }}>x</em>
            </h1>
            <ThoughtBubble text={thought} />
          </div>
          <div className="fade-in" style={{ animationDelay: '1.4s' }}>
            <p className="prev">also known as <span>G1nX</span></p>
            <div className="age-line">
              <span className="age-num" id="age-display">{age}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                years old from <img src={argentinaFlag} alt="Argentina" style={{ width: '24px', height: '24px', objectFit: 'contain', verticalAlign: 'middle' }} />
              </span>
            </div>
          </div>
        </div>

        <div id="about" className="section fade-in" style={{ animationDelay: '1.7s' }}>
          <p className="section-title">about</p>
          <p>
            Hiya! I'm a guy from Argentina who really loves programming.
            I dedicate my free time to either doing nothing, or working on cool things.
            What are those "cool things"? Well, it depends.
            <br /><br />
            I like creating PenguinMod extensions that people find useful. It feels like a fair test of my abilities as a programmer.
            Some notable ones are <strong style={{ color: 'var(--text)', fontWeight: 500 }}>Beat Sync</strong> and <strong style={{ color: 'var(--text)', fontWeight: 500 }}>Lighting</strong>.
            I'm listed as <span>G1nX</span> on the PenguinMod Extra Gallery.
            <br /><br />
            I really like the challenging parts in programming. I like looking at things from different angles, trying to piece things together. I hope this doesn't sound pretentious lol
            <br /><br />
            I also like playing videogames from time to time. I'm REALLY into UNDERTALE and DELTARUNE :D
            <br /><br />
            I like to dabble into a LOT of different territories. I even made a font based off my handwriting! You can check it out <Link to="myfont">here</Link>.
            <br />
            I'm also a "writer" <small style={{ color: 'var(--soft)' }}>(I don't have much experience...)</small>
            <br />Here's <a href="https://bit.ly/4vrdkiM" target="_blank" rel="noopener">my poetry collection</a> if you want to see what I've written so far.
          </p>
        </div>

        <div className="section fade-in" style={{ animationDelay: '2.0s' }}>
          <p className="section-title">identity</p>
          <p className="card-body">
            I was born in Argentina (<span className="spanish-tip" ref={spanishTipRef} onClick={handleSpanishTipClick}>sáquenme de latinoamérica</span>). I'm bisexual and have Autism and ADHD.
            <br />
            I can speak Spanish (natively) and English (fluently-ish...?) and I write in my free time.
            <br />
            My timezone is UTC-3.
          </p>
        </div>

        <div className="section fade-in" style={{ animationDelay: '2.15s' }}>
          <p className="section-title">people</p>
          <p className="card-body">
            Also, I LOVE meeting new people!! If you wanna talk to me, just add me at <span><a href="https://discord.com/users/1264445751723823245" target="_blank" rel="noopener">gen1x_loll</a></span> on Discord! I don't bite :D
            <br />
            I'm taken and I have <a href="https://x.com/WinkMouse350" target="_blank" rel="noopener">the best boyfriend ever</a> {"<3"}
            <br />
            Also, special thanks to my friend doodles for the "imsogay.me" subdomain :D
          </p>
        </div>

        <div id="projects" className="section fade-in" style={{ animationDelay: '2.3s' }}>
          <p className="section-title">projects</p>
          <div className="projects-wrapper">

            <div className="project-link-row">
              <a className="project-link-chip" href="https://extensions.penguinmod.com/" target="_blank" rel="noopener">
                <ExternalIcon />
                PenguinMod Extra Gallery
              </a>
              <a className="project-link-chip" href="https://wiki.penguinmod.com/" target="_blank" rel="noopener">
                <ExternalIcon />
                PenguinMod Wiki
              </a>
              <a className="project-link-chip" href="https://antimony.cc/" target="_blank" rel="noopener">
                <ExternalIcon />
                Antimony
              </a>
            </div>

            <div className="ext-grid" id="ext-grid" style={projects === null ? { display: 'none' } : undefined}>
              {projects && projects.map((p, i) => (
                <div className="ext-card" key={i}>
                  <img
                    src={p.image}
                    alt={p.name}
                    loading="lazy"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                  <div className="ext-overlay">
                    <div className="ext-name">{p.name}</div>
                    <div className="ext-desc">{p.description}</div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

        <div className="section fade-in" style={{ animationDelay: '2.5s' }}>
          <p className="section-title">links</p>
          <div className="project-link-row">
            <Link className="project-link-chip" to="/q&a">
              Check out my totally real FAQ!
            </Link>
            <Link className="project-link-chip" to="/88x31">
              Browse my 88x31 GIF collection!
            </Link>
            <a className="project-link-chip" href="https://gen1xlol.github.io/Jarona-TTS" target="_blank" rel="noopener">
              <ExternalIcon />
              Try Jarona TTS! <small style={{ color: 'var(--soft)', marginLeft: '2px' }}>(slight DELTARUNE spoilers...)</small>
            </a>
            <Link className="project-link-chip" to="/fontmaker">
              Draw your own font in Draw-A-Font!
            </Link>
          </div>
        </div>
      </main>

      <footer className="fade-in" style={{ animationDelay: '2.6s', maxWidth: '680px', marginLeft: 'auto', marginRight: 'auto', paddingLeft: '28px', paddingRight: '28px' }}>
        <span>gen1x</span>
        <span id="footer-year">{new Date().getFullYear()}</span>
      </footer>

      <MouseTooltip targetRef={spanishTipRef} text="get me out of latin america" />
    </>
  )
}