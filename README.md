# Outreach Discovery

Demo for LEAD ASPIRE 2026 (Build with Microsoft and GitHub). An internal Mastercard decision-support prototype: with no lead list, decide where a partner bank should run its next outreach pilot, hand the bank a reviewable brief, and measure 90-day retention afterwards.

**All data is synthetic. Area names are fictional. Salesforce and Fabric panels are mockups; nothing is connected.**

See [PRD.md](PRD.md) for the full spec.

## Run locally

```bash
npm install
npm run dev
```

## Regenerate the synthetic data

```bash
npm run data
```

`scripts/generate_data.py` builds 30 fictional past programs and 3 candidate areas, then `scripts/analyze.py` writes `src/data/research_results.json`. The app reads only these JSON files, so the research brief, rankings and deck numbers always match.

## The five screens

1. **Unknown**: CRM search returns zero leads.
2. **Evidence**: synthetic research brief; branch distance is excluded.
3. **Area**: three candidate areas with evidence, gaps and counterpoints.
4. **Bank**: editable partner-bank brief, approved by a person (never sent).
5. **Outcomes**: simulated pilot results, day-45 retention follow-up, new row for the next study.

## Deploy

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`. In the repo's **Settings → Pages**, set **Source** to **GitHub Actions** once.
