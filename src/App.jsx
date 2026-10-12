import { useEffect, useMemo, useState } from 'react'
import { rankAreas, SIGNAL_META } from './lib/rank.js'
import story from './data/story.json'
import Problem from './screens/Problem.jsx'
import GapMap from './screens/GapMap.jsx'
import Discover from './screens/Discover.jsx'
import Plan from './screens/Plan.jsx'
import Act from './screens/Act.jsx'
import Learn from './screens/Learn.jsx'
import Recap from './screens/Recap.jsx'
import ResearchBrief from './screens/ResearchBrief.jsx'

// The steps mirror the software pipeline: problem, inputs, model, decision, output, feedback.
const STEPS = [
  { key: 'problem', label: 'Problem', title: 'Banks can’t see people who have never banked.', Screen: Problem },
  { key: 'data', label: 'Data', title: 'Where are people underserved and unreached?', Screen: GapMap },
  { key: 'model', label: 'Model', title: 'Which areas are most likely to stay engaged?', Screen: Discover },
  { key: 'decide', label: 'Decide', title: 'Where should the budget go?', Screen: Plan },
  { key: 'act', label: 'Act', title: 'Hand the bank a ready-to-run pilot.', Screen: Act },
  { key: 'learn', label: 'Learn', title: 'Did people stay?', Screen: Learn },
  { key: 'recap', label: 'Recap', title: 'From no leads to retained customers.', Screen: Recap },
]

function initialBrief(area) {
  return {
    areaId: area.area_id,
    pilot: '6-week financial-education workshop series with a local community partner',
    claims: area.topSignals.map((k) => ({
      id: k,
      text: `${SIGNAL_META[k].label}: ${SIGNAL_META[k].format(area[k])}`,
      kept: true,
    })),
    unknowns: area.counterpoint,
    status: 'draft',
  }
}

export default function App() {
  const areas = useMemo(() => rankAreas(), [])
  const recommended = areas.find((a) => a.status === 'recommended')
  const [step, setStep] = useState(0)
  const [ran, setRan] = useState(false)
  const [brief, setBrief] = useState(() => initialBrief(recommended))
  const [budget, setBudget] = useState(150000)
  const [research, setResearch] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [step])

  const { Screen, title } = STEPS[step]
  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1))

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="dots" aria-hidden>
            <i className="dot red" />
            <i className="dot orange" />
          </span>
          Outreach Discovery
        </div>
        <nav className="pipeline" aria-label="Pipeline">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              className={`stage-pill ${i === step ? 'current' : ''} ${i < step ? 'done' : ''}`}
              onClick={() => setStep(i)}
            >
              {s.label}
            </button>
          ))}
        </nav>
        <span className="avatar" title={`${story.user.name}, ${story.user.role}`}>{story.user.initials}</span>
      </header>

      <main className="stage" key={`stage-${step}`}>
        <h1 className="screen-title">{title}</h1>
        <Screen
          areas={areas}
          selected={recommended}
          brief={brief}
          setBrief={setBrief}
          ran={ran}
          setRan={setRan}
          budget={budget}
          setBudget={setBudget}
          openResearch={() => setResearch(true)}
          goTo={setStep}
          next={next}
        />
      </main>

      {research && (
        <div className="overlay" onClick={() => setResearch(false)}>
          <div className="overlay-body" onClick={(e) => e.stopPropagation()}>
            <button className="ghost close" onClick={() => setResearch(false)}>Close</button>
            <ResearchBrief selected={recommended} />
          </div>
        </div>
      )}

      <footer className="footer">
        <button className="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>←</button>
        <span className="footnote">Illustrative data · fictional people, banks and areas</span>
        <button className="primary" onClick={next} disabled={step === STEPS.length - 1}>Next →</button>
      </footer>
    </div>
  )
}
