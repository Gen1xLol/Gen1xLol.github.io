import { useEffect, useLayoutEffect, useRef, useState } from 'react'

const margin = -40

export function calcAge() {
  // march 16th, 2010 at 12:27 UTC-3
  const birth = new Date(Date.UTC(2010, 2, 16, 15, 27, 0))
  const now = new Date()
  let y = now.getUTCFullYear() - birth.getUTCFullYear()
  const m = now.getUTCMonth() - birth.getUTCMonth()
  if (m < 0 || (m === 0 && now.getUTCDate() < birth.getUTCDate())) y--
  return y
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

const FILL_TOP = hexToRgb('#553c78')
const FILL_MID = hexToRgb('#34264f')
const FILL_BOTTOM = hexToRgb('#1c142f')

function getComputedColor(varName, fallback) {
  if (typeof window === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  return v || fallback
}

function buildLobeLayout(width, height, prevLayout, forceRandom = false) {
  const cap = Math.min(width, height) / 2.6
  const straightW = Math.max(0, width - cap * 2)
  const straightH = Math.max(0, height - cap * 2)
  const arcLen = (Math.PI / 2) * cap

  const seg1 = straightW
  const seg2 = seg1 + arcLen
  const seg3 = seg2 + straightH
  const seg4 = seg3 + arcLen
  const seg5 = seg4 + straightW
  const seg6 = seg5 + arcLen
  const seg7 = seg6 + straightH
  const perimeter = seg7 + arcLen

  const MAX_CIRCLES = 124
  const rBaseFromCap = cap * 0.42
  const rBaseMin = perimeter / (MAX_CIRCLES * 0.62)
  const rBase = Math.max(7, rBaseFromCap, rBaseMin)
  const count = Math.min(MAX_CIRCLES, Math.max(14, Math.ceil(perimeter / (rBase * 0.62))))

  const prevCircles = prevLayout && prevLayout.circles
  const prevCount = prevCircles ? prevCircles.length : 0

  const circles = []
  for (let i = 0; i < count; i++) {
    const d = (i / count) * perimeter
    let x, y, nx, ny

    if (d < seg1) {
      x = cap + d
      y = 0
      nx = 0; ny = -1
    } else if (d < seg2) {
      const t = d - seg1
      const a = -Math.PI / 2 + (t / arcLen) * (Math.PI / 2)
      x = width - cap + cap * Math.cos(a)
      y = cap + cap * Math.sin(a)
      nx = Math.cos(a); ny = Math.sin(a)
    } else if (d < seg3) {
      const t = d - seg2
      x = width
      y = cap + t
      nx = 1; ny = 0
    } else if (d < seg4) {
      const t = d - seg3
      const a = 0 + (t / arcLen) * (Math.PI / 2)
      x = width - cap + cap * Math.cos(a)
      y = height - cap + cap * Math.sin(a)
      nx = Math.cos(a); ny = Math.sin(a)
    } else if (d < seg5) {
      const t = d - seg4
      x = width - cap - t
      y = height
      nx = 0; ny = 1
    } else if (d < seg6) {
      const t = d - seg5
      const a = Math.PI / 2 + (t / arcLen) * (Math.PI / 2)
      x = cap + cap * Math.cos(a)
      y = height - cap + cap * Math.sin(a)
      nx = Math.cos(a); ny = Math.sin(a)
    } else if (d < seg7) {
      const t = d - seg6
      x = 0
      y = height - cap - t
      nx = -1; ny = 0
    } else {
      const t = d - seg7
      const a = Math.PI + (t / arcLen) * (Math.PI / 2)
      x = cap + cap * Math.cos(a)
      y = cap + cap * Math.sin(a)
      nx = Math.cos(a); ny = Math.sin(a)
    }

    let rSeed, phase, duration
    if (prevCount > 0 && !forceRandom) {
      const srcIdx = Math.min(prevCount - 1, Math.round((i / count) * prevCount))
      const src = prevCircles[srcIdx]
      rSeed = src.rSeed
      phase = src.phase
      duration = src.duration
    } else {
      rSeed = Math.random()
      phase = Math.random() * Math.PI * 2
      duration = 2.6 + Math.random() * 0.8
    }

    const r = rBase + rSeed * rBase * 0.5
    const inset = rBase * 0.35
    const jitterX = (Math.random() - 0.5) * 6
    const jitterY = (Math.random() - 0.5) * 6
    circles.push({
      x: x - nx * inset + jitterX,
      y: y - ny * inset + jitterY,
      r: r * 1.45,
      coreR: r * 1.3,
      rSeed,
      phase,
      duration,
    })
  }

  const midY = height / 2
  const bigR = 7
  const bubbleSize = Math.min(width, height)
  const tailBackOffset = Math.max(0, Math.min(24, (bubbleSize - 140) * 0.1))
  const bigAttachX = -12 - tailBackOffset
  const midDotR = 4.5
  const smallDotR = 3
  const dotGap = 12 + tailBackOffset * 0.35

  const tailDotsRaw = [
    { x: bigAttachX, r: bigR },
    { x: bigAttachX - bigR - dotGap, r: midDotR },
    { x: bigAttachX - bigR - dotGap * 2.1, r: smallDotR },
  ]
  const minX = Math.min(...tailDotsRaw.map(d => d.x - d.r))
  const svgMargin = Math.max(20, Math.ceil(-minX) + 2)

  const prevTailDots = prevLayout && prevLayout.tailDots
  const tailDurations = prevTailDots && prevTailDots.length === 3
    ? prevTailDots.map(d => d.duration)
    : [3.2 + Math.random() * 0.6, 2.6 + Math.random() * 0.8, 2.6 + Math.random() * 0.8]

  const tailDots = [
    { x: bigAttachX, y: midY, r: bigR, coreR: bigR * 0.85, phase: Math.PI * 0.06, duration: tailDurations[0], big: true },
    { x: bigAttachX - bigR - dotGap, y: midY, r: midDotR, coreR: midDotR * 0.85, phase: Math.PI * 0.2, duration: tailDurations[1] },
    { x: bigAttachX - bigR - dotGap * 2.1, y: midY, r: smallDotR, coreR: smallDotR * 0.85, phase: Math.PI * 0.33, duration: tailDurations[2] },
  ]

  const cornerInset = Math.max(3, Math.min(width, height) * 0.1)

  return { circles, tailDots, svgMargin, cornerInset, cap }
}

function measureLineWithDOM(measureElRef, lineText, fontSize) {
  if (!measureElRef.current) return null
  const el = measureElRef.current
  el.style.fontSize = `${fontSize}px`
  el.innerHTML = ''

  const textNode = document.createTextNode(lineText)
  el.appendChild(textNode)

  const containerRect = el.getBoundingClientRect()
  const range = document.createRange()

  const cumRight = []
  for (let i = 0; i < lineText.length; i++) {
    range.setStart(textNode, 0)
    range.setEnd(textNode, i + 1)
    const r = range.getBoundingClientRect()
    cumRight.push(r.right - containerRect.left)
  }

  const positions = []
  let prevRight = 0
  for (let i = 0; i < lineText.length; i++) {
    const right = cumRight[i]
    positions.push({
      x: prevRight,
      w: right - prevRight,
    })
    prevRight = right
  }

  const lineWidth = el.getBoundingClientRect().width

  return { positions, lineWidth }
}

function measureTextBlock(ctx, cleanText, fontSize, maxWidth, measureElRef) {
  ctx.save()
  ctx.font = `400 ${fontSize}px 'Gen1x Rough', cursive, sans-serif`
  const spaceWidth = ctx.measureText('\u00A0').width || fontSize * 0.3
  const words = cleanText.split(/(\s+)/)

  const lines = []
  let currentLine = []
  let currentWidth = 0

  for (const token of words) {
    if (!token.trim()) {
      currentLine.push({ isSpace: true })
      currentWidth += spaceWidth
      continue
    }
    const chars = token.split('').map(ch => ({
      ch,
      w: ctx.measureText(ch).width,
      shake: {
        durMul: 0.85 + Math.random() * 0.5,
        delayOffset: Math.random(),
        freqX: 2.2 + Math.random() * 2.2,
        freqY: 1.6 + Math.random() * 2.2,
        freqR: 1.0 + Math.random() * 1.6,
        ampX: 0.9 + Math.random() * 1.1,
        ampY: 0.7 + Math.random() * 0.9,
        ampR: 0.012 + Math.random() * 0.018,
        phaseX: Math.random() * Math.PI * 2,
        phaseY: Math.random() * Math.PI * 2,
        phaseR: Math.random() * Math.PI * 2,
        signX: Math.random() < 0.5 ? -1 : 1,
        signY: Math.random() < 0.5 ? -1 : 1,
      },
    }))
    const wordWidth = chars.reduce((sum, c) => sum + c.w, 0)
    if (currentWidth + wordWidth > maxWidth && currentLine.length > 0) {
      lines.push({ segs: currentLine, width: currentWidth })
      currentLine = []
      currentWidth = 0
    }
    currentLine.push({ chars, isSpace: false })
    currentWidth += wordWidth
  }
  if (currentLine.length) lines.push({ segs: currentLine, width: currentWidth })

  ctx.restore()

  if (measureElRef && measureElRef.current) {
    for (const line of lines) {
      let lineText = ''
      for (const seg of line.segs) {
        if (seg.isSpace) {
          lineText += ' '
        } else {
          for (const c of seg.chars) {
            lineText += c.ch
          }
        }
      }
      const measured = measureLineWithDOM(measureElRef, lineText, fontSize)
      if (measured && measured.positions.length === lineText.length) {
        let charCursor = 0
        for (const seg of line.segs) {
          if (seg.isSpace) {
            charCursor += 1
            continue
          }
          for (const c of seg.chars) {
            const pos = measured.positions[charCursor]
            c.x = pos.x
            c.w = pos.w
            charCursor += 1
          }
        }
        line.width = measured.lineWidth
      }
    }
  }

  const lineHeight = fontSize * 1.15
  const naturalWidth = Math.min(maxWidth, Math.max(0, ...lines.map(l => l.width)))
  const naturalHeight = lines.length * lineHeight

  return { lines, lineHeight, naturalWidth, naturalHeight, spaceWidth }
}

export function ThoughtBubble({ text, gap = margin, onClick, shapeSeed = 0 }) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const layoutRef = useRef(null)
  const rafRef = useRef(null)
  const startRef = useRef(null)
  const measureCanvasRef = useRef(null)
  const measureElRef = useRef(null)
  const lastTextRef = useRef(null)
  const transitionRef = useRef(null)
  const shapeTransitionRef = useRef(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [svgMargin, setSvgMargin] = useState(0)

  const isShake = typeof text === 'string' && text.startsWith('[shake]')
  const cleanText = isShake ? text.replace(/^\[shake\]\s*/, '') : text

  if (!measureCanvasRef.current && typeof document !== 'undefined') {
    measureCanvasRef.current = document.createElement('canvas')
  }

  useEffect(() => {
    if (!layoutRef.current || shapeSeed === 0) return

    const currentLayout = layoutRef.current
    const nextLayout = buildLobeLayout(currentLayout._w, currentLayout._h, currentLayout, true)
    nextLayout._w = currentLayout._w
    nextLayout._h = currentLayout._h
    nextLayout.textBlock = currentLayout.textBlock

    shapeTransitionRef.current = {
      fromLayout: currentLayout,
      fromW: currentLayout._w,
      fromH: currentLayout._h,
      fromMargin: currentLayout.svgMargin,
      toLayout: nextLayout,
      toW: currentLayout._w,
      toH: currentLayout._h,
      toMargin: nextLayout.svgMargin,
      startTime: null,
    }
  }, [shapeSeed])

  useLayoutEffect(() => {
    if (!containerRef.current) return

    const PAD_X = 10
    const PAD_Y = 4
    const FONT_SIZE = 26
    const mctx = measureCanvasRef.current.getContext('2d')

    let applying = false

    function recalc() {
      if (!containerRef.current || applying) return
      applying = true
      const isMobile = window.matchMedia('(max-width: 520px)').matches

      let maxTextWidth
      if (isMobile) {
        maxTextWidth = Math.max(40, Math.min(280, window.innerWidth * 0.9) - PAD_X * 2)
      } else {
        const row = containerRef.current.closest('.title-with-thought')
        const h1 = row ? row.querySelector('h1') : null
        const rowWidth = row ? row.getBoundingClientRect().width : 600
        const h1Width = h1 ? h1.getBoundingClientRect().width : 0
        const rowGap = 56
        const desktopCap = Math.max(160, rowWidth - h1Width - rowGap)
        maxTextWidth = Math.max(40, Math.min(420, desktopCap) - PAD_X * 2)
      }

      const block = measureTextBlock(mctx, cleanText, FONT_SIZE, maxTextWidth, measureElRef)
      const contentWidth = Math.ceil(block.naturalWidth) + PAD_X * 2
      const contentHeight = Math.ceil(block.naturalHeight) + PAD_Y * 2

      const width = contentWidth
      const height = contentHeight
      if (width === 0 || height === 0) {
        requestAnimationFrame(() => { applying = false })
        return
      }

      const prevLayout = layoutRef.current
      const textChanged = lastTextRef.current !== null && lastTextRef.current !== cleanText
      const activeShapeTarget = shapeTransitionRef.current && shapeTransitionRef.current.toLayout

      if (activeShapeTarget) {
        activeShapeTarget.textBlock = block
      }

      if (prevLayout && prevLayout._w === width && prevLayout._h === height) {
        if (textChanged && prevLayout.textBlock) {
          transitionRef.current = { outBlock: prevLayout.textBlock, startTime: null }
        }

        prevLayout.textBlock = block
        containerRef.current.style.width = `${contentWidth}px`
        containerRef.current.style.height = `${contentHeight}px`
        setSize(prev => (prev.width === width && prev.height === height ? prev : { width, height }))
        setSvgMargin(prev => (prev === prevLayout.svgMargin ? prev : prevLayout.svgMargin))
        requestAnimationFrame(() => { applying = false })
        return
      }

      const layout = buildLobeLayout(width, height, prevLayout, false)
      layout._w = width
      layout._h = height
      layout.textBlock = block

      if (textChanged && prevLayout && prevLayout.textBlock) {
        transitionRef.current = { outBlock: prevLayout.textBlock, startTime: null }
      }

      layoutRef.current = layout
      containerRef.current.style.width = `${contentWidth}px`
      containerRef.current.style.height = `${contentHeight}px`
      setSize(prev => (prev.width === width && prev.height === height ? prev : { width, height }))
      setSvgMargin(prev => (prev === layout.svgMargin ? prev : layout.svgMargin))
      requestAnimationFrame(() => { applying = false })
    }

    recalc()

    if (typeof document !== 'undefined' && document.fonts && document.fonts.load) {
      document.fonts.load(`400 ${FONT_SIZE}px 'Gen1x Rough'`).catch(() => {})
      document.fonts.ready.then(() => {
        applying = false
        recalc()
      }).catch(() => {})
    }

    const ro = new ResizeObserver(() => recalc())
    if (containerRef.current.parentElement) ro.observe(containerRef.current.parentElement)
    window.addEventListener('resize', recalc)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', recalc)
    }
  }, [text, cleanText, shapeSeed])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || size.width === 0 || size.height === 0) return

    const rawDpr = Math.max(1, window.devicePixelRatio || 1)
    const dpr = Math.min(rawDpr, 4)
    const textDpr = Math.min(4, Math.max(dpr, 2))

    const gl = canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true })
    if (!gl) return
    const textCanvas = document.createElement('canvas')
    const textCtx = textCanvas.getContext('2d')
    const textColor = getComputedColor('--purple-lt', '#c4b5fd')
    const vertexSource = `#version 300 es
      out vec2 vUv;
      void main() {
        vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
        vUv = p;
        gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
      }`
    const cloudFragmentSource = `#version 300 es
      precision highp float;
      precision highp sampler2D;
      in vec2 vUv;
      out vec4 outColor;
      uniform vec2 uSize;
      uniform float uDpr;
      uniform vec3 uBorderColor;
      uniform vec4 uFrame;
      uniform float uBorderWidth;
      uniform sampler2D uCircleData;
      uniform int uCircleCount;
      uniform vec4 uColors[3];
      float roundedRect(vec2 p, vec2 center, vec2 halfSize, float radius) {
        vec2 q = abs(p - center) - halfSize + radius;
        return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
      }
      void main() {
        vec2 p = vec2(gl_FragCoord.x / uDpr, uSize.y - gl_FragCoord.y / uDpr);
        vec2 origin = vec2(uFrame.z, uFrame.z);
        float rw = max(0.0, uFrame.x - uFrame.w * 2.0);
        float rh = max(0.0, uFrame.y - uFrame.w * 2.0);
        float radius = min(rw, rh) * 0.5;
        float dist = roundedRect(p, origin + vec2(uFrame.x * 0.5, uFrame.y * 0.5), vec2(rw, rh) * 0.5, radius);
        for (int i = 0; i < 128; i++) {
          if (i >= uCircleCount) break;
          vec4 c = texelFetch(uCircleData, ivec2(i, 0), 0);
          dist = min(dist, length(p - c.xy) - c.z);
        }
        float coverage = 1.0 - smoothstep(-fwidth(dist), fwidth(dist), dist);
        if (coverage <= 0.0) discard;
        float border = 1.0 - smoothstep(uBorderWidth - fwidth(dist), uBorderWidth + fwidth(dist), abs(dist));
        float y = clamp(p.y / uSize.y, 0.0, 1.0);
        vec3 color = y < 0.45
          ? mix(uColors[0].rgb, uColors[1].rgb, y / 0.45)
          : mix(uColors[1].rgb, uColors[2].rgb, (y - 0.45) / 0.55);
        color = mix(color, uBorderColor, border);
        outColor = vec4(color, coverage);
      }`
    const textFragmentSource = `#version 300 es
      precision highp float;
      in vec2 vUv;
      out vec4 outColor;
      uniform sampler2D uText;
      void main() {
        vec4 glyph = texture(uText, vec2(vUv.x, 1.0 - vUv.y));
        if (glyph.a <= 0.0) discard;
        outColor = glyph;
      }`
    function makeProgram(fragmentSource) {
      const compile = (type, source) => {
        const shader = gl.createShader(type)
        gl.shaderSource(shader, source)
        gl.compileShader(shader)
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader))
        return shader
      }
      const program = gl.createProgram()
      gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource))
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource))
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program))
      return program
    }
    let cloudProgram
    let textProgram
    try {
      cloudProgram = makeProgram(cloudFragmentSource)
      textProgram = makeProgram(textFragmentSource)
    } catch (error) {
      console.error('Thought bubble WebGL2 initialization failed', error)
      return
    }
    const vao = gl.createVertexArray()
    gl.bindVertexArray(vao)
    const circleTexture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, circleTexture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 128, 1, 0, gl.RGBA, gl.FLOAT, null)
    const textTexture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, textTexture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    const cloudUniforms = Object.fromEntries(['uSize', 'uDpr', 'uBorderColor', 'uFrame', 'uBorderWidth', 'uCircleData', 'uCircleCount', 'uColors[0]'].map(name => [name, gl.getUniformLocation(cloudProgram, name)]))
    const textUniforms = Object.fromEntries(['uText'].map(name => [name, gl.getUniformLocation(textProgram, name)]))

    const mobileQuery = window.matchMedia('(max-width: 520px)')

    let canvasCssW = 0
    let canvasCssH = 0
    const circleData = new Float32Array(128 * 4)
    const colorData = new Float32Array([
      FILL_TOP.r / 255, FILL_TOP.g / 255, FILL_TOP.b / 255, 1,
      FILL_MID.r / 255, FILL_MID.g / 255, FILL_MID.b / 255, 1,
      FILL_BOTTOM.r / 255, FILL_BOTTOM.g / 255, FILL_BOTTOM.b / 255, 1,
    ])

    function sizeCanvasTo(cssW, cssH) {
      if (cssW === canvasCssW && cssH === canvasCssH) return
      canvasCssW = cssW
      canvasCssH = cssH
      canvas.style.width = `${cssW}px`
      canvas.style.height = `${cssH}px`
      canvas.width = Math.round(cssW * dpr)
      canvas.height = Math.round(cssH * dpr)
      textCanvas.width = Math.round(cssW * textDpr)
      textCanvas.height = Math.round(cssH * textDpr)
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.bindTexture(gl.TEXTURE_2D, textTexture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, textCanvas.width, textCanvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    }

    sizeCanvasTo(size.width + svgMargin * 2, size.height + svgMargin * 2)

    function lerp(a, b, p) { return a + (b - a) * p }

    function interpolateLayout(shape, eased) {
      const { fromLayout, toLayout } = shape
      const w = lerp(shape.fromW, shape.toW, eased)
      const h = lerp(shape.fromH, shape.toH, eased)
      const svgMargin = lerp(shape.fromMargin, shape.toMargin, eased)
      const cornerInset = lerp(fromLayout.cornerInset, toLayout.cornerInset, eased)

      const toCount = toLayout.circles.length
      const circles = toLayout.circles.map((toC, i) => {
        const fromIdx = Math.min(fromLayout.circles.length - 1, Math.round((i / toCount) * fromLayout.circles.length))
        const fromC = fromLayout.circles[fromIdx]
        return {
          x: lerp(fromC.x, toC.x, eased),
          y: lerp(fromC.y, toC.y, eased),
          r: lerp(fromC.r, toC.r, eased),
          coreR: lerp(fromC.coreR, toC.coreR, eased),
          phase: toC.phase,
          duration: toC.duration,
        }
      })

      const tailDots = toLayout.tailDots.map((toD, i) => {
        const fromD = fromLayout.tailDots[i] || toD
        return {
          x: lerp(fromD.x, toD.x, eased),
          y: lerp(fromD.y, toD.y, eased),
          r: lerp(fromD.r, toD.r, eased),
          coreR: lerp(fromD.coreR, toD.coreR, eased),
          phase: toD.phase,
          duration: toD.duration,
          big: toD.big,
        }
      })

      return { width: w, height: h, svgMargin, cornerInset, circles, tailDots }
    }

    function draw(now) {
      if (startRef.current === null) startRef.current = now
      const t = (now - startRef.current) / 1000
      const layout = layoutRef.current
      if (!layout) {
        rafRef.current = requestAnimationFrame(draw)
        return
      }

      const SHAPE_TRANSITION_MS = 280
      const shape = shapeTransitionRef.current
      let frame

      if (shape) {
        if (shape.startTime === null) shape.startTime = now
        const elapsed = now - shape.startTime
        const progress = Math.min(1, elapsed / SHAPE_TRANSITION_MS)
        const eased = 1 - Math.pow(1 - progress, 2)

        const maxW = Math.max(shape.fromW, shape.toW) + Math.max(shape.fromMargin, shape.toMargin) * 2
        const maxH = Math.max(shape.fromH, shape.toH) + Math.max(shape.fromMargin, shape.toMargin) * 2
        sizeCanvasTo(maxW, maxH)

        frame = interpolateLayout(shape, eased)

        if (progress >= 1) {
          shapeTransitionRef.current = null
          layoutRef.current = shape.toLayout
          sizeCanvasTo(shape.toW + shape.toMargin * 2, shape.toH + shape.toMargin * 2)
          if (containerRef.current) {
            containerRef.current.style.width = `${shape.toW}px`
            containerRef.current.style.height = `${shape.toH}px`
          }
          setSize({ width: shape.toW, height: shape.toH })
          setSvgMargin(shape.toMargin)
        }
      } else {
        sizeCanvasTo(size.width + svgMargin * 2, size.height + svgMargin * 2)
        frame = { width: size.width, height: size.height, svgMargin, cornerInset: layout.cornerInset, circles: layout.circles, tailDots: layout.tailDots }
      }

      const cssW = canvasCssW
      const cssH = canvasCssH
      const drawBlock = shapeTransitionRef.current && shapeTransitionRef.current.toLayout
        ? shapeTransitionRef.current.toLayout.textBlock || layout.textBlock
        : layout.textBlock
      canvas.style.setProperty('--svg-margin', `-${frame.svgMargin}px`)

      let circleCount = 0
      for (const c of frame.circles) {
        if (circleCount >= 128) break
        const wobble = 1 + 0.09 * (Math.sin((t / c.duration) * Math.PI * 2 + c.phase) * 0.5 + 0.5)
        const radius = Math.max(c.coreR, c.r * wobble)
        const i = circleCount++ * 4
        circleData[i] = c.x + frame.svgMargin
        circleData[i + 1] = c.y + frame.svgMargin
        circleData[i + 2] = radius
      }
      if (!mobileQuery.matches) {
        for (const d of frame.tailDots) {
          if (circleCount >= 128) break
          const maxScale = d.big ? 1.35 : 1.25
          const pulse = 1 + (maxScale - 1) * (Math.sin((t / d.duration) * Math.PI * 2 + d.phase) * 0.5 + 0.5)
          const radius = Math.max(d.coreR, d.r * pulse)
          const i = circleCount++ * 4
          circleData[i] = d.x + frame.svgMargin
          circleData[i + 1] = d.y + frame.svgMargin
          circleData[i + 2] = radius
        }
      }

      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(cloudProgram)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, circleTexture)
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 128, 1, gl.RGBA, gl.FLOAT, circleData)
      gl.uniform2f(cloudUniforms.uSize, cssW, cssH)
      gl.uniform1f(cloudUniforms.uDpr, dpr)
      gl.uniform3f(cloudUniforms.uBorderColor, 0.77, 0.69, 0.99)
      gl.uniform4f(cloudUniforms.uFrame, frame.width, frame.height, frame.svgMargin, frame.cornerInset)
      gl.uniform1f(cloudUniforms.uBorderWidth, 1.5)
      gl.uniform1i(cloudUniforms.uCircleData, 0)
      gl.uniform1i(cloudUniforms.uCircleCount, circleCount)
      gl.uniform4fv(cloudUniforms['uColors[0]'], colorData)
      gl.drawArrays(gl.TRIANGLES, 0, 3)

      textCtx.setTransform(textDpr, 0, 0, textDpr, 0, 0)
      textCtx.clearRect(0, 0, cssW, cssH)
      textCtx.save()
      textCtx.translate(frame.svgMargin, frame.svgMargin)
      drawText(textCtx, t, now, drawBlock, frame.width, frame.height, shape)
      textCtx.restore()
      gl.bindTexture(gl.TEXTURE_2D, textTexture)
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, textCanvas)
      gl.useProgram(textProgram)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, textTexture)
      gl.uniform1i(textUniforms.uText, 0)
      gl.drawArrays(gl.TRIANGLES, 0, 3)

      rafRef.current = requestAnimationFrame(draw)
    }

    function drawText(ctx, t, now, block, frameWidth, frameHeight, shape) {
      const TRANSITION_MS = 280
      const RISE_PX = 10

      const textCamera = { tx: 0, ty: 0, sx: 1, sy: 1 }
      if (shape) {
        if (shape.startTime === null) shape.startTime = now
        const elapsed = now - shape.startTime
        const progress = Math.min(1, elapsed / TRANSITION_MS)
        const eased = 1 - Math.pow(1 - progress, 2)
        textCamera.sx = lerp(shape.fromW / shape.toW, 1, eased)
        textCamera.sy = lerp(shape.fromH / shape.toH, 1, eased)
        textCamera.tx = (frameWidth - frameWidth * textCamera.sx) / 2
        textCamera.ty = (frameHeight - frameHeight * textCamera.sy) / 2
      }

      function drawBlock(block, offsetY, alpha) {
        if (alpha <= 0) return
        const fontSize = 26
        ctx.save()
        ctx.translate(textCamera.tx, textCamera.ty)
        ctx.translate(frameWidth * 0.5, frameHeight * 0.5)
        ctx.scale(textCamera.sx, textCamera.sy)
        ctx.translate(-frameWidth * 0.5, -frameHeight * 0.5)
        ctx.globalAlpha = alpha
        ctx.font = `400 ${fontSize}px 'Gen1x Rough', cursive, sans-serif`
        ctx.textBaseline = 'alphabetic'
        ctx.fillStyle = textColor

        const { lines, lineHeight } = block
        const totalHeight = lines.length * lineHeight
        let cy = (frameHeight - totalHeight) / 2 + fontSize * 0.82 + offsetY
        let globalCharIndex = 0
        ctx.textAlign = 'left'

        for (const line of lines) {
          const lineOffset = (frameWidth - line.width) / 2

          for (const seg of line.segs) {
            if (seg.isSpace) continue

            for (const { ch, x, w, shake } of seg.chars) {
              let dx = 0, dy = 0, rot = 0

              if (isShake) {
                const dur = 0.26 * shake.durMul
                const delay = -(shake.delayOffset * dur)
                const phase = ((t - delay) / dur) % 1
                const a = phase * Math.PI * 2
                dx = Math.sin(a * shake.freqX + shake.phaseX) * shake.ampX * shake.signX
                dy = Math.cos(a * shake.freqY + shake.phaseY) * shake.ampY * shake.signY
                rot = Math.sin(a * shake.freqR + shake.phaseR) * shake.ampR
              } else {
                const dur = 2.5
                const delay = (globalCharIndex * 0.1) % dur
                const phase = ((t - delay) / dur) % 1
                const a = phase >= 0 ? phase * Math.PI * 2 : (phase + 1) * Math.PI * 2
                dy = -Math.sin(a) * 3
              }

              const cx = lineOffset + x

              if (rot) {
                ctx.save()
                ctx.translate(cx + w / 2 + dx, cy + dy)
                ctx.rotate(rot)
                ctx.textAlign = 'center'
                ctx.fillText(ch, 0, 0)
                ctx.textAlign = 'left'
                ctx.restore()
              } else {
                ctx.fillText(ch, cx + dx, cy + dy)
              }

              globalCharIndex++
            }
          }
          cy += lineHeight
        }

        ctx.restore()
      }

      const transition = transitionRef.current
      if (transition) {
        if (transition.startTime === null) transition.startTime = now
        const elapsed = now - transition.startTime
        const progress = Math.min(1, elapsed / TRANSITION_MS)
        const eased = 1 - Math.pow(1 - progress, 2)

        const outgoingProgress = Math.min(1, eased * 2)
        const incomingProgress = Math.max(0, (eased - 0.5) * 2)
        drawBlock(transition.outBlock, outgoingProgress * RISE_PX, 1 - outgoingProgress)
        drawBlock(block, (1 - incomingProgress) * -RISE_PX, incomingProgress)

        if (progress >= 1) transitionRef.current = null
      } else {
        drawBlock(block, 0, 1)
      }
    }

    if (lastTextRef.current !== cleanText) {
      lastTextRef.current = cleanText
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      gl.deleteProgram(cloudProgram)
      gl.deleteProgram(textProgram)
      gl.deleteTexture(circleTexture)
      gl.deleteTexture(textTexture)
      gl.deleteVertexArray(vao)
    }
  }, [size, svgMargin, cleanText, isShake])

  return (
    <div
      className="thought-bubble-wrapper fade-in"
      style={{ animationDelay: '0.6s', marginLeft: `${svgMargin + gap}px`, cursor: onClick ? 'pointer' : undefined }}
      title="Click to cycle"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e) } } : undefined}
    >
      <div className="thought-bubble-procedural" ref={containerRef}>
        {size.width > 0 && (
          <canvas
            ref={canvasRef}
            className="cloud-gradient-canvas"
            style={{ '--svg-margin': `-${svgMargin}px` }}
          />
        )}
      </div>
      <div
        ref={measureElRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          visibility: 'hidden',
          pointerEvents: 'none',
          whiteSpace: 'pre',
          fontFamily: "'Gen1x Rough', cursive, sans-serif",
          fontWeight: 400,
          lineHeight: 1,
        }}
      />
    </div>
  )
}


