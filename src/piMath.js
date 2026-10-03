export const LIMIT = 1e8
export const SIEVE_LIMIT = 2000000

const SUPER = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻' }
const FACTORIALS = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880]
const SMALL = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
const ROMAN = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]

export const fmt = value => value.toLocaleString('en-US')
export const approx = (value, places = 2) => value.toLocaleString('en-US', { maximumFractionDigits: places })
export const randomInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1))
export const sum = list => list.reduce((total, value) => total + value, 0)
export const product = list => list.reduce((total, value) => total * value, 1)
export const gcd = (a, b) => (b ? gcd(b, a % b) : a)
export const reverseText = text => [...text].reverse().join('')
export const digitsOf = text => [...String(text)].map(Number)
export const digitSumOf = value => sum(digitsOf(value))
export const article = word => (/^[aeiou]/i.test(word) ? 'an' : 'a')
export const superscript = value => [...String(value)].map(char => SUPER[char] ?? char).join('')
export const isPowerOfTwo = value => value > 0 && (value & (value - 1)) === 0
export const digitFactorial = digit => FACTORIALS[digit]

export function ordinal(value) {
  const rest = value % 100
  const last = value % 10
  const suffix = ['th', 'st', 'nd', 'rd'][rest >= 11 && rest <= 13 ? 0 : last < 4 ? last : 0]
  return `${fmt(value)}${suffix}`
}

export function scientific(value, places = 2) {
  const [mantissa, exponent] = value.toExponential(places).split('e')
  return `${mantissa} × 10${superscript(Number(exponent))}`
}

export const compact = value => (value < 1e9 ? approx(value, 2) : scientific(value))

export function binomial(n, k) {
  let result = 1
  for (let i = 1; i <= k; i += 1) result = (result * (n - k + i)) / i
  return Math.round(result)
}

export function isqrt(value) {
  let root = Math.floor(Math.sqrt(value))
  while (root * root > value) root -= 1
  while ((root + 1) * (root + 1) <= value) root += 1
  return root
}

export function isPrimeNumber(value) {
  if (value < 2) return false
  if (value < 4) return true
  if (value % 2 === 0 || value % 3 === 0) return false
  for (let divisor = 5; divisor * divisor <= value; divisor += 6) {
    if (value % divisor === 0 || value % (divisor + 2) === 0) return false
  }
  return true
}

export function nextPrime(value) {
  let candidate = value + 1
  while (!isPrimeNumber(candidate)) candidate += 1
  return candidate
}

export function previousPrime(value) {
  let candidate = value - 1
  while (candidate >= 2 && !isPrimeNumber(candidate)) candidate -= 1
  return candidate >= 2 ? candidate : null
}

export function factorize(value) {
  const factors = []
  let rest = value
  for (let divisor = 2; divisor * divisor <= rest; divisor += divisor === 2 ? 1 : 2) {
    if (rest % divisor !== 0) continue
    let exponent = 0
    while (rest % divisor === 0) {
      rest /= divisor
      exponent += 1
    }
    factors.push([divisor, exponent])
  }
  if (rest > 1) factors.push([rest, 1])
  return factors
}

export function factorText(factors) {
  return factors.map(([prime, exponent]) => (exponent > 1 ? `${prime}${superscript(exponent)}` : `${prime}`)).join(' × ')
}

export function divisorSum(factors) {
  let total = 1
  for (const [prime, exponent] of factors) {
    let term = 1
    let power = 1
    for (let i = 0; i < exponent; i += 1) {
      power *= prime
      term += power
    }
    total *= term
  }
  return total
}

export const divisorCount = factors => factors.reduce((total, [, exponent]) => total * (exponent + 1), 1)
export const totient = factors => factors.reduce((total, [prime, exponent]) => total * (prime - 1) * prime ** (exponent - 1), 1)
export const aliquotOf = value => divisorSum(factorize(value)) - value
export const primeFactorSum = factors => sum(factors.map(([prime]) => prime))

export function modPow(base, exponent, modulus) {
  const m = BigInt(modulus)
  let result = 1n
  let b = BigInt(base) % m
  let e = BigInt(exponent)
  while (e > 0n) {
    if (e & 1n) result = (result * b) % m
    b = (b * b) % m
    e >>= 1n
  }
  return Number(result)
}

