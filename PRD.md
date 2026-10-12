# PRD: Outreach Discovery

**Status:** Demo specification, frozen for build
**Event:** LEAD ASPIRE 2026, Build with Microsoft and GitHub phase
**Deadline:** Deck and demo link due **2:30 PM, Oct 12**
**Audience:** Mastercard business stakeholders who aren't technical. 5-minute presentation plus 2 minutes of Q&A.
**Product type:** Internal Mastercard decision-support tool (B2B2C: Mastercard → partner bank → community)

> **One sentence:** Outreach Discovery helps Mastercard decide where a partner bank should meet potential customers it can't yet see. It then measures whether that outreach leads to lasting engagement.

---

## 0. How this version differs from the original pitch

The accepted pitch was a "Trust CRM integration layer" that would output a trust score. This PRD keeps the hook and the business model but changes the mechanism. These are deliberate decisions, so the whole team should use the same language:

| Original pitch | This PRD | Why |
|---|---|---|
| A trust score for individuals | **No individual score.** Trust is measured as **90-day program retention** after people consent. | Mastercard can't score people it has never met. A score with no explanation also makes the first judge question hard to answer. |
| Assemble scattered individual signals (rent, remittances, paychecks) | Use **area-level, aggregated** versions of those signals to pick *where* to go. Individual signals are collected only with consent, after outreach. | This avoids implying that the product finds or profiles unknown individuals. |
| Salesforce plugin | Standalone demo app with a **mocked Salesforce handoff** (Campaign and Lead records). The real integration appears on an architecture slide. | It can be built by 2:30 PM, and it's honest about what works today. |
| Heat map of communities | A comparison of 3 candidate areas, with a small map as a stretch goal | The decision matters more than the visualization. |

**How the hook still lands:** "How do you measure trust when there is no credit score? You don't guess it. You measure it as behavior: do people come back? And you decide where to start by looking at evidence you already have."

---

## 1. Problem

- Every bank CRM starts recording at account opening. Workshops, branch visits, and community events that happen 6 to 18 months before then leave no data behind.
- Mastercard knows that underserved US communities exist, including cash-reliant households, informal workers, and immigrants. It doesn't know **where** to put its outreach effort. Today's financial-education outreach is "spray and pray."
- A lead list can't help with this. The people Mastercard wants to reach aren't in any CRM yet.

**Product question:** With no individual lead list, which area should Mastercard propose for the next partner-bank outreach pilot, and why?

**What we're showing Mastercard:** This isn't new technology. It's a new market for what Mastercard already owns: aggregated network insights, financial-education programs, and bank relationships.

---

## 2. Users and value

| User | Job to be done | Output |
|---|---|---|
| Mastercard partnerships or outreach team (**primary demo user**) | Decide where to propose a pilot and justify it to a bank | Area recommendation with evidence, plus a draft pilot brief |
| Partner-bank community team | Decide whether and how to run the program | Brief they can review, with assumptions, checks, and a measurement plan |
| Mastercard research or analytics team | Decide which signals belong in future recommendations | Research brief: definitions, results, and limitations |

**Value hypothesis (illustrated, not proven):** Better-targeted programs, then higher participant retention, then more banked customers for partner banks, then more card and network volume for Mastercard.

---

## 3. Core definitions (use them everywhere)

**90-day program retention.** The share of consenting outreach-program participants who complete at least one additional recorded interaction with the partner bank within 90 days of their first program interaction.

- This isn't account opening, creditworthiness, or card usage. Don't use those terms for it anywhere.
- `retention_rate_90d = participants_retained_90d / participants_consented`

**Unit of analysis.** One past outreach program in one area.

**Pre-outreach signal.** An area-level measure that is knowable *before* a program runs. Attendance, sign-ups, and branch visits from a program are **never** inputs for recommending that same program's area.

**Program type.** This is fixed to **one** type, a community financial-education workshop series, so the study compares like with like.

---

## 4. Demo success criteria

A judge who watches the demo should be able to say:

1. "They started with zero leads."
2. "They chose signals based on a stated test, not arbitrary weights."
3. "One area was recommended, one needed more investigation, and one was lower priority, each with visible reasons."
4. "The tool was honest about what it doesn't know."
5. "The output is a brief the bank can act on, and a person approved it."
6. "Real outcomes feed back into the next decision, and the retention follow-up keeps leads from going cold."

