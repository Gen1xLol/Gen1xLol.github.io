import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Font, Glyph, Path, parse as parseFont } from 'opentype.js'

const CANVAS_SIZE = 480
const UNITS_PER_EM = 1000
const ASCENDER = 800
const DESCENDER = -200
const SCALE = UNITS_PER_EM / CANVAS_SIZE

const CHAR_GROUPS = [
  { label: 'Uppercase', chars: 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZÁÉÍÓÚ'.split('') },
  { label: 'Lowercase', chars: 'abcdefghijklmnñopqrstuvwxyzáéíóú'.split('') },
  { label: 'Numbers', chars: '0123456789'.split('') },
  { label: 'Punctuation', chars: '.,¡!¿?\'"-—_:;()[]{}@#$%&*+=/\\<>~^|'.split('') },
]

const ALL_CHARS = CHAR_GROUPS.flatMap(g => g.chars)

const GUIDE_FONTS = [
  { label: 'Sans', value: 'sans-serif' },
  { label: 'Serif', value: 'serif' },
  { label: 'Monospace', value: 'monospace' },
  { label: 'Cursive', value: 'cursive' },
]

function charStorageKey(char) {
  return `fontmaker-glyph-${char.charCodeAt(0)}`
}

function loadStroke(char) {
  try {
    const raw = localStorage.getItem(charStorageKey(char))
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveStroke(char, strokes) {
  try {
    localStorage.setItem(charStorageKey(char), JSON.stringify(strokes))
  } catch {}
}

function clearStroke(char) {
  try {
    localStorage.removeItem(charStorageKey(char))
  } catch {}
}

const TRACE_SUPERSAMPLE = 2
const TRACE_SIZE = CANVAS_SIZE * TRACE_SUPERSAMPLE

function rasterizeStrokesToMask(strokes, brushSize) {
  const canvas = document.createElement('canvas')
  canvas.width = TRACE_SIZE
  canvas.height = TRACE_SIZE
  const ctx = canvas.getContext('2d')
  ctx.scale(TRACE_SUPERSAMPLE, TRACE_SUPERSAMPLE)
  ctx.fillStyle = '#000'
  ctx.strokeStyle = '#000'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = brushSize

  for (const stroke of strokes) {
    if (isOutlineStroke(stroke)) {
      ctx.beginPath()
      for (const contour of stroke.contours) {
        if (contour.length === 0) continue
        ctx.moveTo(contour[0].x, contour[0].y)
        for (let i = 1; i < contour.length; i++) ctx.lineTo(contour[i].x, contour[i].y)
        ctx.closePath()
      }
      ctx.fill('nonzero')
      continue
    }
    if (stroke.length === 0) continue
    if (stroke.length === 1) {
      ctx.beginPath()
      ctx.arc(stroke[0].x, stroke[0].y, brushSize / 2, 0, Math.PI * 2)
      ctx.fill()
      continue
    }
    ctx.beginPath()
    ctx.moveTo(stroke[0].x, stroke[0].y)
    for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y)
    ctx.stroke()
  }

  const { data } = ctx.getImageData(0, 0, TRACE_SIZE, TRACE_SIZE)
  const mask = new Uint8Array(TRACE_SIZE * TRACE_SIZE)
  for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] > 127 ? 1 : 0
  return mask
}

function traceMaskToPolygons(mask, size) {
  const at = (x, y) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return 0
    return mask[y * size + x]
  }

  const segments = []
  for (let y = 0; y <= size; y++) {
    for (let x = 0; x < size; x++) {
      const above = at(x, y - 1)
      const below = at(x, y)
      if (above !== below) segments.push([x, y, x + 1, y])
    }
  }
  for (let x = 0; x <= size; x++) {
    for (let y = 0; y < size; y++) {
      const left = at(x - 1, y)
      const right = at(x, y)
      if (left !== right) segments.push([x, y, x, y + 1])
    }
  }

  const pointKey = (x, y) => `${x},${y}`
  const adjacency = new Map()
  for (const [x1, y1, x2, y2] of segments) {
    const a = pointKey(x1, y1)
    const b = pointKey(x2, y2)
    if (!adjacency.has(a)) adjacency.set(a, [])
    if (!adjacency.has(b)) adjacency.set(b, [])
    adjacency.get(a).push(b)
    adjacency.get(b).push(a)
  }

  const usedEdges = new Set()
  const edgeKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`)
  const polygons = []

  for (const startKey of adjacency.keys()) {
    const neighbors = adjacency.get(startKey)
    for (const firstNeighbor of neighbors) {
      const startEdge = edgeKey(startKey, firstNeighbor)
      if (usedEdges.has(startEdge)) continue

      const contour = [startKey]
      let prevKey = startKey
      let currKey = firstNeighbor
      usedEdges.add(startEdge)

      while (currKey !== startKey) {
        contour.push(currKey)
        const options = adjacency.get(currKey) || []
        let nextKey = null
        for (const cand of options) {
          if (cand === prevKey && options.length > 1) continue
          const key = edgeKey(currKey, cand)
          if (usedEdges.has(key)) continue
          nextKey = cand
          break
        }
        if (nextKey === null) break
        usedEdges.add(edgeKey(currKey, nextKey))
        prevKey = currKey
        currKey = nextKey
      }

      if (contour.length >= 3) {
        polygons.push(contour.map(k => {
          const [px, py] = k.split(',').map(Number)
          return { x: px, y: py }
        }))
      }
    }
  }

  return polygons
}

function sqDistToSegment(p, a, b) {
  let x = a.x, y = a.y
  let dx = b.x - x, dy = b.y - y
  if (dx !== 0 || dy !== 0) {
    const t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy)
    if (t > 1) {
      x = b.x
      y = b.y
    } else if (t > 0) {
      x += dx * t
      y += dy * t
    }
  }
  dx = p.x - x
  dy = p.y - y
  return dx * dx + dy * dy
}

function douglasPeucker(points, tolerance) {
  if (points.length <= 2) return points
  const sqTolerance = tolerance * tolerance

  const simplifyRange = (pts, first, last, tol, out) => {
    let maxDist = tol
    let index = -1
    for (let i = first + 1; i < last; i++) {
      const dist = sqDistToSegment(pts[i], pts[first], pts[last])
      if (dist > maxDist) {
        index = i
        maxDist = dist
      }
    }
    if (maxDist > tol && index !== -1) {
      if (index - first > 1) simplifyRange(pts, first, index, tol, out)
      out.push(pts[index])
      if (last - index > 1) simplifyRange(pts, index, last, tol, out)
    }
  }

  const result = [points[0]]
  simplifyRange(points, 0, points.length - 1, sqTolerance, result)
  result.push(points[points.length - 1])
  return result
}

function simplifyPolygon(poly, tolerance) {
  if (poly.length <= 4) return poly
  let startIdx = 0
  let maxDist = -1
  for (let i = 1; i < poly.length; i++) {
    const d = Math.hypot(poly[i].x - poly[0].x, poly[i].y - poly[0].y)
    if (d > maxDist) {
      maxDist = d
      startIdx = i
    }
  }
  const rotated = poly.slice(startIdx).concat(poly.slice(0, startIdx))
  rotated.push(rotated[0])
  const simplified = douglasPeucker(rotated, tolerance)
  simplified.pop()
  return simplified.length >= 3 ? simplified : poly
}

function signedArea(poly) {
  let sum = 0
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    sum += a.x * b.y - b.x * a.y
  }
  return sum / 2
}

function pointInPolygon(pt, poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y
    const xj = poly[j].x, yj = poly[j].y
    const intersect = ((yi > pt.y) !== (yj > pt.y)) &&
      (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

const glyphPathCache = new WeakMap()

function buildGlyphPathCached(strokes, brushSize, sideBearing = 50) {
  let entry = glyphPathCache.get(strokes)
  if (entry && entry.brushSize === brushSize && entry.sideBearing === sideBearing) {
    return entry.result
  }
  const result = buildGlyphPath(strokes, brushSize, sideBearing)
  glyphPathCache.set(strokes, { brushSize, sideBearing, result })
  return result
}

function buildGlyphPath(strokes, brushSize, sideBearing) {
  const path = new Path()
  const hasContent = strokes.some(s => isOutlineStroke(s) ? s.contours.length > 0 : s.length > 0)

  if (hasContent) {
    const mask = rasterizeStrokesToMask(strokes, brushSize)
    const rawPolygons = traceMaskToPolygons(mask, TRACE_SIZE)

    const contours = []
    for (const poly of rawPolygons) {
      const simplified = simplifyPolygon(poly, TRACE_SUPERSAMPLE * 1.5)
      if (simplified.length < 3) continue
      const area = signedArea(simplified)
      if (Math.abs(area) < (TRACE_SUPERSAMPLE * TRACE_SUPERSAMPLE) * 2) continue
      contours.push(simplified)
    }

    const depths = contours.map((poly, i) => {
      let depth = 0
      for (let j = 0; j < contours.length; j++) {
        if (i === j) continue
        if (pointInPolygon(poly[0], contours[j])) depth++
      }
      return depth
    })

    for (let i = 0; i < contours.length; i++) {
      const poly = contours[i]
      const isHole = depths[i] % 2 === 1

      const fontPts = poly.map(pt => ({
        x: Math.round((pt.x / TRACE_SUPERSAMPLE) * SCALE),
        y: Math.round((CANVAS_SIZE - pt.y / TRACE_SUPERSAMPLE) * SCALE + DESCENDER),
      }))

      const dedup = fontPts.filter((p, k) => {
        const prev = fontPts[(k - 1 + fontPts.length) % fontPts.length]
        return p.x !== prev.x || p.y !== prev.y
      })
      if (dedup.length < 3) continue

      const area = signedArea(dedup)
      const wantsNegative = isHole
      const isNegative = area < 0
      if (wantsNegative !== isNegative) dedup.reverse()

      path.moveTo(dedup[0].x, dedup[0].y)
      for (let k = 1; k < dedup.length; k++) path.lineTo(dedup[k].x, dedup[k].y)
      path.close()
    }
  }

  const box = path.getBoundingBox()
  let glyphAdvanceWidth = Math.round(UNITS_PER_EM * 0.62)

  if (box.x1 !== box.x2) {
    const glyphWidth = box.x2 - box.x1
    
    glyphAdvanceWidth = Math.round(glyphWidth + (sideBearing * 2))

    const currentCenter = (box.x1 + box.x2) / 2
    const targetCenter = glyphAdvanceWidth / 2
    const shiftX = Math.round(targetCenter - currentCenter)

    for (const cmd of path.commands) {
      if (cmd.x !== undefined) cmd.x = Math.round(cmd.x + shiftX)
      if (cmd.x1 !== undefined) cmd.x1 = Math.round(cmd.x1 + shiftX)
      if (cmd.x2 !== undefined) cmd.x2 = Math.round(cmd.x2 + shiftX)
    }
  }

  return { path, advanceWidth: glyphAdvanceWidth }
}

function smoothStroke(points, intensity) {
  if (intensity <= 0 || points.length < 3) return points

  const passes = Math.max(1, Math.round((intensity / 100) * 6))
  let pts = points

  for (let pass = 0; pass < passes; pass++) {
    const next = [pts[0]]
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i]
      const p1 = pts[i + 1]
      next.push({
        x: p0.x * 0.75 + p1.x * 0.25,
        y: p0.y * 0.75 + p1.y * 0.25,
      })
      next.push({
        x: p0.x * 0.25 + p1.x * 0.75,
        y: p0.y * 0.25 + p1.y * 0.75,
      })
    }
    next.push(pts[pts.length - 1])
    pts = next
  }

  const smoothWindow = Math.max(1, Math.round((intensity / 100) * 4))
  const smoothed = pts.map((p, i) => {
    let sx = 0, sy = 0, count = 0
    for (let j = Math.max(0, i - smoothWindow); j <= Math.min(pts.length - 1, i + smoothWindow); j++) {
      sx += pts[j].x
      sy += pts[j].y
      count++
    }
    return { x: sx / count, y: sy / count }
  })
  smoothed[0] = points[0]
  smoothed[smoothed.length - 1] = points[points.length - 1]

  return smoothed
}

function drawGlyph(ctx, char, guideFont, brushSize, strokes) {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

  ctx.fillStyle = '#0a0810'
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

  ctx.font = `${CANVAS_SIZE * 0.72}px ${guideFont}`
  ctx.fillStyle = 'rgba(167, 139, 250, 0.16)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(char, CANVAS_SIZE / 2, CANVAS_SIZE / 2 + CANVAS_SIZE * 0.04)

  ctx.strokeStyle = 'rgba(167, 139, 250, 0.08)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, CANVAS_SIZE * 0.75)
  ctx.lineTo(CANVAS_SIZE, CANVAS_SIZE * 0.75)
  ctx.stroke()

  ctx.strokeStyle = '#e9e4f0'
  ctx.lineWidth = brushSize
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const stroke of strokes) {
    if (isOutlineStroke(stroke)) {
      ctx.fillStyle = '#e9e4f0'
      ctx.beginPath()
      for (const contour of stroke.contours) {
        if (contour.length === 0) continue
        ctx.moveTo(contour[0].x, contour[0].y)
        for (let i = 1; i < contour.length; i++) {
          ctx.lineTo(contour[i].x, contour[i].y)
        }
        ctx.closePath()
      }
      ctx.fill('nonzero')
      continue
    }

    if (stroke.length < 2) {
      if (stroke.length === 1) {
        ctx.beginPath()
        ctx.arc(stroke[0].x, stroke[0].y, brushSize / 2, 0, Math.PI * 2)
        ctx.fillStyle = '#e9e4f0'
        ctx.fill()
      }
      continue
    }
    ctx.beginPath()
    ctx.moveTo(stroke[0].x, stroke[0].y)
    for (let i = 1; i < stroke.length; i++) {
      ctx.lineTo(stroke[i].x, stroke[i].y)
    }
    ctx.stroke()
  }
}

function pathToCanvasPolygons(path, fontSize) {
  const fontScale = fontSize / UNITS_PER_EM
  const CURVE_STEPS = 8
  const polygons = []
  let current = []
  let cursor = { x: 0, y: 0 }
  let start = { x: 0, y: 0 }

  const toCanvas = (p) => ({
    x: p.x * fontScale,
    y: -p.y * fontScale,
  })

  for (const cmd of path.commands) {
    if (cmd.type === 'M') {
      if (current.length > 0) polygons.push(current)
      cursor = { x: cmd.x, y: cmd.y }
      start = cursor
      current = [toCanvas(cursor)]
    } else if (cmd.type === 'L') {
      cursor = { x: cmd.x, y: cmd.y }
      current.push(toCanvas(cursor))
    } else if (cmd.type === 'Q') {
      const p1 = { x: cmd.x1, y: cmd.y1 }
      const p2 = { x: cmd.x, y: cmd.y }
      const pts = []
      flattenQuadTo(cursor, p1, p2, CURVE_STEPS, pts)
      for (const p of pts) current.push(toCanvas(p))
      cursor = p2
    } else if (cmd.type === 'C') {
      const p1 = { x: cmd.x1, y: cmd.y1 }
      const p2 = { x: cmd.x2, y: cmd.y2 }
      const p3 = { x: cmd.x, y: cmd.y }
      const pts = []
      flattenCubicTo(cursor, p1, p2, p3, CURVE_STEPS, pts)
      for (const p of pts) current.push(toCanvas(p))
      cursor = p3
    } else if (cmd.type === 'Z') {
      if (current.length > 0) polygons.push(current)
      current = []
      cursor = start
    }
  }
  if (current.length > 0) polygons.push(current)

  return polygons
}

function measureGlyphWidth(strokes, brushSize) {
  const advanceWidth = Math.round(UNITS_PER_EM * 0.62)
  if (!strokes || strokes.length === 0) return advanceWidth
  const { advanceWidth: glyphAdvanceWidth } = buildGlyphPathCached(strokes, brushSize, 50)
  return glyphAdvanceWidth
}

function layoutTextToLines(text, strokesRefs, brushSize, fontSize, options = {}) {
  const { maxWidth = Infinity, lineHeight = fontSize * 1.3 } = options
  const advanceWidth = Math.round(UNITS_PER_EM * 0.62)
  const spaceWidth = Math.round(UNITS_PER_EM * 0.5)
  const fontScale = fontSize / UNITS_PER_EM

  const lines = []
  let current = []
  let currentWidth = 0

  const flushLine = () => {
    lines.push(current)
    current = []
    currentWidth = 0
  }

  const pushChar = (char, w) => {
    current.push({ char, w })
    currentWidth += w * fontScale
  }

  const wrapWord = (word) => {
    if (current.length > 0) flushLine()
    for (const char of word) {
      const strokes = strokesRefs.current[char]
      const w = measureGlyphWidth(strokes, brushSize)
      if (currentWidth + w * fontScale > maxWidth && current.length > 0) flushLine()
      pushChar(char, w)
    }
  }

  for (const rawWord of text.split('\n')) {
    if (rawWord === '') {
      if (current.length > 0 || lines.length === 0) flushLine()
      continue
    }

    const words = rawWord.split(' ')
    for (let i = 0; i < words.length; i++) {
      const word = words[i]
      if (word === '') continue

      const wordWidth = [...word].reduce(
        (acc, char) => acc + measureGlyphWidth(strokesRefs.current[char], brushSize) * fontScale,
        0
      )
      const spaceW = i > 0 ? spaceWidth * fontScale : 0

      if (wordWidth > maxWidth) {
        wrapWord(word)
        if (i < words.length - 1) pushChar(' ', spaceWidth)
        continue
      }

      if (current.length > 0 && currentWidth + spaceW + wordWidth > maxWidth) {
        flushLine()
      } else if (current.length > 0) {
        pushChar(' ', spaceWidth)
      }

      for (const char of word) {
        const strokes = strokesRefs.current[char]
        const w = measureGlyphWidth(strokes, brushSize)
        pushChar(char, w)
      }
    }
    if (current.length > 0) flushLine()
  }

  if (current.length > 0) flushLine()

  return {
    lines,
    lineHeight,
    width: lines.reduce((acc, line) => Math.max(acc, line.reduce((a, c) => a + c.w * fontScale, 0)), 0),
    height: Math.max(lines.length, 1) * lineHeight,
  }
}

function renderTextToCanvas(ctx, text, strokesRefs, brushSize, fontSize, options = {}) {
  const { color = '#e9e4f0', maxWidth = Infinity, lineHeight = fontSize * 1.3 } = options
  const spaceWidth = Math.round(UNITS_PER_EM * 0.5)
  const fontScale = fontSize / UNITS_PER_EM

  ctx.fillStyle = color

  const layout = layoutTextToLines(text, strokesRefs, brushSize, fontSize, { maxWidth, lineHeight })

  layout.lines.forEach((line, lineIndex) => {
    let penX = 0
    for (const { char, w } of line) {
      if (char === ' ') {
        penX += spaceWidth * fontScale
        continue
      }

      const strokes = strokesRefs.current[char] || []
      if (strokes.length === 0) {
        penX += w * fontScale
        continue
      }

      const { path } = buildGlyphPathCached(strokes, brushSize, 50)
      const polygons = pathToCanvasPolygons(path, fontSize)

      ctx.save()
      ctx.translate(penX, lineIndex * lineHeight)
      ctx.beginPath()
      for (const poly of polygons) {
        if (poly.length < 3) continue
        ctx.moveTo(poly[0].x, poly[0].y)
        for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y)
        ctx.closePath()
      }
      ctx.fill('nonzero')
      ctx.restore()

      penX += w * fontScale
    }
  })

  return layout
}

function isOutlineStroke(stroke) {
  return !Array.isArray(stroke) && stroke && stroke.type === 'outline'
}

function flattenQuadTo(p0, p1, p2, steps, out) {
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    const mt = 1 - t
    out.push({
      x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
      y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
    })
  }
}

function flattenCubicTo(p0, p1, p2, p3, steps, out) {
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    const mt = 1 - t
    out.push({
      x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
      y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.x + t * t * t * p3.y,
    })
  }
}

function fontPathToCanvasContours(path, canvasHeight) {
  const CURVE_STEPS = 8
  const contours = []
  let current = []
  let cursor = { x: 0, y: 0 }
  let start = { x: 0, y: 0 }

  const toCanvas = (p) => ({
    x: p.x / SCALE,
    y: canvasHeight - (p.y - DESCENDER) / SCALE,
  })

  for (const cmd of path.commands) {
    if (cmd.type === 'M') {
      if (current.length > 0) contours.push(current)
      cursor = { x: cmd.x, y: cmd.y }
      start = cursor
      current = [toCanvas(cursor)]
    } else if (cmd.type === 'L') {
      cursor = { x: cmd.x, y: cmd.y }
      current.push(toCanvas(cursor))
    } else if (cmd.type === 'Q') {
      const p1 = { x: cmd.x1, y: cmd.y1 }
      const p2 = { x: cmd.x, y: cmd.y }
      const pts = []
      flattenQuadTo(cursor, p1, p2, CURVE_STEPS, pts)
      for (const p of pts) current.push(toCanvas(p))
      cursor = p2
    } else if (cmd.type === 'C') {
      const p1 = { x: cmd.x1, y: cmd.y1 }
      const p2 = { x: cmd.x2, y: cmd.y2 }
      const p3 = { x: cmd.x, y: cmd.y }
      const pts = []
      flattenCubicTo(cursor, p1, p2, p3, CURVE_STEPS, pts)
      for (const p of pts) current.push(toCanvas(p))
      cursor = p3
    } else if (cmd.type === 'Z') {
      if (current.length > 0) contours.push(current)
      current = []
      cursor = start
    }
  }
  if (current.length > 0) contours.push(current)

  return contours.filter(c => c.length >= 3)
}

async function importGlyphsFromFontFile(file, chars = ALL_CHARS) {
  const buffer = await file.arrayBuffer()
  const font = parseFont(buffer)

  const result = {}
  for (const char of chars) {
    const codePoint = char.charCodeAt(0)
    const glyphIndex = font.charToGlyphIndex(char)
    if (!glyphIndex) continue
    const glyph = font.glyphs.get(glyphIndex)
    if (!glyph || !glyph.path || glyph.path.commands.length === 0) continue

    const unitsPerEm = font.unitsPerEm || 1000
    const rescale = UNITS_PER_EM / unitsPerEm
    const scaledPath = new Path()
    for (const cmd of glyph.path.commands) {
      const scaled = { type: cmd.type }
      if (cmd.x !== undefined) scaled.x = cmd.x * rescale
      if (cmd.y !== undefined) scaled.y = cmd.y * rescale
      if (cmd.x1 !== undefined) scaled.x1 = cmd.x1 * rescale
      if (cmd.y1 !== undefined) scaled.y1 = cmd.y1 * rescale
      if (cmd.x2 !== undefined) scaled.x2 = cmd.x2 * rescale
      if (cmd.y2 !== undefined) scaled.y2 = cmd.y2 * rescale
      scaledPath.commands.push(scaled)
    }

    const contours = fontPathToCanvasContours(scaledPath, CANVAS_SIZE)
    if (contours.length === 0) continue

    let minX = Infinity, maxX = -Infinity
    for (const contour of contours) {
      for (const p of contour) {
        if (p.x < minX) minX = p.x
        if (p.x > maxX) maxX = p.x
      }
    }
    if (minX !== Infinity && maxX !== minX) {
      const glyphCenter = (minX + maxX) / 2
      const shiftX = CANVAS_SIZE / 2 - glyphCenter
      for (const contour of contours) {
        for (const p of contour) {
          p.x += shiftX
        }
      }
    }

    result[char] = { type: 'outline', contours }
  }
  return result
}

function setupCanvasDPI(canvas, cssWidth, cssHeight) {
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.round(cssWidth * dpr)
  canvas.height = Math.round(cssHeight * dpr)
  canvas.style.width = `${cssWidth}px`
  canvas.style.height = `${cssHeight}px`
  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return ctx
}

function GlyphEditor({ char, guideFont, brushSize, initialStrokes, onCommit, steadyHand, smoothIntensity, resetKey }) {
  const canvasRef = useRef(null)
  const drawingRef = useRef(false)
  const currentStrokeRef = useRef([])
  const historyRef = useRef([initialStrokes])
  const historyIndexRef = useRef(0)

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    setupCanvasDPI(canvas, CANVAS_SIZE, CANVAS_SIZE)
    const ctx = canvas.getContext('2d')
    drawGlyph(ctx, char, guideFont, brushSize, historyRef.current[historyIndexRef.current])
  }, [char, guideFont, brushSize])

  useEffect(() => {
    historyRef.current = [initialStrokes]
    historyIndexRef.current = 0
    redraw()
  }, [char, resetKey])

  useEffect(() => {
    redraw()
  }, [guideFont, brushSize])

  useEffect(() => {
    const handleDpiChange = () => redraw()
    const dpr = window.devicePixelRatio || 1
    const mq = window.matchMedia(`(resolution: ${dpr}dppx)`)
    mq.addEventListener?.('change', handleDpiChange)
    return () => mq.removeEventListener?.('change', handleDpiChange)
  }, [redraw])

  const currentStrokes = () => historyRef.current[historyIndexRef.current]

  const pushHistory = (strokes) => {
    const trimmed = historyRef.current.slice(0, historyIndexRef.current + 1)
    trimmed.push(strokes)
    historyRef.current = trimmed
    historyIndexRef.current = trimmed.length - 1
    saveStroke(char, strokes)
    onCommit(char, strokes)
    redraw()
  }

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return
    historyIndexRef.current -= 1
    const strokes = historyRef.current[historyIndexRef.current]
    saveStroke(char, strokes)
    onCommit(char, strokes)
    redraw()
  }, [char, redraw])

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return
    historyIndexRef.current += 1
    const strokes = historyRef.current[historyIndexRef.current]
    saveStroke(char, strokes)
    onCommit(char, strokes)
    redraw()
  }, [char, redraw])

  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase()
      if ((e.ctrlKey || e.metaKey) && key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((e.ctrlKey || e.metaKey) && (key === 'y' || (key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  const getPos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS_SIZE,
      y: ((clientY - rect.top) / rect.height) * CANVAS_SIZE,
    }
  }

  const handleStart = (e) => {
    e.preventDefault()
    drawingRef.current = true
    const pos = getPos(e)
    currentStrokeRef.current = [pos]
  }

  const handleMove = (e) => {
    if (!drawingRef.current) return
    e.preventDefault()
    const pos = getPos(e)
    currentStrokeRef.current.push(pos)
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
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

  const handleEnd = () => {
    if (!drawingRef.current) return
    drawingRef.current = false
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
      <div className="fm-editor-actions">
        <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">↩ Undo</button>
        <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)">↪ Redo</button>
        <button onClick={handleClear} className="fm-editor-clear">✕ Clear</button>
      </div>
    </div>
  )
}

const PREVIEW_SAMPLE = 'The quick brown fox jumps over the lazy dog. 0123456789'
const PREVIEW_HEIGHT = 200
const PREVIEW_FONT_SIZE = 46

function FontPreview({ strokesRefs, brushSize, drawnChars, version }) {
  const canvasRef = useRef(null)
  const [height, setHeight] = useState(PREVIEW_HEIGHT)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const width = canvas.clientWidth
    const drawHeight = height
    canvas.width = width * dpr
    canvas.height = drawHeight * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, drawHeight)

    if (drawnChars.size === 0) {
      ctx.fillStyle = '#6b6080'
      ctx.font = '13px Inter, sans-serif'
      ctx.fillText('Draw a few letters and they will show up here, rendered as your font.', 0, PREVIEW_HEIGHT / 2)
      return
    }

    ctx.save()
    ctx.translate(4, PREVIEW_FONT_SIZE * 0.85 + 8)
    const layout = renderTextToCanvas(ctx, PREVIEW_SAMPLE, strokesRefs, brushSize, PREVIEW_FONT_SIZE, {
      maxWidth: width - 8,
      lineHeight: PREVIEW_FONT_SIZE * 1.35,
    })
    ctx.restore()

    const requiredHeight = layout.height + PREVIEW_FONT_SIZE * 0.85 + 16
    if (Math.abs(requiredHeight - height) > 1) setHeight(requiredHeight)
  }, [strokesRefs, brushSize, drawnChars, version, height])

  return (
    <div className="fm-preview">
      <div className="fm-preview-label">Sentence test</div>
      <canvas ref={canvasRef} className="fm-preview-canvas" style={{ height }} />
    </div>
  )
}

function TypeBox({ strokesRefs, brushSize, drawnChars, version }) {
  const [text, setText] = useState('Type something!')
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const typeFontSize = 40
  const [height, setHeight] = useState(120)

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const width = wrap.clientWidth
    const drawHeight = height
    canvas.width = width * dpr
    canvas.height = drawHeight * dpr
    canvas.style.height = `${drawHeight}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, drawHeight)

    ctx.save()
    ctx.translate(10, typeFontSize * 0.85 + 12)
    const layout = renderTextToCanvas(ctx, text || '', strokesRefs, brushSize, typeFontSize, {
      maxWidth: width - 20,
      lineHeight: typeFontSize * 1.35,
    })
    ctx.restore()

    const requiredHeight = layout.height + typeFontSize * 0.85 + 24
    if (Math.abs(requiredHeight - height) > 1) setHeight(requiredHeight)
  }, [text, strokesRefs, brushSize, drawnChars, version, height])

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

