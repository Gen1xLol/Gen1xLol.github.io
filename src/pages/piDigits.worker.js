const A = 13591409n
const B = 545140134n
const C3_OVER_24 = 10939058860032000n
let splitState = null

function binarySplit(a, b) {
  if (b - a === 1) {
    if (a === 0) return { p: 1n, q: 1n, t: A }
    const n = BigInt(a)
    const p = (6n * n - 5n) * (2n * n - 1n) * (6n * n - 1n)
    const q = n * n * n * C3_OVER_24
    const t = p * (A + B * n) * (a % 2 === 0 ? 1n : -1n)
    return { p, q, t }
  }

  const middle = Math.floor((a + b) / 2)
  const left = binarySplit(a, middle)
  const right = binarySplit(middle, b)
  return {
    p: left.p * right.p,
    q: left.q * right.q,
    t: left.t * right.q + left.p * right.t,
  }
}

function integerSqrt(value) {
  if (value < 2n) return value
  let x = value
  let next = (x + 1n) >> 1n
  while (next < x) {
    x = next
    next = (x + value / x) >> 1n
  }
  return x
}

function binarySplitPrefix(terms) {
  if (!splitState) {
    splitState = { terms, ...binarySplit(0, terms) }
    return splitState
  }
  if (terms <= splitState.terms) return splitState

  const tail = binarySplit(splitState.terms, terms)
  splitState = {
    terms,
    p: splitState.p * tail.p,
    q: splitState.q * tail.q,
    t: splitState.t * tail.q + splitState.p * tail.t,
  }
  return splitState
}

function calculatePi(decimalPlaces) {
  const terms = Math.ceil(decimalPlaces / 14.181647462) + 1
  const { q, t } = binarySplitPrefix(terms)
  const scale = 10n ** BigInt(decimalPlaces)
  const root = integerSqrt(10005n * scale * scale)
  const scaledPi = (426880n * root * q) / t
  const digits = scaledPi.toString().padStart(decimalPlaces + 1, '0')
  return `${digits[0]}.${digits.slice(1, decimalPlaces + 1)}`
}

self.onmessage = (event) => {
  const decimalPlaces = Math.max(512, Math.floor(event.data.decimalPlaces))
  const pi = calculatePi(decimalPlaces)
  self.postMessage({ decimalPlaces, pi })
}
