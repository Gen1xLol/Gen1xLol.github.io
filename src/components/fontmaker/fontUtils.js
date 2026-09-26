import { Font, Glyph, Path, parse as parseFont } from 'opentype.js'
import { createFont as createFontEditorFont, woff2 } from 'fonteditor-core'

const CANVAS_SIZE = 480
const UNITS_PER_EM = 1000
const ASCENDER = 800
const DESCENDER = -200
const SCALE = UNITS_PER_EM / CANVAS_SIZE

const BASE_CHAR_GROUPS = [
  { label: 'Uppercase', chars: 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZÁÉÍÓÚÜ'.split('') },
  { label: 'Lowercase', chars: 'abcdefghijklmnñopqrstuvwxyzáéíóúü'.split('') },
  { label: 'Numbers', chars: '0123456789'.split('') },
  { label: 'Punctuation', chars: '.:,;¡!¿?\'‘’"“”‹›«»-—_()[]{}@#$%&*+=/\\<>~^|'.split('') },
]

const CUSTOM_SYMBOLS_STORAGE_KEY = 'fontmaker-custom-symbols'

function loadCustomSymbols() {
  try {
    const stored = localStorage.getItem(CUSTOM_SYMBOLS_STORAGE_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []
    const base = new Set(BASE_CHAR_GROUPS.flatMap(g => g.chars))
    const seen = new Set()
    return parsed.filter(c => {
      if (typeof c !== 'string' || c.length !== 1) return false
      if (base.has(c) || seen.has(c)) return false
      seen.add(c)
      return true
    })
  } catch {
    return []
  }
}

function saveCustomSymbols(symbols) {
  try {
    localStorage.setItem(CUSTOM_SYMBOLS_STORAGE_KEY, JSON.stringify(symbols))
  } catch {}
}

let CHAR_GROUPS = BASE_CHAR_GROUPS
let ALL_CHARS = CHAR_GROUPS.flatMap(g => g.chars)
export { CHAR_GROUPS, ALL_CHARS }

function rebuildCharGroups(customSymbols) {
  CHAR_GROUPS = customSymbols.length > 0
    ? [...BASE_CHAR_GROUPS, { label: 'Custom', chars: customSymbols }]
    : BASE_CHAR_GROUPS
  ALL_CHARS = CHAR_GROUPS.flatMap(g => g.chars)
  return ALL_CHARS
}

if (typeof window !== 'undefined') {
  rebuildCharGroups(loadCustomSymbols())
}

const GUIDE_FONT_STORAGE_KEY = 'fontmaker-guide-font'

const GUIDE_FONTS = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { label: 'Segoe UI', value: '"Segoe UI", sans-serif' },
  { label: 'Calibri', value: 'Calibri, sans-serif' },
  { label: 'Century Gothic', value: '"Century Gothic", sans-serif' },
  { label: 'Impact', value: 'Impact, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Garamond', value: 'Garamond, serif' },
  { label: 'Palatino', value: '"Palatino Linotype", Palatino, serif' },
  { label: 'Cambria', value: 'Cambria, serif' },
  { label: 'Bookman', value: '"Bookman Old Style", serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
  { label: 'Lucida Console', value: '"Lucida Console", Monaco, monospace' },
  { label: 'Consolas', value: 'Consolas, monospace' },
  { label: 'Brush Script MT', value: '"Brush Script MT", cursive' },
  { label: 'Comic Sans MS', value: '"Comic Sans MS", cursive' },
  { label: 'Sans-serif (generic)', value: 'sans-serif' },
  { label: 'Serif (generic)', value: 'serif' },
  { label: 'Monospace (generic)', value: 'monospace' },
  { label: 'Cursive (generic)', value: 'cursive' },
]

function loadGuideFont() {
  try {
    const stored = localStorage.getItem(GUIDE_FONT_STORAGE_KEY)
    if (stored && GUIDE_FONTS.some(f => f.value === stored)) return stored
  } catch {}
  return GUIDE_FONTS[0].value
}

const BRUSH_SIZE_STORAGE_KEY = 'fontmaker-brush-size'
const FONT_NAME_STORAGE_KEY = 'fontmaker-font-name'
const STEADY_HAND_STORAGE_KEY = 'fontmaker-steady-hand'
const SMOOTH_INTENSITY_STORAGE_KEY = 'fontmaker-smooth-intensity'

function loadBrushSize() {
  try {
    const stored = Number(localStorage.getItem(BRUSH_SIZE_STORAGE_KEY))
    if (Number.isFinite(stored) && stored >= 4 && stored <= 32) return stored
  } catch {}
  return 14
}

function loadFontName() {
  try {
    const stored = localStorage.getItem(FONT_NAME_STORAGE_KEY)
    if (typeof stored === 'string' && stored.trim() !== '') return stored
  } catch {}
  return 'My Handwriting'
}

function loadSteadyHand() {
  try {
    return localStorage.getItem(STEADY_HAND_STORAGE_KEY) === 'true'
  } catch {}
  return false
}

function loadSmoothIntensity() {
  try {
    const stored = Number(localStorage.getItem(SMOOTH_INTENSITY_STORAGE_KEY))
    if (Number.isFinite(stored) && stored >= 1 && stored <= 100) return stored
  } catch {}
  return 50
}

const KERNING_STRENGTH_STORAGE_KEY = 'fontmaker-kerning-strength'
const DEFAULT_KERNING_STRENGTH = 100

function loadKerningStrength() {
  try {
    const raw = localStorage.getItem(KERNING_STRENGTH_STORAGE_KEY)
    if (raw === null || raw === '') return DEFAULT_KERNING_STRENGTH
    const stored = Number(raw)
    if (Number.isFinite(stored) && stored >= 0 && stored <= 200) return stored
  } catch {}
  return DEFAULT_KERNING_STRENGTH
}

const GUIDE_OPACITY_STORAGE_KEY = 'fontmaker-guide-opacity'

function loadGuideOpacity() {
  try {
    const raw = localStorage.getItem(GUIDE_OPACITY_STORAGE_KEY)
    if (raw === null || raw === '') return 16
    const stored = Number(raw)
    if (Number.isFinite(stored) && stored >= 0 && stored <= 100) return stored
  } catch {}
  return 16
}

const CUSTOM_GUIDE_FONT_NAME = 'FontMakerCustomGuide'
let customGuideFontFace = null

async function loadCustomGuideFont(file) {
  const buffer = await file.arrayBuffer()
  if (customGuideFontFace) {
    document.fonts.delete(customGuideFontFace)
    customGuideFontFace = null
  }
  const face = new FontFace(CUSTOM_GUIDE_FONT_NAME, buffer)
  await face.load()
  document.fonts.add(face)
  customGuideFontFace = face
  return `"${CUSTOM_GUIDE_FONT_NAME}"`
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

function seedGlyphPathCache(strokes, brushSize, sideBearing, contours) {
  const result = pathFromContours(contours, sideBearing)
  glyphPathCache.set(strokes, { brushSize, sideBearing, result })
  return result
}

function computeGlyphContours(strokes, brushSize) {
  const hasContent = strokes.some(s => isOutlineStroke(s) ? s.contours.length > 0 : s.length > 0)
  if (!hasContent) return []

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

  const result = []
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

    result.push(dedup)
  }

  return result
}

function pathFromContours(contours, sideBearing) {
  const path = new Path()

  for (const dedup of contours) {
    path.moveTo(dedup[0].x, dedup[0].y)
    for (let k = 1; k < dedup.length; k++) path.lineTo(dedup[k].x, dedup[k].y)
    path.close()
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
    
    path.boundingBox = undefined
  }

  return { path, advanceWidth: glyphAdvanceWidth }
}

function buildGlyphPath(strokes, brushSize, sideBearing) {
  const contours = computeGlyphContours(strokes, brushSize)
  return pathFromContours(contours, sideBearing)
}

function resampleStroke(points, spacing) {
  if (points.length < 2) return points
  const result = [{ x: points[0].x, y: points[0].y }]
  let carry = 0
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const segLen = Math.hypot(dx, dy)
    if (segLen === 0) continue
    let remaining = segLen
    while (remaining + carry >= spacing) {
      const t = 1 - (remaining + carry - spacing) / segLen
      result.push({ x: a.x + dx * t, y: a.y + dy * t })
      remaining -= spacing - carry
      carry = 0
    }
    carry += remaining
  }
  const last = points[points.length - 1]
  const tail = Math.hypot(result[result.length - 1].x - last.x, result[result.length - 1].y - last.y)
  if (tail > spacing * 0.25) result.push({ x: last.x, y: last.y })
  return result
}

function smoothStroke(points, intensity) {
  if (intensity <= 0 || points.length < 3) return points

  const resampled = resampleStroke(points, 5)
  if (resampled.length < 3) return points

  const tolerance = 0.25 + (intensity / 100) * 2.5
  const simplified = douglasPeucker(resampled, tolerance)
  if (simplified.length < 3) return points

  const radius = Math.max(1, Math.round((intensity / 100) * 4))
  const passes = Math.max(1, Math.round((intensity / 100) * 3))

  let pts = simplified
  for (let pass = 0; pass < passes; pass++) {
    const next = pts.map((p, i) => {
      let sx = 0
      let sy = 0
      let count = 0
      const lo = Math.max(0, i - radius)
      const hi = Math.min(pts.length - 1, i + radius)
      for (let j = lo; j <= hi; j++) {
        sx += pts[j].x
        sy += pts[j].y
        count++
      }
      return { x: sx / count, y: sy / count }
    })
    pts = next
  }

  pts[0] = { x: points[0].x, y: points[0].y }
  pts[pts.length - 1] = { x: points[points.length - 1].x, y: points[points.length - 1].y }
  return pts
}

function drawGlyph(ctx, char, guideFont, brushSize, strokes, guideOpacity = 16) {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

  const opacity = guideOpacity / 100

  if (opacity > 0) {
    ctx.font = `${CANVAS_SIZE * 0.72}px ${guideFont}`
    ctx.fillStyle = `rgba(167, 139, 250, ${opacity})`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(char, CANVAS_SIZE / 2, CANVAS_SIZE / 2 + CANVAS_SIZE * 0.04)

    ctx.strokeStyle = `rgba(167, 139, 250, ${opacity * 0.5})`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, CANVAS_SIZE * 0.75)
    ctx.lineTo(CANVAS_SIZE, CANVAS_SIZE * 0.75)
    ctx.stroke()
  }

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

const KERN_SAMPLE_STEPS = 40
const KERN_TARGET_GAP = UNITS_PER_EM * 0.045
const KERN_MAX_ADJUST = UNITS_PER_EM * 0.14

const KERN_ZONE_WEIGHT = 2.2
const KERN_STRAIGHT_SLOPE_THRESHOLD = 0.06
const KERN_ROUND_SPREAD_THRESHOLD = 0.1

function glyphSideProfiles(path, advanceWidth, char) {
  const box = path.getBoundingBox()
  if (box.x1 === box.x2 || box.y1 === box.y2) return null

  const polygons = []
  let current = []
  let cursor = { x: 0, y: 0 }
  let start = { x: 0, y: 0 }
  for (const cmd of path.commands) {
    if (cmd.type === 'M') {
      if (current.length > 0) polygons.push(current)
      cursor = { x: cmd.x, y: cmd.y }
      start = cursor
      current = [cursor]
    } else if (cmd.type === 'L') {
      cursor = { x: cmd.x, y: cmd.y }
      current.push(cursor)
    } else if (cmd.type === 'Q') {
      const pts = []
      flattenQuadTo(cursor, { x: cmd.x1, y: cmd.y1 }, { x: cmd.x, y: cmd.y }, 6, pts)
      current.push(...pts)
      cursor = { x: cmd.x, y: cmd.y }
    } else if (cmd.type === 'C') {
      const pts = []
      flattenCubicTo(cursor, { x: cmd.x1, y: cmd.y1 }, { x: cmd.x2, y: cmd.y2 }, { x: cmd.x, y: cmd.y }, 6, pts)
      current.push(...pts)
      cursor = { x: cmd.x, y: cmd.y }
    } else if (cmd.type === 'Z') {
      if (current.length > 0) polygons.push(current)
      current = []
      cursor = start
    }
  }
  if (current.length > 0) polygons.push(current)
  if (polygons.length === 0) return null

  const left = new Array(KERN_SAMPLE_STEPS).fill(Infinity)
  const right = new Array(KERN_SAMPLE_STEPS).fill(-Infinity)
  const yTop = box.y2
  const yBottom = box.y1
  const ySpan = yTop - yBottom

  for (let i = 0; i < KERN_SAMPLE_STEPS; i++) {
    const t = (i + 0.5) / KERN_SAMPLE_STEPS
    const y = yBottom + t * ySpan
    for (const poly of polygons) {
      for (let k = 0; k < poly.length; k++) {
        const a = poly[k]
        const b = poly[(k + 1) % poly.length]
        if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) {
          const x = a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x)
          if (x < left[i]) left[i] = x
          if (x > right[i]) right[i] = x
        }
      }
    }
  }

  const isLower = typeof char === 'string' && char === char.toLowerCase() && char !== char.toUpperCase()
  const zoneWeights = new Array(KERN_SAMPLE_STEPS)
  const zoneLo = isLower ? yBottom + ySpan * 0.08 : yBottom + ySpan * 0.04
  const zoneHi = isLower ? yBottom + ySpan * 0.62 : yBottom + ySpan * 0.96
  for (let i = 0; i < KERN_SAMPLE_STEPS; i++) {
    const t = (i + 0.5) / KERN_SAMPLE_STEPS
    const y = yBottom + t * ySpan
    zoneWeights[i] = (y >= zoneLo && y <= zoneHi) ? KERN_ZONE_WEIGHT : 1
  }

  return classifyGlyphSides({ left, right, box, advanceWidth, zoneWeights })
}

