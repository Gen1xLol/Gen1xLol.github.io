let THOUGHTS = [
  "hi there",
  "The quick brown fox was GAY the WHOLE TIME",
  "Brown Fox x Lazy Dog doomed yaoi",
  "what are you doing here",
  "erm",
  "What are you looking at?",
  "trans rights",
  "'kris is he/him!!!' the 72+ wiki citations:",
  "[shake]I NEVER EVEN MET HER!!!",
  "[shake]STAY IN CHARACTER!!!",
  "bocaaa sho te amoooo (/j)",
  "el que te pinchaba con los alfilerardos",
  "huh?",
  "first you get the sugar, then you get the power, then you get the women",
  "67",
  "this status message is a status message",
  "Mike is definitely a cat!",
  "best viewed in desktop",
  "Erk-erk! Ink emergency!",
  "aaaaaahhhhhhhhhhhhhhhhhhhhhhhh",
  "i'm The Grungler",
  "Kane Parsons is 20 years old",
  "Oui oui oui oui, it is Paris",
  "'Bingle bongle Dingle dangle' is the best thing to ever come out of the British.",
  "sponsored by no one!",
  "Heh, it's my Jarona!",
  "We're sorry, Carol.",
  "if this world doesn't make sense, then STOP making sense! SDHGSDHHSDAJHJ",
  "i shjat myself",
  "Flowery voiceclips hit the stimming market like crack hit low-income households in the 80s",
  "Baskemtball",
  "i love my bf",
  "it's a game called Hello Neighbor",
  "Equip  ❤️  Equip",
  "YOU (yes, you!) are VALID",
  "Donald Trump x Charlie Kirk doomed yaoi",
  "i'm not gay, but my boyfriend is!",
  "the cloud this text is floating on was very hard to code",
  "mweheheheheheh",
  "Better Call Saul!",
  "Better Fuel Huell!",
  "Breaking Bad",
  "Fixing Good",
  "[Hochi Mama]!!!",
  "[shake]WATCH ME FLY, MAMA!!!",
  "CSS is a pain in the Ass.",
  "[shake]i'm a shakey shakey boy",
  "what if there was a game called Hello Neighbor",
  "vedal: wowie zowie",
  "ddededodediamante",
  "Z, 4, Q... another Q... a third Q... and the Batman symbol."
  "Ah... Argentina. Home to La Avenida Más Ancha del Mundo, El Río Más Ancho del Mundo, and Las Minas Más Lindas del Mundo... and dulce de leche." 
]

function shuffle(array) {
  const shuffled = [...array]; 
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

THOUGHTS = shuffle(THOUGHTS);

export default THOUGHTS