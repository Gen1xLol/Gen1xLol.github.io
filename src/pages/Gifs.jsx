import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'

const PAGE_SIZE = 100

function levenshteinDistance(s1, s2) {
  const len1 = s1.length
  const len2 = s2.length
  if (len1 === 0) return len2
  if (len2 === 0) return len1
  let row = Array(len2 + 1).fill(0).map((_, i) => i)
  for (let i = 1; i <= len1; i++) {
    let prev = i
    for (let j = 1; j <= len2; j++) {
      let val
      if (s1[i - 1] === s2[j - 1]) {
        val = row[j - 1]
      } else {
        val = Math.min(row[j - 1] + 1, prev + 1, row[j] + 1)
      }
      row[j - 1] = prev
      prev = val
    }
    row[len2] = prev
  }
  return row[len2]
}

function getSearchMatch(item, cleanQuery, queryWords) {
  if (!cleanQuery) return { match: true, score: 1 }

  if (item.cleanText === cleanQuery) return { match: true, score: 200 }
  if (item.cleanFilename === cleanQuery) return { match: true, score: 180 }

  if (item.cleanText.includes(cleanQuery)) {
    return { match: true, score: 100 + (cleanQuery.length / (item.cleanText.length || 1)) }
  }
  if (item.cleanFilename.includes(cleanQuery)) {
    return { match: true, score: 90 + (cleanQuery.length / (item.cleanFilename.length || 1)) }
  }

  let totalScore = 0
  let matchesCount = 0
  for (const qWord of queryWords) {
    let bestWordScore = 0
    for (const tWord of item.words) {
      if (tWord.includes(qWord)) {
        const score = qWord.length / tWord.length
        if (score > bestWordScore) bestWordScore = score
      } else {
        const dist = levenshteinDistance(qWord, tWord)
        const maxLen = Math.max(qWord.length, tWord.length)
        const allowedTypos = qWord.length <= 4 ? 1 : 2
        if (dist <= allowedTypos) {
          const score = ((maxLen - dist) / maxLen) * 0.8
          if (score > bestWordScore) bestWordScore = score
        }
      }
    }
    if (bestWordScore > 0.25) {
      totalScore += bestWordScore
      matchesCount++
    }
  }
  if (matchesCount === queryWords.length) return { match: true, score: totalScore }

  let subsequenceIdx = 0
  let subsequenceMatches = 0
  const combined = item.cleanText + ' ' + item.cleanFilename
  for (let i = 0; i < cleanQuery.length; i++) {
    const char = cleanQuery[i]
    const foundIdx = combined.indexOf(char, subsequenceIdx)
    if (foundIdx !== -1) {
      subsequenceMatches++
      subsequenceIdx = foundIdx + 1
    }
  }
  if (subsequenceMatches === cleanQuery.length && cleanQuery.length > 2) {
    return { match: true, score: 5 + (subsequenceMatches / combined.length) }
  }

  return { match: false, score: 0 }
}

function Pagination({ page, totalPages, onPage }) {
  const [jumpingSlot, setJumpingSlot] = useState(null)
  const [jumpValue, setJumpValue] = useState('')

  if (totalPages <= 1) return null

  const getPages = () => {
    const pages = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
      return pages
    }
    pages.push(1)
    if (page > 3) pages.push('ellipsis-left')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i)
    }
    if (page < totalPages - 2) pages.push('ellipsis-right')
    pages.push(totalPages)
    return pages
  }

  const commitJump = () => {
    const n = parseInt(jumpValue, 10)
    if (!isNaN(n) && n >= 1 && n <= totalPages) onPage(n)
    setJumpingSlot(null)
    setJumpValue('')
  }

  const handleJumpKey = (e) => {
    if (e.key === 'Enter') commitJump()
    if (e.key === 'Escape') {
      setJumpingSlot(null)
      setJumpValue('')
    }
  }

  return (
    <div className="gif-pagination">
      <button
        className="gif-page-btn"
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
      >
        ←
      </button>
      {getPages().map((p, i) => {
        if (p === 'ellipsis-left' || p === 'ellipsis-right') {
          return jumpingSlot === p
            ? (
              <input
                key={p}
                className="gif-page-jump-input"
                type="number"
                min={1}
                max={totalPages}
                autoFocus
                value={jumpValue}
                onChange={e => setJumpValue(e.target.value)}
                onKeyDown={handleJumpKey}
                onBlur={commitJump}
              />
            )
            : (
              <button
                key={p}
                className="gif-page-ellipsis-btn"
                title="Click to jump to a page"
                onClick={() => { setJumpingSlot(p); setJumpValue('') }}
              >
                …
              </button>
            )
        }
        return (
          <button
            key={p}
            className={`gif-page-btn${p === page ? ' gif-page-btn--active' : ''}`}
            onClick={() => onPage(p)}
          >
            {p}
          </button>
        )
      })}
      <button
        className="gif-page-btn"
        onClick={() => onPage(page + 1)}
        disabled={page === totalPages}
      >
        →
      </button>
    </div>
  )
}