function classifySide(edgeValues) {
  const known = []
  for (let i = 0; i < edgeValues.length; i++) {
    const v = edgeValues[i]
    if (v !== Infinity && v !== -Infinity) known.push(v)
  }
  if (known.length < 2) return { shape: 'flat', spread: 0, slope: 0 }

  const first = known[0]
  const last = known[known.length - 1]
  const span = Math.max(1, known.length - 1)
  const slope = Math.abs(last - first) / (UNITS_PER_EM * span / KERN_SAMPLE_STEPS)

  let minV = Infinity
  let maxV = -Infinity
  for (const v of known) {
    if (v < minV) minV = v
    if (v > maxV) maxV = v
  }
  const spread = (maxV - minV) / UNITS_PER_EM

  let shape
  if (spread > KERN_ROUND_SPREAD_THRESHOLD) {
    const mid = known[Math.floor(known.length / 2)]
    const bulgesOut = mid > (first + last) / 2
    shape = bulgesOut ? 'round' : 'concave'
  } else if (slope > KERN_STRAIGHT_SLOPE_THRESHOLD) {
    shape = 'diagonal'
  } else {
    shape = 'flat'
  }
  return { shape, spread, slope }
}

function classifyGlyphSides(profile) {
  profile.leftShape = classifySide(profile.left)
  profile.rightShape = classifySide(profile.right)
  return profile
}