export function multiplicativeOrder(base, modulus) {
  let order = totient(factorize(modulus))
  for (const [prime] of factorize(order)) {
    while (order % prime === 0 && modPow(base, order / prime, modulus) === 1) order /= prime
  }
  return order
}

export function smallestPrimitiveRoot(prime) {
  const primes = factorize(prime - 1).map(([factor]) => factor)
  for (let candidate = 2; candidate < prime; candidate += 1) {
    if (primes.every(factor => modPow(candidate, (prime - 1) / factor, prime) !== 1)) return candidate
  }
  return null
}

let sieve = null

function primeSieve() {
  if (sieve) return sieve
  sieve = new Uint8Array(SIEVE_LIMIT + 1)
  sieve[0] = 1
  sieve[1] = 1
  for (let i = 2; i * i <= SIEVE_LIMIT; i += 1) {
    if (sieve[i]) continue
    for (let j = i * i; j <= SIEVE_LIMIT; j += i) sieve[j] = 1
  }
  return sieve
}

export function primeCountUpTo(limit) {
  const table = primeSieve()
  let count = 0
  for (let i = 2; i <= limit; i += 1) if (!table[i]) count += 1
  return count
}

export function twoSquares(value) {
  const pairs = []
  for (let a = 1; 2 * a * a <= value; a += 1) {
    const rest = value - a * a
    const b = Math.round(Math.sqrt(rest))
    if (b * b === rest) pairs.push([a, b])
  }
  return pairs
}

export function twoCubes(value) {
  const pairs = []
  for (let a = 1; 2 * a * a * a <= value; a += 1) {
    const rest = value - a * a * a
    const b = Math.round(Math.cbrt(rest))
    if (b * b * b === rest) pairs.push([a, b])
  }
  return pairs
}

export function consecutiveRuns(value) {
  const runs = []
  for (let length = 2; length * (length + 1) <= 2 * value; length += 1) {
    const rest = value - (length * (length - 1)) / 2
    if (rest % length === 0) runs.push([rest / length, length])
  }
  return runs
}

export function goldbach(value) {
  for (let low = 2; low <= value / 2; low += 1) {
    if (isPrimeNumber(low) && isPrimeNumber(value - low)) return [low, value - low]
  }
  return null
}

export function collatz(start) {
  let value = start
  let steps = 0
  let peak = start
  while (value !== 1 && steps < 3000) {
    value = value % 2 === 0 ? value / 2 : value * 3 + 1
    if (value > peak) peak = value
    steps += 1
  }
  return { steps, peak }
}

export function happyNumber(start) {
  const seen = new Set()
  let value = start
  let steps = 0
  while (value !== 1 && !seen.has(value)) {
    seen.add(value)
    value = sum(digitsOf(value).map(digit => digit * digit))
    steps += 1
  }
  return { happy: value === 1, steps }
}

export function persistenceChain(start) {
  const chain = [start]
  while (chain[chain.length - 1] >= 10) chain.push(product(digitsOf(chain[chain.length - 1])))
  return chain
}

export function reverseAndAdd(start) {
  let value = BigInt(start)
  for (let step = 0; step < 150; step += 1) {
    const text = value.toString()
    if (step > 0 && text === reverseText(text)) return { steps: step, value: text }
    value += BigInt(reverseText(text))
  }
  return null
}

export function kaprekarRoutine(text) {
  const width = text.length
  let value = Number(text)
  for (let step = 1; step <= 10; step += 1) {
    const sorted = String(value).padStart(width, '0').split('').sort()
    const low = Number(sorted.join(''))
    const high = Number(sorted.reverse().join(''))
    const next = high - low
    if (next === value) return { steps: step - 1, value }
    value = next
  }
  return null
}

export function kaprekarSplit(value) {
  if (value < 2) return null
  const square = (BigInt(value) ** 2n).toString()
  for (let cut = 1; cut < square.length; cut += 1) {
    const left = BigInt(square.slice(0, cut))
    const right = BigInt(square.slice(cut))
    if (right > 0n && left + right === BigInt(value)) return { square, left, right }
  }
  return null
}

export const lookAndSay = text => text.replace(/(\d)\1*/g, run => `${run.length}${run[0]}`)

