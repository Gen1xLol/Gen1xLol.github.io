const CANVAS_SIZE = 480
const UNITS_PER_EM = 1000
const DESCENDER = -200
const SCALE = UNITS_PER_EM / CANVAS_SIZE
const TRACE_SUPERSAMPLE = 2
const TRACE_SIZE = CANVAS_SIZE * TRACE_SUPERSAMPLE

function isOutlineStroke(stroke) {
  return !Array.isArray(stroke) && stroke && stroke.type === 'outline'
}

function rasterizeStrokesToMask(strokes, brushSize) {
  const canvas = new OffscreenCanvas(TRACE_SIZE, TRACE_SIZE)
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

self.onmessage = (e) => {
  const { type, jobId, entries, brushSize, chunkSize = 6 } = e.data
  if (type !== 'process') return

  const total = entries.length
  const results = new Array(total)
  let i = 0

  const processChunk = () => {
    const end = Math.min(i + chunkSize, total)
    for (; i < end; i++) {
      const { char, strokes: rawStrokes } = entries[i]
      let strokes = []
      let corrupt = false

      if (rawStrokes !== undefined && rawStrokes !== null) {
        if (Array.isArray(rawStrokes)) {
          strokes = rawStrokes
        } else {
          corrupt = true
        }
      }

      let contours = []
      if (strokes.length > 0) {
        try {
          contours = computeGlyphContours(strokes, brushSize)
        } catch {
          contours = []
        }
      }

      results[i] = { char, strokes, contours, corrupt }
    }

    self.postMessage({ type: 'progress', jobId, done: i, total })

    if (i < total) {
      setTimeout(processChunk, 0)
    } else {
      self.postMessage({ type: 'complete', jobId, results })
    }
  }

  processChunk()
}
