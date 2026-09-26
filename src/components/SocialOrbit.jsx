import { useEffect, useRef } from 'react'
import './SocialOrbit.css'

const socials = [
  { name: 'GitHub', href: 'https://github.com/Gen1xLol', icon: '/icons/github.svg' },
  { name: 'Discord', href: 'https://discord.com/users/1264445751723823245', icon: '/icons/discord.svg' },
  { name: 'Spotify', href: 'https://open.spotify.com/user/31b25d6rtdiy22uqc2n63l4p3f3m', icon: '/icons/spotify.svg' },
]

function createShader(gl, type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    throw new Error(gl.getShaderInfoLog(shader))
  }
  return shader
}

export default function SocialOrbit() {
  const canvasRef = useRef(null)
  const anchorsRef = useRef([])
  const hoverRef = useRef({ index: -1, x: 0, y: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    const gl = canvas?.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true })
    if (!gl) return

    const vertexSource = `#version 300 es
      in vec2 aPosition;
      in vec2 aUv;
      out vec2 vUv;
      void main() {
        gl_Position = vec4(aPosition, 0.0, 1.0);
        vUv = aUv;
      }`
    const fragmentSource = `#version 300 es
      precision mediump float;
      in vec2 vUv;
      uniform sampler2D uTexture;
      uniform vec2 uViewport;
      uniform float uDpr;
      uniform float uBehind;
      uniform float uGlow;
      out vec4 outColor;
      void main() {
        if (uGlow > 0.5) {
          vec2 glowUv = (vUv - 0.5) * 2.0;
          float radius = length(glowUv);
          if (radius > 1.0) discard;
          float alpha = 0.3 * exp(-radius * radius * 4.0);
          outColor = vec4(1.0, 1.0, 1.0, alpha);
          return;
        }
        vec4 icon = texture(uTexture, vUv);
        if (uBehind > 0.5) {
          vec2 p = gl_FragCoord.xy;
          vec2 center = uViewport * 0.5;
          vec2 avatarDelta = p - (center + vec2(0.0, 16.0 * uDpr));
          bool overAvatar = length(avatarDelta) < 58.0 * uDpr;
          bool overLabel = abs(p.x - center.x) < 48.0 * uDpr && abs(p.y - (center.y - 54.0 * uDpr)) < 14.0 * uDpr;
          if (overAvatar || overLabel) discard;
        }
        outColor = icon;
      }`

    let program
    try {
      program = gl.createProgram()
      gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vertexSource))
      gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fragmentSource))
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program))
    } catch {
      return
    }

    const vao = gl.createVertexArray()
    const buffer = gl.createBuffer()
    gl.bindVertexArray(vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(24), gl.DYNAMIC_DRAW)
    const positionLocation = gl.getAttribLocation(program, 'aPosition')
    const uvLocation = gl.getAttribLocation(program, 'aUv')
    const viewportLocation = gl.getUniformLocation(program, 'uViewport')
    const dprLocation = gl.getUniformLocation(program, 'uDpr')
    const behindLocation = gl.getUniformLocation(program, 'uBehind')
    const glowLocation = gl.getUniformLocation(program, 'uGlow')
    gl.enableVertexAttribArray(positionLocation)
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0)
    gl.enableVertexAttribArray(uvLocation)
    gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 16, 8)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    const imageRefs = []
    const textures = socials.map(({ icon }) => {
      const texture = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      const image = new Image()
      image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
        texture.ready = true
      }
      image.src = icon
      imageRefs.push(image)
      return texture
    })

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const orbitPhases = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3]
    const drawOrder = [0, 1, 2]
    const currentPositions = socials.map(() => ({ x: null, y: null }))
    const labels = anchorsRef.current.map(anchor => anchor?.querySelector('span'))
    const labelSizes = labels.map(label => ({ width: label?.offsetWidth || 0, height: label?.offsetHeight || 0 }))
    let frameId = null
    let width = 0
    let height = 0
    let dpr = 1
    let startTime = null
    const vertices = new Float32Array(24)

    function resize() {
      const rect = canvas.getBoundingClientRect()
      const nextDpr = Math.max(1, window.devicePixelRatio || 1)
      if (rect.width === width && rect.height === height && nextDpr === dpr) return
      width = rect.width
      height = rect.height
      dpr = nextDpr
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      gl.viewport(0, 0, canvas.width, canvas.height)
    }

    function updateVertices(x, y, size) {
      const clipX = (x / width) * 2
      const clipY = -(y / height) * 2
      const clipW = (size / width) * 2
      const clipH = (size / height) * 2
      const left = clipX - clipW / 2
      const right = clipX + clipW / 2
      const top = clipY + clipH / 2
      const bottom = clipY - clipH / 2
      vertices.set([
        left, top, 0, 0,
        left, bottom, 0, 1,
        right, top, 1, 0,
        right, top, 1, 0,
        left, bottom, 0, 1,
        right, bottom, 1, 1,
      ])
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices)
    }

    function draw(now) {
      if (startTime === null) startTime = now
      resize()
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(program)
      gl.bindVertexArray(vao)

      const elapsed = reducedMotion.matches ? 0 : (now - startTime) / 1000
      const orbitWidth = Math.min(width * 0.4, 132, Math.max(0, width / 2 - 58))
      const orbitHeight = Math.min(height * 0.31, 92, Math.max(0, height / 2 - 58))
      const hover = hoverRef.current
      gl.uniform2f(viewportLocation, canvas.width, canvas.height)
      gl.uniform1f(dprLocation, dpr)

      drawOrder.sort((a, b) => {
        if (a === b) return 0
        if (hover.index === a) return 1
        if (hover.index === b) return -1
        const depthA = Math.sin(elapsed * 0.48 + orbitPhases[a])
        const depthB = Math.sin(elapsed * 0.48 + orbitPhases[b])
        return depthA - depthB
      })

      drawOrder.forEach(index => {
        const texture = textures[index]
        if (!texture.ready) return
        const angle = elapsed * 0.48 + orbitPhases[index]
        const depth = Math.sin(angle)
        let targetX = Math.cos(angle) * orbitWidth
        let targetY = Math.sin(angle) * orbitHeight
        if (hover.index === index) {
          const hoverSafeX = Math.min(58, width / 2)
          const hoverSafeY = Math.min(58, height / 2)
          targetX = Math.max(hoverSafeX, Math.min(width - hoverSafeX, hover.x)) - width / 2
          targetY = Math.max(hoverSafeY, Math.min(height - hoverSafeY, hover.y)) - height / 2
        }
        const position = currentPositions[index]
        if (position.x === null) {
          position.x = targetX
          position.y = targetY
        } else {
          position.x += (targetX - position.x) * 0.24
          position.y += (targetY - position.y) * 0.24
        }
        const x = position.x
        const y = position.y
        const z = hover.index === index ? 1.2 : depth
        const perspective = 1 / (1 - z * 0.18)
        const size = 39 * perspective
        const anchor = anchorsRef.current[index]
        if (anchor) {
          anchor.style.transform = `translate(${x}px, ${y}px) scale(${perspective})`
          if (hover.index === index && labels[index]) {
            const label = labels[index]
            const labelSize = labelSizes[index]
            const labelHalfWidth = (labelSize.width * perspective) / 2
            const labelHalfHeight = (labelSize.height * perspective) / 2
            const labelCenterX = width / 2 + x
            const labelShiftX = (Math.max(labelHalfWidth + 8, Math.min(width - labelHalfWidth - 8, labelCenterX)) - labelCenterX) / perspective
            const labelOffsetY = 29 + labelSize.height / 2
            const showAbove = height / 2 + y + labelOffsetY * perspective > height - 8
            const labelCenterY = height / 2 + y + (showAbove ? -labelOffsetY : labelOffsetY) * perspective
            const labelShiftY = (Math.max(labelHalfHeight + 8, Math.min(height - labelHalfHeight - 8, labelCenterY)) - labelCenterY) / perspective
            label.style.left = `calc(50% + ${labelShiftX}px)`
            if (showAbove) {
              label.style.top = 'auto'
              label.style.bottom = `calc(100% + ${5 - labelShiftY}px)`
            } else {
              label.style.top = `calc(100% + ${5 + labelShiftY}px)`
              label.style.bottom = 'auto'
            }
          }
        }
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, texture)
        if (hover.index === index) {
          gl.uniform1f(glowLocation, 1)
          updateVertices(x, y, size * 2.2)
          gl.drawArrays(gl.TRIANGLES, 0, 6)
        }
        gl.uniform1f(glowLocation, 0)
        gl.uniform1f(behindLocation, hover.index !== index && depth < 0 ? 1 : 0)
        updateVertices(x, y, size)
        gl.drawArrays(gl.TRIANGLES, 0, 6)
      })

      frameId = requestAnimationFrame(draw)
    }

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    frameId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(frameId)
      observer.disconnect()
      imageRefs.forEach(image => { image.onload = null; image.src = '' })
      textures.forEach(texture => gl.deleteTexture(texture))
      gl.deleteBuffer(buffer)
      gl.deleteVertexArray(vao)
      gl.deleteProgram(program)
    }
  }, [])

  return (
    <div
      className="social-orbit"
      aria-label="my socials :)"
      onPointerMove={event => {
        const rect = event.currentTarget.getBoundingClientRect()
        const x = event.clientX - rect.left
        const y = event.clientY - rect.top
        hoverRef.current.x = x
        hoverRef.current.y = y
        if (hoverRef.current.index >= 0) {
          const dx = x - hoverRef.current.originX
          const dy = y - hoverRef.current.originY
          if (dx * dx + dy * dy > 76 * 76) hoverRef.current.index = -1
        }
      }}
      onPointerLeave={() => { hoverRef.current.index = -1 }}
    >
      <canvas ref={canvasRef} className="social-orbit-canvas" aria-hidden="true" />
      <div className="social-orbit-center">
        <img src="https://api.lanyard.rest/1264445751723823245.png" alt="" />
        <span>Gen1x</span>
      </div>
      <div className="social-orbit-links">
        {socials.map((social, index) => (
          <a
            key={social.name}
            ref={element => { anchorsRef.current[index] = element }}
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={social.name}
            onClick={event => {
              hoverRef.current.index = -1
              event.currentTarget.blur()
            }}
            onPointerEnter={event => {
              const orbitRect = event.currentTarget.parentElement.parentElement.getBoundingClientRect()
              const iconRect = event.currentTarget.getBoundingClientRect()
              hoverRef.current.index = index
              hoverRef.current.originX = iconRect.left + iconRect.width / 2 - orbitRect.left
              hoverRef.current.originY = iconRect.top + iconRect.height / 2 - orbitRect.top
            }}
            onFocus={event => {
              const orbitRect = event.currentTarget.parentElement.parentElement.getBoundingClientRect()
              const iconRect = event.currentTarget.getBoundingClientRect()
              hoverRef.current.index = index
              hoverRef.current.x = iconRect.left + iconRect.width / 2 - orbitRect.left
              hoverRef.current.y = iconRect.top + iconRect.height / 2 - orbitRect.top
              hoverRef.current.originX = hoverRef.current.x
              hoverRef.current.originY = hoverRef.current.y
            }}
            onBlur={() => { hoverRef.current.index = -1 }}
          ><span>{social.name}</span></a>
        ))}
      </div>
    </div>
  )
}
