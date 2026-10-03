import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Volume2, VolumeX } from 'lucide-react'
import { factorize, fmt, isPrimeNumber } from '../piMath.js'
import { THEORY_FACTS } from '../piFactsTheory.js'
import './infinite-pi.css'

const INITIAL_DIGITS = 2048
const TOUCH_DRAG_MULTIPLIER = 1.2
const FACT_SPACING = 34
const FACT_CLUSTER_LENGTHS = [2, 3, 3, 4]
const WINDOW_SIZE = 700
const WINDOW_STEP = 128
const SORTED_THEORY_FACTS = THEORY_FACTS
  .map(([weight, builder], type) => ({ weight, builder, type }))
  .sort((left, right) => right.weight - left.weight)
const RECENT_FACT_TYPES = []
const FACT_TYPE_COOLDOWN = 5
const FACT_PRIORITY_TOLERANCE = 2.5
const digitPairStats = new Map()
let digitPairStatsLength = 2

function updateDigitPairStats(pi) {
  for (let end = digitPairStatsLength; end < pi.length; end += 1) {
    for (let length = 2; length <= 4; length += 1) {
      const start = end - length + 1
      if (start < 2) continue
      const cluster = pi.slice(start, end + 1)
      let stats = digitPairStats.get(cluster)
      if (!stats) {
        stats = { first: start, count: 0 }
        digitPairStats.set(cluster, stats)
      }
      stats.count += 1
    }
  }
  digitPairStatsLength = pi.length
}

function theoryFactFor(pi, text, index = 0) {
  const value = Number(text)
  if (!Number.isFinite(value) || value < 2 || text.length < 2 || text.length > 4) return null
  const stats = digitPairStats.get(text) || { first: -1, count: 0 }
  const factors = factorize(value)
  const context = {
    n: value,
    f: value,
    text,
    index,
    length: text.length,
    digits: [...text],
    pi,
    firstOccurrence: stats.first,
    occurrenceCount: stats.count,
    digitStats: digitPairStats,
    prime: isPrimeNumber(value),
    factors,
    divisorCount: factors.reduce((total, [, exponent]) => total * (exponent + 1), 1),
    divisorSum: factors.reduce((total, [prime, exponent]) => {
      let term = 1
      let power = 1
      for (let i = 0; i < exponent; i += 1) {
        power *= prime
        term += power
      }
      return total * term
    }, 1),
  }

  const matches = []
  let highestWeight = -Infinity
  for (const fact of SORTED_THEORY_FACTS) {
    if (matches.length && fact.weight < highestWeight - FACT_PRIORITY_TOLERANCE) break
    const text = fact.builder(context)
    if (!text) continue
    if (matches.length === 0) highestWeight = fact.weight
    matches.push({ ...fact, text })
  }
  if (!matches.length) return null
  const selected = matches.find(fact => !RECENT_FACT_TYPES.includes(fact.type)) || matches[0]
  RECENT_FACT_TYPES.push(selected.type)
  if (RECENT_FACT_TYPES.length > FACT_TYPE_COOLDOWN) RECENT_FACT_TYPES.shift()
  if (text[0] !== text[1]) return selected.text
  return `${selected.text} (at decimal position ${fmt(index + 1)}).`
}

function makeDigitFact(pair, index, pi) {
  if (pair[0] === '0') return null
  const theory = theoryFactFor(pi, pair, index)
  if (!theory) return null
  const group = Math.floor((index - 2) / FACT_SPACING)
  return {
    index,
    pair,
    highlights: [{ index, length: pair.length }],
    text: theory,
    kind: 'digits',
    side: group % 2 ? 'below' : 'above',
  }
}

