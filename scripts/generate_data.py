"""Generate the synthetic demo dataset.

Writes src/data/historical_programs.json,
then runs analyze.py. Every value is synthetic; area names are fictional.

The generator searches seeds until the target pattern in PRD section 5.3 emerges
(partners strongest, branch distance near zero). Whatever analyze.py reports is
what the app shows; nothing is typed in by hand.
"""
import json
import random
from datetime import date, timedelta
from pathlib import Path

from analyze import DATA, compute, main as analyze_main

N_AREAS = 22
N_PROGRAMS = 30
N_SMALL = 5  # programs below the 15-participant threshold

FIRST = ["Juniper", "Coyote", "Alder", "Sagebrush", "Copper", "Willow", "Ironwood", "Mesquite",
         "Tamarack", "Cottonwood", "Larkspur", "Saltgrass", "Pinyon", "Bluestem", "Redrock",
         "Antelope", "Yucca", "Basalt", "Thistle", "Aspen", "Quarry", "Prairie"]
SECOND = ["Bend", "Crossing", "Flats", "Hollow", "Springs", "Gulch", "Mesa", "Ridge", "Wells",
          "Landing", "Butte", "Draw", "Fork", "Point", "Valley", "Hill", "Park", "Basin",
          "Station", "Commons", "Heights", "Junction"]
STATES = ["TX", "NM", "AZ", "ID", "MT", "WY", "TX", "NM", "ID", "MT", "TX"]


def make_areas(rng):
    firsts, seconds = FIRST[:], SECOND[:]
    rng.shuffle(firsts)
    rng.shuffle(seconds)
    areas = []
    for i in range(N_AREAS):
        rural = rng.random() < 0.4
        gap = rng.uniform(0.06, 0.38)
        cash = min(88, max(18, 25 + gap * 120 + rng.gauss(0, 10)))
        remit = min(92, max(5, 10 + gap * 140 + rng.gauss(0, 15)))
        partners = rng.randint(0, 3) if rural else rng.randint(1, 8)
        dist = rng.uniform(12, 45) if rural else rng.uniform(0.5, 8)
        areas.append({
            "area_id": f"AR-{i + 1:02d}",
            "area_name": f"{firsts[i]} {seconds[i]}, {rng.choice(STATES)}",
            "financial_access_gap": round(gap, 3),
            "cash_reliance_index": round(cash),
            "remittance_activity_index": round(remit),
            "community_partner_count": partners,
            "branch_distance_mi": round(dist, 1),
        })
    return areas


def make_programs(rng, areas):
    # Every area gets one program; 8 areas get a second, later one.
    picks = [a for a in areas] + rng.sample(areas, N_PROGRAMS - N_AREAS)
    small = set(rng.sample(range(N_PROGRAMS), N_SMALL))
    start = date(2022, 1, 10)
    programs, first_rate = [], {}
    for i, a in enumerate(picks):
        repeat = a["area_id"] in first_rate
        offset = rng.randint(500, 1250) if repeat else rng.randint(0, 600)
        rate = (0.10
                + 0.040 * a["community_partner_count"]
                + 0.45 * a["financial_access_gap"]
                + 0.0010 * a["cash_reliance_index"]
                + 0.0006 * a["remittance_activity_index"]
                + rng.gauss(0, 0.05))
        rate = min(0.78, max(0.06, rate))
        n = rng.randint(4, 12) if i in small else rng.randint(18, 72)
        retained = sum(1 for _ in range(n) if rng.random() < rate)
        programs.append({
            "program_id": None,
            "area_id": a["area_id"],
            "area_name": a["area_name"],
            "program_type": "financial_education_workshop",
            "program_start_date": (start + timedelta(days=offset)).isoformat(),
            **{k: a[k] for k in ("financial_access_gap", "cash_reliance_index",
                                 "remittance_activity_index", "community_partner_count",
                                 "branch_distance_mi")},
            "prior_program_retention": first_rate.get(a["area_id"]),
            "participants_consented": n,
            "participants_retained_90d": retained,
            "retention_rate_90d": round(retained / n, 3),
            "data_completeness": 1.0,
            "notes": "Too few participants to rely on" if n < 15 else "",
        })
        if not repeat:
            first_rate[a["area_id"]] = round(retained / n, 3)
    programs.sort(key=lambda p: p["program_start_date"])
    for i, p in enumerate(programs):
        p["program_id"] = f"P-{i + 1:03d}"
    return programs


def matches_target(results):
    r = {s["key"]: s["r"] for s in results["signals"]}
    return (
        0.45 <= r["community_partner_count"] <= 0.62
        and 0.28 <= r["financial_access_gap"] <= 0.45
        and 0.20 <= r["cash_reliance_index"] <= 0.38
        and 0.12 <= r["remittance_activity_index"] <= 0.32
        and r["community_partner_count"] > r["financial_access_gap"] > r["cash_reliance_index"] > r["remittance_activity_index"]
        and abs(r["branch_distance_mi"]) <= 0.08
        and results["holdout"]["top_half_above_median"] >= 3
    )


# Candidate areas are hand-authored in src/data/candidate_areas.json (scored by the paper's model).


def main():
    for seed in range(1, 20000):
        rng = random.Random(seed)
        programs = make_programs(rng, make_areas(rng))
        if matches_target(compute(programs)):
            break
    else:
        raise SystemExit("No seed matched the target pattern")
    print(f"seed={seed}")
    (DATA / "historical_programs.json").write_text(json.dumps(programs, indent=2) + "\n")
    analyze_main()


if __name__ == "__main__":
    main()