---

## 5. Research foundation (synthetic)

**Title:** *Which Pre-Outreach Area Signals Are Associated with 90-Day Financial-Program Retention? A Synthetic Demonstration*

**Banner on every research view:** `SYNTHETIC DEMONSTRATION DATA: NOT REAL FINDINGS`

### 5.1 Candidate signals

All signals are area-level and available before a program starts. The "Real-world analog" column is for the architecture slide only. The demo uses synthetic values.

| Signal | Definition | Real-world analog (proposed, not integrated) | Decision |
|---|---|---|---|
| `financial_access_gap` | % of households that are unbanked or underbanked | FDIC household survey, Census ACS | **Include** |
| `cash_reliance_index` (0–100) | Share of local spend in cash versus card | Aggregated, anonymized Mastercard network insights | **Include** |
| `remittance_activity_index` (0–100) | Relative volume of outbound remittances | Aggregated remittance-provider data | **Include** |
| `community_partner_count` | Active organizations that could host a program (CDFIs, libraries, faith and community groups) | Partner-bank and nonprofit directories | **Include, highest weight** |
| `branch_distance_mi` | Median distance to the nearest bank branch | FDIC Summary of Deposits | **Exclude from ranking**, show as context |
| `prior_program_retention` | 90-day retention of an earlier program in the same area, if one ran | Our own learning loop | **Needs more evidence.** Missing for most areas. |
| `data_completeness` | % of included signals that are present and verified | n/a | **Eligibility gate** |

### 5.2 Methods

- 30 synthetic historical programs across about 22 fictional US areas.
- Pearson correlation between each signal and `retention_rate_90d`, with a 95% confidence interval from the Fisher z-transform.
- Programs with fewer than 15 consented participants are **shown but excluded** from the correlations. They appear greyed out with the label "too small to rely on."
- Stretch goal: rank by the illustrative weights on 8 held-out programs and report how often the top half really had above-median retention.
- Compute all of this **once in a script** (`scripts/analyze.py` or a spreadsheet). The app reads static results from JSON. The app doesn't run the study on each click.

### 5.3 Target pattern for generating the data

Generate the synthetic data so that roughly this pattern emerges. **Show only what the script actually outputs.** Don't put a coefficient in the deck that doesn't appear in the app.

| Signal | Intended direction |
|---|---|
| `community_partner_count` | Strongest positive (about r 0.5) |
| `financial_access_gap` | Moderate positive (about r 0.35) |
| `cash_reliance_index` | Moderate positive (about r 0.3) |
| `remittance_activity_index` | Weak to moderate positive (about r 0.25) |
| `branch_distance_mi` | About 0, with a CI that spans zero |

### 5.4 The finding that changes a product decision (for the live demo)

> "We expected distance to the nearest branch to be the best signal, because remote means underserved. In this synthetic illustration it showed almost no association with retention. Places with active community partners retained people better. So the prototype doesn't rank areas on distance alone."

This finding sets up the Area B moment on Screen 3.

### 5.5 Limitations section (required text in the brief)

- Correlation isn't causation.
- Area-level patterns don't describe or identify individuals.
- Past programs may differ in how well they were run.
- Small samples and missing data can mislead.
- All data is synthetic.

---

## 6. Recommendation logic

The logic is simple and visible:

1. **Eligibility gate:** `data_completeness >= 75%` → eligible for ranking. Below that threshold, the area is flagged **Investigate**.
2. **Normalize** each included signal to 0–1 against the *historical* min and max, so the 3 candidates don't collapse to 0 or 1.
3. **Illustrative weights**, displayed on screen and labeled "illustrative, not validated":
   - community partners 0.35
   - financial access gap 0.30
   - cash reliance 0.20
   - remittance activity 0.15
   - branch distance 0
4. **Assign a status**:
   - **Recommended for pilot review**: the top eligible area
   - **Investigate**: fails the gate
   - **Lower priority for this pilot**: everything else
5. **Explanation:** Fill a template from the displayed fields to make two sentences of reasoning plus one counterpoint or uncertainty. The demo uses no generative AI.

Never call the output a "trust score," a probability, or a guarantee. The UI label is **"Pilot-review ranking."**