const SHAPE_GAP_FACTOR = {
  'flat|flat': 1.08,
  'flat|round': 0.98,
  'round|flat': 0.98,
  'round|round': 0.88,
  'flat|diagonal': 0.94,
  'diagonal|flat': 0.94,
  'diagonal|diagonal': 0.82,
  'round|diagonal': 0.85,
  'diagonal|round': 0.85,
  'concave|flat': 1.0,
  'flat|concave': 1.0,
  'concave|round': 0.92,
  'round|concave': 0.92,
  'concave|concave': 0.8,
  'concave|diagonal': 0.82,
  'diagonal|concave': 0.82,
}

function shapeTargetGap(leftShape, rightShape) {
  const key = `${leftShape}|${rightShape}`
  const factor = SHAPE_GAP_FACTOR[key] ?? 1
  return KERN_TARGET_GAP * factor
}

function computeAutoKerningValue(leftProfile, rightProfile) {
  if (!leftProfile || !rightProfile) return 0

  const gaps = []
  const weights = []
  let minGap = Infinity

  for (let i = 0; i < KERN_SAMPLE_STEPS; i++) {
    const leftEdge = leftProfile.right[i]
    const rightEdge = rightProfile.left[i]
    if (leftEdge === -Infinity || rightEdge === Infinity) continue
    const gap = (leftProfile.advanceWidth - leftEdge) + rightEdge
    gaps.push(gap)
    weights.push(leftProfile.zoneWeights[i] * rightProfile.zoneWeights[i])
    if (gap < minGap) minGap = gap
  }
  if (gaps.length === 0) return 0

  const nearMinBand = minGap + UNITS_PER_EM * 0.02
  let bandSum = 0
  let bandWeight = 0
  for (let i = 0; i < gaps.length; i++) {
    if (gaps[i] <= nearMinBand) {
      bandSum += gaps[i] * weights[i]
      bandWeight += weights[i]
    }
  }
  const effectiveGap = bandWeight > 0 ? bandSum / bandWeight : minGap

  const target = shapeTargetGap(leftProfile.rightShape.shape, rightProfile.leftShape.shape)
  const adjust = target - effectiveGap
  return Math.max(-KERN_MAX_ADJUST, Math.min(KERN_MAX_ADJUST, Math.round(adjust)))
}

