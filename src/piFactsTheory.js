import {
  aliquotOf, approx, binomial, consecutiveRuns, divisorSum, factorText, fmt, gcd, goldbach, highlyCompositeNumbers,
  invertPolynomial, isPowerOfTwo, isPrimeNumber, modPow, multiplicativeOrder, nextPrime, ordinal, previousPrime,
  primeCountUpTo, primeFactorSum, randomInt, reverseText, sequences, smallestPrimitiveRoot, SIEVE_LIMIT, sum,
  totient, twoCubes, twoSquares, factorize, superscript, digitSumOf,
} from './piMath.js'

const PI_DIGITS = '314159265358979323846264338327950288419716939937510'
const FERMAT_PRIMES = [3, 5, 17, 257, 65537]
const PI_CONVERGENTS = [[22, 7], [333, 106], [355, 113], [103993, 33102], [104348, 33215], [208341, 66317], [312689, 99532]]
const CONSTANTS = [
  ['e', '2.718281828'], ['√2', '1.414213562'], ['the golden ratio φ', '1.618033988'], ['√3', '1.732050807'],
  ['√5', '2.236067977'], ['ln 2', '0.693147180'], ['ln 10', '2.302585092'], ['Euler\'s constant γ', '0.577215664'],
  ['Apéry\'s constant ζ(3)', '1.202056903'], ['Catalan\'s constant', '0.915965594'],
]
const MAXIMAL_GAPS = new Map([
  [89, 8], [113, 14], [523, 18], [887, 20], [1129, 22], [1327, 34], [9551, 36], [15683, 44], [19609, 52], [31397, 72],
  [155921, 86], [360653, 96], [370261, 112], [492113, 114], [1349533, 118], [1357201, 132], [2010733, 148],
  [4652353, 154], [17051707, 180], [20831323, 210], [47326693, 220],
])
const PERSISTENCE_RECORDS = new Map([[10, 1], [25, 2], [39, 3], [77, 4], [679, 5], [6788, 6], [68889, 7], [2677889, 8], [26888999, 9]])
const FAMOUS = {
  256: '256 = 2⁸, so an unsigned 8-bit value has exactly 256 possibilities: 0 through 255.',
  314: '314 is what you get by multiplying π by 100 and dropping the decimals: 100π = 314.159...',
  365: 'A common year has 365 days; the extra quarter-day in Earth\'s orbit is why leap years are needed.',
  28: '28 is both triangular (1 + 2 + ... + 7) and perfect: its proper divisors 1 + 2 + 4 + 7 + 14 add back up to 28.',
  30: '30 = 1² + 2² + 3² + 4²: the sum of the first four squares is also five times six.',
  495: '495 is the 3-digit Kaprekar constant: sort a 3-digit number\'s digits high-to-low and low-to-high, subtract, and repeat; every number with at least two different digits reaches 495.',
  17: 'Gauss proved at 19 that a regular 17-gon can be built with compass and straightedge, and wanted one on his tombstone.',
  37: 'The 37% rule: in the secretary problem, skip the first 1/e ≈ 36.8% of candidates, then take the next one that beats them all.',
  42: '42 = 6 × 7 is the 5th Catalan number, and the “Answer to the Ultimate Question” in The Hitchhiker\'s Guide to the Galaxy.',
  52: 'A deck of 52 cards can be ordered in 52! ≈ 8.07 × 10⁶⁷ ways, so a well-shuffled deck is almost surely unique in history.',
  60: '60 has 12 divisors, which is why Babylonian base 60 survives in our 60-minute hours and 360-degree circles.',
  64: '64 = 2⁶ = 4³ = 8²: the smallest number above 1 that is a perfect square, a cube and a sixth power at once.',
  89: '1/89 = 0.0112359550...: its digits hide the Fibonacci numbers 1, 1, 2, 3, 5, 8, 13, ... added up with overlapping shifts.',
  97: '97 is the largest two-digit prime, and 1/97 takes 96 digits to start repeating.',
  100: '1³ + 2³ + 3³ + 4³ = 100. In fact, the sum of the first n cubes is always the square of the nth triangular number.',
  127: '127 = 2⁷ − 1 is a Mersenne prime; Lucas proved 2¹²⁷ − 1 prime by hand in 1876, a record that stood until computers in 1951.',
  137: '137 ≈ 1/α, the inverse of the fine-structure constant (137.036...), a number that haunted physicists like Pauli and Feynman.',
  144: '144 = 12² is the largest perfect square in the Fibonacci sequence; only 0, 1 and 144 are squares.',
  168: 'There are exactly 168 primes below 1,000.',
  360: '360 has 24 divisors, which is part of why a circle was cut into 360 degrees.',
  563: '563 is a Wilson prime: its square divides (563 − 1)! + 1. Only three are known: 5, 13 and 563.',
  641: '641 divides 2³² + 1 = 4,294,967,297, which refuted Fermat\'s guess that every 2^(2ⁿ) + 1 is prime (Euler, 1732).',
  1001: '1,001 = 7 × 11 × 13, so a six-digit number made by repeating a three-digit block, like 123,123, is divisible by all three.',
  1089: '1,089 is the “magic” result of the reverse-and-subtract trick, and 1,089 × 9 = 9,801 is its own reversal.',
  1093: '1,093 is one of only two known Wieferich primes (the other is 3,511): 2^(p−1) ≡ 1 even modulo p².',
  1729: '1,729 = 1³ + 12³ = 9³ + 10³: Hardy called it dull, and Ramanujan replied it is the smallest sum of two cubes in two ways.',
  3511: '3,511 is one of only two known Wieferich primes (the other is 1,093): 2^(p−1) ≡ 1 even modulo p².',
  4900: '4,900 = 70² solves the cannonball problem: 1² + 2² + ... + 24² is a perfect square, and apart from 1 it never happens again.',
  5040: '5,040 = 7! has 60 divisors; Plato proposed it as the size of an ideal city because it splits so evenly.',
  5777: '5,777 is one of only two known odd numbers (with 5,993) that are not a prime plus twice a square, breaking Goldbach\'s other conjecture.',
  5993: '5,993 is one of only two known odd numbers (with 5,777) that are not a prime plus twice a square, breaking Goldbach\'s other conjecture.',
  6174: '6,174 is Kaprekar\'s constant: rearrange any 4-digit number\'s digits big-to-small minus small-to-big, repeat, and you land here.',
  625: '625 = 5⁴ = 25², so it is both a square and a fourth power.',
  2025: '2,025 = 45² = 1³ + 2³ + ... + 9³: the first nine cubes add up to the square of 1 + 2 + ... + 9.',
  16843: '16,843 is one of only two known Wolstenholme primes (the other is 2,124,679).',
  19600: '19,600 = 140² is also the 48th tetrahedral number; only 1, 4 and 19,600 are both square and tetrahedral.',
  65537: '65,537 = 2¹⁶ + 1 is the largest known Fermat prime, so a regular 65,537-gon is constructible; Hermes spent about ten years on it.',
  86400: '86,400 is the number of seconds in a day: 24 × 60 × 60.',
  142857: '142,857 is the cyclic number from 1/7: multiply it by 2 through 6 and the same digits rotate around.',
  2124679: '2,124,679 is one of only two known Wolstenholme primes (the other is 16,843).',
  3628800: '3,628,800 = 10! seconds is exactly six weeks.',
  6700417: '6,700,417 is the larger prime factor of 2³² + 1 = 641 × 6,700,417, found by Euler.',
  12345679: '12,345,679 × 9 = 111,111,111, and ×18 gives 222,222,222: the missing 8 is what makes it work.',
}

