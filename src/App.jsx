import { useEffect, useMemo, useState } from 'react'
import { rankAreas, SIGNAL_META } from './lib/rank.js'
import story from './data/story.json'
import NoLeads from './screens/NoLeads.jsx'
import Discover from './screens/Discover.jsx'
import ResearchBrief from './screens/ResearchBrief.jsx'
import BankHandoff from './screens/BankHandoff.jsx'
import LearningLoop from './screens/LearningLoop.jsx'

const first = story.user.name.split(' ')[0]

const STEPS = [
  {
    key: 'crm', label: 'No leads', Screen: NoLeads,
    narration: `The bank's CRM has no one to call.`,
  },
  {
    key: 'discover', label: 'Discover', Screen: Discover,
    narration: `Score every area from aggregate data. No names in, no names out.`,
  },
  {
    key: 'evidence', label: 'Evidence', Screen: ResearchBrief,
    narration: `Why these signals? The research behind the weights.`,
  },
  {
    key: 'brief', label: 'Bank brief', Screen: BankHandoff,
    narration: `Review the brief, then share it with the bank.`,
  },
  {
    key: 'outcomes', label: 'Outcomes', Screen: LearningLoop,
    narration: `After the pilot: real, consented contacts flow back in.`,
  },
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
  const [step, setStep] = useState(0)
  const [ran, setRan] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [brief, setBrief] = useState(null)
  const [narrate, setNarrate] = useState(true)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [step])

  const selected = areas.find((a) => a.area_id === selectedId)

  function selectArea(area) {
    setSelectedId(area.area_id)
    if (!brief || brief.areaId !== area.area_id) setBrief(initialBrief(area))
    setStep(2)
  }

  const shared = brief?.status === 'shared'
  const reachable = (i) => i <= step || i === 1 || (i <= 3 && selected) || (i === 4 && shared)
  const canNext = step < STEPS.length - 1 && reachable(step + 1)
  const { Screen, narration } = STEPS[step]

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="dots" aria-hidden>
            <i className="dot red" />
            <i className="dot orange" />
          </span>
          Outreach Discovery
          <span className="workspace">{story.bank.short} pilot · {story.region}</span>
        </div>
        <nav className="progress" aria-label="Progress">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              className={`step ${i === step ? 'current' : ''} ${i < step ? 'done' : ''}`}
              onClick={() => setStep(i)}
              disabled={!reachable(i)}
            >
              <span className="num">{i + 1}</span>
              {s.label}
            </button>
          ))}
        </nav>
        <div className="user">
          <button className={`story-toggle ${narrate ? 'on' : ''}`} onClick={() => setNarrate((n) => !n)}>
            Story mode {narrate ? 'on' : 'off'}
          </button>
          <span className="avatar" title={`${story.user.name}, ${story.user.role}`}>{story.user.initials}</span>
        </div>
      </header>

      {narrate && (
        <div className="narration" key={`narration-${step}`}>
          <span className="narration-step">Step {step + 1} of {STEPS.length}</span>
          <p>{narration}</p>
        </div>
      )}

      <main className="stage" key={`stage-${step}`}>
        <Screen
          areas={areas}
          selected={selected}
          selectArea={selectArea}
          brief={brief}
          setBrief={setBrief}
          ran={ran}
          setRan={setRan}
          next={() => setStep((s) => s + 1)}
        />
      </main>

      <footer className="footer">
        <button className="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
          ← Back
        </button>
        <span className="footnote">
          Synthetic demo · fictional people, banks and areas
        </span>
        <button className="primary" onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
          {step === STEPS.length - 1 ? 'End' : 'Next →'}
        </button>
      </footer>
    </div>
  )
}