export function roman(value) {
  let rest = value
  let text = ''
  for (const [size, symbol] of ROMAN) {
    while (rest >= size) {
      text += symbol
      rest -= size
    }
  }
  return text
}

export function spell(value) {
  if (value < 20) return SMALL[value]
  if (value < 100) return TENS[Math.floor(value / 10)] + (value % 10 ? `-${SMALL[value % 10]}` : '')
  if (value < 1000) return `${SMALL[Math.floor(value / 100)]} hundred${value % 100 ? ` ${spell(value % 100)}` : ''}`
  for (const [size, name] of [[1e6, 'million'], [1e3, 'thousand']]) {
    if (value >= size) return `${spell(Math.floor(value / size))} ${name}${value % size ? ` ${spell(value % size)}` : ''}`
  }
  return ''
}

export const letterCount = value => spell(value).replace(/[^a-z]/g, '').length

export function magicChain(start) {
  const chain = [start]
  while (chain[chain.length - 1] !== 4 && chain.length < 12) chain.push(letterCount(chain[chain.length - 1]))
  return chain
}

export function zeckendorf(value) {
  const fibs = [1, 2]
  while (fibs[fibs.length - 1] <= value) fibs.push(fibs[fibs.length - 1] + fibs[fibs.length - 2])
  const parts = []
  let rest = value
  for (let i = fibs.length - 1; i >= 0 && rest > 0; i -= 1) {
    if (fibs[i] <= rest) {
      parts.push(fibs[i])
      rest -= fibs[i]
    }
  }
  return parts
}

export function sqrtContinuedFraction(value) {
  const root = isqrt(value)
  if (root * root === value) return null
  const terms = []
  let m = 0
  let d = 1
  let a = root
  do {
    m = d * a - m
    d = (value - m * m) / d
    a = Math.floor((root + m) / d)
    terms.push(a)
  } while (a !== 2 * root && terms.length < 200000)
  return { root, terms }
}

export function pellSolution(value) {
  const root = isqrt(value)
  if (root * root === value) return null
  const target = BigInt(value)
  let m = 0
  let d = 1
  let a = root
  let previousTop = 1n
  let top = BigInt(root)
  let previousBottom = 0n
  let bottom = 1n
  for (let i = 0; i < 4000; i += 1) {
    if (top * top - target * bottom * bottom === 1n) return { x: top, y: bottom }
    m = d * a - m
    d = (value - m * m) / d
    a = Math.floor((root + m) / d)
    const term = BigInt(a)
    const nextTop = term * top + previousTop
    const nextBottom = term * bottom + previousBottom
    previousTop = top
    top = nextTop
    previousBottom = bottom
    bottom = nextBottom
  }
  return null
}

export function pisanoPeriod(modulus) {
  let a = 0
  let b = 1
  let count = 0
  do {
    const next = (a + b) % modulus
    a = b
    b = next
    count += 1
  } while (!(a === 0 && b === 1))
  return count
}

let partitions = null

export function partitionNumber(value) {
  if (!partitions) {
    partitions = [1n]
    for (let n = 1; n <= 1000; n += 1) {
      let total = 0n
      for (let k = 1; ; k += 1) {
        const first = (k * (3 * k - 1)) / 2
        if (first > n) break
        const sign = k % 2 ? 1n : -1n
        total += sign * partitions[n - first]
        const second = (k * (3 * k + 1)) / 2
        if (second <= n) total += sign * partitions[n - second]
      }
      partitions.push(total)
    }
  }
  return partitions[value]
}

let highlyComposite = null

export function highlyCompositeNumbers() {
  if (highlyComposite) return highlyComposite
  const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]
  const candidates = []
  const walk = (value, divisors, position, ceiling) => {
    candidates.push([value, divisors])
    if (position >= primes.length) return
    let next = value
    for (let exponent = 1; exponent <= ceiling; exponent += 1) {
      next *= primes[position]
      if (next > LIMIT) break
      walk(next, divisors * (exponent + 1), position + 1, exponent)
    }
  }
  walk(1, 1, 0, 40)
  candidates.sort((a, b) => a[0] - b[0])
  highlyComposite = new Map()
  let best = 0
  for (const [value, divisors] of candidates) {
    if (divisors > best) {
      best = divisors
      highlyComposite.set(value, divisors)
    }
  }
  return highlyComposite
}