export default function FontMaker() {
  const [guideFont, setGuideFont] = useState('sans-serif')
  const [brushSize, setBrushSize] = useState(14)
  const [fontName, setFontName] = useState('My Handwriting')
  const [drawnChars, setDrawnChars] = useState(() => new Set())
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(null)
  const [index, setIndex] = useState(0)
  const [steadyHand, setSteadyHand] = useState(false)
  const [smoothIntensity, setSmoothIntensity] = useState(50)
  const [resetVersion, setResetVersion] = useState(0)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState(null)
  const importInputRef = useRef(null)
  const importModeRef = useRef('current')
  const strokesRefs = useRef({})

  useEffect(() => {
    const drawn = new Set()
    for (const char of ALL_CHARS) {
      const strokes = loadStroke(char)
      strokesRefs.current[char] = strokes
      if (strokes.length > 0) drawn.add(char)
    }
    setDrawnChars(new Set(drawn))
    setResetVersion(v => v + 1)
  }, [])

  const handleCommit = useCallback((char, strokes) => {
    strokesRefs.current[char] = strokes
    setDrawnChars(prev => {
      const isDrawn = strokes.length > 0
      const next = new Set(prev)
      if (isDrawn) next.add(char)
      else next.delete(char)
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

      for (const char of importedChars) {
        const strokes = [imported[char]]
        strokesRefs.current[char] = strokes
        saveStroke(char, strokes)
      }
      setDrawnChars(prev => {
        const next = new Set(prev)
        for (const char of importedChars) next.add(char)
        return next
      })
      setResetVersion(v => v + 1)
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
      advanceWidth: Math.round(UNITS_PER_EM * 0.5),
      path: new Path(),
    })
    glyphs.push(spaceGlyph)

    for (const char of ALL_CHARS) {
        const strokes = strokesRefs.current[char] || []
        if (strokes.length === 0) continue

        const {
            path,
            advanceWidth
        } = buildGlyphPathCached(strokes, brushSize, 50)

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

    const font = new Font({
      familyName: fontName || 'My Font',
      styleName: 'Regular',
      unitsPerEm: UNITS_PER_EM,
      ascender: ASCENDER,
      descender: DESCENDER,
      glyphs,
    })

    return font
  }

  const handleExport = (format) => {
    setExportError(null)
    setExporting(true)
    try {
      const font = buildFont()
      const arrayBuffer = font.toArrayBuffer()
      const mime = format === 'otf' ? 'font/otf' : 'font/ttf'
      const blob = new Blob([arrayBuffer], { type: mime })
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
          <Link to="/" className="fm-back-link">← back</Link>
          <div className="fm-page-title-group">
            <span className="fm-page-title">Draw-A-Font</span>
            <span className="fm-page-subtitle">{progress} / {ALL_CHARS.length} drawn</span>
          </div>
        </div>
      </div>

      <main className="fm-main">
        <div className="fm-intro">
          Draw each character by hand, using the guide letter behind it for reference.
          Use the arrows to move between characters, Ctrl+Z / Ctrl+Y to undo and redo.
          Turn on Steady Hand to smooth out each stroke after you draw it. Your progress
          saves automatically in this browser.
        </div>

        <div className="fm-toolbar">
          <div className="fm-toolbar-group">
            <label className="fm-toolbar-label">Guide font</label>
            <select
              className="fm-select"
              value={guideFont}
              onChange={e => setGuideFont(e.target.value)}
            >
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
              />
              <span className="fm-range-value">{smoothIntensity}%</span>
            </div>
          </div>

          <div className="fm-toolbar-group">
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

          <button className="fm-clear-all-btn" onClick={handleClearAll}>
            Clear all glyphs
          </button>
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
          </div>
          {exportError && <div className="fm-export-error">{exportError}</div>}
        </div>

        <div className="fm-nav-bar">
          <button className="fm-nav-btn" onClick={goPrev} disabled={index === 0}>← Back</button>
          <div className="fm-nav-info">
            <span className="fm-nav-group">{currentGroupInfo.label}</span>
            <span className="fm-nav-pos">{currentGroupInfo.posInGroup} / {currentGroupInfo.groupSize}</span>
          </div>
          <button className="fm-nav-btn" onClick={goNext} disabled={index === ALL_CHARS.length - 1}>Next →</button>
        </div>

        <div className="fm-current-char">
          {currentChar === ' ' ? 'space' : currentChar}
        </div>

        <GlyphEditor
          char={currentChar}
          guideFont={guideFont}
          brushSize={brushSize}
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
        />

        <TypeBox
          strokesRefs={strokesRefs}
          brushSize={brushSize}
          drawnChars={drawnChars}
          version={resetVersion}
        />

        <div className="fm-strip">
          {ALL_CHARS.map((char, i) => (
            <button
              key={char}
              className={`fm-strip-item${i === index ? ' fm-strip-item--active' : ''}${drawnChars.has(char) ? ' fm-strip-item--done' : ''}`}
              onClick={() => setIndex(i)}
            >
              {char === ' ' ? '␣' : char}
            </button>
          ))}
        </div>

        <div className="fm-about-section">
          <div className="fm-about-title">About this project</div>
          <p>
            So... this entire project was born out of spite.
			I was sick and tired of using those "draw your own font" apps on mobile with all the ads, which ended up
			producing fonts that Windows Font Viewer did not want to accept, for some reason. And all the characters
			were spaced really weirdly.
          </p>
          <p>
            SO I began working on this font maker to massively simplify the process of making a font off your own handwriting.
			You just draw in each box for the characters you want, and you have your own font, ready to be used anywhere!
			Any fonts you produce out of this app are 100% YOURS and YOURS only. I won't come knocking down your door asking
			for royalties, don't worry.
          </p>
		  <p>
		  I hope you enjoy this silly thing as much as I enjoyed making it :)
		  </p>
        </div>
      </main>
    </>
  )
}