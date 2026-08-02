import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import QA from './pages/QA.jsx'
import Gifs from './pages/Gifs.jsx'
import FontMaker from './pages/FontMaker.jsx'
import MyFont from './pages/MyFont.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/q&a" element={<QA />} />
        <Route path="/88x31" element={<Gifs />} />
        <Route path="/fontmaker" element={<FontMaker />} />
        <Route path="/myfont" element={<MyFont />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>,
)