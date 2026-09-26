import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Font, Glyph, Path, parse as parseFont } from 'opentype.js'
import { createFont as createFontEditorFont, woff2 } from 'fonteditor-core'
import { ArrowLeft, ArrowRight, Undo2, Redo2, X, Space, TriangleAlert, Plus, PenLine, Locate, Minus, Upload, Trash2 } from 'lucide-react'
import { loadStroke, saveStroke, clearStroke } from '../glyphDB.js'
import { GlyphEditor, FontPreview, TypeBox } from '../components/fontmaker/FontMakerComponents.jsx'
import { CHAR_GROUPS, ALL_CHARS } from '../components/fontmaker/fontUtils.js'
import { CANVAS_SIZE, UNITS_PER_EM, ASCENDER, DESCENDER, SCALE, BASE_CHAR_GROUPS, CUSTOM_SYMBOLS_STORAGE_KEY, loadCustomSymbols, saveCustomSymbols, rebuildCharGroups, GUIDE_FONT_STORAGE_KEY, GUIDE_FONTS, loadGuideFont, BRUSH_SIZE_STORAGE_KEY, FONT_NAME_STORAGE_KEY, STEADY_HAND_STORAGE_KEY, SMOOTH_INTENSITY_STORAGE_KEY, loadBrushSize, loadFontName, loadSteadyHand, loadSmoothIntensity, KERNING_STRENGTH_STORAGE_KEY, DEFAULT_KERNING_STRENGTH, loadKerningStrength, GUIDE_OPACITY_STORAGE_KEY, loadGuideOpacity, CUSTOM_GUIDE_FONT_NAME, TRACE_SUPERSAMPLE, TRACE_SIZE, rasterizeStrokesToMask, traceMaskToPolygons, sqDistToSegment, douglasPeucker, simplifyPolygon, signedArea, pointInPolygon, glyphPathCache, buildGlyphPathCached, seedGlyphPathCache, computeGlyphContours, pathFromContours, buildGlyphPath, resampleStroke, smoothStroke, drawGlyph, pathToCanvasPolygons, measureGlyphWidth, KERN_SAMPLE_STEPS, KERN_TARGET_GAP, KERN_MAX_ADJUST, KERN_ZONE_WEIGHT, KERN_STRAIGHT_SLOPE_THRESHOLD, KERN_ROUND_SPREAD_THRESHOLD, glyphSideProfiles, classifySide, classifyGlyphSides, SHAPE_GAP_FACTOR, shapeTargetGap, computeAutoKerningValue, computeAutoKerningTable, kerningTableCache, getKerningTableCached, DEFAULT_SPACE_WIDTH, SPACE_WIDTH_FACTOR, computeAutoSpaceWidth, spaceWidthCache, getAutoSpaceWidthCached, getKerningAdjustment, pad4, computeTableChecksum, KERN_SUBTABLE_HEADER_SIZE, KERN_MAX_PAIRS_PER_SUBTABLE, encodeKernSubtable, makeKernTableBuffer, makeGposTableBuffer, injectKernTable, convertCffToTrueType, WOFF2_WASM_URL, ensureWoff2Ready, measureGlyphVerticalExtent, computeTextMetrics, layoutTextToLines, renderTextToCanvas, isOutlineStroke, flattenQuadTo, flattenCubicTo, fontPathToCanvasContours, setupCanvasDPI, snapAngle, measureGuideGlyphBounds, centerStrokes } from '../components/fontmaker/fontUtils.js' // i'm not even going to try to explain this one
import '../fontmaker.css'