### 6.1 Candidate areas (all fictional, modeled on US archetypes)

| | **Area A: Mesa Flats, TX** | **Area B: Bitterroot Junction, MT** | **Area C: Cedar Park Heights, ID** |
|---|---|---|---|
| Archetype | Border metro neighborhood | Rural Mountain West town | Small-city suburb |
| Financial access gap | 31% | 27% | 9% |
| Cash reliance index | 72 | **missing** | 34 |
| Remittance activity | 81 | 12 | 22 |
| Community partners | 6 | 2 (unverified) | 3 |
| Branch distance | 2.1 mi | **38 mi** | 1.4 mi |
| Prior program | None | None | None |
| Data completeness | 100% | 50% | 100% |
| **Status** | **Recommended for pilot review** | **Investigate** | **Lower priority** |
| Counterpoint shown | "Strong remittance activity may reflect ties to non-US banking. The bank should verify local relevance." | "Distance makes this look the most underserved, but our research says distance alone isn't enough, and key data is missing." | "Signals are complete but show a smaller access gap. Better suited to a later phase." |

Area B is the teaching moment. Intuition says "go to the most remote place." The evidence says "first verify the data you're missing."

---

## 7. The five screens

The demo is a guided, clickable flow, not a dashboard. A persistent progress bar runs across the top: **Unknown → Evidence → Area → Bank → Outcomes**. Each screen has one **Next** button and works from start to finish with no network calls.

### Screen 1: No leads
- A CRM-style lead search with the filter "Underserved households, El Paso region" returns **0 records**.
- Callout: "Every CRM starts at account opening. The people we want to reach aren't here yet."
- Prompt: **"Where should we run the next outreach program?"**
- *Acceptance:* zero results are visible and the question is on screen within 5 seconds.

### Screen 2: Research brief
- A paper-style single page with the synthetic banner. It shows the research question, the retention definition, a dataset summary (30 programs, total participants, and areas), and the signal table with r, 95% CI, n, and decision.
- The **branch distance** row is highlighted, with the decision-change callout from §5.4.
- Small-sample programs are listed separately and greyed out.
- *Acceptance:* every number matches `research_results.json`. Every decision chip reads **Include**, **Exclude**, or **Needs evidence**.

### Screen 3: Area recommendation
- Three evidence cards side by side, one per area, each with a status badge.
- Each card shows signal values, a clear "missing" marker for absent data, a counterpoint, and data completeness.
- An expandable **"How was this ranked?"** panel shows the weights and normalized values, labeled illustrative.
- Stretch: a simple US map with 3 pins.
- *Acceptance:* clicking Area A carries it into Screen 4. Area B can't be selected for a brief; its button reads "Request missing data."

### Screen 4: Bank handoff
A generated pilot brief for Area A. All fields are editable:
- **Proposed area**
- **Why review it** (2–3 signals)
- **What we don't know**
- **Suggested pilot:** a 6-week financial-education workshop series with a local community partner
- **Bank decision required:** confirm local relevance, staffing capacity, and the host partner
- **Measurement plan:** consented participation, a recorded first interaction, and 90-day retention as defined in §3
- **Data handling:** individual data only with consent; no identities inferred from area data

