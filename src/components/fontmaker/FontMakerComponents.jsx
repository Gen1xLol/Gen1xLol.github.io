import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Font, Glyph, Path, parse as parseFont } from 'opentype.js'
import { createFont as createFontEditorFont, woff2 } from 'fonteditor-core'
import { saveStroke, clearStroke } from '../../glyphDB.js'
import { ArrowLeft, ArrowRight, Undo2, Redo2, X, Space, TriangleAlert, Plus, PenLine, Locate, Minus, Upload, Trash2 } from 'lucide-react'
import { CANVAS_SIZE, UNITS_PER_EM, ASCENDER, DESCENDER, SCALE, BASE_CHAR_GROUPS, CUSTOM_SYMBOLS_STORAGE_KEY, loadCustomSymbols, saveCustomSymbols, rebuildCharGroups, GUIDE_FONT_STORAGE_KEY, GUIDE_FONTS, loadGuideFont, BRUSH_SIZE_STORAGE_KEY, FONT_NAME_STORAGE_KEY, STEADY_HAND_STORAGE_KEY, SMOOTH_INTENSITY_STORAGE_KEY, loadBrushSize, loadFontName, loadSteadyHand, loadSmoothIntensity, KERNING_STRENGTH_STORAGE_KEY, DEFAULT_KERNING_STRENGTH, loadKerningStrength, GUIDE_OPACITY_STORAGE_KEY, loadGuideOpacity, CUSTOM_GUIDE_FONT_NAME, TRACE_SUPERSAMPLE, TRACE_SIZE, rasterizeStrokesToMask, traceMaskToPolygons, sqDistToSegment, douglasPeucker, simplifyPolygon, signedArea, pointInPolygon, glyphPathCache, buildGlyphPathCached, seedGlyphPathCache, computeGlyphContours, pathFromContours, buildGlyphPath, resampleStroke, smoothStroke, drawGlyph, pathToCanvasPolygons, measureGlyphWidth, KERN_SAMPLE_STEPS, KERN_TARGET_GAP, KERN_MAX_ADJUST, KERN_ZONE_WEIGHT, KERN_STRAIGHT_SLOPE_THRESHOLD, KERN_ROUND_SPREAD_THRESHOLD, glyphSideProfiles, classifySide, classifyGlyphSides, SHAPE_GAP_FACTOR, shapeTargetGap, computeAutoKerningValue, computeAutoKerningTable, kerningTableCache, getKerningTableCached, DEFAULT_SPACE_WIDTH, SPACE_WIDTH_FACTOR, computeAutoSpaceWidth, spaceWidthCache, getAutoSpaceWidthCached, getKerningAdjustment, pad4, computeTableChecksum, KERN_SUBTABLE_HEADER_SIZE, KERN_MAX_PAIRS_PER_SUBTABLE, encodeKernSubtable, makeKernTableBuffer, makeGposTableBuffer, injectKernTable, convertCffToTrueType, WOFF2_WASM_URL, ensureWoff2Ready, measureGlyphVerticalExtent, computeTextMetrics, layoutTextToLines, renderTextToCanvas, isOutlineStroke, flattenQuadTo, flattenCubicTo, fontPathToCanvasContours, setupCanvasDPI, snapAngle, measureGuideGlyphBounds, centerStrokes } from './fontUtils.js' // dear fucking god this is a long import line