export function invertPolynomial(polynomial, target) {
  let low = 1
  let high = 20000
  while (low < high) {
    const middle = (low + high) >>> 1
    if (polynomial(middle) < target) low = middle + 1
    else high = middle
  }
  return polynomial(low) === target ? low : null
}

let sequenceTables = null

export function sequences() {
  if (sequenceTables) return sequenceTables
  const make = produce => {
    const table = new Map()
    produce((value, index) => {
      if (value >= 10 && value < LIMIT && !table.has(value)) table.set(value, index)
    })
    return table
  }
  const table = primeSieve()
  sequenceTables = {
    fibonacci: make(put => {
      let a = 0
      let b = 1
      for (let k = 0; a < LIMIT; k += 1) {
        put(a, k)
        const next = a + b
        a = b
        b = next
      }
    }),
    lucas: make(put => {
      let a = 2
      let b = 1
      for (let k = 0; a < LIMIT; k += 1) {
        put(a, k)
        const next = a + b
        a = b
        b = next
      }
    }),
    pell: make(put => {
      let a = 0
      let b = 1
      for (let k = 0; a < LIMIT; k += 1) {
        put(a, k)
        const next = 2 * b + a
        a = b
        b = next
      }
    }),
    catalan: make(put => {
      let value = 1
      for (let k = 0; value < LIMIT; k += 1) {
        put(value, k)
        value = (value * 2 * (2 * k + 1)) / (k + 2)
      }
    }),
    bell: make(put => {
      let row = [1]
      put(1, 0)
      for (let k = 1; row[0] < LIMIT; k += 1) {
        const next = [row[row.length - 1]]
        for (let i = 0; i < row.length; i += 1) next.push(next[i] + row[i])
        row = next
        put(row[0], k)
      }
    }),
    motzkin: make(put => {
      let previous = 1
      let current = 1
      for (let n = 2; current < LIMIT; n += 1) {
        const next = ((2 * n + 1) * current + (3 * n - 3) * previous) / (n + 2)
        previous = current
        current = next
        put(current, n)
      }
    }),
    partition: make(put => {
      for (let k = 1; k <= 100; k += 1) put(Number(partitionNumber(k)), k)
    }),
    factorial: make(put => {
      let value = 1
      for (let k = 1; value < LIMIT; k += 1) {
        value *= k
        put(value, k)
      }
    }),
    primorial: make(put => {
      let value = 1
      let count = 0
      for (let p = 2; value < LIMIT; p += 1) {
        if (table[p]) continue
        value *= p
        count += 1
        put(value, count)
      }
    }),
    lcm: make(put => {
      let value = 1
      for (let k = 2; value < LIMIT; k += 1) {
        value = (value / gcd(value, k)) * k
        put(value, k)
      }
    }),
    primeSum: make(put => {
      let total = 0
      let count = 0
      for (let p = 2; total < LIMIT; p += 1) {
        if (table[p]) continue
        total += p
        count += 1
        put(total, count)
      }
    }),
  }
  return sequenceTables
}

export function colorName(r, g, b) {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const lightness = (max + min) / 2
  if (lightness < 0.1) return 'near-black'
  if (lightness > 0.92) return 'near-white'
  const delta = max - min
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1))
  if (saturation < 0.12) return lightness < 0.35 ? 'dark grey' : lightness > 0.65 ? 'light grey' : 'grey'
  let hue
  if (max === rn) hue = ((gn - bn) / delta) % 6
  else if (max === gn) hue = (bn - rn) / delta + 2
  else hue = (rn - gn) / delta + 4
  hue = (hue * 60 + 360) % 360
  const names = [[15, 'red'], [40, 'orange'], [65, 'yellow'], [150, 'green'], [190, 'teal'], [255, 'blue'], [290, 'purple'], [335, 'magenta'], [361, 'red']]
  let base = names.find(([limit]) => hue < limit)[1]
  if (base === 'orange' && lightness < 0.4) base = 'brown'
  if (base === 'yellow' && lightness < 0.4) base = 'olive'
  const tone = lightness < 0.3 ? 'dark ' : lightness > 0.7 ? 'light ' : ''
  return tone + base
}