function buildFacts(pi, priorLength = 0) {
  updateDigitPairStats(pi)
  const facts = []
  const firstIndex = priorLength <= 2 ? 0 : Math.floor((priorLength - 2) / FACT_SPACING) + 1
  const totalDigits = pi.length - 2
  for (let group = firstIndex; group * FACT_SPACING < totalDigits; group += 1) {
    const decimalOffset = group * FACT_SPACING
    const index = decimalOffset + 2
    const length = FACT_CLUSTER_LENGTHS[group % FACT_CLUSTER_LENGTHS.length]
    if (decimalOffset + length > totalDigits) break
    const cluster = pi.slice(index, index + length)
    const fact = makeDigitFact(cluster, index, pi)
    if (fact) facts.push(fact)
  }
  const feynmanStart = Math.max(2, priorLength <= 2 ? 2 : priorLength - 5)
  const feynmanIndex = pi.indexOf('999999', feynmanStart)
  if (feynmanIndex !== -1 && feynmanIndex + 6 <= pi.length) {
    const group = Math.floor((feynmanIndex - 2) / FACT_SPACING)
    facts.push({
      index: feynmanIndex,
      pair: '999999',
      highlights: [{ index: feynmanIndex, length: 6 }],
      text: `The Feynman point: six 9s in a row, at decimal place ${fmt(feynmanIndex - 1)}.`,
      kind: 'digits',
      side: group % 2 ? 'below' : 'above',
    })
  }
  return facts.sort((left, right) => left.index - right.index)
}

function findFactStart(facts, position) {
  let low = 0
  let high = facts.length
  while (low < high) {
    const middle = (low + high) >>> 1
    if (facts[middle].index < position) low = middle + 1
    else high = middle
  }
  return low
}

const PiDigits = memo(function PiDigits({ digits, base, unit, facts }) {
  const first = Math.max(0, base - 32)
  const visible = digits.slice(first, first + WINDOW_SIZE)
  const renderEnd = first + visible.length
  const markerStart = findFactStart(facts, Math.max(0, first - 5))
  const markers = []
  for (let index = markerStart; index < facts.length && facts[index].index < renderEnd; index += 1) {
    const fact = facts[index]
    if (fact.kind !== 'digits') continue
    const highlights = fact.highlights || [{ index: fact.index, length: fact.pair.length }]
    for (let rangeIndex = 0; rangeIndex < highlights.length; rangeIndex += 1) {
      const range = highlights[rangeIndex]
      if (range.index < renderEnd && range.index + range.length > first) {
        markers.push({ ...range, side: range.side || fact.side, key: `${fact.index}-${rangeIndex}` })
      }
    }
  }
  markers.sort((left, right) => left.index - right.index)
  const parts = []
  let cursor = first
  for (const marker of markers) {
    const start = Math.max(cursor, first, marker.index)
    const end = Math.min(renderEnd, marker.index + marker.length)
    if (end <= start) continue
    if (start > cursor) parts.push(digits.slice(cursor, start))
    parts.push(
      <span className={`pi-highlight pi-highlight-${marker.side}`} key={marker.key}>
        {digits.slice(start, end)}
      </span>,
    )
    cursor = end
  }
  if (cursor < renderEnd) parts.push(digits.slice(cursor, renderEnd))

  return (
    <div className="pi-number" style={{ left: `${first * unit}px` }} aria-label={`π digits, starting at position ${first}`}>
      {parts}
    </div>
  )
})