const isStrobogrammatic = text => {
  const map = { 0: '0', 1: '1', 6: '9', 8: '8', 9: '6' }
  return [...text].every(digit => digit in map) && [...text].reverse().map(digit => map[digit]).join('') === text
}

const isCarmichael = c => c.factors.length >= 3 && c.factors.every(([prime, exponent]) => exponent === 1 && (c.n - 1) % (prime - 1) === 0)

const truncations = (text, fromRight) => {
  const parts = []
  for (let cut = 1; cut < text.length; cut += 1) parts.push(fromRight ? text.slice(0, text.length - cut) : text.slice(cut))
  return parts
}

function aliquotChain(start) {
  const chain = [start]
  let value = start
  while (chain.length < 30) {
    if (value > 1e10) return null
    value = aliquotOf(value)
    if (chain.includes(value)) return null
    chain.push(value)
    if (value === 1) return chain
  }
  return null
}

const keithSequence = c => {
  if (c.length < 2) return null
  const terms = [...c.digits]
  while (terms[terms.length - 1] < c.n) terms.push(sum(terms.slice(-c.length)))
  return terms[terms.length - 1] === c.n ? terms : null
}

const vampireFangs = c => {
  if (c.length % 2 || c.length < 4) return null
  const half = c.length / 2
  const target = [...c.text].sort().join('')
  for (let left = 10 ** (half - 1); left * left <= c.n; left += 1) {
    if (c.n % left !== 0) continue
    const right = c.n / left
    if (String(right).length !== half || (left % 10 === 0 && right % 10 === 0)) continue
    if ([...`${left}${right}`].sort().join('') === target) return [left, right]
  }
  return null
}

