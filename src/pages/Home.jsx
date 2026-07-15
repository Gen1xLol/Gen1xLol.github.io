import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ExternalIcon from '../components/ExternalIcon.jsx'
import MouseTooltip from '../components/MouseTooltip.jsx'
import argentinaFlag from '../argentina.png'

function calcAge() {
  const birth = new Date(Date.UTC(2010, 2, 16, 15, 27, 0))
  const now = new Date()
  let y = now.getUTCFullYear() - birth.getUTCFullYear()
  const m = now.getUTCMonth() - birth.getUTCMonth()
  if (m < 0 || (m === 0 && now.getUTCDate() < birth.getUTCDate())) y--
  return y
}

export default function Home() {
  const [age, setAge] = useState('—')
  const [projects, setProjects] = useState([])
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
            <a href="#about" onClick={(e) => scrollToSection(e, 'about')}>about</a>
            <a href="#projects" onClick={(e) => scrollToSection(e, 'projects')}>projects</a>
          </nav>
        </div>
      </header>

      <main>
        <div className="intro">
          <p className="intro-label">hey, i'm</p>
          <h1 className="fade-in" style={{ animationDelay: '0.6s' }}>
            <span className="float-char" style={{ animationDelay: '0s' }}>G</span>
            <span className="float-char" style={{ animationDelay: '0.15s' }}>e</span>
            <span className="float-char" style={{ animationDelay: '0.3s' }}>n</span>
            <em className="float-char" style={{ animationDelay: '0.45s' }}>1</em>
            <em className="float-char" style={{ animationDelay: '0.6s' }}>x</em>
          </h1>
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
            <br />
            I like creating PenguinMod extensions that people find useful. It feels like a fair test of my abilities as a programmer.
            Some notable ones are <strong style={{ color: 'var(--text)', fontWeight: 500 }}>Beat Sync</strong> and <strong style={{ color: 'var(--text)', fontWeight: 500 }}>Lighting</strong>.
            I'm listed as <span>G1nX</span> on the PenguinMod Extra Gallery.
            <br /><br />
            I really like the challenging parts in programming. I like looking at things from different angles, trying to piece things together. I hope this doesn't sound pretentious lol
            <br /><br />
            I'm also a "writer" <small style={{ color: 'var(--soft)' }}>(I don't have much experience...)</small>
            <br />Here's <a href="https://bit.ly/4vrdkiM" target="_blank" rel="noopener">my poetry collection</a> if you want to see what I've written so far.
            <br /><br />
            Also, I LOVE meeting new people!! If you wanna talk to me, just add me at <span><a href="https://discord.com/users/1264445751723823245" target="_blank" rel="noopener">gen1x_loll</a></span> on Discord! I don't bite :D
            <br /><br />
            <Link to="/q&a.html">Check out my totally real FAQ!</Link>
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
      </main>

      <footer className="fade-in" style={{ animationDelay: '2.6s', maxWidth: '680px', marginLeft: 'auto', marginRight: 'auto', paddingLeft: '28px', paddingRight: '28px' }}>
        <span>gen1x</span>
        <span id="footer-year">{new Date().getFullYear()}</span>
      </footer>

      <MouseTooltip targetRef={spanishTipRef} text="get me out of latin america" />
    </>
  )
}