function Starfield({ velocityRef, offsetRef }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const gl = canvas?.getContext('webgl2', { alpha: false, antialias: false, powerPreference: 'low-power' })
    if (!gl) return undefined

    const vertexSource = `#version 300 es
      in vec2 a_position;
      in float a_size;
      in float a_layer;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform float u_velocity;
      uniform float u_scroll;
      uniform float u_drift;
      out float v_alpha;
      out vec3 v_tint;
      void main() {
        float depth = a_layer * 0.5;
        float x = fract(a_position.x - u_scroll * (0.035 + depth * 0.105) + u_time * (0.003 + depth * 0.005) + u_drift * (0.04 + depth * 0.1));
        float y = fract(a_position.y + u_time * (0.002 + depth * 0.003) + u_drift * (0.008 + depth * 0.02));
        vec2 position = vec2(x * u_resolution.x, y * u_resolution.y);
        vec2 clip = (position / u_resolution) * 2.0 - 1.0;
        gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
        gl_PointSize = a_size * (0.9 + a_layer * 0.24) * (1.0 + u_velocity * (0.18 + a_layer * 0.1));
        float twinkle = 0.82 + 0.18 * sin(u_time * 1.6 + a_position.x * 31.0 + a_position.y * 19.0);
        v_alpha = (0.24 + a_size * 0.12 + a_layer * 0.08) * twinkle;
        float hue = fract(a_position.x * 0.7 + a_position.y * 0.45);
        vec3 farTint = vec3(0.62, 0.77, 1.0);
        vec3 middleTint = mix(vec3(0.78, 0.78, 1.0), vec3(0.72, 0.84, 1.0), smoothstep(0.45, 0.9, hue));
        vec3 nearTint = mix(vec3(0.96, 0.89, 1.0), vec3(1.0, 0.9, 0.78), smoothstep(0.45, 0.9, hue));
        v_tint = a_layer < 1.0 ? mix(farTint, middleTint, a_layer) : mix(middleTint, nearTint, a_layer - 1.0);
      }`
    const backgroundVertexSource = `#version 300 es
      const vec2 positions[3] = vec2[3](
        vec2(-1.0, -1.0),
        vec2(3.0, -1.0),
        vec2(-1.0, 3.0)
      );
      void main() {
        gl_Position = vec4(positions[gl_VertexID], 0.0, 1.0);
      }`
    const backgroundFragmentSource = `#version 300 es
      precision mediump float;
      uniform vec2 u_resolution;
      out vec4 outColor;
      float haze(vec2 point, vec2 center, vec2 spread) {
        vec2 delta = (point - center) / spread;
        return exp(-dot(delta, delta) * 1.8);
      }
      void main() {
        vec2 point = gl_FragCoord.xy / u_resolution;
        point.x *= u_resolution.x / u_resolution.y;
        vec3 color = vec3(0.004, 0.006, 0.018);
        color += vec3(0.018, 0.032, 0.085) * haze(point, vec2(0.2, 0.78), vec2(0.48, 0.3));
        color += vec3(0.055, 0.018, 0.09) * haze(point, vec2(0.92, 0.52), vec2(0.42, 0.34));
        color += vec3(0.008, 0.048, 0.065) * haze(point, vec2(0.59, 0.12), vec2(0.34, 0.2));
        float vignette = 1.0 - smoothstep(0.12, 1.25, length((point - vec2(0.5 * u_resolution.x / u_resolution.y, 0.5)) * vec2(0.7, 0.9)));
        color *= 0.58 + vignette * 0.42;
        outColor = vec4(color, 1.0);
      }`
    const fragmentSource = `#version 300 es
      precision mediump float;
      in float v_alpha;
      in vec3 v_tint;
      out vec4 outColor;
      void main() {
        vec2 point = gl_PointCoord - vec2(0.5);
        float distanceFromCenter = length(point);
        float glow = 1.0 - smoothstep(0.12, 0.5, distanceFromCenter);
        float core = 1.0 - smoothstep(0.0, 0.16, distanceFromCenter);
        outColor = vec4(mix(v_tint, vec3(1.0), core * 0.48), glow * v_alpha);
      }`

    function compile(type, source) {
      const shader = gl.createShader(type)
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader)
        return null
      }
      return shader
    }

    const vertexShader = compile(gl.VERTEX_SHADER, vertexSource)
    const fragmentShader = compile(gl.FRAGMENT_SHADER, fragmentSource)
    const backgroundVertexShader = compile(gl.VERTEX_SHADER, backgroundVertexSource)
    const backgroundFragmentShader = compile(gl.FRAGMENT_SHADER, backgroundFragmentSource)
    if (!vertexShader || !fragmentShader || !backgroundVertexShader || !backgroundFragmentShader) return undefined
    const program = gl.createProgram()
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return undefined
    gl.useProgram(program)
    const backgroundProgram = gl.createProgram()
    gl.attachShader(backgroundProgram, backgroundVertexShader)
    gl.attachShader(backgroundProgram, backgroundFragmentShader)
    gl.linkProgram(backgroundProgram)
    if (!gl.getProgramParameter(backgroundProgram, gl.LINK_STATUS)) return undefined
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    const starCount = 220
    const stars = new Float32Array(starCount * 4)
    let seed = 841
    const starPositions = []
    const minimumStarDistance = 0.026
    for (let i = 0; i < starCount; i += 1) {
      let x = 0
      let y = 0
      let attempts = 0
      let separated = false
      while (!separated && attempts < 80) {
        seed = (seed * 16807) % 2147483647
        x = seed / 2147483647
        seed = (seed * 16807) % 2147483647
        y = seed / 2147483647
        separated = starPositions.every(([otherX, otherY]) => {
          const deltaX = Math.abs(x - otherX)
          const deltaY = Math.abs(y - otherY)
          const horizontalDistance = Math.min(deltaX, 1 - deltaX) * Math.max(0.65, window.innerWidth / window.innerHeight)
          const verticalDistance = Math.min(deltaY, 1 - deltaY)
          return horizontalDistance ** 2 + verticalDistance ** 2 >= minimumStarDistance ** 2
        })
        attempts += 1
      }
      starPositions.push([x, y])
      const layer = i < 110 ? 0 : i < 180 ? 1 : 2
      stars[i * 4] = x
      stars[i * 4 + 1] = y
      seed = (seed * 16807) % 2147483647
      const sizeRange = layer === 0 ? [0.55, 0.95] : layer === 1 ? [0.9, 1.35] : [1.2, 1.8]
      stars[i * 4 + 2] = sizeRange[0] + (seed / 2147483647) * sizeRange[1]
      stars[i * 4 + 3] = layer
    }
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, stars, gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'a_position')
    const size = gl.getAttribLocation(program, 'a_size')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 16, 0)
    gl.enableVertexAttribArray(size)
    gl.vertexAttribPointer(size, 1, gl.FLOAT, false, 16, 8)
    const layer = gl.getAttribLocation(program, 'a_layer')
    gl.enableVertexAttribArray(layer)
    gl.vertexAttribPointer(layer, 1, gl.FLOAT, false, 16, 12)
    const resolution = gl.getUniformLocation(program, 'u_resolution')
    const timeUniform = gl.getUniformLocation(program, 'u_time')
    const velocityUniform = gl.getUniformLocation(program, 'u_velocity')
    const scrollUniform = gl.getUniformLocation(program, 'u_scroll')
    const driftUniform = gl.getUniformLocation(program, 'u_drift')
    const backgroundResolution = gl.getUniformLocation(backgroundProgram, 'u_resolution')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0
    let start = performance.now()
    let previousFrame = start
    let accumulatedDrift = 0

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5)
      const width = Math.floor(window.innerWidth * ratio)
      const height = Math.floor(window.innerHeight * ratio)
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
        gl.viewport(0, 0, width, height)
      }
    }

    function render(now) {
      resize()
      const elapsed = reducedMotion ? 0 : (now - start) / 1000
      const frameElapsed = Math.min(48, Math.max(0, now - previousFrame)) / 1000
      previousFrame = now
      if (!reducedMotion) accumulatedDrift += velocityRef.current * frameElapsed
      gl.clearColor(0, 0, 0, 1)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(backgroundProgram)
      gl.uniform2f(backgroundResolution, canvas.width, canvas.height)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      gl.useProgram(program)
      gl.uniform2f(resolution, canvas.width, canvas.height)
      gl.uniform1f(timeUniform, elapsed)
      gl.uniform1f(velocityUniform, reducedMotion ? 0 : velocityRef.current)
      gl.uniform1f(scrollUniform, reducedMotion ? 0 : offsetRef.current / Math.max(1, window.innerWidth))
      gl.uniform1f(driftUniform, reducedMotion ? 0 : accumulatedDrift)
      gl.drawArrays(gl.POINTS, 0, 220)
      frame = requestAnimationFrame(render)
    }

    frame = requestAnimationFrame(render)
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.deleteProgram(backgroundProgram)
      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)
      gl.deleteShader(backgroundVertexShader)
      gl.deleteShader(backgroundFragmentShader)
    }
  }, [velocityRef, offsetRef])

  return <canvas ref={canvasRef} className="pi-stars" aria-hidden="true" />
}