const lastOrNull = list => (list.length ? list[list.length - 1] : null)
const countWord = count => (Number(count) === 1 ? 'time' : 'times')

export const THEORY_FACTS = [
  [9, c => FAMOUS[c.n] ?? null],
  [9, c => {
    const match = PI_CONVERGENTS.find(pair => pair.includes(c.n))
    if (!match) return null
    const [top, bottom] = match
    return `${c.f} appears in ${fmt(top)}/${fmt(bottom)} ≈ ${(top / bottom).toFixed(8)}, a continued-fraction approximation of π.`
  }],
  [9, c => {
    if (c.length < 3) return null
    if (PI_DIGITS.startsWith(c.text)) return `${c.text} are the opening digits of π itself: the number is quoting its own start, 3.${PI_DIGITS.slice(1, c.length)}...`
    if (PI_DIGITS.slice(1).startsWith(c.text)) return `${c.text} are exactly the first ${c.length} decimals of π, so π restarts right here.`
    return null
  }],
  [6, c => {
    if (c.length < 3) return null
    const match = CONSTANTS.find(([, value]) => value.replace('.', '').replace(/^0+/, '').startsWith(c.text))
    return match ? `${c.text} are the opening digits of ${match[0]} ≈ ${match[1]}..., another famous constant hiding inside π.` : null
  }],
  [0.9, c => {
    const first = c.firstOccurrence
    return first === c.index ? `${c.text} makes its first appearance in π right here, at decimal place ${fmt(c.index - 1)}.` : null
  }],
  [0.8, c => {
    const total = c.pi.length - 2
    const count = c.occurrenceCount
    const expected = (total - c.length + 1) / 10 ** c.length
    if (count < Math.ceil(expected * 1.5) + 2) return null
    const plural = countWord(count)
    if (expected >= 0.1) return `${c.text} appears ${count} ${plural} in the first ${fmt(total)} digits of π; that many random digits would give about ${approx(expected, 1)}.`
    const chance = (expected * 100).toLocaleString('en-US', { maximumSignificantDigits: 2 })
    return `${c.text} appears ${count} ${plural} in the first ${fmt(total)} digits of π, though random digits would contain it only about ${chance}% of the time.`
  }],
  [2, c => {
    const back = reverseText(c.text)
    if (back === c.text) return null
    const reversed = c.digitStats?.get(back)
    const reverseAt = reversed?.first ?? -1
    if (reverseAt === -1) return `The mirror image ${back} hasn't turned up in the first ${fmt(c.pi.length - 2)} digits of π.`
    return `The reversed cluster ${back} first appears in π at decimal place ${fmt(reverseAt - 1)}.`
  }],
  [0.5, c => `If π is normal (still unproven), each ${c.length}-digit cluster like ${c.text} should turn up about once every ${fmt(10 ** c.length)} digits.`],
  [10, c => (c.text.includes('999999') ? `${c.text} contains six 9s in a row, the Feynman point, which first occurs at decimal place 762.` : null)],
  [3, c => (c.prime ? `${c.f} is prime: nothing but 1 and itself divides it.` : null)],
  [4, c => (c.prime && c.n <= SIEVE_LIMIT ? `${c.f} is the ${ordinal(primeCountUpTo(c.n))} prime number.` : null)],
  [1.4, c => {
    if (c.prime || c.n > SIEVE_LIMIT) return null
    return `There are ${fmt(primeCountUpTo(c.n))} primes below ${c.f}; the estimate n/ln n predicts about ${fmt(Math.round(c.n / Math.log(c.n)))}.`
  }],
  [1.5, c => `Near ${c.f}, roughly 1 in ${approx(Math.log(c.n), 1)} whole numbers is prime, as the prime number theorem predicts.`],
  [5, c => {
    if (!c.prime) return null
    const twin = isPrimeNumber(c.n + 2) ? c.n + 2 : isPrimeNumber(c.n - 2) ? c.n - 2 : null
    return twin ? `${c.f} and ${fmt(twin)} are twin primes, just 2 apart; whether infinitely many such pairs exist is still unproven.` : null
  }],
  [4, c => {
    if (!c.prime) return null
    const options = []
    for (const gap of [4, 6]) for (const other of [c.n - gap, c.n + gap]) if (isPrimeNumber(other)) options.push([gap, other])
    if (!options.length) return null
    const [gap, other] = options[randomInt(0, options.length - 1)]
    return gap === 4
      ? `${c.f} and ${fmt(other)} are cousin primes: both prime, exactly 4 apart.`
      : `${c.f} and ${fmt(other)} are sexy primes: 6 apart, from the Latin “sex” for six.`
  }],
  [5, c => {
    if (!c.prime) return null
    const options = []
    if (isPrimeNumber(2 * c.n + 1)) options.push(`${c.f} is a Sophie Germain prime: 2 × ${c.f} + 1 = ${fmt(2 * c.n + 1)} is prime too.`)
    if (isPrimeNumber((c.n - 1) / 2)) options.push(`${c.f} is a safe prime: (${c.f} − 1) / 2 = ${fmt((c.n - 1) / 2)} is prime too, which cryptographers like.`)
    return options.length ? options[randomInt(0, options.length - 1)] : null
  }],
  [5, c => {
    if (!c.prime) return null
    const back = reverseText(c.text)
    if (back === c.text) return `${c.f} is a palindromic prime: prime, and the same read backward.`
    return isPrimeNumber(Number(back)) ? `${c.f} is an emirp: reversed it is ${fmt(Number(back))}, another prime (“prime” spelled backward).` : null
  }],
  [9, c => {
    if (!c.prime) return null
    if (isPowerOfTwo(c.n + 1)) {
      const p = Math.round(Math.log2(c.n + 1))
      return `${c.f} = 2^${p} − 1 is a Mersenne prime, and it builds the perfect number ${fmt(2 ** (p - 1) * c.n)}.`
    }
    if (FERMAT_PRIMES.includes(c.n)) return `${c.f} = 2^${Math.round(Math.log2(c.n - 1))} + 1 is a Fermat prime; only five are known: 3, 5, 17, 257 and 65,537.`
    return null
  }],
  [3, c => {
    if (!c.prime || c.n === 2) return null
    if (c.n % 4 === 1) {
      const [a, b] = twoSquares(c.n)[0]
      return `${c.f} = ${a}² + ${b}²: primes one above a multiple of 4 are sums of two squares in exactly one way.`
    }
    return `${c.f} can't be a sum of two squares: primes three above a multiple of 4 never are.`
  }],
  [4, c => {
    if (!c.prime || c.n < 5) return null
    return `${smallestPrimitiveRoot(c.n)} is the smallest primitive root of ${c.f}: its powers visit every number from 1 to ${fmt(c.n - 1)} before repeating.`
  }],
  [3, c => {
    let rest = c.n
    let twos = 0
    let fives = 0
    while (rest % 2 === 0) { rest /= 2; twos += 1 }
    while (rest % 5 === 0) { rest /= 5; fives += 1 }
    if (rest === 1) return `1/${c.f} ends after ${Math.max(twos, fives)} decimal digits, because ${c.f} has no prime factors except 2 and 5.`
    const period = multiplicativeOrder(10, rest)
    if (c.prime && period === c.n - 1) return `1/${c.f} repeats every ${fmt(period)} digits, the longest possible: ${c.f} is a full reptend prime, like 7.`
    return `1/${c.f} has a decimal expansion that repeats every ${period === 1 ? 'digit' : `${fmt(period)} digits`}.`
  }],
  [3, c => {
    if (c.prime) return `The next prime after ${c.f} is ${fmt(nextPrime(c.n))}, a gap of ${nextPrime(c.n) - c.n}.`
    const low = previousPrime(c.n)
    const high = nextPrime(c.n)
    return `${c.f} sits between the primes ${fmt(low)} and ${fmt(high)}, inside a run of ${high - low - 1} composite numbers.`
  }],
  [10, c => (MAXIMAL_GAPS.has(c.n) ? `After ${c.f} comes a record prime gap: the next prime is ${MAXIMAL_GAPS.get(c.n)} higher, longer than any gap before it.` : null)],
  [8, c => {
    if (!c.prime) return null
    if (String(nextPrime(c.n)).length > c.length) return `${c.f} is the largest ${c.length}-digit prime.`
    const before = previousPrime(c.n)
    return before !== null && String(before).length < c.length ? `${c.f} is the smallest ${c.length}-digit prime.` : null
  }],
  [2, c => (c.prime && c.n < 1e6 ? `Wilson's theorem: (${c.f} − 1)! + 1 is divisible by ${c.f}, and only primes pass that test.` : null)],
  [4, c => {
    if (!c.prime || c.length < 3) return null
    const right = truncations(c.text, true)
    const left = truncations(c.text, false)
    const rightOk = right.every(part => isPrimeNumber(Number(part)))
    const leftOk = !c.text.includes('0') && left.every(part => isPrimeNumber(Number(part)))
    if (c.n === 73939133) return '73,939,133 is the largest right-truncatable prime: chop digits off the right and every stub stays prime.'
    if (rightOk && leftOk) return `${c.f} is a two-sided truncatable prime: chop digits off either end and it stays prime every time.`
    if (rightOk) return `${c.f} is right-truncatable: ${right.map(fmt).join(', ')} are all prime too.`
    if (leftOk) return `${c.f} is left-truncatable: ${left.map(fmt).join(', ')} are all prime too.`
    return null
  }],
  [6, c => {
    if (!c.prime || c.length < 3) return null
    const rotations = [...c.text].map((_, i) => c.text.slice(i) + c.text.slice(0, i)).slice(1)
    return rotations.every(rotation => isPrimeNumber(Number(rotation))) ? `${c.f} is a circular prime: every rotation of its digits (${rotations.join(', ')}) is prime too.` : null
  }],
  [4, c => {
    if (c.n < 10 || c.n > 40) return null
    const value = c.n * c.n + c.n + 41
    return c.n === 40
      ? 'Euler\'s polynomial n² + n + 41 yields primes for n = 0 to 39, then fails at 40: 40² + 40 + 41 = 1,681 = 41².'
      : `Euler's polynomial n² + n + 41 gives ${fmt(value)} at n = ${c.n}, and it is prime for every n from 0 to 39.`
  }],
  [2, c => (c.n >= 4 && !c.prime ? `${c.f} = ${factorText(c.factors)}, and no other prime factorization exists (the fundamental theorem of arithmetic).` : null)],
  [3, c => {
    if (sum(c.factors.map(([, exponent]) => exponent)) !== 2) return null
    if (c.factors.length === 1) return `${c.f} = ${c.factors[0][0]}², the square of a prime, which makes it a semiprime.`
    return `${c.f} = ${c.factors[0][0]} × ${c.factors[1][0]}: a semiprime, the kind of number RSA encryption hides its secrets in.`
  }],
  [4, c => (c.factors.length === 3 && c.factors.every(([, exponent]) => exponent === 1) ? `${c.f} = ${c.factors.map(([prime]) => prime).join(' × ')}: a sphenic number, three different primes used once each.` : null)],
  [2, c => `${c.f} has ${fmt(c.divisorCount)} divisors, and together they add up to ${fmt(c.divisorSum)}.`],
  [3, c => {
    const aliquot = c.divisorSum - c.n
    if (aliquot === c.n) return null
    return `${c.f} is ${aliquot > c.n ? 'abundant' : 'deficient'}: its proper divisors add up to ${fmt(aliquot)}, ${aliquot > c.n ? 'more' : 'less'} than ${c.f} itself.`
  }],
  [10, c => (c.divisorSum - c.n === c.n ? `${c.f} is a perfect number: its proper divisors add back up to ${c.f}. No odd perfect number has ever been found.` : null)],
  [10, c => {
    const partner = c.divisorSum - c.n
    return partner > 1 && partner !== c.n && aliquotOf(partner) === c.n ? `${c.f} and ${fmt(partner)} are amicable: each equals the sum of the other's proper divisors.` : null
  }],
  [2, c => {
    const chain = aliquotChain(c.n)
    if (!chain || chain.length < 5) return null
    const shown = chain.length > 6 ? `${chain.slice(0, 5).map(fmt).join(' → ')} → ... → 1` : chain.map(fmt).join(' → ')
    return `Replace a number by the sum of its proper divisors, again and again: ${shown}, in ${chain.length - 1} steps.`
  }],
  [2, c => `φ(${c.f}) = ${fmt(totient(c.factors))}: that many numbers from 1 to ${c.f} share no factor with it.`],
  [2, c => {
    const repeated = c.factors.find(([, exponent]) => exponent > 1)
    if (!repeated) return `${c.f} is squarefree: no perfect square above 1 divides it. About 6/π² ≈ 60.8% of whole numbers are.`
    return `${fmt(repeated[0] ** 2)} divides ${c.f}, so it isn't squarefree; about 1 − 6/π² ≈ 39.2% of whole numbers aren't.`
  }],
  [4, c => {
    if (!c.factors.length || !c.factors.every(([, exponent]) => exponent >= 2)) return null
    const common = c.factors.map(([, exponent]) => exponent).reduce(gcd)
    if (common === 1) return `${c.f} = ${factorText(c.factors)} is an Achilles number: powerful, yet not a perfect power. 72 is the smallest.`
    return `${c.f} = ${factorText(c.factors)} is powerful: every prime that divides it does so at least twice.`
  }],
  [3, c => (c.factors.length && c.factors.every(([prime]) => prime <= 5) ? `${c.f} is a regular number: only 2, 3 and 5 divide it, so 1/${c.f} terminates in base 60, as in Babylonian reciprocal tables.` : null)],
  [10, c => {
    const record = highlyCompositeNumbers().get(c.n)
    return record ? `${c.f} is highly composite: ${record} divisors, more than any smaller number has.` : null
  }],
  [9, c => (isCarmichael(c) ? `${c.f} is a Carmichael number: composite, yet it passes Fermat's primality test for every base coprime to it.` : null)],
  [8, c => (c.n % 2 === 1 && !c.prime && !isCarmichael(c) && modPow(2, c.n - 1, c.n) === 1 ? `${c.f} is composite but passes Fermat's primality test in base 2, a pseudoprime; 341 is the smallest.` : null)],
  [8, c => {
    const rule = (c.n - 1) % 2 === 0 ? [c.n - 1, c.n + 1] : [c.n - 1, c.n + 1]
    const own = primeFactorSum(c.factors)
    const other = rule.find(neighbor => neighbor > 1 && primeFactorSum(factorize(neighbor)) === own)
    return other ? `${c.f} and ${fmt(other)} are a Ruth–Aaron pair: their distinct prime factors add to ${own} both times, like 714 and 715.` : null
  }],
  [6, c => {
    const own = digitSumOf(c.n)
    if (c.prime || c.n < 4) return null
    const parts = sum(c.factors.map(([prime, exponent]) => exponent * digitSumOf(prime)))
    return parts === own ? `${c.f} is a Smith number: its digit sum ${own} equals the digit sums of its prime factors added up (named for a phone number, 4,937,775).` : null
  }],
  [5, c => {
    const digitSum = digitSumOf(c.n)
    return c.n % digitSum === 0 ? `${c.f} is a Harshad number: it divides evenly by the sum of its digits, ${digitSum}, giving ${c.n / digitSum}.` : null
  }],
  [5, c => {
    let value = c.n
    const path = [value]
    const seen = new Set()
    while (value !== 1 && !seen.has(value) && path.length < 30) {
      seen.add(value)
      value = [...String(value)].reduce((total, digit) => total + Number(digit) ** 2, 0)
      path.push(value)
    }
    return value === 1 ? `${c.f} is a happy number: repeatedly square and add its digits, and the trail ${path.join(' → ')} ends at 1.` : null
  }],
  [4, c => {
    if (c.length < 2 || !c.text.split('').every(digit => digit === c.text[0])) return null
    const digit = Number(c.text[0])
    const repunit = Number('1'.repeat(c.length))
    return `${c.f} = ${digit} × ${repunit}: every repeated-digit number is its digit times a repunit.`
  }],
  [2, c => {
    const reversed = Number(reverseText(c.text))
    const difference = Math.abs(c.n - reversed)
    return difference && difference % 9 === 0 ? `${c.f} and its reversal ${fmt(reversed)} differ by ${fmt(difference)}, a multiple of 9; reversing digits keeps the digit sum unchanged.` : null
  }],
  [5, c => {
    const terms = keithSequence(c)
    return terms ? `${c.f} is a Keith number: start from its digits and keep adding the last ${c.length} terms (${terms.slice(0, c.length + 3).join(', ')}, ...) and you hit ${c.f}.` : null
  }],
  [9, c => {
    const fangs = vampireFangs(c)
    return fangs ? `${c.f} = ${fangs[0]} × ${fangs[1]}: a vampire number, whose two “fangs” reuse exactly the digits of ${c.f}.` : null
  }],
  [4, c => {
    for (let m = Math.max(1, c.n - 9 * c.length); m < c.n; m += 1) if (m + digitSumOf(m) === c.n) return null
    return `${c.f} is a self number: no whole number plus its own digit sum ever equals it.`
  }],
  [5, c => (isStrobogrammatic(c.text) && c.length >= 2 ? `${c.f} reads the same upside down, a strobogrammatic number, since 6 and 9 swap places when you flip it.` : null)],
  [9, c => {
    const match = PERSISTENCE_RECORDS.get(c.n)
    return match ? `${c.f} is the smallest number whose digits must be multiplied together ${match} ${countWord(match)} to reach a single digit.` : null
  }],
  [9, c => {
    if (c.length < 3) return null
    const powers = c.digits.map(digit => digit ** c.length)
    return sum(powers) === c.n ? `${c.f} is an Armstrong number: ${c.digits.map(digit => `${digit}^${c.length}`).join(' + ')} = ${c.f}.` : null
  }],
  [8, c => {
    const k = sequences().lcm.get(c.n)
    return k ? `${c.f} is the smallest number divisible by every whole number from 1 to ${k}.` : null
  }],
  [5, c => {
    const k = sequences().primeSum.get(c.n)
    return k && k >= 4 ? `${c.f} is the sum of the first ${k} primes: 2 + 3 + 5 + 7 + ... .` : null
  }],
  [3, c => {
    const runs = consecutiveRuns(c.n)
    if (!runs.length) return `${c.f} is a power of two, so it can't be written as a sum of two or more consecutive positive whole numbers.`
    const [start, length] = lastOrNull(runs)
    const terms = length <= 4 ? Array.from({ length }, (_, i) => start + i).join(' + ') : `${start} + ${start + 1} + ... + ${start + length - 1}`
    return `${c.f} = ${terms}${runs.length > 1 ? `, one of ${runs.length} ways to write it as consecutive whole numbers` : ''}.`
  }],
  [3, c => {
    const pairs = twoSquares(c.n)
    const impossible = c.factors.some(([prime, exponent]) => prime % 4 === 3 && exponent % 2 === 1)
    if (impossible) return `${c.f} can't be a sum of two squares: a prime that is 3 mod 4 divides it an odd number of times.`
    if (!pairs.length) return null
    const [a, b] = pairs[0]
    return pairs.length > 1
      ? `${c.f} = ${a}² + ${b}² = ${pairs[1][0]}² + ${pairs[1][1]}²: two different sums of two squares.`
      : `${c.f} = ${a}² + ${b}², a sum of two positive squares.`
  }],
  [4, c => {
    let rest = c.n
    while (rest % 4 === 0) rest /= 4
    return rest % 8 === 7 ? `${c.f} can't be a sum of three squares, since it has the form 4ᵃ(8b + 7); four squares always suffice (Lagrange).` : null
  }],
  [5, c => {
    const pairs = twoCubes(c.n)
    if (pairs.length > 1) return `${c.f} = ${pairs[0][0]}³ + ${pairs[0][1]}³ = ${pairs[1][0]}³ + ${pairs[1][1]}³: a taxicab number, like Ramanujan's 1,729.`
    return pairs.length ? `${c.f} = ${pairs[0][0]}³ + ${pairs[0][1]}³, a sum of two positive cubes.` : null
  }],
  [3, c => {
    if (c.n % 2 === 1 && c.n > 6) {
      const [p, q] = goldbach(c.n - 3) ?? []
      return p ? `${c.f} = 3 + ${p} + ${q}: every odd number from 7 up is a sum of three primes (Helfgott proved this in 2013).` : null
    }
    const pair = goldbach(c.n)
    return pair ? `${c.f} = ${pair[0]} + ${pair[1]}, both prime: Goldbach's conjecture says every even number above 2 splits this way, and none has failed.` : null
  }],
]