export function GlyphEditor({ char, guideFont, brushSize, guideOpacity, initialStrokes, onCommit, steadyHand, smoothIntensity, resetKey }) {
  const canvasRef = useRef(null)
  const drawingRef = useRef(false)
  const currentStrokeRef = useRef([])
  const lineStartRef = useRef(null)
  const historyRef = useRef([initialStrokes])
  const historyIndexRef = useRef(0)
  const [tool, setTool] = useState('brush')
  const [shiftHeld, setShiftHeld] = useState(false)
  const toolRef = useRef(tool)
  const shiftHeldRef = useRef(false)
  toolRef.current = tool
  shiftHeldRef.current = shiftHeld

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    setupCanvasDPI(canvas, CANVAS_SIZE, CANVAS_SIZE)
    const ctx = canvas.getContext('2d')
    drawGlyph(ctx, char, guideFont, brushSize, historyRef.current[historyIndexRef.current], guideOpacity)
  }, [char, guideFont, brushSize, guideOpacity])

  useEffect(() => {
    historyRef.current = [initialStrokes]
    historyIndexRef.current = 0
    redraw()
  }, [char, resetKey])

  useEffect(() => {
    redraw()
  }, [guideFont, brushSize, guideOpacity])

  useEffect(() => {
    const handleDpiChange = () => redraw()
    const dpr = window.devicePixelRatio || 1
    const mq = window.matchMedia(`(resolution: ${dpr}dppx)`)
    mq.addEventListener?.('change', handleDpiChange)
    return () => mq.removeEventListener?.('change', handleDpiChange)
  }, [redraw])

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
    window.scrollTo(0, 0)
  }, [])

  const currentStrokes = () => historyRef.current[historyIndexRef.current]

  const pushHistory = (strokes) => {
    const trimmed = historyRef.current.slice(0, historyIndexRef.current + 1)
    trimmed.push(strokes)
    historyRef.current = trimmed
    historyIndexRef.current = trimmed.length - 1
    saveStroke(char, strokes).then(result => onCommit(char, strokes, result.ok))
    redraw()
  }

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return
    historyIndexRef.current -= 1
    const strokes = historyRef.current[historyIndexRef.current]
    saveStroke(char, strokes).then(result => onCommit(char, strokes, result.ok))
    redraw()
  }, [char, redraw])

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return
    historyIndexRef.current += 1
    const strokes = historyRef.current[historyIndexRef.current]
    saveStroke(char, strokes).then(result => onCommit(char, strokes, result.ok))
    redraw()
  }, [char, redraw])

  const handleCenter = useCallback(() => {
    const guideBounds = guideOpacity > 0 ? measureGuideGlyphBounds(char, guideFont) : null
    const centered = centerStrokes(currentStrokes(), guideBounds)
    if (centered !== currentStrokes()) pushHistory(centered)
  }, [char, guideFont, guideOpacity])

  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase()
      if (e.key === 'Shift') setShiftHeld(true)
      if ((e.ctrlKey || e.metaKey) && key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((e.ctrlKey || e.metaKey) && (key === 'y' || (key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
      }
    }
    const handleKeyUp = (e) => {
      if (e.key === 'Shift') setShiftHeld(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [undo, redo])

  const getPos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0])
    const clientX = touch ? touch.clientX : e.clientX
    const clientY = touch ? touch.clientY : e.clientY
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS_SIZE,
      y: ((clientY - rect.top) / rect.height) * CANVAS_SIZE,
    }
  }

  const drawLinePreview = (from, to) => {
    redraw()
    const ctx = canvasRef.current.getContext('2d')
    ctx.strokeStyle = '#e9e4f0'
    ctx.lineWidth = brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
  }

  const handleStart = (e) => {
    e.preventDefault()
    drawingRef.current = true
    const pos = getPos(e)
    if (toolRef.current === 'line') {
      lineStartRef.current = pos
    } else {
      currentStrokeRef.current = [pos]
    }
  }

  const handleMove = (e) => {
    if (!drawingRef.current) return
    e.preventDefault()
    const pos = getPos(e)

    if (toolRef.current === 'line') {
      const start = lineStartRef.current
      if (!start) return
      const end = shiftHeldRef.current ? snapAngle(start, pos) : pos
      drawLinePreview(start, end)
      return
    }

    currentStrokeRef.current.push(pos)
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (steadyHand) {
      const preview = [...currentStrokes(), smoothStroke(currentStrokeRef.current, smoothIntensity)]
      drawGlyph(ctx, char, guideFont, brushSize, preview, guideOpacity)
      return
    }

    ctx.strokeStyle = '#e9e4f0'
    ctx.lineWidth = brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    const s = currentStrokeRef.current
    if (s.length >= 2) {
      ctx.beginPath()
      ctx.moveTo(s[s.length - 2].x, s[s.length - 2].y)
      ctx.lineTo(s[s.length - 1].x, s[s.length - 1].y)
      ctx.stroke()
    }
  }

  const handleEnd = (e) => {
    if (!drawingRef.current) return
    drawingRef.current = false

    if (toolRef.current === 'line') {
      const start = lineStartRef.current
      lineStartRef.current = null
      if (start && e) {
        const pos = getPos(e)
        const end = shiftHeldRef.current ? snapAngle(start, pos) : pos
        if (Math.hypot(end.x - start.x, end.y - start.y) > 0.5) {
          const next = [...currentStrokes(), [start, end]]
          pushHistory(next)
        } else {
          redraw()
        }
      } else {
        redraw()
      }
      return
    }

    if (currentStrokeRef.current.length > 0) {
      const finishedStroke = steadyHand
        ? smoothStroke(currentStrokeRef.current, smoothIntensity)
        : currentStrokeRef.current
      const next = [...currentStrokes(), finishedStroke]
      pushHistory(next)
    }
    currentStrokeRef.current = []
  }

  const handleClear = () => {
    pushHistory([])
    clearStroke(char)
  }

  const canUndo = historyIndexRef.current > 0
  const canRedo = historyIndexRef.current < historyRef.current.length - 1

  return (
    <div className="fm-editor">
      <div className="fm-tool-row">
        <button
          type="button"
          className={`fm-tool-btn${tool === 'brush' ? ' fm-tool-btn--active' : ''}`}
          onClick={() => setTool('brush')}
          title="Brush"
        >
          <PenLine size={15} /> Brush
        </button>
        <button
          type="button"
          className={`fm-tool-btn${tool === 'line' ? ' fm-tool-btn--active' : ''}`}
          onClick={() => setTool('line')}
          title="Line tool (hold Shift to snap to 45°)"
        >
          <Minus size={15} /> Line
        </button>
        {tool === 'line' && <span className="fm-tool-hint">Hold Shift to snap 45°</span>}
        <div className="fm-editor-actions">
          <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)"><Undo2 size={16} /></button>
          <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)"><Redo2 size={16} /></button>
          <button onClick={handleCenter} title="Center the drawing"><Locate size={16} /></button>
          <button onClick={handleClear} className="fm-editor-clear" title="Clear the canvas"><Trash2 size={16} /></button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="fm-editor-canvas"
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      />
    </div>
  )
}