const STORAGE_KEY = 'infinite-pi-position'
const LEGACY_STORAGE_KEY = 'infinite-pi-offset'
const SOUND_STORAGE_KEY = 'infinite-pi-sound'

function createAmbientAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return null
  const context = new AudioContextClass()
  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate)
  const samples = buffer.getChannelData(0)
  let previous = 0
  for (let index = 0; index < samples.length; index += 1) {
    const noise = Math.random() * 2 - 1
    previous = previous * 0.86 + noise * 0.14
    samples[index] = previous
  }
  const source = context.createBufferSource()
  source.buffer = buffer
  source.loop = true

  const highPass = context.createBiquadFilter()
  highPass.type = 'highpass'
  highPass.frequency.value = 48
  const air = context.createBiquadFilter()
  air.type = 'bandpass'
  air.frequency.value = 130
  air.Q.value = 0.28
  const airGain = context.createGain()
  airGain.gain.value = 0
  const lowPass = context.createBiquadFilter()
  lowPass.type = 'lowpass'
  lowPass.frequency.value = 110
  const lowGain = context.createGain()
  lowGain.gain.value = 0
  const convolver = context.createConvolver()
  const impulseLength = Math.floor(context.sampleRate * 3)
  const impulse = context.createBuffer(2, impulseLength, context.sampleRate)
  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const impulseSamples = impulse.getChannelData(channel)
    for (let index = 0; index < impulseLength; index += 1) {
      const decay = (1 - index / impulseLength) ** 4
      impulseSamples[index] = (Math.random() * 2 - 1) * decay
    }
  }
  convolver.buffer = impulse
  const reverbGain = context.createGain()
  reverbGain.gain.value = 0.08
  const masterLowPass = context.createBiquadFilter()
  masterLowPass.type = 'lowpass'
  masterLowPass.frequency.value = 210
  masterLowPass.Q.value = 0.35
  const drift = context.createOscillator()
  drift.frequency.value = 0.08
  const driftDepth = context.createGain()
  driftDepth.gain.value = 34

  source.connect(highPass)
  highPass.connect(air)
  air.connect(airGain)
  airGain.connect(masterLowPass)
  source.connect(lowPass)
  lowPass.connect(lowGain)
  lowGain.connect(masterLowPass)
  lowPass.connect(convolver)
  convolver.connect(reverbGain)
  reverbGain.connect(masterLowPass)
  masterLowPass.connect(context.destination)
  drift.connect(driftDepth)
  driftDepth.connect(air.frequency)
  source.start()
  drift.start()
  context.resume()

  return { context, source, drift, air, airGain, lowPass, lowGain, reverbGain }
}