function computeAutoKerningTable(strokesRefs, brushSize) {
  const profiles = {}
  for (const char of ALL_CHARS) {
    const strokes = strokesRefs.current[char]
    if (!strokes || strokes.length === 0) continue
    const { path, advanceWidth } = buildGlyphPathCached(strokes, brushSize, 50)
    profiles[char] = glyphSideProfiles(path, advanceWidth, char)
  }

  const table = {}
  for (const l of ALL_CHARS) {
    if (!profiles[l]) continue
    for (const r of ALL_CHARS) {
      if (!profiles[r]) continue
      const value = computeAutoKerningValue(profiles[l], profiles[r])
      if (value !== 0) table[`${l}|${r}`] = value
    }
  }
  return table
}

const kerningTableCache = new WeakMap()

function getKerningTableCached(strokesRefs, brushSize, version) {
  let entry = kerningTableCache.get(strokesRefs)
  if (entry && entry.brushSize === brushSize && entry.version === version) {
    return entry.table
  }
  const table = computeAutoKerningTable(strokesRefs, brushSize)
  kerningTableCache.set(strokesRefs, { brushSize, version, table })
  return table
}

const DEFAULT_SPACE_WIDTH = Math.round(UNITS_PER_EM * 0.32)
const SPACE_WIDTH_FACTOR = 0.62

function computeAutoSpaceWidth(strokesRefs, brushSize) {
  let totalWidth = 0
  let totalInset = 0
  let count = 0

  for (const char of ALL_CHARS) {
    if (char === ' ') continue
    const strokes = strokesRefs.current[char]
    if (!strokes || strokes.length === 0) continue

    const { path, advanceWidth } = buildGlyphPathCached(strokes, brushSize, 50)
    const profile = glyphSideProfiles(path, advanceWidth, char)
    if (!profile) continue

    let rightMost = -Infinity
    let leftMost = Infinity
    for (let i = 0; i < KERN_SAMPLE_STEPS; i++) {
      if (profile.right[i] !== -Infinity && profile.right[i] > rightMost) rightMost = profile.right[i]
      if (profile.left[i] !== Infinity && profile.left[i] < leftMost) leftMost = profile.left[i]
    }
    if (rightMost === -Infinity || leftMost === Infinity) continue

    const rightBearing = advanceWidth - rightMost
    const leftBearing = leftMost
    totalInset += rightBearing + leftBearing
    totalWidth += advanceWidth
    count++
  }

  if (count === 0) return DEFAULT_SPACE_WIDTH

  const avgWidth = totalWidth / count
  const avgInset = totalInset / count
  const inkWidth = Math.max(avgWidth - avgInset, avgWidth * 0.3)
  const spaceWidth = inkWidth * SPACE_WIDTH_FACTOR + avgInset

  return Math.round(Math.min(Math.max(spaceWidth, UNITS_PER_EM * 0.15), UNITS_PER_EM * 0.55))
}

const spaceWidthCache = new WeakMap()

function getAutoSpaceWidthCached(strokesRefs, brushSize, version) {
  let entry = spaceWidthCache.get(strokesRefs)
  if (entry && entry.brushSize === brushSize && entry.version === version) {
    return entry.width
  }
  const width = computeAutoSpaceWidth(strokesRefs, brushSize)
  spaceWidthCache.set(strokesRefs, { brushSize, version, width })
  return width
}

function getKerningAdjustment(kerningTable, kerningStrength, l, r) {
  if (!kerningTable) return 0
  const raw = kerningTable[`${l}|${r}`]
  if (!raw) return 0
  const effectiveStrength = kerningStrength === 0 ? 100 : kerningStrength
  return Math.round(raw * (effectiveStrength / 100))
}

function pad4(n) {
  return (n + 3) & ~3
}

function computeTableChecksum(bytes) {
  const padded = pad4(bytes.byteLength)
  const paddedBytes = new Uint8Array(padded)
  paddedBytes.set(bytes)
  const view = new DataView(paddedBytes.buffer)
  let sum = 0
  for (let i = 0; i < padded / 4; i++) {
    sum = (sum + view.getUint32(i * 4)) >>> 0
  }
  return sum
}

const KERN_SUBTABLE_HEADER_SIZE = 14
const KERN_MAX_PAIRS_PER_SUBTABLE = Math.floor((0xFFFF - KERN_SUBTABLE_HEADER_SIZE) / 6)

function encodeKernSubtable(entries) {
  const nPairs = entries.length
  let searchRange = 1
  let entrySelector = 0
  while (searchRange * 2 <= nPairs) {
    searchRange *= 2
    entrySelector++
  }
  searchRange *= 6
  const rangeShift = nPairs * 6 - searchRange

  const subtableBodySize = 8 + nPairs * 6
  const subtableSize = 6 + subtableBodySize

  const buf = new ArrayBuffer(subtableSize)
  const view = new DataView(buf)
  let o = 0
  view.setUint16(o, 0); o += 2
  view.setUint16(o, subtableSize); o += 2
  view.setUint16(o, 0x0001); o += 2

  view.setUint16(o, nPairs); o += 2
  view.setUint16(o, searchRange); o += 2
  view.setUint16(o, entrySelector); o += 2
  view.setUint16(o, rangeShift); o += 2

  for (const e of entries) {
    view.setUint16(o, e.left); o += 2
    view.setUint16(o, e.right); o += 2
    view.setInt16(o, e.value); o += 2
  }

  return buf
}

function makeKernTableBuffer(kerningPairs) {
  const entries = Object.keys(kerningPairs)
    .map(key => {
      const [l, r] = key.split(',').map(Number)
      return { left: l, right: r, value: kerningPairs[key] }
    })
    .filter(e => e.value !== 0)
    .sort((a, b) => (a.left - b.left) || (a.right - b.right))

  if (entries.length === 0) return null

  const subtables = []
  for (let i = 0; i < entries.length; i += KERN_MAX_PAIRS_PER_SUBTABLE) {
    subtables.push(encodeKernSubtable(entries.slice(i, i + KERN_MAX_PAIRS_PER_SUBTABLE)))
  }

  const totalSize = 4 + subtables.reduce((sum, s) => sum + s.byteLength, 0)
  const buf = new ArrayBuffer(totalSize)
  const view = new DataView(buf)
  const bytes = new Uint8Array(buf)
  let o = 0
  view.setUint16(o, 0); o += 2
  view.setUint16(o, subtables.length); o += 2
  for (const subtable of subtables) {
    bytes.set(new Uint8Array(subtable), o)
    o += subtable.byteLength
  }

  return buf
}

