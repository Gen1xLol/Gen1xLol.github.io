import { Link } from 'react-router-dom'

const qas = [
  {
    q: 'Are you today or tomorrow?',
    a: 'I am in simultaneous, colliding parallel timelines. Next question.',
  },
  {
    q: 'What color is your nose?',
    a: 'Nose-colored. Next question.',
  },
  {
    q: 'How many times have you gone over there ⏬➡️⬆️↕️⏫↘️↙️🔃',
    a: 'Many more than I could count. Next question.',
  },
  {
    q: 'How many old would you be if you walked to the moon?',
    a: 'Thirty-seven thousand Goobleyinkolns old. Next question.',
  },
  {
    q: 'If you had a small orange cat, would you give it tuna flavored treats, or salmon flavored treats?',
    a: 'Ehhhhhh, probably both. Next question.',
  },
  {
    q: 'Why are you named "Gen1x"?',
    a: 'Gen1x-naming-related reasons. Next question.',
  },
  {
    q: 'Are you a snail or a guy 🧍‍♂️?',
    a: 'A juxtaposition of both. Next question.',
  },
  {
    q: 'Are you that or this?',
    a: 'Either of them, whenever I feel like it. Next question.',
  },
  {
    q: 'Do you have a head or an arm sticking out?',
    a: 'It depends. Next question.',
  },
  {
    q: 'Do you eat?',
    a: 'Perhapsibly. Next question.',
  },
  {
    q: 'What is your favorite piece of that window I just broke?',
    a: 'That one, over there. Next question.',
  },
  {
    q: 'If you could go to mexico to eat it, would you?',
    a: 'Negotiable. Next question.',
  },
  {
    q: 'Do I have any more questions?',
    a: "I don't know. Next question.",
  },
  {
    q: "The answer is I don't Goodbye",
    a: 'Aw.',
  },
]

export default function QA() {
  return (
    <main>
      <h1>Frequently Asked Questions</h1>
      <Link to="/" className="back-link">← go back</Link>

      <div className="qa-container">
        {qas.map((item, i) => (
          <div className="qa-item" key={i}>
            <div className="question">{item.q}</div>
            <div className="answer">{item.a}</div>
          </div>
        ))}
      </div>
    </main>
  )
}