export default function FontMaker() {
  const [guideFont, setGuideFont] = useState(loadGuideFont)
  const [brushSize, setBrushSize] = useState(loadBrushSize)
  const [fontName, setFontName] = useState(loadFontName)
  const [drawnChars, setDrawnChars] = useState(() => new Set())
  const [saveErrorChars, setSaveErrorChars] = useState(() => new Set())
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(null)
  const [index, setIndex] = useState(0)
  const [steadyHand, setSteadyHand] = useState(loadSteadyHand)
  const [smoothIntensity, setSmoothIntensity] = useState(loadSmoothIntensity)
  const [resetVersion, setResetVersion] = useState(0)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState(null)
  const [bootLoading, setBootLoading] = useState(true)
  const [bootProgress, setBootProgress] = useState(0)
  const [guideOpacity, setGuideOpacity] = useState(loadGuideOpacity)
  const [kerningStrength, setKerningStrength] = useState(loadKerningStrength)
  const [customSymbols, setCustomSymbols] = useState(loadCustomSymbols)
  const [newSymbolInput, setNewSymbolInput] = useState('')
  const [symbolError, setSymbolError] = useState(null)
  const [loadingCustomGuideFont, setLoadingCustomGuideFont] = useState(false)
  const [guideFontError, setGuideFontError] = useState(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const importInputRef = useRef(null)
  const importModeRef = useRef('current')
  const guideFontInputRef = useRef(null)
  const strokesRefs = useRef({})
  const brushSizeRef = useRef(brushSize)
  const customSymbolsSet = useMemo(() => new Set(customSymbols), [customSymbols])

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    let cancelled = false
    let worker = null

    const finish = (drawn) => {
      if (cancelled) return
      setDrawnChars(drawn)
      setResetVersion(v => v + 1)
      setBootLoading(false)
    }

    const applyResults = (results) => {
      const drawn = new Set()
      const corruptChars = []
      for (const { char, strokes, contours, corrupt } of results) {
        strokesRefs.current[char] = strokes
        if (strokes.length > 0) {
          drawn.add(char)
          seedGlyphPathCache(strokes, brushSizeRef.current, 50, contours)
        }
        if (corrupt) corruptChars.push(char)
      }
      for (const char of corruptChars) {
        console.error(`Corrupt glyph data for "${char}", clearing entry.`)
        clearStroke(char)
      }
      finish(drawn)
    }

    const runMainThreadFallback = (entries) => {
      const drawn = new Set()
      for (const { char, strokes } of entries) {
        strokesRefs.current[char] = strokes
        if (strokes.length > 0) drawn.add(char)
      }
      setBootProgress(100)
      finish(drawn)
    }

    const boot = async () => {
      let entries
      try {
        entries = await Promise.all(ALL_CHARS.map(async char => ({
          char,
          strokes: await loadStroke(char),
        })))
      } catch {
        entries = ALL_CHARS.map(char => ({ char, strokes: [] }))
      }
      if (cancelled) return

      if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') {
        runMainThreadFallback(entries)
        return
      }

      try {
        worker = new Worker(new URL('/glyphWorker.js', import.meta.url))
      } catch {
        runMainThreadFallback(entries)
        return
      }

      worker.onmessage = (e) => {
        if (cancelled) return
        const { type, done, total, results } = e.data
        if (type === 'progress') {
          setBootProgress(Math.round((done / total) * 100))
        } else if (type === 'complete') {
          applyResults(results)
        }
      }

      worker.onerror = () => {
        if (cancelled) return
        runMainThreadFallback(entries)
      }

      worker.postMessage({ type: 'process', jobId: 1, entries, brushSize: brushSizeRef.current })
    }

    boot()

    return () => {
      cancelled = true
      if (worker) worker.terminate()
    }
  }, [])

  useEffect(() => {
    if (!bootLoading) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [bootLoading])

  useEffect(() => {
    try {
      localStorage.setItem(GUIDE_FONT_STORAGE_KEY, guideFont)
    } catch {}
  }, [guideFont])

  useEffect(() => {
    try {
      localStorage.setItem(BRUSH_SIZE_STORAGE_KEY, String(brushSize))
    } catch {}
    brushSizeRef.current = brushSize
  }, [brushSize])

  useEffect(() => {
    try {
      localStorage.setItem(FONT_NAME_STORAGE_KEY, fontName)
    } catch {}
  }, [fontName])

  useEffect(() => {
    try {
      localStorage.setItem(STEADY_HAND_STORAGE_KEY, String(steadyHand))
    } catch {}
  }, [steadyHand])

  useEffect(() => {
    try {
      localStorage.setItem(SMOOTH_INTENSITY_STORAGE_KEY, String(smoothIntensity))
    } catch {}
  }, [smoothIntensity])

  useEffect(() => {
    try {
      localStorage.setItem(GUIDE_OPACITY_STORAGE_KEY, String(guideOpacity))
    } catch {}
  }, [guideOpacity])

  useEffect(() => {
    try {
      localStorage.setItem(KERNING_STRENGTH_STORAGE_KEY, String(kerningStrength))
    } catch {}
  }, [kerningStrength])

  useEffect(() => {
    setHasUnsavedChanges(saveErrorChars.size > 0)
  }, [saveErrorChars])

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!hasUnsavedChanges) return
      e.preventDefault()
      e.returnValue = ''
      return ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const handleCommit = useCallback((char, strokes, saveOk = true) => {
    strokesRefs.current[char] = strokes
    setDrawnChars(prev => {
      const isDrawn = strokes.length > 0
      const next = new Set(prev)
      if (isDrawn) next.add(char)
      else next.delete(char)
      return next
    })
    setSaveErrorChars(prev => {
      const next = new Set(prev)
      if (saveOk) next.delete(char)
      else next.add(char)
      return next
    })
  }, [])

  const handleClearAll = () => {
    if (!window.confirm('Clear every glyph you have drawn? This cannot be undone.')) return
    for (const char of ALL_CHARS) {
      strokesRefs.current[char] = []
      clearStroke(char)
    }
    setDrawnChars(new Set())
    setResetVersion(v => v + 1)
  }

  const handleAddSymbol = () => {
    const trimmed = newSymbolInput.trim()
    setSymbolError(null)
    if (!trimmed) {
      setSymbolError('Type a symbol first.')
      return
    }
    const chars = [...new Set([...trimmed])]
    const already = chars.filter(c => ALL_CHARS.includes(c))
    const fresh = chars.filter(c => !ALL_CHARS.includes(c))
    if (fresh.length === 0) {
      setSymbolError(already.length === 1
        ? `"${already[0]}" is already in the list.`
        : 'All of those symbols are already in the list.')
      return
    }
    const next = [...customSymbols, ...fresh]
    setCustomSymbols(next)
    saveCustomSymbols(next)
    rebuildCharGroups(next)
    for (const char of fresh) {
      strokesRefs.current[char] = strokesRefs.current[char] || []
    }
    setNewSymbolInput('')
    setResetVersion(v => v + 1)
    setIndex(ALL_CHARS.indexOf(fresh[0]))
  }

  const handleRemoveSymbol = (char) => {
    if (!window.confirm(`Remove "${char}" from your symbol list? Any drawing for it will be deleted too.`)) return
    const next = customSymbols.filter(c => c !== char)
    setCustomSymbols(next)
    saveCustomSymbols(next)
    const removedIndex = ALL_CHARS.indexOf(char)
    rebuildCharGroups(next)
    clearStroke(char)
    delete strokesRefs.current[char]
    setDrawnChars(prev => {
      const nextSet = new Set(prev)
      nextSet.delete(char)
      return nextSet
    })
    setIndex(i => {
      if (removedIndex === -1) return Math.min(i, ALL_CHARS.length - 1)
      if (i > removedIndex) return i - 1
      return Math.min(i, ALL_CHARS.length - 1)
    })
    setResetVersion(v => v + 1)
  }

  const handleGuideFontUpload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setLoadingCustomGuideFont(true)
    setGuideFontError(null)
    try {
      const cssValue = await loadCustomGuideFont(file)
      setGuideFont(cssValue)
    } catch (err) {
      setGuideFontError(err.message || 'Could not load that font file as a guide.')
    } finally {
      setLoadingCustomGuideFont(false)
    }
  }

  const handleImportCurrentClick = () => {
    importModeRef.current = 'current'
    setImportError(null)
    importInputRef.current?.click()
  }

  const handleImportAllClick = () => {
    importModeRef.current = 'all'
    setImportError(null)
    importInputRef.current?.click()
  }

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const mode = importModeRef.current
    const targetChars = mode === 'current' ? [ALL_CHARS[index]] : ALL_CHARS

    setImporting(true)
    setImportError(null)
    try {
      const imported = await importGlyphsFromFontFile(file, targetChars)
      const importedChars = Object.keys(imported)
      if (importedChars.length === 0) {
        throw new Error(mode === 'current'
          ? 'That font has no glyph for the current character.'
          : 'No matching glyphs found in that font file.')
      }

      const overwriting = importedChars.some(char => (strokesRefs.current[char] || []).length > 0)
      if (overwriting && !window.confirm(
        mode === 'current'
          ? `This will overwrite what you've drawn for "${importedChars[0]}". Continue?`
          : `This will overwrite ${importedChars.length} glyph${importedChars.length === 1 ? '' : 's'} you've already drawn (matching characters in the imported font). Continue?`
      )) {
        return
      }

      const failedChars = []
      for (const char of importedChars) {
        const strokes = [imported[char]]
        strokesRefs.current[char] = strokes
        const result = await saveStroke(char, strokes)
        if (!result.ok) failedChars.push(char)
      }
      setDrawnChars(prev => {
        const next = new Set(prev)
        for (const char of importedChars) next.add(char)
        return next
      })
      setResetVersion(v => v + 1)
      if (failedChars.length > 0) {
        setImportError(
          `Imported ${importedChars.length - failedChars.length} of ${importedChars.length} glyphs, but ` +
          `${failedChars.length} couldn't be saved for some reason. They'll be lost on reload unless you free up space and redraw or reimport them.`
        )
      }
    } catch (err) {
      setImportError(err.message || 'Could not read that font file.')
    } finally {
      setImporting(false)
    }
  }

  const goPrev = useCallback(() => {
    setIndex(i => Math.max(0, i - 1))
  }, [])

  const goNext = useCallback(() => {
    setIndex(i => Math.min(ALL_CHARS.length - 1, i + 1))
  }, [])

  useEffect(() => {
    const handleEnterKey = (e) => {
      if (e.key !== 'Enter') return
      const target = e.target
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return
      e.preventDefault()
      goNext()
    }
    window.addEventListener('keydown', handleEnterKey)
    return () => window.removeEventListener('keydown', handleEnterKey)
  }, [goNext])

  const progress = drawnChars.size
  const currentChar = ALL_CHARS[index]

  const currentGroupInfo = useMemo(() => {
    let offset = 0
    for (const group of CHAR_GROUPS) {
      if (index < offset + group.chars.length) {
        return { label: group.label, posInGroup: index - offset + 1, groupSize: group.chars.length }
      }
      offset += group.chars.length
    }
    return { label: '', posInGroup: 0, groupSize: 0 }
  }, [index])

  const kerningTable = useMemo(
    () => getKerningTableCached(strokesRefs, brushSize, resetVersion),
    [strokesRefs, brushSize, resetVersion, drawnChars]
  )

  const spaceWidth = useMemo(
    () => getAutoSpaceWidthCached(strokesRefs, brushSize, resetVersion),
    [strokesRefs, brushSize, resetVersion, drawnChars]
  )

  const handleResetKerning = () => setKerningStrength(DEFAULT_KERNING_STRENGTH)

  const buildFont = () => {
    const glyphs = []
    glyphs.push(new Glyph({
      name: '.notdef',
      unicode: 0,
      advanceWidth: Math.round(UNITS_PER_EM * 0.6),
      path: new Path(),
    }))

    const spaceGlyph = new Glyph({
      name: 'space',
      unicode: 32,
      advanceWidth: spaceWidth,
      path: new Path(),
    })
    glyphs.push(spaceGlyph)

    let globalXMin = Infinity, globalYMin = Infinity
    let globalXMax = -Infinity, globalYMax = -Infinity

    for (const char of ALL_CHARS) {
        const strokes = strokesRefs.current[char] || []
        if (strokes.length === 0) continue

        const {
            path,
            advanceWidth
        } = buildGlyphPathCached(strokes, brushSize, 50)

        const box = path.getBoundingBox()
        if (box.x1 !== box.x2 || box.y1 !== box.y2) {
          globalXMin = Math.min(globalXMin, box.x1)
          globalYMin = Math.min(globalYMin, box.y1)
          globalXMax = Math.max(globalXMax, box.x2)
          globalYMax = Math.max(globalYMax, box.y2)
        }

        const glyph = new Glyph({
            name: char === ' ' ? 'space' : `uni${char.charCodeAt(0).toString(16).padStart(4, '0')}`,
            unicode: char.charCodeAt(0),
            advanceWidth,
            path,
        })
        glyphs.push(glyph)
    }

    if (glyphs.length <= 2) {
      throw new Error('Draw at least one character before exporting.')
    }

    const found = globalXMin !== Infinity
    const minY = found ? globalYMin : DESCENDER
    const maxY = found ? globalYMax : ASCENDER

    const calcAscender = Math.max(ASCENDER, Math.round(maxY))
    const calcDescender = Math.min(DESCENDER, Math.round(minY))
    const calcGlyphHeight = (maxY - minY)
    const calcLineHeight = Math.round(calcGlyphHeight + Math.max(UNITS_PER_EM * 0.15, 150))
    const calcLineGap = Math.max(0, Math.round(calcLineHeight - (calcAscender - calcDescender)))

    const font = new Font({
      familyName: fontName || 'My Font',
      styleName: 'Regular',
      unitsPerEm: UNITS_PER_EM,
      ascender: calcAscender,
      descender: calcDescender,
      glyphs,
    })

    if (!font.tables) font.tables = {}
    if (!font.tables.hhea) font.tables.hhea = {}
    font.tables.hhea.ascender = calcAscender
    font.tables.hhea.descender = calcDescender
    font.tables.hhea.lineGap = calcLineGap

    if (!font.tables.os2) font.tables.os2 = {}
    font.tables.os2.sTypoAscender = calcAscender
    font.tables.os2.sTypoDescender = calcDescender
    font.tables.os2.sTypoLineGap = calcLineGap
    font.tables.os2.usWinAscent = Math.max(0, calcAscender)
    font.tables.os2.usWinDescent = Math.max(0, -calcDescender)

    const glyphIndexByChar = {}
    for (const char of ALL_CHARS) {
      const idx = font.charToGlyphIndex(char)
      if (idx) glyphIndexByChar[char] = idx
    }

    const kerningPairs = {}
    for (const l of ALL_CHARS) {
      const li = glyphIndexByChar[l]
      if (!li) continue
      for (const r of ALL_CHARS) {
        const ri = glyphIndexByChar[r]
        if (!ri) continue
        const value = getKerningAdjustment(kerningTable, kerningStrength, l, r)
        if (value !== 0) kerningPairs[`${li},${ri}`] = value
      }
    }
    font.kerningPairs = kerningPairs

    return { 
      font, 
      kerningPairs, 
      lineMetrics: { 
        ascender: calcAscender, 
        descender: calcDescender, 
        lineGap: calcLineGap,
        xMin: found ? Math.round(globalXMin) : 0,
        yMin: found ? Math.round(globalYMin) : DESCENDER,
        xMax: found ? Math.round(globalXMax) : Math.round(UNITS_PER_EM * 0.6),
        yMax: found ? Math.round(globalYMax) : ASCENDER
      } 
    }
  }

  const handleExport = async (format) => {
    setExportError(null)
    setExporting(true)
    try {
      const { font, kerningPairs, lineMetrics } = buildFont()
      const cffArrayBuffer = font.toArrayBuffer()
      const rawArrayBuffer = format === 'otf' ? cffArrayBuffer : convertCffToTrueType(cffArrayBuffer)
      const sfntArrayBuffer = injectKernTable(rawArrayBuffer, kerningPairs, lineMetrics)
      const arrayBuffer = format === 'woff2' ? await convertTrueTypeToWoff2(sfntArrayBuffer) : sfntArrayBuffer
      const mimeByFormat = { otf: 'font/otf', ttf: 'font/ttf', woff2: 'font/woff2' }
      const blob = new Blob([arrayBuffer], { type: mimeByFormat[format] })
      const url = window.URL.createObjectURL(blob)
      const safeName = (fontName || 'my-font').trim().replace(/\s+/g, '-').toLowerCase()
      const a = document.createElement('a')
      a.href = url
      a.download = `${safeName}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setExportError(err.message || 'Something went wrong while building the font.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <div className="fm-page-header">
        <div className="fm-page-header-inner">
          <Link
            to="/"
            className="fm-back-link"
            onClick={e => {
              if (hasUnsavedChanges && !window.confirm(
                'Some glyphs failed to save to this browser and will be lost if you leave. Leave anyway?'
              )) {
                e.preventDefault()
              }
            }}
          ><ArrowLeft size={16} /> back</Link>
          <div className="fm-page-title-group">
            <span className="fm-page-title">Draw-A-Font</span>
            <span className="fm-page-subtitle">{progress} / {ALL_CHARS.length} drawn</span>
          </div>
        </div>
      </div>

      <main className="fm-main">
        {bootLoading && (
          <div className="fm-boot-overlay" role="status" aria-live="polite">
            <div className="fm-boot-overlay-inner">
              <div className="fm-boot-overlay-label">Hold on! We're loading here!</div>
              <div className="fm-boot-progress-track">
                <div
                  className="fm-boot-progress-fill"
                  style={{ width: `${bootProgress}%` }}
                />
              </div>
              <div className="fm-boot-progress-pct">{bootProgress}%</div>
            </div>
          </div>
        )}

        <div className="fm-intro">
          Draw each character by hand, using the guide letter behind it for reference.
          Use the arrows or press Enter to move to the next character, Ctrl+Z / Ctrl+Y to
          undo and redo. Switch to the Line tool for straight strokes. You can hold Shift to snap
          to 45°. Turn on Steady Hand to smooth out each stroke after you draw it. Your
          progress saves automatically in this browser.
        </div>

        {saveErrorChars.size > 0 && (
          <div className="fm-save-error-banner">
            <TriangleAlert size={18} />
            <span>
              {saveErrorChars.size === 1
                ? `"${[...saveErrorChars][0] === ' ' ? 'space' : [...saveErrorChars][0]}" couldn't be saved to this browser's storage (likely full). Export soon or free up space, or this glyph will be lost on reload.`
                : `${saveErrorChars.size} glyphs couldn't be saved to this browser's storage (likely full). Export soon or free up space, or they'll be lost on reload.`}
            </span>
          </div>
        )}

        <div className="fm-toolbar">
          <div className="fm-toolbar-group">
            <label className="fm-toolbar-label">Guide font</label>
            <select
              className="fm-select"
              value={guideFont}
              onChange={e => setGuideFont(e.target.value)}
            >
              {loadingCustomGuideFont === false && guideFont === `"${CUSTOM_GUIDE_FONT_NAME}"` && (
                <option value={guideFont}>Your uploaded font</option>
              )}
              {GUIDE_FONTS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          <div className="fm-toolbar-group">
            <label className="fm-toolbar-label">Brush size</label>
            <input
              type="range"
              min="4"
              max="32"
              value={brushSize}
              onChange={e => setBrushSize(Number(e.target.value))}
              className="fm-range"
              style={{ '--fm-range-pct': `${((brushSize - 4) / (32 - 4)) * 100}%` }}
            />
            <span className="fm-range-value">{brushSize}px</span>
          </div>

          <div className="fm-toolbar-group">
            <label className="fm-toolbar-label">Font name</label>
            <input
              type="text"
              className="fm-text-input"
              value={fontName}
              onChange={e => setFontName(e.target.value)}
              placeholder="My Handwriting"
            />
          </div>

          <div className="fm-toolbar-group">
		        <label className="fm-toolbar-label">Smoothing</label>
            <label className="fm-toolbar-label fm-steady-label">
              <input
                type="checkbox"
                className="fm-checkbox"
                checked={steadyHand}
                onChange={e => setSteadyHand(e.target.checked)}
              />
              Steady hand
            </label>
            <div className="fm-steady-slider-row">
              <input
                type="range"
                min="1"
                max="100"
                value={smoothIntensity}
                onChange={e => setSmoothIntensity(Number(e.target.value))}
                className="fm-range"
                disabled={!steadyHand}
                style={{ '--fm-range-pct': `${((smoothIntensity - 1) / (100 - 1)) * 100}%` }}
              />
              <span className="fm-range-value">{smoothIntensity}%</span>
            </div>
          </div>

          <div className="fm-toolbar-row3">
            <div className="fm-toolbar-group fm-toolbar-group--row3">
              <label className="fm-toolbar-label">Import font</label>
              <div className="fm-import-btn-row">
                <button
                  className="fm-import-btn"
                  onClick={handleImportCurrentClick}
                  disabled={importing}
                  type="button"
                >
                  {importing ? 'Importing…' : `Load "${currentChar === ' ' ? 'space' : currentChar}" only`}
                </button>
                <button
                  className="fm-import-btn"
                  onClick={handleImportAllClick}
                  disabled={importing}
                  type="button"
                >
                  {importing ? 'Importing…' : 'Load whole alphabet'}
                </button>
              </div>
              <input
                ref={importInputRef}
                type="file"
                accept=".ttf,.otf,.woff,font/ttf,font/otf,font/woff"
                onChange={handleImportFile}
                style={{ display: 'none' }}
              />
              {importError && <div className="fm-import-error">{importError}</div>}
            </div>

            <div className="fm-toolbar-group fm-toolbar-group--row3">
              <label className="fm-toolbar-label">Guide opacity</label>
              <input
                type="range"
                min="0"
                max="60"
                value={guideOpacity}
                onChange={e => setGuideOpacity(Number(e.target.value))}
                className="fm-range"
                style={{ '--fm-range-pct': `${(guideOpacity / 60) * 100}%` }}
              />
              <span className="fm-range-value">{guideOpacity}%</span>
            </div>

            <div className="fm-toolbar-group fm-toolbar-group--row3">
              <label className="fm-toolbar-label">Auto kerning</label>
              <input
                type="range"
                min="0"
                max="200"
                value={kerningStrength}
                onChange={e => setKerningStrength(Number(e.target.value))}
                className="fm-range"
                style={{ '--fm-range-pct': `${(kerningStrength / 200) * 100}%` }}
              />
              <div className="fm-kerning-value-row">
                <span className="fm-range-value">{kerningStrength}%</span>
                <button
                  className="fm-reset-kerning-btn"
                  onClick={handleResetKerning}
                  disabled={kerningStrength === DEFAULT_KERNING_STRENGTH}
                  type="button"
                  title="Reset to auto"
                >
                  <Locate size={12} />
                </button>
              </div>
            </div>

            <div className="fm-toolbar-group fm-toolbar-group--row3">
              <label className="fm-toolbar-label">Guide reference font</label>
              <button
                className="fm-import-btn"
                onClick={() => guideFontInputRef.current?.click()}
                disabled={loadingCustomGuideFont}
                type="button"
              >
                <Upload size={13} /> {loadingCustomGuideFont ? 'Loading...' : 'Upload font as guide'}
              </button>
              <input
                ref={guideFontInputRef}
                type="file"
                accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff"
                onChange={handleGuideFontUpload}
                style={{ display: 'none' }}
              />
              {guideFontError && <div className="fm-import-error">{guideFontError}</div>}
            </div>
          </div>
        </div>

        <div className="fm-export-bar">
          <div className="fm-export-buttons">
            <button
              className="fm-export-btn fm-export-btn--primary"
              onClick={() => handleExport('ttf')}
              disabled={exporting || progress === 0}
            >
              Export as .ttf
            </button>
            <button
              className="fm-export-btn"
              onClick={() => handleExport('otf')}
              disabled={exporting || progress === 0}
            >
              Export as .otf
            </button>
            <button
              className="fm-export-btn"
              onClick={() => handleExport('woff2')}
              disabled={exporting || progress === 0}
            >
              Export as .woff2
            </button>
          </div>
          <button className="fm-clear-all-btn" onClick={handleClearAll}>
            Clear all glyphs
          </button>
          {exportError && <div className="fm-export-error">{exportError}</div>}
        </div>

        <div className="fm-nav-bar">
          <button className="fm-nav-btn" onClick={goPrev} disabled={index === 0}><ArrowLeft size={16} /> Back</button>
          <div className="fm-nav-info">
            <span className="fm-nav-group">{currentGroupInfo.label}</span>
            <span className="fm-nav-pos">{currentGroupInfo.posInGroup} / {currentGroupInfo.groupSize}</span>
          </div>
          <button className="fm-nav-btn" onClick={goNext} disabled={index === ALL_CHARS.length - 1}>Next <ArrowRight size={16} /></button>
        </div>

        <div className="fm-current-char">
          {currentChar === ' ' ? 'space' : currentChar}
        </div>

        <GlyphEditor
          char={currentChar}
          guideFont={guideFont}
          brushSize={brushSize}
          guideOpacity={guideOpacity}
          initialStrokes={strokesRefs.current[currentChar] || []}
          onCommit={handleCommit}
          steadyHand={steadyHand}
          smoothIntensity={smoothIntensity}
          resetKey={resetVersion}
        />

        <FontPreview
          strokesRefs={strokesRefs}
          brushSize={brushSize}
          drawnChars={drawnChars}
          version={resetVersion}
          kerningTable={kerningTable}
          kerningStrength={kerningStrength}
          spaceWidth={spaceWidth}
        />

        <TypeBox
          strokesRefs={strokesRefs}
          brushSize={brushSize}
          drawnChars={drawnChars}
          version={resetVersion}
          kerningTable={kerningTable}
          kerningStrength={kerningStrength}
          spaceWidth={spaceWidth}
        />

        <div className="fm-strip">
          {ALL_CHARS.map((char, i) => {
            const isCustom = customSymbolsSet.has(char)
            return (
              <div key={char} className="fm-strip-item-wrap">
                <button
                  className={`fm-strip-item${i === index ? ' fm-strip-item--active' : ''}${drawnChars.has(char) ? ' fm-strip-item--done' : ''}`}
                  onClick={() => setIndex(i)}
                >
                  {char === ' ' ? <Space size={14} /> : char}
                </button>
                {isCustom && (
                  <button
                    className="fm-strip-item-remove"
                    onClick={() => handleRemoveSymbol(char)}
                    title={`Remove custom symbol "${char}"`}
                    type="button"
                  >
                    <X size={9} />
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <div className="fm-add-symbol-bar">
          <label className="fm-add-symbol-label">Add custom symbol</label>
          <input
            type="text"
            className="fm-text-input fm-symbol-input"
            value={newSymbolInput}
            onChange={e => setNewSymbolInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddSymbol()
              }
            }}
            placeholder="e.g. €£¥"
            maxLength={64}
          />
          <button className="fm-import-btn" onClick={handleAddSymbol} type="button">
            <Plus size={14} /> Add
          </button>
          {symbolError && <div className="fm-import-error">{symbolError}</div>}
        </div>

        <div className="fm-about-section">
          <div className="fm-about-title">About this project</div>
          <p>
            So... this entire project was born out of spite.
			One day, I wanted to make a font out of my own handwriting. However, I was sick and tired
			of using those "draw your own font" apps on mobile with all the ads, which ended up
			producing fonts that Windows Font Viewer did not want to accept, for some reason. And all the characters
			were spaced really weirdly.
          </p>
          <p>
            So I began working on this font maker to massively simplify the process of making a font off your own handwriting.
			You just draw in each box for the characters you want, and you have your own font, ready to be used anywhere!
			Any fonts you produce out of this app are 100% YOURS and YOURS only. I won't come knocking down your door asking
			for royalties, don't worry :P
          </p>
		  <p>
		  I hope you enjoy this silly thing as much as I enjoyed making it :)
		  </p>
		  <br />
		  <p>
		  Also shoutout to my friend <a href="https://ddededodediamante.vercel.app" target="_blank" rel="noopener">ddededodediamante</a> for helping develop this thing 🎉
		  </p>
        </div>
      <div className="fm-about-section">
          <div className="fm-about-title">How it works</div>
          <p>
            Alright. Yap session...
            <br />
            <i>INHAAAALE</i>
          </p>
          <p>
            When you draw a glyph, Draw-A-Font records a series of points on a 480×480 canvas and stores that stroke data in the browser using IndexedDB so your progress is preserved between sessions. The guide letter underneath is rendered as a semi-transparent reference, and you can switch between a brush tool and a line tool; the line tool creates straight segments, while the brush tool captures freehand strokes. If you enable Steady Hand, the app resamples your stroke, simplifies it, and smooths it so small wobble and jitter are reduced before the glyph is used.
          </p>
          <p>
            Once a glyph has strokes, it converts those strokes into vector outlines. It first rasterizes the drawing into a bitmap mask, traces the mask into polygon contours, simplifies those contours, and determines which ones are outer shapes and which are holes. Those contours are then converted into OpenType path commands and turned into a glyph path with a measured advance width, so the character has a proper shape and spacing behavior.
          </p>
          <p>
            Finally, when you export, it packages everything into a downloadable font file using opentype.js. Each drawn glyph becomes a real OpenType glyph with its own path, advance width, and Unicode value, and the app also builds kerning pairs for the characters you have. The resulting file is exported as .ttf or .otf, so you can install it and use it in normal applications just like any other font.
          </p>
        </div>
      </main>
    </>
  )
}