export default function Gifs() {
  const [allGifs, setAllGifs] = useState([])
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [copiedId, setCopiedId] = useState(null)

  useEffect(() => {
    fetch('/index.json')
      .then(res => res.json())
      .then(data => {
        const list = Object.values(data).map(item => {
          const text = item.text || ''
          const filename = item.filename || ''
          const cleanText = text.toLowerCase()
          const cleanFilename = filename.toLowerCase()
          const words = (cleanText + ' ' + cleanFilename)
            .split(/[^a-z0-9]+/)
            .filter(Boolean)
          return { ...item, cleanText, cleanFilename, words }
        })
        setAllGifs(list)
      })
      .catch(err => console.error(err))
  }, [])

  const filteredGifs = useMemo(() => {
    if (!query.trim()) return allGifs
    const cleanQuery = query.toLowerCase().trim()
    const queryWords = cleanQuery.split(/\s+/).filter(Boolean)
    return allGifs
      .map(item => {
        const { match, score } = getSearchMatch(item, cleanQuery, queryWords)
        return { item, match, score }
      })
      .filter(res => res.match)
      .sort((a, b) => b.score - a.score)
      .map(res => res.item)
  }, [allGifs, query])

  const totalPages = Math.max(1, Math.ceil(filteredGifs.length / PAGE_SIZE))

  const displayedGifs = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredGifs.slice(start, start + PAGE_SIZE)
  }, [filteredGifs, page])

  useEffect(() => {
    setPage(1)
  }, [query])

  const handlePage = (p) => {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCopy = (item) => {
    const htmlCode = `<a href="https://gen1xlol.github.io" target="_blank"><img src="https://gen1xlol.github.io/gifs/${encodeURIComponent(item.filename)}" alt="${(item.text || '').replace(/"/g, '&quot;')}" width="88" height="31" /></a>`
    navigator.clipboard.writeText(htmlCode).then(() => {
      setCopiedId(item.filename)
      setTimeout(() => setCopiedId(null), 1500)
    })
  }

  const start = (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, filteredGifs.length)

  return (
    <>
      <div className="gif-page-header">
        <div className="gif-page-header-inner">
          <Link to="/" className="gif-back-link">← back</Link>
          <div className="gif-page-title-group">
            <span className="gif-page-title">88x31 Gallery</span>
            <span className="gif-page-subtitle">{allGifs.length > 0 ? `${allGifs.length} buttons` : 'loading...'}</span>
          </div>
        </div>
      </div>

      <div className="gif-sticky-bar">
        <div className="gif-sticky-bar-inner">
          <input
            type="text"
            className="gif-search-input"
            placeholder="Search buttons by their text..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <span className="gif-results-count">
            {filteredGifs.length > 0
              ? <>{start}-{end} <span className="gif-results-of">of</span> {filteredGifs.length}</>
              : 'no results'}
          </span>
        </div>
      </div>

      <main className="gif-main">
        <div className="gif-warning">
          I haven't checked each of the 6497 GIF files myself, so there might be mistakes in the text!
		  <br />
		  Also, click on an individual button to copy its HTML embed code.
        </div>

        <Pagination page={page} totalPages={totalPages} onPage={handlePage} />

        <div className="gif-grid">
          {displayedGifs.map((item, i) => (
            <div
              className="gif-card"
              key={i}
              onClick={() => handleCopy(item)}
              title="Click to copy HTML embed code"
            >
              <div className="gif-img-container">
                <img
                  src={`/gifs/${encodeURIComponent(item.filename)}`}
                  alt={item.text || '88x31 button'}
                  loading="lazy"
                />
              </div>
              <div className="gif-card-text">
                {item.text || <span className="no-ocr-text">no text</span>}
              </div>
              {copiedId === item.filename && (
                <div className="gif-copied-overlay">
                  <span>Copied!</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <Pagination page={page} totalPages={totalPages} onPage={handlePage} />

        <details className="gif-about-section">
          <summary className="gif-about-summary">About this project</summary>
          <div className="gif-about-body">
            <p>
              The reason I have decided to randomly pour around 5 hours of my time into this silly project is because one day I was bored, looking through a friend's website, when I noticed something that said "88x31" on it. Me, being curious, I naturally did some Google-Fu to find out what it was.
            </p>
            <p>
              88x31 is basically what it says right on the tin: images, usually GIFs, that are exactly 88 pixels wide and 31 pixels tall. I liked the idea and thought "Oh, this would look cool on my own site!". On the search results, I found <a href="https://88x31.nl" target="_blank" rel="noopener noreferrer">a great collection</a> of these types of images. What frustrated me is that it didn't let me search through the images... so I had an idea: "What if I made one? Using some local OCR model?"
            </p>
            <p>
              So I fired off good old Claude asking it for help on nice (yet performant) local OCR models for Ollama. After some back and forth, it suggested the one I ended up sticking to in the end: GLM-OCR.
            </p>
            <p>
              I first outlined a Python script on my own laptop, but then moved it to a Colab notebook and kept tinkering with it there (Thanks, Claude!).
            </p>
            <p>
              After ~5 hours, I managed to finish the Python script. Around 2 hours, 25 minutes, and 59 seconds later, the JSON was ready, with only 4 fails! (I will fix those... sometime soon...)
            </p>
            <p>
              Now all that needed to be done is create the gallery page! ... So here we are.
            </p>
          </div>
        </details>
      </main>
    </>
  )
}