function makeGposTableBuffer(kerningPairs) {
  const entries = Object.keys(kerningPairs)
    .map(key => {
      const [l, r] = key.split(',').map(Number)
      return { left: l, right: r, value: kerningPairs[key] }
    })
    .filter(e => Number.isFinite(e.left) && Number.isFinite(e.right) && e.value !== 0)
    .sort((a, b) => (a.left - b.left) || (a.right - b.right))

  if (entries.length === 0) return null

  const byLeft = new Map()
  for (const e of entries) {
    if (!byLeft.has(e.left)) byLeft.set(e.left, [])
    byLeft.get(e.left).push({ right: e.right, value: e.value })
  }
  const leftGlyphs = Array.from(byLeft.keys()).sort((a, b) => a - b)

  const VALUE_FORMAT1 = 0x0004
  const VALUE_FORMAT2 = 0x0000

  const pairSetCount = leftGlyphs.length
  const subtableHeaderSize = 2 + 2 + 2 + 2 + 2 + pairSetCount * 2

  const pairSetBlobs = leftGlyphs.map(left => {
    const pairs = byLeft.get(left).sort((a, b) => a.right - b.right)
    const size = 2 + pairs.length * (2 + 2)
    const buf = new ArrayBuffer(size)
    const view = new DataView(buf)
    let o = 0
    view.setUint16(o, pairs.length); o += 2
    for (const p of pairs) {
      view.setUint16(o, p.right); o += 2
      view.setInt16(o, p.value); o += 2
    }
    return buf
  })

  const coverageSize = 2 + 2 + leftGlyphs.length * 2
  const coverageBuf = new ArrayBuffer(coverageSize)
  {
    const view = new DataView(coverageBuf)
    let o = 0
    view.setUint16(o, 1); o += 2
    view.setUint16(o, leftGlyphs.length); o += 2
    for (const g of leftGlyphs) { view.setUint16(o, g); o += 2 }
  }

  let cursor = subtableHeaderSize
  const pairSetOffsets = pairSetBlobs.map(blob => {
    const start = cursor
    cursor += blob.byteLength
    return start
  })
  const coverageOffset = cursor
  cursor += coverageBuf.byteLength
  const subtableSize = cursor

  const subtableBuf = new ArrayBuffer(subtableSize)
  const subtableView = new DataView(subtableBuf)
  const subtableBytes = new Uint8Array(subtableBuf)
  {
    let o = 0
    subtableView.setUint16(o, 1); o += 2
    subtableView.setUint16(o, coverageOffset); o += 2
    subtableView.setUint16(o, VALUE_FORMAT1); o += 2
    subtableView.setUint16(o, VALUE_FORMAT2); o += 2
    subtableView.setUint16(o, pairSetCount); o += 2
    for (const off of pairSetOffsets) { subtableView.setUint16(o, off); o += 2 }

    pairSetBlobs.forEach((blob, i) => {
      subtableBytes.set(new Uint8Array(blob), pairSetOffsets[i])
    })
    subtableBytes.set(new Uint8Array(coverageBuf), coverageOffset)
  }

  const lookupHeaderSize = 2 + 2 + 2 + 2
  const lookupSize = lookupHeaderSize + subtableSize
  const lookupBuf = new ArrayBuffer(lookupSize)
  const lookupBytes = new Uint8Array(lookupBuf)
  {
    const view = new DataView(lookupBuf)
    let o = 0
    view.setUint16(o, 2); o += 2
    view.setUint16(o, 0); o += 2
    view.setUint16(o, 1); o += 2
    view.setUint16(o, lookupHeaderSize); o += 2
    lookupBytes.set(subtableBytes, lookupHeaderSize)
  }

  const lookupListHeaderSize = 2 + 2 * 1
  const lookupListSize = lookupListHeaderSize + lookupSize
  const lookupListBuf = new ArrayBuffer(lookupListSize)
  const lookupListBytes = new Uint8Array(lookupListBuf)
  {
    const view = new DataView(lookupListBuf)
    let o = 0
    view.setUint16(o, 1); o += 2
    view.setUint16(o, lookupListHeaderSize); o += 2
    lookupListBytes.set(lookupBytes, lookupListHeaderSize)
  }

  const featureTableSize = 2 + 2 + 1 * 2
  const featureListHeaderSize = 2 + (4 + 2) * 1
  const featureListSize = featureListHeaderSize + featureTableSize
  const featureListBuf = new ArrayBuffer(featureListSize)
  {
    const view = new DataView(featureListBuf)
    let o = 0
    view.setUint16(o, 1); o += 2
    view.setUint8(o, 0x6b); o += 1
    view.setUint8(o, 0x65); o += 1
    view.setUint8(o, 0x72); o += 1
    view.setUint8(o, 0x6e); o += 1
    const featureOffset = featureListHeaderSize
    view.setUint16(o, featureOffset); o += 2

    const fview = new DataView(featureListBuf, featureOffset)
    let fo = 0
    fview.setUint16(fo, 0); fo += 2
    fview.setUint16(fo, 1); fo += 2
    fview.setUint16(fo, 0); fo += 2
  }

  const langSysSize = 2 + 2 + 2 + 1 * 2
  const scriptTableSize = 2 + 2 + langSysSize
  const scriptListHeaderSize = 2 + (4 + 2) * 1
  const scriptListSize = scriptListHeaderSize + scriptTableSize
  const scriptListBuf = new ArrayBuffer(scriptListSize)
  {
    const view = new DataView(scriptListBuf)
    let o = 0
    view.setUint16(o, 1); o += 2
    view.setUint8(o, 0x44); o += 1
    view.setUint8(o, 0x46); o += 1
    view.setUint8(o, 0x4c); o += 1
    view.setUint8(o, 0x54); o += 1
    const scriptOffset = scriptListHeaderSize
    view.setUint16(o, scriptOffset); o += 2

    const sview = new DataView(scriptListBuf, scriptOffset)
    let so = 0
    const defaultLangSysOffset = 2 + 2
    sview.setUint16(so, defaultLangSysOffset); so += 2
    sview.setUint16(so, 0); so += 2

    const lview = new DataView(scriptListBuf, scriptOffset + defaultLangSysOffset)
    let lo = 0
    lview.setUint16(lo, 0); lo += 2
    lview.setUint16(lo, 0xFFFF); lo += 2
    lview.setUint16(lo, 1); lo += 2
    lview.setUint16(lo, 0); lo += 2
  }

  const headerSize = 2 + 2 + 2 + 2 + 2
  const scriptListOffset = headerSize
  const featureListOffset = scriptListOffset + scriptListSize
  const lookupListOffset = featureListOffset + featureListSize
  const totalSize = lookupListOffset + lookupListSize

  const out = new ArrayBuffer(totalSize)
  const outView = new DataView(out)
  const outBytes = new Uint8Array(out)
  let o = 0
  outView.setUint16(o, 1); o += 2
  outView.setUint16(o, 0); o += 2
  outView.setUint16(o, scriptListOffset); o += 2
  outView.setUint16(o, featureListOffset); o += 2
  outView.setUint16(o, lookupListOffset); o += 2

  outBytes.set(new Uint8Array(scriptListBuf), scriptListOffset)
  outBytes.set(new Uint8Array(featureListBuf), featureListOffset)
  outBytes.set(new Uint8Array(lookupListBuf), lookupListOffset)

  return out
}