Interactions:
- Edit the pilot type.
- Remove a claim (there's a checkbox on each evidence bullet).
- **Approve brief**. The status changes from `Draft` to `Approved, ready to share with partner bank`. There's no "Send" or "Launch."

**Salesforce preview (mockup):** a side panel labeled *"Proposed integration: not connected"* shows how the approved brief would become a Salesforce **Campaign**. Fields shown: Name, Type = Financial Education, Status = Planned, and Expected Response = the retention target.

*Acceptance:* the approved state persists when the user goes back and forward.

### Screen 5: Learning loop and retention
Labeled **`SIMULATED FUTURE OUTCOME`**.
- **Funnel for Area A:** 64 attended → 41 consented → 41 first interactions recorded → **22 retained at 90 days (54%)**. Shown next to the historical median from the research data.
- **Retention follow-up list (the retention feature):** at day 45, 23 consented participants have no return interaction yet, so they're flagged for a follow-up touch. Show 3–4 fictional first-name rows with the last interaction and a suggested next step, such as "1:1 budgeting session." This is the only place individuals appear, and only *after* consent.
- **Salesforce mockup:** consented participants become **Leads** (Lead Source = program). Interactions are logged as **Activities**. Retention is a report on **Campaign Members** with an activity within 90 days.
- **The loop closes:** an animated "new row" adds the Mesa Flats program to the historical dataset (30 → 31 programs), and `prior_program_retention` for Area A changes from missing to 54%.
- Closing line on screen: "We can't name people we haven't met. We can decide where to meet them, and learn whether they stay."

---

## 8. Data files

```
data/
  historical_programs.json   # 30 rows
  candidate_areas.json       # 3 rows (A, B, C)
  research_results.json      # per-signal r, ci_low, ci_high, n, decision, note
  simulated_outcome.json     # Screen 5 funnel and follow-up rows
scripts/
  generate_data.py           # seeded synthetic generator (target pattern in §5.3)
  analyze.py                 # writes research_results.json
```

**`historical_programs.json` row:**
```json
{
  "program_id": "P-014",
  "area_id": "AR-07",
  "area_name": "Fictional name",
  "program_type": "financial_education_workshop",
  "program_start_date": "2024-03-04",
  "financial_access_gap": 0.24,
  "cash_reliance_index": 61,
  "remittance_activity_index": 55,
  "community_partner_count": 4,
  "branch_distance_mi": 6.2,
  "participants_consented": 38,
  "participants_retained_90d": 13,
  "retention_rate_90d": 0.342,
  "data_completeness": 1.0,
  "notes": ""
}
```

`candidate_areas.json` uses the same signal fields plus `status`, `counterpoint`, and `missing_fields`. It has **no outcome fields**.

**Consistency rule:** the app, the research brief, and the deck read from the same JSON. If a number changes, regenerate it; never type it by hand.

---

## 9. Technical build

| Layer | Choice | Notes |
|---|---|---|
| App | Vite + React (or the team's fastest framework), one route per screen | Shared state holds the selected area and brief status. |
| Data | Local JSON, imported at build time | No backend, no auth, no external API |
| Analysis | Python script run once | Commit its output. |
| Styling | Mastercard-adjacent palette (red `#EB001B`, orange `#F79E1B`, warm neutrals) | Don't use the Mastercard logo unless the event allows it. |
| Hosting | **GitHub Pages or Azure Static Web Apps** from this repo | A genuine use of GitHub and Microsoft. Say "built with GitHub Copilot" only if it's true. |
| Fallback | 60–90 second screen recording plus screenshots in the deck | Record as soon as the flow runs end to end. |

**Microsoft and Salesforce: what we may claim**

| Claim | OK? |
|---|---|
| "Deployed on Azure Static Web Apps / GitHub Pages" | Yes, if it's true |
| "Fabric *could* combine census, FDIC, and aggregated network data into one lakehouse; Power BI *could* serve the area view" | Yes, as proposed architecture |
| "Approved briefs *would* become Salesforce Campaigns; consented participants *would* become Leads" | Yes, as proposed architecture, with the mockup labeled |
| "Our demo pulls live data from Fabric or Salesforce" | **No** |

---

## 10. Build order (time-boxed to 2:30 PM)

| # | Task | Owner | Done when |
|---|---|---|---|
| 1 | Freeze the narrative and the §3 definitions (15 min) | All | Everyone can say the retention definition from memory. |
| 2 | Generate the data and run the analysis (30 min) | Data | `research_results.json` shows distance at about r 0 and partners as the strongest signal. |
| 3 | Screens 1, 3, 4: the core story (60–75 min) | Frontend | Click through from zero leads to an approved brief. |
| 4 | Screen 2: research brief (30 min) | Frontend and data | Numbers match the JSON. |
| 5 | Screen 5: learning loop and follow-up list (30 min) | Frontend | Funnel, follow-up rows, and new-row animation all work. |
| 6 | Deploy and record the fallback video (15 min) | Any | Public link works in an incognito window. |
| 7 | Deck, built in parallel from step 2 onward | Deck | Screenshots match the deployed app. |
| 8 | Rehearse and cut (20 min) | All | 5:00 or less. Cut anything that needs a long explanation. |

**Cut order if time runs short:** map, then held-out validation, then the Salesforce mockup panels, then the Screen 5 animation. **Never cut:** Screen 1, Screen 3, Screen 4, or the synthetic labels.

---

## 11. Five-minute run of show

| Time | Beat | Screen |
|---|---|---|
| 0:00–0:40 | Hook: "How do you measure trust when there's no credit score?" The CRM has no leads, so where do we start? | 1 |
| 0:40–1:35 | Define trust as retention. Show the study design and the branch-distance surprise. | 2 |
| 1:35–2:35 | Compare the 3 areas. Area B shows why we don't just go to the most remote place. | 3 |
| 2:35–3:40 | Generate the brief, edit one claim, approve it. Show the Salesforce Campaign preview. | 4 |
| 3:40–4:25 | Simulated outcome, the follow-up list keeps people from going cold, the loop adds a row. | 5 |
| 4:25–5:00 | Close: B2B2C value, US pilot, then a Latin America roadmap. "Not new tech, a new market for what Mastercard already owns." | Deck |

**Likely Q&A, with prepared answers**

- *"Is this real data?"* No. Every number is synthetic and labeled that way. The pilot's job is to produce the first real data.
- *"How is this different from a credit score?"* It never scores a person. It ranks places to try outreach and measures whether people come back.
- *"What about privacy?"* Inputs are area-level aggregates. Individual records exist only after consent at a program.
- *"Why would a bank pay for this?"* It gets a targeted pilot with a measurement plan instead of spray-and-pray community spending. That's also useful for CRA reporting. (Phrase this as a possibility.)
- *"Why Latin America later?"* There are similar cash-reliant, remittance-heavy communities and existing Mastercard presence. The US pilot proves the loop first.

---

## 12. Out of scope

- Finding names or contacts of people with no prior relationship or consent
- Any individual trust score, credit score, or eligibility decision
- Automatically contacting consumers or sending the brief
- Live Fabric, Salesforce, bank, or messaging integrations
- Claiming the synthetic study validates the model, or that the tool raises retention or revenue

---

## 13. Risks and safeguards

| Risk | Safeguard |
|---|---|
| Synthetic findings look real | A persistent banner on Screens 2, 3, and 5, plus "illustrative" on the weights |
| Correlation read as causation | Say "associated with," keep a visible limitations box, and frame the output as a pilot to test |
| Area data used to judge individuals | Outputs are places only. Individuals appear only after consent, on Screen 5. |
| Outcome leakage | Candidate areas have no outcome fields. Program engagement appears only on Screen 5. |
| A small sample looks decisive | n is shown on every stat, n < 15 is excluded and greyed out, and CIs are displayed. |
| It looks like an auto-send | The flow is Approve, then "ready to share." There's no send button. |
| The "trust score" expectation from the original pitch | §0 reframing, delivered in the first 40 seconds |

---

## 14. Final consistency checklist

- [ ] Every study result and future outcome is labeled synthetic or simulated.
- [ ] Only pre-outreach signals rank new areas.
- [ ] Retention is measured only after consenting people participate, using the §3 definition everywhere.
- [ ] No area-level statistic is presented as a fact about an individual.
- [ ] No correlation is described as causal or as guaranteed retention.
- [ ] The brief is approved by a person, not sent automatically.
- [ ] The demo works end to end offline and at the deployed link.
- [ ] Deck numbers equal app numbers equal JSON numbers.
- [ ] The first and last screens answer the same question: *where do Mastercard and a bank start when there's no lead list?*

---

## 15. Decisions made in this version (confirm or override quickly)

| Open question from the previous draft | Default chosen |
|---|---|
| Pilot geography | Fictional areas modeled on a TX border metro, rural Montana, and an Idaho suburb. Screen 1 searches the "El Paso region." |
| Outreach format | One type only: a 6-week community financial-education workshop series |
| Signal definitions | §5.1 |
| Decision-changing result | Branch distance excluded from the ranking (§5.4) |
| Bank decision requested | Approve a single pilot in Area A, after confirming local relevance, capacity, and a host partner |
| Retention feature | Day-45 follow-up list for consented participants who haven't returned yet (Screen 5) |
| Salesforce detail | Mocked Campaign, Lead, and Activity mapping, labeled "Proposed integration: not connected" |
