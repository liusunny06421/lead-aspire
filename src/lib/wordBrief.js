import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx'
import story from '../data/story.json'
import { MODEL_SIGNALS, contributions } from './rank.js'

const pct = (v) => `${Math.round(v * 100)}%`
const money = (v) => `$${v.toLocaleString()}`

function heading(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 100 } })
}

function bullet(text) {
  return new Paragraph({ text, bullet: { level: 0 } })
}

function line(label, value) {
  return new Paragraph({ children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun(value)], spacing: { after: 60 } })
}

function signalTable(area) {
  const none = { style: BorderStyle.SINGLE, size: 2, color: 'DDDDDD' }
  const borders = { top: none, bottom: none, left: none, right: none }
  const cell = (text, bold = false) =>
    new TableCell({ borders, children: [new Paragraph({ children: [new TextRun({ text, bold })] })] })
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [cell('Signal', true), cell('Area value', true), cell('Effect on estimate', true)] }),
      ...contributions(area).map((c) =>
        new TableRow({
          children: [
            cell(MODEL_SIGNALS[c.key].label),
            cell(MODEL_SIGNALS[c.key].format(area[c.key])),
            cell(`${c.contribution >= 0 ? '+' : '−'}${Math.abs(c.contribution).toFixed(2)} log-odds`),
          ],
        }),
      ),
    ],
  })
}

export async function downloadBrief({ area, brief, funding }) {
  const kept = brief.claims.filter((c) => c.kept).map((c) => c.text)
  const doc = new Document({
    creator: story.user.name,
    title: `Pilot brief: ${area.area_name}`,
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
    sections: [{
      children: [
        new Paragraph({ text: `Financial-education pilot brief: ${area.area_name}`, heading: HeadingLevel.TITLE }),
        line('For', `${story.bank.name} · Attn: ${story.bank.contact}, ${story.bank.contact_role}`),
        line('From', `${story.user.name}, ${story.user.role}`),
        line('Reviewed by', `${story.reviewer.name}, ${story.reviewer.role}`),
        line('Status', brief.status === 'draft' ? 'Draft' : 'Approved'),

        heading('Recommendation'),
        new Paragraph({
          text: `Run a ${brief.pilot.toLowerCase()} in ${area.area_name}. The model estimates ${pct(area.retention)} of consenting participants will still be engaged with the bank at 90 days.`,
        }),
        ...(funding ? [line('Proposed funding', `${funding.series} workshop series · ${money(funding.spend)} · ${funding.people} seats · ~${Math.round(funding.retained)} participants retained`)] : []),

        heading('Why this area'),
        ...kept.map(bullet),
        new Paragraph({ text: '' }),
        signalTable(area),

        heading("What we don't know"),
        new Paragraph({ text: brief.unknowns }),

        heading('Decision needed from the bank'),
        bullet("Confirm the area fits the bank's community goals"),
        bullet('Confirm staffing capacity for the pilot'),
        bullet('Confirm a host partner'),

        heading('How success is measured'),
        bullet('Consented participation'),
        bullet('A recorded first interaction'),
        bullet('90-day retention: share of consenting participants with at least one more recorded interaction within 90 days'),

        heading('Data handling'),
        bullet('Individual information is collected only with consent'),
        bullet('No identities are inferred from area-level data'),
      ],
    }],
  })
  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Pilot brief - ${area.area_name.split(',')[0]}.docx`
  a.click()
  URL.revokeObjectURL(url)
}
