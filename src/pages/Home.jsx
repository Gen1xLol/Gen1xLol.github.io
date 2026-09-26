import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import MouseTooltip from '../components/MouseTooltip.jsx'
import SocialOrbit from '../components/SocialOrbit.jsx'
import argentinaFlag from '../argentina.png'
import { THOUGHTS, shuffleThoughts} from '../thoughts.js'
import '../home.css'

import { calcAge, ThoughtBubble } from '../components/ThoughtBubble.jsx'

export default function Home() {
  const [age, setAge] = useState('—')
  const [projects, setProjects] = useState([])
  const [projectPage, setProjectPage] = useState(1)
  const [thoughtIndex, setThoughtIndex] = useState(() => Math.floor(Math.random() * THOUGHTS.length))
  const [bubbleShapeSeed, setBubbleShapeSeed] = useState(0)
  const spanishTipRef = useRef(null)
  const projectsPerPage = 3
  const projectPageCount = Math.max(1, Math.ceil((projects?.length || 0) / projectsPerPage))
  const visibleProjects = projects?.slice((projectPage - 1) * projectsPerPage, projectPage * projectsPerPage) || []
  var thought = THOUGHTS[thoughtIndex]
  var rnd = Math.floor(Math.random() * 10000)
  thought = thought.replace(/\[rnd\]/g, rnd)

  function cycleThought() {
    shuffleThoughts();
    setBubbleShapeSeed(prev => prev + 1)
    setThoughtIndex(prev => {
      if (THOUGHTS.length <= 1) return prev
      let next = Math.floor(Math.random() * THOUGHTS.length)
      while (next === prev) next = Math.floor(Math.random() * THOUGHTS.length)
      return next
    })
  }

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
          <div className="intro-copy">
          <p className="intro-label">hey, i'm</p>
          <div className="title-with-thought">
            <h1 className="fade-in" style={{ animationDelay: '0.6s' }}>
              <span className="float-char" style={{ animationDelay: '0s' }}>G</span>
              <span className="float-char" style={{ animationDelay: '0.15s' }}>e</span>
              <span className="float-char" style={{ animationDelay: '0.3s' }}>n</span>
              <em className="float-char" style={{ animationDelay: '0.45s' }}>1</em>
              <em className="float-char" style={{ animationDelay: '0.6s' }}>x</em>
            </h1>
            <ThoughtBubble text={thought} onClick={cycleThought} shapeSeed={bubbleShapeSeed} />
          </div>
          <div className="fade-in" style={{ animationDelay: '1.4s' }}>
            <br />
            <p className="prev">AKA: <span><a href="https://github.com/Gen1xLol" target="_blank" rel="noopener">Gen1xLol</a></span> / <span>YoSoyGena</span> / <span>G1nX</span> (very ocasionally)</p>
			<div className="age-line">
              <span className="age-num" id="age-display">{age}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                years old from <img src={argentinaFlag} alt="Argentina" style={{ width: '24px', height: '24px', objectFit: 'contain', verticalAlign: 'middle' }} /> <p style={{ color: 'var(--soft)' }}>(he/him)</p>
              </span>
            </div>
          </div>
          </div>
          <SocialOrbit />
        </div>

        <div className="home-card-stack home-about-stack">
        <div id="about" className="section fade-in" style={{ animationDelay: '1.7s' }}>
          <p className="section-title">about</p>
          <p>
            Hiya! I'm a guy from Argentina who really loves programming.
            I dedicate my free time to either doing nothing, or working on cool things.
            What are those "cool things"? Well, it depends.
            <br /><br />
            I like creating PenguinMod extensions that people find useful. It feels like a fair test of my abilities as a programmer.
            Some notable ones are <strong style={{ color: 'var(--text)', fontWeight: 500 }}>Beat Sync</strong> and <strong style={{ color: 'var(--text)', fontWeight: 500 }}>Lighting</strong>.
            Also, if you use something of mine for, say, a game, you can let me know if you want! I genuinely love seeing people use my work :D
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
        </div>

        <div id="links" className="section fade-in" style={{ animationDelay: '2.5s' }}>
          <p className="section-title">links</p>
          <div className="project-link-row">
            <Link className="project-link-chip" to="/q&a">
              Check out my totally real FAQ!
            </Link>
            <Link className="project-link-chip" to="/88x31">
              Browse my 88x31 GIF collection!
            </Link>
            <a className="project-link-chip" href="https://gen1xlol.github.io/Jarona-TTS" target="_blank" rel="noopener">
              <ExternalLink size={16} />
              Try Jarona TTS! <small style={{ color: 'var(--soft)', marginLeft: '2px' }}>(slight DELTARUNE spoilers...)</small>
            </a>
            <Link className="project-link-chip" to="/fontmaker">
              Draw your own font in Draw-A-Font!
            </Link>
          </div>
        </div>

        <div className="home-card-stack home-project-stack">
        <div id="projects" className="section fade-in" style={{ animationDelay: '2.3s' }}>
          <p className="section-title">projects</p>
          <div className="projects-wrapper">

            <div className="project-link-row">
              <a className="project-link-chip" href="https://extensions.penguinmod.com/" target="_blank" rel="noopener">
                <ExternalLink size={16} />
                PenguinMod Extra Gallery
              </a>
              <a className="project-link-chip" href="https://wiki.penguinmod.com/" target="_blank" rel="noopener">
                <ExternalLink size={16} />
                PenguinMod Wiki
              </a>
              <a className="project-link-chip" href="https://antimony.cc/" target="_blank" rel="noopener">
                <ExternalLink size={16} />
                Antimony
              </a>
			  <a className="project-link-chip" href="https://penguinmod-wiki.github.io/penguinblocks/" target="_blank" rel="noopener">
                <ExternalLink size={16} />
                PenguinBlocks
              </a>
            </div>

            {projects?.length > 0 && (
              <nav className="project-pagination" aria-label="Project pages">
                <button type="button" aria-label="Previous project page" disabled={projectPage === 1} onClick={() => setProjectPage(page => Math.max(1, page - 1))}>
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>
                <span aria-live="polite">{projectPage} / {projectPageCount}</span>
                <button type="button" aria-label="Next project page" disabled={projectPage === projectPageCount} onClick={() => setProjectPage(page => Math.min(projectPageCount, page + 1))}>
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </nav>
            )}

            <div className="ext-grid" id="ext-grid" style={projects === null ? { display: 'none' } : undefined}>
              {visibleProjects.map(p => (
                <div className="ext-card" key={p.image || p.name}>
                  <img
                    src={p.image}
                    alt={p.name}
                    loading="eager"
                    decoding="async"
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