const PREVIEW_SAMPLE = 'The quick brown fox jumps over the lazy dog. 0123456789'
const PREVIEW_HEIGHT = 200
const PREVIEW_FONT_SIZE = 46

export function FontPreview({ strokesRefs, brushSize, drawnChars, version, kerningTable, kerningStrength, spaceWidth }) {
  const canvasRef = useRef(null)
  const [height, setHeight] = useState(PREVIEW_HEIGHT)
  const [width, setWidth] = useState(0)
  const [dprTick, setDprTick] = useState(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const update = () => setWidth(canvas.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(canvas)
    const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`)
    const handleDpiChange = () => setDprTick(t => t + 1)
    mq.addEventListener?.('change', handleDpiChange)
    return () => {
      ro.disconnect()
      mq.removeEventListener?.('change', handleDpiChange)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const drawWidth = width || canvas.clientWidth
    const drawHeight = height
    canvas.width = Math.round(drawWidth * dpr)
    canvas.height = Math.round(drawHeight * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, drawWidth, drawHeight)

    if (drawnChars.size === 0) {
      ctx.fillStyle = '#8a7fae'
      ctx.font = '13px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Draw a few letters and they will show up here, rendered as your font.', drawWidth / 2, PREVIEW_HEIGHT / 2)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      return
    }

    const raf = window.requestAnimationFrame(() => {
      const metrics = computeTextMetrics(strokesRefs, brushSize, PREVIEW_FONT_SIZE)
      ctx.save()
      ctx.translate(4, metrics.baselineOffset)
      const layout = renderTextToCanvas(ctx, PREVIEW_SAMPLE, strokesRefs, brushSize, PREVIEW_FONT_SIZE, {
        maxWidth: drawWidth - 8,
        lineHeight: metrics.lineHeight,
        kerningTable,
        kerningStrength,
        spaceWidth,
      })
      ctx.restore()

      const requiredHeight = metrics.baselineOffset
        + (layout.lines.length - 1) * metrics.lineHeight
        + metrics.descenderDepth
        + 10
      if (Math.abs(requiredHeight - height) > 1) setHeight(requiredHeight)
    })

    return () => window.cancelAnimationFrame(raf)
  }, [strokesRefs, brushSize, drawnChars, version, height, width, dprTick, kerningTable, kerningStrength, spaceWidth])

  return (
    <div className="fm-preview">
      <div className="fm-preview-label">Sentence test</div>
      <canvas ref={canvasRef} className="fm-preview-canvas" style={{ height }} />
    </div>
  )
}

export function TypeBox({ strokesRefs, brushSize, drawnChars, version, kerningTable, kerningStrength, spaceWidth }) {
  const [text, setText] = useState('Type something!')
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const typeFontSize = 40
  const [height, setHeight] = useState(120)
  const [width, setWidth] = useState(0)
  const [dprTick, setDprTick] = useState(0)

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const update = () => setWidth(wrap.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(wrap)
    const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`)
    const handleDpiChange = () => setDprTick(t => t + 1)
    mq.addEventListener?.('change', handleDpiChange)
    return () => {
      ro.disconnect()
      mq.removeEventListener?.('change', handleDpiChange)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const drawWidth = width || wrap.clientWidth
    const drawHeight = height
    canvas.width = Math.round(drawWidth * dpr)
    canvas.height = Math.round(drawHeight * dpr)
    canvas.style.height = `${drawHeight}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, drawWidth, drawHeight)

    const raf = window.requestAnimationFrame(() => {
      const metrics = computeTextMetrics(strokesRefs, brushSize, typeFontSize)
      ctx.save()
      ctx.translate(10, metrics.baselineOffset)
      const layout = renderTextToCanvas(ctx, text || '', strokesRefs, brushSize, typeFontSize, {
        maxWidth: drawWidth - 20,
        lineHeight: metrics.lineHeight,
        kerningTable,
        kerningStrength,
        spaceWidth,
      })
      ctx.restore()

      const requiredHeight = metrics.baselineOffset
        + (layout.lines.length - 1) * metrics.lineHeight
        + metrics.descenderDepth
        + 12
      if (Math.abs(requiredHeight - height) > 1) setHeight(requiredHeight)
    })

    return () => window.cancelAnimationFrame(raf)
  }, [text, strokesRefs, brushSize, drawnChars, version, height, width, dprTick, kerningTable, kerningStrength, spaceWidth])

  return (
    <div className="fm-typebox">
      <div className="fm-preview-label">Try typing with your font</div>
      <div className="fm-typebox-canvas-wrap" ref={wrapRef}>
        <canvas ref={canvasRef} className="fm-typebox-canvas" />
      </div>
      <input
        type="text"
        className="fm-typebox-input"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Type something!"
      />
    </div>
  )
}


