import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import '../qa.css'

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

const qasTwo = [
  {
    q: 'How many colors are your left cheese?',
    a: 'Up to viewer interpretation.',
  },
  {
    q: 'Why are you listening to Spotify?',
    a: 'What is man without the joys of contemporary music?',
  },
  {
    q: 'If you HAD and I mean absolutely HAD to have a butt how many chambers would it have?',
    a: 'As many as needed to shove approximately 18.7 pickles up there.',
  },
  {
    q: 'Do you?',
    a: 'In your dreams.',
  },
  {
    q: 'Would yu eat the tada emoji?',
    a: "Only if it tastes like yesterday's leftovers.",
  },
  {
    q: 'Do you like booty or booty or booty or 1234?',
    a: 'That one, or the other one, or the one after that, or any value depending on the local weather around a radius of 8 meters of the White House.',
  },
  {
    q: 'You eat?',
    a: 'I eat my enemies and my friends and my frenemies.',
  },
  {
    q: 'Is this a YouTube video?',
    a: 'I mean, depends on how you look at it.',
    image: '/assets/es-una-incognita.png',
  },
  {
    q: 'Do you like Portal?',
    a: 'Yes.',
  },
  {
    q: 'Does your booty glow green when it explodes?',
    a: 'Let me spin up an 8 ball for that one... It said 7.',
  },
  {
    q: 'Labubu or chocolate Labubu?',
    a: 'Sí.',
  },
  {
    q: 'Are you gay?',
    a: "I'd say so. I'm bi. Every hole's a goal in this house...",
  },
]

export default function QA() {
  const [activeTab, setActiveTab] = useState(0)
  const activeQas = activeTab === 0 ? qas : qasTwo
  const title = activeTab === 0
    ? 'Frequently Asked Questions'
    : 'Questions & Answers Banswers Canswers Danswers Eanswers Fanswers Ganswers'

  return (
    <main className="qa-page">
      <h1>{title}</h1>
      <Link to="/" className="back-link"><ArrowLeft size={16} /> go back</Link>

      <div className="qa-tabs" role="tablist" aria-label="Question sets">
        <button
          className={activeTab === 0 ? 'active' : ''}
          onClick={() => setActiveTab(0)}
          role="tab"
          aria-selected={activeTab === 0}
        >
          Set 1
        </button>
        <button
          className={activeTab === 1 ? 'active' : ''}
          onClick={() => setActiveTab(1)}
          role="tab"
          aria-selected={activeTab === 1}
        >
          Set 2
        </button>
      </div>

      <div className="qa-container">
        {activeQas.map((item, i) => (
          <div className="qa-item" key={i}>
            <div className="question">{item.q}</div>
            {item.image && <img className="qa-image" src={item.image} alt="Es una incógnita" />}
            <div className="answer">{item.a}</div>
          </div>
        ))}
      </div>
    </main>
  )
}