function injectKernTable(arrayBuffer, kerningPairs, lineMetrics = null) {
  const kernData = makeKernTableBuffer(kerningPairs)
  const gposData = makeGposTableBuffer(kerningPairs)
  if (!kernData && !gposData && !lineMetrics) return arrayBuffer

  const src = new DataView(arrayBuffer)
  const sfntVersion = src.getUint32(0)
  const numTables = src.getUint16(4)

  const tables = []
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16
    const tag = String.fromCharCode(
      src.getUint8(rec), src.getUint8(rec + 1), src.getUint8(rec + 2), src.getUint8(rec + 3)
    )
    const offset = src.getUint32(rec + 8)
    const length = src.getUint32(rec + 12)
    tables.push({ tag, offset, length, data: arrayBuffer.slice(offset, offset + length) })
  }

  if (lineMetrics) {
    for (const t of tables) {
      if (t.tag === 'hhea' && t.data.byteLength >= 36) {
        const dv = new DataView(t.data)
        dv.setInt16(4, lineMetrics.ascender)
        dv.setInt16(6, lineMetrics.descender)
        dv.setInt16(8, lineMetrics.lineGap)
        t.checksum = computeTableChecksum(new Uint8Array(t.data))
      } else if (t.tag === 'OS/2' && t.data.byteLength >= 78) {
        const dv = new DataView(t.data)
        dv.setInt16(68, lineMetrics.ascender)
        dv.setInt16(70, lineMetrics.descender)
        dv.setInt16(72, lineMetrics.lineGap)
        dv.setUint16(74, Math.max(0, lineMetrics.ascender))
        dv.setUint16(76, Math.max(0, -lineMetrics.descender))
        t.checksum = computeTableChecksum(new Uint8Array(t.data))
      } else if (t.tag === 'head' && t.data.byteLength >= 54) {
        const dv = new DataView(t.data)
        if (lineMetrics.xMin !== undefined) dv.setInt16(36, lineMetrics.xMin)
        if (lineMetrics.yMin !== undefined) dv.setInt16(38, lineMetrics.yMin)
        if (lineMetrics.xMax !== undefined) dv.setInt16(40, lineMetrics.xMax)
        if (lineMetrics.yMax !== undefined) dv.setInt16(42, lineMetrics.yMax)
        t.checksum = computeTableChecksum(new Uint8Array(t.data))
      }
    }
  }

  if (kernData) {
    tables.push({
      tag: 'kern',
      length: kernData.byteLength,
      data: kernData,
      checksum: computeTableChecksum(new Uint8Array(kernData)),
    })
  }

  if (gposData) {
    tables.push({
      tag: 'GPOS',
      length: gposData.byteLength,
      data: gposData,
      checksum: computeTableChecksum(new Uint8Array(gposData)),
    })
  }

  for (const t of tables) {
    if (t.checksum === undefined) {
      t.checksum = computeTableChecksum(new Uint8Array(t.data))
    }
  }

  tables.sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0))

  const newNumTables = tables.length
  let searchRange = 1
  let entrySelector = 0
  while (searchRange * 2 <= newNumTables) {
    searchRange *= 2
    entrySelector++
  }
  searchRange *= 16
  const rangeShift = newNumTables * 16 - searchRange

  const headerSize = 12 + newNumTables * 16
  let cursor = headerSize
  const layout = tables.map(t => {
    const start = cursor
    cursor += pad4(t.length)
    return { ...t, newOffset: start }
  })

  const totalSize = cursor
  const out = new ArrayBuffer(totalSize)
  const outView = new DataView(out)
  const outBytes = new Uint8Array(out)

  outView.setUint32(0, sfntVersion)
  outView.setUint16(4, newNumTables)
  outView.setUint16(6, searchRange)
  outView.setUint16(8, entrySelector)
  outView.setUint16(10, rangeShift)

  let headOffsetInFile = -1
  let headRecordIndex = -1

  layout.forEach((t, i) => {
    const rec = 12 + i * 16
    for (let c = 0; c < 4; c++) outView.setUint8(rec + c, t.tag.charCodeAt(c))
    outView.setUint32(rec + 4, t.checksum)
    outView.setUint32(rec + 8, t.newOffset)
    outView.setUint32(rec + 12, t.length)

    outBytes.set(new Uint8Array(t.data), t.newOffset)
    if (t.tag === 'head') {
      headOffsetInFile = t.newOffset
      headRecordIndex = i
    }
  })

  if (headOffsetInFile >= 0) {
    outView.setUint32(headOffsetInFile + 8, 0)

    const headLength = layout[headRecordIndex].length
    const headBytes = new Uint8Array(out, headOffsetInFile, headLength)
    const headRec = 12 + headRecordIndex * 16
    outView.setUint32(headRec + 4, computeTableChecksum(headBytes))

    let fullChecksum = 0
    const fullView = new DataView(out, 0, pad4(totalSize))
    const fullLen = pad4(totalSize) / 4
    for (let i = 0; i < fullLen; i++) {
      fullChecksum = (fullChecksum + fullView.getUint32(i * 4)) >>> 0
    }
    const checksumAdjustment = (0xB1B0AFBA - fullChecksum) >>> 0
    outView.setUint32(headOffsetInFile + 8, checksumAdjustment)
  }

  return out
}

