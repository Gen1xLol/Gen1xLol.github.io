import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import QA from './pages/QA.jsx'
import Gifs from './pages/Gifs.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/q&a.html" element={<QA />} />
        <Route path="/88x31.html" element={<Gifs />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>,
)