const perfectPower = (c, exponent) => {
  const root = Math.round(c.n ** (1 / exponent))
  return root > 1 && root ** exponent === c.n ? root : null
}

THEORY_FACTS.push(
  [4, c => {
    const r = perfectPower(c, 2)
    return r ? `${c.f} = ${fmt(r)}²: it fills a ${fmt(r)} × ${fmt(r)} grid, and equals 1 + 3 + 5 + ... + ${fmt(2 * r - 1)}, the first ${fmt(r)} odd numbers.` : null
  }],
  [4, c => {
    const r = perfectPower(c, 3)
    return r ? `${c.f} = ${fmt(r)}³, which is also ${fmt(r * r - r + 1)} + ... + ${fmt(r * r + r - 1)}, a sum of ${fmt(r)} consecutive odd numbers.` : null
  }],
  [4, c => {
    for (let k = 27; k >= 4; k -= 1) {
      const r = perfectPower(c, k)
      if (r) return `${c.f} = ${r}${superscript(k)}, a perfect ${ordinal(k)} power.`
    }
    return null
  }],
)

const figurate = (weight, polynomial, text) => THEORY_FACTS.push([weight, c => {
  const k = invertPolynomial(polynomial, c.n)
  return k ? text(c, k) : null
}])

figurate(3, k => (k * (k + 1)) / 2, (c, k) => `${c.f} is the ${ordinal(k)} triangular number: 1 + 2 + ... + ${fmt(k)}, or dots stacked ${fmt(k)} rows deep.`)
figurate(4, k => (k * (3 * k - 1)) / 2, (c, k) => `${c.f} is the ${ordinal(k)} pentagonal number, the kind Euler used to count integer partitions.`)
figurate(4, k => k * (2 * k - 1), (c, k) => `${c.f} is the ${ordinal(k)} hexagonal number, which is always triangular too: the ${ordinal(2 * k - 1)} one.`)
figurate(4, k => 3 * k * (k + 1) + 1, (c, k) => `${c.f} honeycomb cells make a hexagon of ${fmt(k)} rings around a centre cell.`)
figurate(4, k => (k * (k + 1) * (k + 2)) / 6, (c, k) => `${c.f} cannonballs stack into a triangular pyramid ${fmt(k)} layers high: the ${ordinal(k)} tetrahedral number.`)
figurate(4, k => (k * (k + 1) * (2 * k + 1)) / 6, (c, k) => `${c.f} balls stack into a square pyramid ${fmt(k)} layers high: 1² + 2² + ... + ${fmt(k)}².`)
figurate(3, k => k * (k + 1), (c, k) => `${c.f} = ${fmt(k)} × ${fmt(k + 1)}: a pronic number, twice the ${ordinal(k)} triangular number.`)
figurate(4, k => 2 * k * (k + 1) + 1, (c, k) => `${c.f} = ${fmt(k)}² + ${fmt(k + 1)}²: dots in a diamond with ${fmt(k)} rings around a centre dot.`)
figurate(4, k => 6 * k * (k - 1) + 1, (c, k) => (c.n === 121 ? '121 is the 5th star number: a Chinese checkers board has exactly 121 holes.' : `${c.f} is the ${ordinal(k)} star number: a hexagram of dots ${fmt(k)} layers deep.`))