function convertCffToTrueType(arrayBuffer) {
  const editorFont = createFontEditorFont(arrayBuffer, {
    type: 'otf',
    kerning: false,
    hinting: false,
  })
  const ttfBuffer = editorFont.write({ type: 'ttf', kerning: false })
  return ttfBuffer.buffer
    ? ttfBuffer.buffer.slice(ttfBuffer.byteOffset, ttfBuffer.byteOffset + ttfBuffer.byteLength)
    : ttfBuffer
}

const WOFF2_WASM_URL = 'https://unpkg.com/fonteditor-core@2.6.3/woff2/woff2.wasm'
let woff2InitPromise = null

function ensureWoff2Ready() {
  if (woff2.isInited()) return Promise.resolve()
  if (!woff2InitPromise) woff2InitPromise = woff2.init(WOFF2_WASM_URL)
  return woff2InitPromise
}

async function convertTrueTypeToWoff2(ttfArrayBuffer) {
  await ensureWoff2Ready()
  const encoded = woff2.encode(ttfArrayBuffer)
  return encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength)
}

function measureGlyphVerticalExtent(strokes, brushSize) {
  if (!strokes || strokes.length === 0) return null
  const { path } = buildGlyphPathCached(strokes, brushSize, 50)
  const box = path.getBoundingBox()
  if (box.y1 === box.y2) return null
  return { minY: box.y1, maxY: box.y2 }
}

function computeTextMetrics(strokesRefs, brushSize, fontSize) {
  const fontScale = fontSize / UNITS_PER_EM
  let minY = Infinity
  let maxY = -Infinity
  let found = false
  for (const char of ALL_CHARS) {
    const extent = measureGlyphVerticalExtent(strokesRefs.current[char], brushSize)
    if (!extent) continue
    found = true
    minY = Math.min(minY, extent.minY)
    maxY = Math.max(maxY, extent.maxY)
  }
  if (!found) {
    return { baselineOffset: fontSize * 0.85, lineHeight: fontSize * 1.35, descenderDepth: fontSize * 1.35 }
  }
  const glyphHeight = (maxY - minY) * fontScale
  const lineHeight = Math.round(glyphHeight + Math.max(fontSize * 0.15, 8))
  const baselineOffset = Math.round(maxY * fontScale + 10)
  const descenderDepth = -minY * fontScale
  return { baselineOffset, lineHeight, descenderDepth }
}