export default function InfinitePi() {
  const [digits, setDigits] = useState('3.')
  const [facts, setFacts] = useState([])
  const [offset, setOffset] = useState(0)
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight })
  const [generating, setGenerating] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return window.localStorage.getItem(SOUND_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })
  const [activeFacts, setActiveFacts] = useState([])
  const workerRef = useRef(null)
  const updateOffsetRef = useRef(() => {})
  const wheelHandlerRef = useRef(null)
  const digitsLengthRef = useRef(2)
  const factsRef = useRef(facts)
  const stageRef = useRef(null)
  const offsetRef = useRef(0)
  const targetOffsetRef = useRef(0)
  const unitRef = useRef(38)
  const viewportRef = useRef(viewport)
  const velocityRef = useRef(0)
  const draggingRef = useRef(null)
  const requestedRef = useRef(INITIAL_DIGITS)
  const generationInFlightRef = useRef(true)
  const generationTimingRef = useRef({ digits: 0, milliseconds: 0 })
  const scrollDigitsPerSecondRef = useRef(0)
  const ensureDigitsRef = useRef(() => {})
  const queuedOffsetRef = useRef(null)
  const saveOffsetRef = useRef(null)
  const audioEngineRef = useRef(null)
  const ambientIntensityRef = useRef(0)
  const soundEnabledRef = useRef(soundEnabled)
  soundEnabledRef.current = soundEnabled

  const persistOffset = useCallback(() => {
    if (typeof window === 'undefined') return
    const position = queuedOffsetRef.current ?? targetOffsetRef.current
    const value = Math.max(0, Math.round(position / Math.max(1, unitRef.current)))
    window.localStorage.setItem(STORAGE_KEY, String(value))
  }, [])

  const measureUnit = useCallback(() => {
    const digit = document.querySelector('.pi-number')
    const size = Number.parseFloat(getComputedStyle(digit || document.documentElement).fontSize) || 32
    const sample = document.createElement('canvas')
    const context = sample.getContext('2d')
    if (context) {
      context.font = `${size}px "Fira Code", monospace`
      unitRef.current = context.measureText('0').width
    } else unitRef.current = size * 0.602
    setViewport({ width: window.innerWidth, height: window.innerHeight })
  }, [])

  const updateOffset = useCallback(next => {
    const currentUnit = unitRef.current
    const maxOffset = Math.max(0, (digitsLengthRef.current - 1) * currentUnit - viewportRef.current.width + 72)
    const requested = Math.max(0, next)
    if (requested > maxOffset) queuedOffsetRef.current = requested
    else queuedOffsetRef.current = null
    const bounded = Math.max(0, Math.min(next, maxOffset))
    targetOffsetRef.current = bounded
    clearTimeout(saveOffsetRef.current)
    saveOffsetRef.current = window.setTimeout(() => {
      persistOffset()
    }, 160)

    ensureDigitsRef.current(queuedOffsetRef.current ?? bounded)
  }, [persistOffset])
  updateOffsetRef.current = updateOffset
  factsRef.current = facts
  ensureDigitsRef.current = position => {
    if (generationInFlightRef.current || !workerRef.current || requestedRef.current > digitsLengthRef.current - 2) return
    const currentUnit = Math.max(1, unitRef.current)
    const visibleDigits = viewportRef.current.width / currentUnit
    const positionDigits = Math.max(position, offsetRef.current) / currentUnit
    const availableDigits = digitsLengthRef.current - 2
    const remainingDigits = availableDigits - positionDigits - visibleDigits
    const nextTarget = requestedRef.current * 2
    const timing = generationTimingRef.current
    const estimatedMilliseconds = timing.digits
      ? timing.milliseconds * (nextTarget / timing.digits) ** 1.45
      : 750
    const timeBuffer = scrollDigitsPerSecondRef.current * Math.max(750, estimatedMilliseconds * 2.5) / 1000
    const safetyBuffer = Math.max(visibleDigits * 12, timeBuffer)
    if (remainingDigits > safetyBuffer) return
    requestedRef.current = nextTarget
    generationInFlightRef.current = true
    workerRef.current.postMessage({ decimalPlaces: nextTarget })
  }

  useEffect(() => {
    const worker = new Worker(new URL('./piDigits.worker.js', import.meta.url), { type: 'module' })
    workerRef.current = worker
    worker.onmessage = event => {
      const nextDigits = event.data.pi
      const previousLength = digitsLengthRef.current
      digitsLengthRef.current = nextDigits.length
      generationTimingRef.current = {
        digits: event.data.decimalPlaces,
        milliseconds: event.data.elapsedMilliseconds,
      }
      generationInFlightRef.current = false
      setDigits(nextDigits)
      setFacts(previous => [...previous, ...buildFacts(nextDigits, previousLength)])
      if (previousLength <= 2) setGenerating(false)
      requestAnimationFrame(() => updateOffsetRef.current(queuedOffsetRef.current ?? offsetRef.current))
    }
    worker.onerror = () => {
      generationInFlightRef.current = false
      setGenerating(false)
    }
    worker.postMessage({ decimalPlaces: INITIAL_DIGITS })
    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  useEffect(() => {
    measureUnit()
    document.fonts?.ready.then(measureUnit)
    window.addEventListener('resize', measureUnit)
    return () => window.removeEventListener('resize', measureUnit)
  }, [measureUnit])

  useEffect(() => {
    const storedPosition = window.localStorage.getItem(STORAGE_KEY)
    const storedOffset = storedPosition === null ? window.localStorage.getItem(LEGACY_STORAGE_KEY) : null
    const restored = storedPosition !== null
      ? Number.parseFloat(storedPosition)
      : storedOffset !== null
        ? Number.parseFloat(storedOffset) / Math.max(1, unitRef.current)
        : null
    if (Number.isFinite(restored)) updateOffsetRef.current(restored * unitRef.current)
  }, [])

  useEffect(() => () => {
    const engine = audioEngineRef.current
    if (!engine) return
    engine.source.stop()
    engine.drift.stop()
    engine.context.close()
    audioEngineRef.current = null
  }, [])

  useEffect(() => {
    const engine = audioEngineRef.current
    if (!soundEnabled) {
      if (!engine) return undefined
      const now = engine.context.currentTime
      engine.airGain.gain.setTargetAtTime(0, now, 0.09)
      engine.lowGain.gain.setTargetAtTime(0, now, 0.09)
      engine.reverbGain.gain.setTargetAtTime(0, now, 0.09)
      return undefined
    }

    let frame = 0
    const updateAmbientSound = time => {
      const currentEngine = audioEngineRef.current
      if (currentEngine?.context.state === 'running') {
        const intensity = ambientIntensityRef.current
        const now = currentEngine.context.currentTime
        currentEngine.air.frequency.setTargetAtTime(105 + intensity * 70, now, 0.025)
        currentEngine.lowPass.frequency.setTargetAtTime(85 + intensity * 55, now, 0.03)
        currentEngine.airGain.gain.setTargetAtTime(0.008 + intensity ** 0.85 * 0.03, now, 0.025)
        currentEngine.lowGain.gain.setTargetAtTime(0.015 + intensity ** 0.9 * 0.033, now, 0.03)
        currentEngine.reverbGain.gain.setTargetAtTime(0.09 + intensity * 0.04, now, 0.05)
      }
      frame = requestAnimationFrame(updateAmbientSound)
    }
    frame = requestAnimationFrame(updateAmbientSound)
    return () => {
      cancelAnimationFrame(frame)
      const currentEngine = audioEngineRef.current
      if (!currentEngine) return
      const now = currentEngine.context.currentTime
      currentEngine.airGain.gain.setTargetAtTime(0, now, 0.09)
      currentEngine.lowGain.gain.setTargetAtTime(0, now, 0.09)
      currentEngine.reverbGain.gain.setTargetAtTime(0, now, 0.12)
    }
  }, [soundEnabled])

  useEffect(() => {
    const saveOnPageHide = () => persistOffset()
    window.addEventListener('pagehide', saveOnPageHide)
    return () => {
      window.removeEventListener('pagehide', saveOnPageHide)
      clearTimeout(saveOffsetRef.current)
      persistOffset()
    }
  }, [persistOffset])

  useEffect(() => {
    if (digits.length <= 2) return
    viewportRef.current = viewport
    const maxOffset = Math.max(0, (digits.length - 1) * unitRef.current - viewport.width + 72)
    targetOffsetRef.current = Math.min(targetOffsetRef.current, maxOffset)
    offsetRef.current = Math.min(offsetRef.current, maxOffset)
    setOffset(offsetRef.current)
  }, [viewport, digits])

  useEffect(() => {
    let frame = 0
    let previousTime = performance.now()
    let previousOffset = offsetRef.current
    let lastWindow = -1
    let lastCounter = -1
    let lastFactSet = ''
    const animate = time => {
      const elapsed = Math.min(48, Math.max(1, time - previousTime))
      previousTime = time
      const current = offsetRef.current
      const target = targetOffsetRef.current
      const next = current + (target - current) * (1 - Math.exp(-elapsed / 95))
      offsetRef.current = Math.abs(target - next) < 0.15 ? target : next
      const currentUnit = unitRef.current
      const speed = Math.min(1, Math.abs(offsetRef.current - previousOffset) / elapsed * 1000 / 1400)
      velocityRef.current += (speed - velocityRef.current) * (1 - Math.exp(-elapsed / 150))
      const ambientResponse = 1 - Math.exp(-elapsed / (speed > ambientIntensityRef.current ? 32 : 115))
      ambientIntensityRef.current += (speed - ambientIntensityRef.current) * ambientResponse
      const observedDigitsPerSecond = Math.abs(offsetRef.current - previousOffset) / elapsed * 1000 / currentUnit
      scrollDigitsPerSecondRef.current += (observedDigitsPerSecond - scrollDigitsPerSecondRef.current) * (1 - Math.exp(-elapsed / 250))
      previousOffset = offsetRef.current
      ensureDigitsRef.current(Math.max(offsetRef.current, targetOffsetRef.current))
      if (stageRef.current) stageRef.current.style.setProperty('--pi-shift', `${28 - offsetRef.current}px`)

      const windowIndex = Math.floor(offsetRef.current / currentUnit / WINDOW_STEP)
      if (windowIndex !== lastWindow) {
        lastWindow = windowIndex
        setOffset(offsetRef.current)
      }
      const counter = Math.floor(offsetRef.current / currentUnit / 16)
      if (counter !== lastCounter) {
        lastCounter = counter
        setOffset(offsetRef.current)
      }
      const first = findFactStart(factsRef.current, Math.floor((offsetRef.current + viewportRef.current.width / 2 - 28) / currentUnit) - 2)
      const selected = factsRef.current.slice(Math.max(0, first - 2), first + 4)
      const selectedKey = selected.map(fact => fact.index).join(',')
      if (selectedKey !== lastFactSet) {
        lastFactSet = selectedKey
        setActiveFacts(selected)
      }
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [])

  const unit = unitRef.current
  const base = Math.floor(offset / unit / WINDOW_STEP) * WINDOW_STEP
  const factIndices = useMemo(() => activeFacts.filter(fact => fact.kind === 'digits').map(fact => fact.index), [activeFacts])
  const decimalPosition = Math.max(0, Math.floor(offset / unit))

  function handleWheel(event) {
    event.preventDefault()
    activateAmbientSound()
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
    updateOffset((queuedOffsetRef.current ?? targetOffsetRef.current) + delta)
  }
  wheelHandlerRef.current = handleWheel

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return undefined
    const onWheel = event => wheelHandlerRef.current?.(event)
    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => stage.removeEventListener('wheel', onWheel)
  }, [])

  function handlePointerDown(event) {
    if (event.target instanceof Element && event.target.closest('button, a, input, textarea, select')) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    activateAmbientSound()
    draggingRef.current = {
      x: event.clientX,
      offset: offsetRef.current,
      multiplier: event.pointerType === 'touch' ? TOUCH_DRAG_MULTIPLIER : 1,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event) {
    if (!draggingRef.current) return
    updateOffset(
      draggingRef.current.offset +
        (draggingRef.current.x - event.clientX) * draggingRef.current.multiplier,
    )
  }

  function handlePointerUp() {
    draggingRef.current = null
    persistOffset()
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      activateAmbientSound()
      updateOffset((queuedOffsetRef.current ?? targetOffsetRef.current) + (event.key === 'ArrowRight' ? 80 : -80))
    } else if (event.key === 'Home') updateOffset(0)
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft' || event.key === 'Home') persistOffset()
  }

  function handleSoundToggle() {
    const next = !soundEnabled
    if (next) activateAmbientSound(true)
    setSoundEnabled(next)
    try {
      window.localStorage.setItem(SOUND_STORAGE_KEY, String(next))
    } catch {
      return
    }
  }

  function activateAmbientSound(force = false) {
    if (!force && !soundEnabledRef.current) return
    if (!audioEngineRef.current) audioEngineRef.current = createAmbientAudio()
    else audioEngineRef.current.context.resume()
  }

  return (
    <div className="pi-page">
      <Starfield velocityRef={velocityRef} offsetRef={offsetRef} />
      <header className="pi-header">
        <div className="pi-brand-tools">
          <Link className="pi-brand" to="/">gen1x</Link>
          <button
            className="pi-sound-toggle"
            type="button"
            aria-label={soundEnabled ? 'Turn ambient sound off' : 'Turn ambient sound on'}
            aria-pressed={soundEnabled}
            title={soundEnabled ? 'Turn ambient sound off' : 'Turn ambient sound on'}
            onClick={handleSoundToggle}
          >
            {soundEnabled ? <Volume2 size={16} strokeWidth={1.8} /> : <VolumeX size={16} strokeWidth={1.8} />}
          </button>
        </div>
        <Link className="pi-back" to="/">back to the site</Link>
      </header>
      <div className="pi-caption">a little trip through π</div>
      <main
        className="pi-stage"
        ref={stageRef}
        tabIndex={0}
        aria-label="Infinite pi. Drag, swipe, or scroll horizontally through the digits."
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
      >
        <div className="pi-travel-layer" style={{ '--pi-unit': `${unit}px` }}>
          <PiDigits digits={digits} base={base} unit={unit} facts={facts} />
          {activeFacts.map(fact => (
            <div
              className={`pi-fact ${fact.side === 'above' ? 'pi-fact-above' : 'pi-fact-below'} ${fact.kind === 'pi' ? 'pi-fact-about-pi' : ''}`}
              key={fact.index}
              style={{
                left: `${(fact.index + (fact.highlights?.[0]?.length || fact.pair?.length || 0) / 2) * unit}px`,
                '--pi-highlight-width': `${fact.highlights?.[0]?.length || fact.pair?.length || 0}`,
              }}
            >
              <span className="pi-fact-text">{fact.text}</span>
              {fact.kind === 'digits' && <span className="pi-fact-line" aria-hidden="true" />}
            </div>
          ))}
          <span className="pi-last-digit" style={{ left: `${digits.length * unit}px` }} aria-hidden="true" />
        </div>
        <button className="pi-status" type="button" aria-live="polite" onClick={() => updateOffset(0)}>
          {generating ? 'finding the next digits...' : `${(decimalPosition + 1).toLocaleString()} decimal places in (click to reset)`}
        </button>
        <div className="pi-hint">drag, swipe or scroll</div>
      </main>
      <span className="pi-sr-only">Digit markers: {factIndices.length}</span>
    </div>
  )
}
