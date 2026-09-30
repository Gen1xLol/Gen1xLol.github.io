export function traceMaskToPolygons(mask, size, bounds = null) {
  const at = (x, y) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return 0
    return mask[y * size + x]
  }

  const minX = bounds ? bounds.minX : 0
  const minY = bounds ? bounds.minY : 0
  const maxX = bounds ? bounds.maxX : size - 1
  const maxY = bounds ? bounds.maxY : size - 1
  if (maxX < minX || maxY < minY) return []

  const segments = []
  for (let y = minY; y <= maxY + 1; y++) {
    for (let x = minX; x <= maxX; x++) {
      const above = at(x, y - 1)
      const below = at(x, y)
      if (above !== below) segments.push(above ? [x + 1, y, x, y] : [x, y, x + 1, y])
    }
  }
  for (let x = minX; x <= maxX + 1; x++) {
    for (let y = minY; y <= maxY; y++) {
      const left = at(x - 1, y)
      const right = at(x, y)
      if (left !== right) segments.push(left ? [x, y, x, y + 1] : [x, y + 1, x, y])
    }
  }

  const pointKey = (x, y) => `${x},${y}`
  const adjacency = new Map()
  for (const [x1, y1, x2, y2] of segments) {
    const start = pointKey(x1, y1)
    const end = pointKey(x2, y2)
    if (!adjacency.has(start)) adjacency.set(start, [])
    adjacency.get(start).push(end)
  }

  const usedEdges = new Set()
  const edgeKey = (a, b) => `${a}>${b}`
  const polygons = []

  for (const startKey of adjacency.keys()) {
    for (const firstNeighbor of adjacency.get(startKey)) {
      const startEdge = edgeKey(startKey, firstNeighbor)
      if (usedEdges.has(startEdge)) continue

      const contour = [startKey]
      let prevKey = startKey
      let currKey = firstNeighbor
      usedEdges.add(startEdge)

      while (currKey !== startKey) {
        contour.push(currKey)
        const options = adjacency.get(currKey) || []
        const [px, py] = prevKey.split(',').map(Number)
        const [cx, cy] = currKey.split(',').map(Number)
        const inDirection = [cx - px, cy - py]
        const turnRank = candidate => {
          const [nx, ny] = candidate.split(',').map(Number)
          const outDirection = [nx - cx, ny - cy]
          const cross = inDirection[0] * outDirection[1] - inDirection[1] * outDirection[0]
          const dot = inDirection[0] * outDirection[0] + inDirection[1] * outDirection[1]
          if (cross > 0) return 0
          if (dot > 0) return 1
          if (cross < 0) return 2
          return 3
        }
        const available = options.filter(candidate => !usedEdges.has(edgeKey(currKey, candidate)))
        available.sort((a, b) => turnRank(a) - turnRank(b))
        const nextKey = available[0]
        if (nextKey === undefined) break
        usedEdges.add(edgeKey(currKey, nextKey))
        prevKey = currKey
        currKey = nextKey
      }

      if (contour.length >= 3) {
        polygons.push(contour.map(key => {
          const [x, y] = key.split(',').map(Number)
          return { x, y }
        }))
      }
    }
  }

  return polygons
}