function layoutTextToLines(text, strokesRefs, brushSize, fontSize, options = {}) {
  const calculatedLineHeight = options.lineHeight || computeTextMetrics(strokesRefs, brushSize, fontSize).lineHeight
  const { maxWidth = Infinity, lineHeight = calculatedLineHeight, kerningTable = null, kerningStrength = 100, spaceWidth = DEFAULT_SPACE_WIDTH } = options
  const fontScale = fontSize / UNITS_PER_EM

  const lines = []
  let current = []
  let currentWidth = 0

  const flushLine = () => {
    lines.push(current)
    current = []
    currentWidth = 0
  }

  const kernBefore = (char) => {
    if (current.length === 0) return 0
    const prevChar = current[current.length - 1].char
    return getKerningAdjustment(kerningTable, kerningStrength, prevChar, char)
  }

  const pushChar = (char, w) => {
    const k = char === ' ' ? 0 : kernBefore(char)
    current.push({ char, w, k })
    currentWidth += (w + k) * fontScale
  }

  const wrapWord = (word) => {
    if (current.length > 0) flushLine()
    for (const char of word) {
      const strokes = strokesRefs.current[char]
      const w = measureGlyphWidth(strokes, brushSize)
      const k = kernBefore(char)
      if (currentWidth + (w + k) * fontScale > maxWidth && current.length > 0) flushLine()
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
    width: lines.reduce((acc, line) => Math.max(acc, line.reduce((a, c) => a + (c.w + c.k) * fontScale, 0)), 0),
    height: Math.max(lines.length, 1) * lineHeight,
  }
}

function renderTextToCanvas(ctx, text, strokesRefs, brushSize, fontSize, options = {}) {
  const { color = '#e9e4f0', maxWidth = Infinity, lineHeight = fontSize * 1.3, kerningTable = null, kerningStrength = 100, spaceWidth = DEFAULT_SPACE_WIDTH } = options
  const fontScale = fontSize / UNITS_PER_EM

  ctx.fillStyle = color

  const layout = layoutTextToLines(text, strokesRefs, brushSize, fontSize, { maxWidth, lineHeight, kerningTable, kerningStrength, spaceWidth })

  layout.lines.forEach((line, lineIndex) => {
    let penX = 0
    for (const { char, w, k } of line) {
      if (char === ' ') {
        penX += spaceWidth * fontScale
        continue
      }

      penX += (k || 0) * fontScale

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
  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return ctx
}

function snapAngle(from, to) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.hypot(dx, dy)
  if (dist === 0) return to
  const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4)
  return {
    x: from.x + Math.cos(angle) * dist,
    y: from.y + Math.sin(angle) * dist,
  }
}

function measureGuideGlyphBounds(char, guideFont) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  ctx.font = `${CANVAS_SIZE * 0.72}px ${guideFont}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const originX = CANVAS_SIZE / 2
  const originY = CANVAS_SIZE / 2 + CANVAS_SIZE * 0.04
  const metrics = ctx.measureText(char)
  const left = metrics.actualBoundingBoxLeft
  const right = metrics.actualBoundingBoxRight
  const ascent = metrics.actualBoundingBoxAscent
  const descent = metrics.actualBoundingBoxDescent
  if (![left, right, ascent, descent].every(Number.isFinite) || left + right <= 0 || ascent + descent <= 0) {
    return null
  }
  return {
    minX: originX - left,
    maxX: originX + right,
    minY: originY - ascent,
    maxY: originY + descent,
  }
}

function centerStrokes(strokes, guideBounds = null) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  let found = false

  for (const stroke of strokes) {
    if (isOutlineStroke(stroke)) {
      for (const contour of stroke.contours) {
        for (const p of contour) {
          found = true
          if (p.x < minX) minX = p.x
          if (p.x > maxX) maxX = p.x
          if (p.y < minY) minY = p.y
          if (p.y > maxY) maxY = p.y
        }
      }
      continue
    }
    for (const p of stroke) {
      found = true
      if (p.x < minX) minX = p.x
      if (p.x > maxX) maxX = p.x
      if (p.y < minY) minY = p.y
      if (p.y > maxY) maxY = p.y
    }
  }

  if (!found) return strokes

  const targetX = guideBounds ? (guideBounds.minX + guideBounds.maxX) / 2 : CANVAS_SIZE / 2
  const targetY = guideBounds ? (guideBounds.minY + guideBounds.maxY) / 2 : CANVAS_SIZE / 2

  const shiftX = targetX - (minX + maxX) / 2
  const shiftY = targetY - (minY + maxY) / 2
  if (Math.abs(shiftX) < 0.5 && Math.abs(shiftY) < 0.5) return strokes

  const shiftPt = (p) => ({ x: p.x + shiftX, y: p.y + shiftY })

  return strokes.map(stroke => {
    if (isOutlineStroke(stroke)) {
      return { type: 'outline', contours: stroke.contours.map(c => c.map(shiftPt)) }
    }
    return stroke.map(shiftPt)
  })
}

// i feel sorry for the poor soul that decides to take on the herculean task of reading this thing. good luck, o7
export {
  CANVAS_SIZE,
  UNITS_PER_EM,
  ASCENDER,
  DESCENDER,
  SCALE,
  BASE_CHAR_GROUPS,
  CUSTOM_SYMBOLS_STORAGE_KEY,
  loadCustomSymbols,
  saveCustomSymbols,
  rebuildCharGroups,

  GUIDE_FONT_STORAGE_KEY,
  GUIDE_FONTS,
  loadGuideFont,

  BRUSH_SIZE_STORAGE_KEY,
  FONT_NAME_STORAGE_KEY,
  STEADY_HAND_STORAGE_KEY,
  SMOOTH_INTENSITY_STORAGE_KEY,
  loadBrushSize,
  loadFontName,
  loadSteadyHand,
  loadSmoothIntensity,

  KERNING_STRENGTH_STORAGE_KEY,
  DEFAULT_KERNING_STRENGTH,
  loadKerningStrength,

  GUIDE_OPACITY_STORAGE_KEY,
  loadGuideOpacity,

  CUSTOM_GUIDE_FONT_NAME,
  TRACE_SUPERSAMPLE,
  TRACE_SIZE,

  rasterizeStrokesToMask,
  traceMaskToPolygons,
  sqDistToSegment,
  douglasPeucker,
  simplifyPolygon,
  signedArea,
  pointInPolygon,

  glyphPathCache,
  buildGlyphPathCached,
  seedGlyphPathCache,
  computeGlyphContours,
  pathFromContours,
  buildGlyphPath,
  resampleStroke,
  smoothStroke,
  drawGlyph,
  pathToCanvasPolygons,
  measureGlyphWidth,

  KERN_SAMPLE_STEPS,
  KERN_TARGET_GAP,
  KERN_MAX_ADJUST,
  KERN_ZONE_WEIGHT,
  KERN_STRAIGHT_SLOPE_THRESHOLD,
  KERN_ROUND_SPREAD_THRESHOLD,
  glyphSideProfiles,
  classifySide,
  classifyGlyphSides,
  SHAPE_GAP_FACTOR,
  shapeTargetGap,
  computeAutoKerningValue,
  computeAutoKerningTable,
  kerningTableCache,
  getKerningTableCached,

  DEFAULT_SPACE_WIDTH,
  SPACE_WIDTH_FACTOR,
  computeAutoSpaceWidth,
  spaceWidthCache,
  getAutoSpaceWidthCached,
  getKerningAdjustment,

  pad4,
  computeTableChecksum,
  KERN_SUBTABLE_HEADER_SIZE,
  KERN_MAX_PAIRS_PER_SUBTABLE,
  encodeKernSubtable,
  makeKernTableBuffer,
  makeGposTableBuffer,
  injectKernTable,
  convertCffToTrueType,

  WOFF2_WASM_URL,
  ensureWoff2Ready,

  measureGlyphVerticalExtent,
  computeTextMetrics,
  layoutTextToLines,
  renderTextToCanvas,

  isOutlineStroke,
  flattenQuadTo,
  flattenCubicTo,
  fontPathToCanvasContours,
  setupCanvasDPI,
  snapAngle,
  measureGuideGlyphBounds,
  centerStrokes,
}

