import { useEffect } from 'react'
import { Link } from 'react-router-dom'

function Man() {
  useEffect(() => {
    if (window.sessionStorage.getItem('man-page-access-unlocked') !== 'true') {
      window.location.hash = '#/'
      return
    }

    const prevTitle = document.title
    document.title = '* (Behind the tree.)'

    return () => {
      document.title = prevTitle
    }
  }, [])

  if (window.sessionStorage.getItem('man-page-access-unlocked') !== 'true') {
    return null
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        minWidth: '320px',
        width: '100%',
        maxWidth: '100%',
        backgroundColor: 'black',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '1rem',
        boxSizing: 'border-box',
      }}
    >
      <Link to="/">
      <img
        src="/assets/tree.gif"
        alt="* (It is a tree.)"
        title="* (It is a tree.)"
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          display: 'block',
          objectFit: 'contain',
          imageRendering: 'pixelated',
        }}
      />
      </Link>
    </div>
  )
}

export default Man