THEORY_FACTS.push([9, c => {
  const k = invertPolynomial(t => (t * (t + 1)) / 2, c.n)
  const r = perfectPower(c, 2)
  return k && r ? `${c.f} is both a perfect square (${fmt(r)}²) and triangular: such numbers (1, 36, 1,225, 41,616, ...) grow about 34-fold each time.` : null
}])

const sequence = (weight, name, text) => THEORY_FACTS.push([weight, c => {
  const k = sequences()[name].get(c.n)
  return k === undefined ? null : text(c, k)
}])

sequence(6, 'fibonacci', (c, k) => `${c.f} is the ${ordinal(k)} Fibonacci number; ratios of neighbouring terms close in on the golden ratio, 1.618...`)
sequence(6, 'lucas', (c, k) => `${c.f} is the Lucas number L(${k}): Fibonacci's rule, started from 2 and 1 instead of 0 and 1.`)
sequence(6, 'pell', (c, k) => `${c.f} is the Pell number P(${k}); neighbouring ratios close in on 1 + √2 ≈ 2.414.`)
sequence(6, 'catalan', (c, k) => `${c.f} is the Catalan number C(${k}): the number of ways to triangulate a ${k + 2}-sided polygon.`)
sequence(6, 'bell', (c, k) => `${c.f} is the Bell number B(${k}): the number of ways to split ${k} labelled things into groups.`)
sequence(6, 'motzkin', (c, k) => `${c.f} is the Motzkin number M(${k}): ways to draw non-crossing chords between ${k} points on a circle.`)
sequence(6, 'partition', (c, k) => `${c.f} = p(${k}): there are that many ways to write ${k} as a sum of positive whole numbers.`)
sequence(6, 'factorial', (c, k) => `${c.f} = ${k}!, the number of ways to line up ${k} different objects.`)
sequence(6, 'primorial', (c, k) => `${c.f} is the product of the first ${k} primes, a primorial.`)

export { binomial }
