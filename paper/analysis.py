"""Participant-level logistic regression for the research paper.

Generates synthetic participant records for the 30 historical programs in
src/data/historical_programs.json (retained counts match each program exactly),
fits two logistic regressions, and writes figures plus paper/results.json and
paper/results.tex (LaTeX macros the paper reads, so no number is typed by hand).

All data is synthetic. The model fit, standard errors and validation are real
computations on that synthetic data.
"""
import json
import math
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.transforms
import matplotlib.ticker
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent
FIG = OUT / "figures"
FIG.mkdir(exist_ok=True)

SEED = 2026
TEST_SHARE = 0.30

# name, label, family, true effect per SD used only to simulate the data
SIGNALS = [
    ("income_regularity", "Income regularity", "Cash flow", 0.30),
    ("cash_buffer", "Cash buffer", "Cash flow", 0.05),
    ("balance_volatility", "Balance volatility", "Cash flow", -0.28),
    ("rent_on_time", "Rent on-time share", "Payments", 0.22),
    ("utility_on_time", "Utility on-time share", "Payments", 0.06),
    ("payment_gap_freq", "Payment-gap frequency", "Payments", -0.04),
    ("consented_visits", "Consented visits (days 0-14)", "Touchpoints", 0.40),
    ("optin_response", "Opt-in response rate (days 0-14)", "Touchpoints", 0.35),
    ("relationship_days", "Days since first contact", "Touchpoints", 0.22),
]
FAMILIES = ["Cash flow", "Payments", "Touchpoints"]
COVERAGE = {"Cash flow": 0.82, "Payments": 0.71, "Touchpoints": 0.66}
WITHIN_FAMILY_CORR = 0.40
PRE_CONTACT = [s[0] for s in SIGNALS if s[2] != "Touchpoints"]

RED, ORANGE, GREY, INK = "#EB001B", "#F79E1B", "#9A928A", "#1D1A17"


# ---------- synthetic data ----------

def covariance():
    k = len(SIGNALS)
    cov = np.eye(k)
    for i in range(k):
        for j in range(k):
            if i != j and SIGNALS[i][2] == SIGNALS[j][2]:
                cov[i, j] = WITHIN_FAMILY_CORR
    # balance volatility and payment gaps run opposite to their family
    sign = np.array([-1 if s[0] in ("balance_volatility", "payment_gap_freq") else 1 for s in SIGNALS])
    return cov * np.outer(sign, sign)


def simulate(rng):
    programs = json.loads((ROOT / "src/data/historical_programs.json").read_text())
    cov = covariance()
    beta = np.array([s[3] for s in SIGNALS])
    # With X | y ~ N(y * delta, cov), the true log-odds slope is cov^-1 delta = beta.
    delta = cov @ beta
    chol = np.linalg.cholesky(cov)
    rows, y, prog = [], [], []
    for p in programs:
        n, r = p["participants_consented"], p["participants_retained_90d"]
        outcome = np.array([1] * r + [0] * (n - r))
        x = rng.standard_normal((n, len(SIGNALS))) @ chol.T + outcome[:, None] * delta
        rows.append(x)
        y.append(outcome)
        prog += [p["program_id"]] * n
    X, y = np.vstack(rows), np.concatenate(y)
    # coverage: each consented signal family is unavailable for some participants
    mask = np.ones_like(X, dtype=bool)
    for fam in FAMILIES:
        missing = rng.random(len(X)) > COVERAGE[fam]
        cols = [i for i, s in enumerate(SIGNALS) if s[2] == fam]
        mask[np.ix_(missing, cols)] = False
    X = np.where(mask, X, np.nan)
    return X, y, np.array(prog), programs


# ---------- model ----------

def design(X, cols, mu, sd):
    """Standardize with training mean and SD, mean-impute, add family missingness flags."""
    idx = [i for i, s in enumerate(SIGNALS) if s[0] in cols]
    Z = (X[:, idx] - mu[idx]) / sd[idx]
    Z = np.nan_to_num(Z, nan=0.0)
    fams = [f for f in FAMILIES if any(SIGNALS[i][2] == f for i in idx)]
    flags = np.column_stack([np.isnan(X[:, [i for i in idx if SIGNALS[i][2] == f][0]]) for f in fams]).astype(float)
    return np.column_stack([np.ones(len(X)), Z, flags]), fams


def fit_logit(D, y, iters=50):
    b = np.zeros(D.shape[1])
    for _ in range(iters):
        p = 1 / (1 + np.exp(-D @ b))
        W = p * (1 - p)
        H = D.T @ (D * W[:, None])
        step = np.linalg.solve(H, D.T @ (y - p))
        b += step
        if np.max(np.abs(step)) < 1e-10:
            break
    p = 1 / (1 + np.exp(-D @ b))
    H = D.T @ (D * (p * (1 - p))[:, None])
    se = np.sqrt(np.diag(np.linalg.inv(H)))
    return b, se


def p_value(z):
    return math.erfc(abs(z) / math.sqrt(2))


def auc(y, s):
    order = np.argsort(s)
    ranks = np.empty(len(s))
    ranks[order] = np.arange(1, len(s) + 1)
    n1 = y.sum()
    n0 = len(y) - n1
    return (ranks[y == 1].sum() - n1 * (n1 + 1) / 2) / (n1 * n0)


def roc(y, s):
    order = np.argsort(-s)
    ys = y[order]
    tpr = np.concatenate([[0], np.cumsum(ys) / ys.sum()])
    fpr = np.concatenate([[0], np.cumsum(1 - ys) / (1 - ys).sum()])
    return fpr, tpr


def calibration(y, p, bins=5):
    edges = np.quantile(p, np.linspace(0, 1, bins + 1))
    idx = np.clip(np.searchsorted(edges, p, side="right") - 1, 0, bins - 1)
    return [(p[idx == b].mean(), y[idx == b].mean()) for b in range(bins)]


def run_model(name, cols, X, y, train, test, mu, sd):
    Dtr, fams = design(X[train], cols, mu, sd)
    Dte, _ = design(X[test], cols, mu, sd)
    b, se = fit_logit(Dtr, y[train])
    p_te = 1 / (1 + np.exp(-Dte @ b))
    labels = ["Intercept"] + [s[1] for s in SIGNALS if s[0] in cols] + [f"{f} unavailable" for f in fams]
    keys = ["intercept"] + [s[0] for s in SIGNALS if s[0] in cols] + [f"missing_{f.lower().replace(' ', '_')}" for f in fams]
    coefs = []
    for i, (k, lab) in enumerate(zip(keys, labels)):
        z = b[i] / se[i]
        coefs.append({
            "key": k, "label": lab, "beta": b[i], "se": se[i], "z": z, "p": p_value(z),
            "or": math.exp(b[i]), "or_low": math.exp(b[i] - 1.96 * se[i]), "or_high": math.exp(b[i] + 1.96 * se[i]),
        })
    return {
        "name": name, "coefs": coefs, "p_test": p_te,
        "auc": auc(y[test], p_te), "brier": float(np.mean((p_te - y[test]) ** 2)),
        "calibration": calibration(y[test], p_te),
    }


# ---------- figures ----------

def style():
    plt.rcParams.update({
        "font.family": "DejaVu Sans", "font.size": 9, "axes.spines.top": False,
        "axes.spines.right": False, "axes.edgecolor": GREY, "axes.labelcolor": INK,
        "xtick.color": INK, "ytick.color": INK, "savefig.dpi": 300,
    })


def fig_forest(full):
    coefs = [c for c in full["coefs"] if c["key"] in {s[0] for s in SIGNALS}]
    fig, ax = plt.subplots(figsize=(6.8, 3.8))
    for i, c in enumerate(reversed(coefs)):
        fam = next(s[2] for s in SIGNALS if s[0] == c["key"])
        sig = c["p"] < 0.05
        color = (RED if fam != "Touchpoints" else ORANGE) if sig else GREY
        ax.plot([c["or_low"], c["or_high"]], [i, i], color=color, lw=2, solid_capstyle="round")
        ax.plot(c["or"], i, "o", color=color, ms=6, mfc=color if sig else "white", mew=1.5)
    ax.axvline(1, color=GREY, ls="--", lw=1)
    ax.set_yticks(range(len(coefs)))
    ax.set_yticklabels([c["label"] for c in reversed(coefs)])
    ax.set_xscale("log")
    ticks = [0.6, 0.8, 1, 1.25, 1.6, 2]
    ax.set_xticks(ticks)
    ax.set_xticklabels([f"{t:g}" for t in ticks])
    ax.minorticks_off()
    ax.set_xlabel("Odds ratio for 90-day retention, per 1 SD increase (95% CI)")
    # Touchpoint rows are plotted at y = 0..2 (list is reversed); the rest sit above.
    ax.axhspan(-0.5, 2.5, color=ORANGE, alpha=0.08, lw=0)
    side = matplotlib.transforms.blended_transform_factory(ax.transAxes, ax.transData)
    ax.text(1.02, 1, "After contact\n(follow-up list)", transform=side, va="center", fontsize=8, color="#9a5b00")
    ax.text(1.02, len(coefs) - 2.5, "Before contact\n(usable for\ntargeting)", transform=side, va="center", fontsize=8, color=RED)
    fig.text(0.01, 0.01, "Full model. Filled = p < 0.05; hollow grey = not significant. SYNTHETIC DATA: not empirical findings.",
             fontsize=7, color=GREY)
    fig.tight_layout()
    fig.savefig(FIG / "fig1_odds_ratios.pdf")
    fig.savefig(FIG / "fig1_odds_ratios.png")
    plt.close(fig)


def fig_validation(y_test, pre, full):
    fig, (a, b) = plt.subplots(1, 2, figsize=(6.4, 2.9))
    for m, color in ((pre, RED), (full, ORANGE)):
        fpr, tpr = roc(y_test, m["p_test"])
        a.plot(fpr, tpr, color=color, lw=1.8, label=f'{m["name"]}: AUC {m["auc"]:.2f}')
        xs, ys = zip(*m["calibration"])
        b.plot(xs, ys, "o-", color=color, ms=4, lw=1.5, label=f'{m["name"]}: Brier {m["brier"]:.3f}')
    for ax in (a, b):
        ax.plot([0, 1], [0, 1], ls="--", color=GREY, lw=1)
        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)
        ax.set_aspect("equal")
        ax.legend(frameon=False, fontsize=7, loc="lower right")
    a.set_title("A  Discrimination (held-out)", loc="left", fontsize=9, fontweight="bold")
    a.set_xlabel("False-positive rate")
    a.set_ylabel("True-positive rate")
    b.set_title("B  Calibration (held-out)", loc="left", fontsize=9, fontweight="bold")
    b.set_xlabel("Mean predicted probability")
    b.set_ylabel("Observed retention")
    fig.text(0.01, 0.0, "SYNTHETIC DATA: not empirical findings.", fontsize=7, color=GREY)
    fig.tight_layout()
    fig.savefig(FIG / "fig2_validation.pdf")
    fig.savefig(FIG / "fig2_validation.png")
    plt.close(fig)


def fig_programs(prog_scores):
    fig, ax = plt.subplots(figsize=(3.2, 2.6))
    xs = [s for s, _, _ in prog_scores]
    ys = [r for _, r, _ in prog_scores]
    ns = [n for _, _, n in prog_scores]
    ax.scatter(xs, ys, s=[n * 2.5 for n in ns], color=RED, alpha=0.55, edgecolor="white", lw=0.5)
    ax.set_xlabel("Mean pre-contact score of\nprogram participants (log-odds)")
    ax.set_ylabel("Program 90-day retention")
    ax.yaxis.set_major_formatter(matplotlib.ticker.PercentFormatter(1.0))
    fig.tight_layout()
    fig.savefig(FIG / "fig3_programs.pdf")
    fig.savefig(FIG / "fig3_programs.png")
    plt.close(fig)


# ---------- main ----------

def tex_macros(r):
    def m(name, val):
        return f"\\newcommand{{\\{name}}}{{{val}}}"
    lines = [
        m("Nparticipants", f'{r["n"]:,}'), m("Nprograms", r["programs"]), m("Ntrain", f'{r["n_train"]:,}'),
        m("Ntest", r["n_test"]), m("BaseRate", f'{r["base_rate"] * 100:.0f}\\%'),
        m("AUCpre", f'{r["pre"]["auc"]:.2f}'), m("AUCfull", f'{r["full"]["auc"]:.2f}'),
        m("BrierPre", f'{r["pre"]["brier"]:.3f}'), m("BrierFull", f'{r["full"]["brier"]:.3f}'),
        m("ProgCorr", f'{r["program_corr"]:.2f}'),
    ]
    for fam, cov in COVERAGE.items():
        lines.append(m("Cov" + fam.replace(" ", ""), f"{cov * 100:.0f}\\%"))
    for prefix, model in (("", r["full"]), ("Pre", r["pre"])):
        for c in model["coefs"]:
            tag = prefix + "".join(w.capitalize() for w in c["key"].split("_"))
            lines.append(m(f"OR{tag}", f'{c["or"]:.2f}'))
            lines.append(m(f"P{tag}", "< 0.001" if c["p"] < 0.001 else f'= {c["p"]:.3f}'))
    return "\n".join(lines) + "\n"


def tex_table(full, pre):
    pre_by_key = {c["key"]: c for c in pre["coefs"]}
    out = []
    for c in full["coefs"]:
        def cell(x):
            stars = "***" if x["p"] < 0.001 else "**" if x["p"] < 0.01 else "*" if x["p"] < 0.05 else ""
            p = "$<$0.001" if x["p"] < 0.001 else f'{x["p"]:.3f}'
            beta = f'{x["beta"]:+.2f}'.replace("-", "$-$").replace("+", "$+$")
            return f'{beta}{stars} & {x["se"]:.2f} & {p}'
        pc = pre_by_key.get(c["key"])
        pre_cells = cell(pc) if pc else "\\multicolumn{3}{c}{---}"
        label = c["label"].replace("0-14", "0--14")
        out.append(f'{label} & {pre_cells} & {cell(c)} \\\\')
    head = [
        "\\begin{tabular}{lrrrrrr}", "\\toprule",
        " & \\multicolumn{3}{c}{Pre-contact model} & \\multicolumn{3}{c}{Full model} \\\\",
        "\\cmidrule(lr){2-4}\\cmidrule(lr){5-7}",
        "Signal & $\\beta$ & SE & $p$ & $\\beta$ & SE & $p$ \\\\", "\\midrule",
    ]
    tail = [
        "\\midrule",
        f'Held-out AUC & \\multicolumn{{3}}{{c}}{{{pre["auc"]:.2f}}} & \\multicolumn{{3}}{{c}}{{{full["auc"]:.2f}}} \\\\',
        f'Held-out Brier score & \\multicolumn{{3}}{{c}}{{{pre["brier"]:.3f}}} & \\multicolumn{{3}}{{c}}{{{full["brier"]:.3f}}} \\\\',
        "\\bottomrule", "\\end{tabular}",
    ]
    return "\n".join(head + out + tail) + "\n"


def main():
    rng = np.random.default_rng(SEED)
    X, y, prog, programs = simulate(rng)
    test = rng.random(len(y)) < TEST_SHARE
    train = ~test
    mu, sd = np.nanmean(X[train], axis=0), np.nanstd(X[train], axis=0)

    pre = run_model("Pre-contact model", PRE_CONTACT, X, y, train, test, mu, sd)
    full = run_model("Full model", [s[0] for s in SIGNALS], X, y, train, test, mu, sd)

    # Program-level check: does the participants' mean pre-contact score track program retention?
    D_all, _ = design(X, PRE_CONTACT, mu, sd)
    b = np.array([c["beta"] for c in pre["coefs"]])
    lin = D_all[:, 1:1 + len(PRE_CONTACT)] @ b[1:1 + len(PRE_CONTACT)]
    prog_scores = []
    for p in programs:
        sel = prog == p["program_id"]
        prog_scores.append((float(lin[sel].mean()), p["retention_rate_90d"], p["participants_consented"]))
    big = [(s, r) for s, r, n in prog_scores if n >= 15]
    corr = float(np.corrcoef(*zip(*big))[0, 1])

    style()
    fig_forest(full)
    fig_validation(y[test], pre, full)
    fig_programs(prog_scores)

    results = {
        "synthetic": True, "seed": SEED, "n": int(len(y)), "programs": len(programs),
        "n_train": int(train.sum()), "n_test": int(test.sum()), "base_rate": float(y.mean()),
        "coverage": COVERAGE, "program_corr": corr,
        "pre": {k: v for k, v in pre.items() if k != "p_test"},
        "full": {k: v for k, v in full.items() if k != "p_test"},
    }
    (OUT / "results.json").write_text(json.dumps(results, indent=2, default=float) + "\n")
    (OUT / "results.tex").write_text(tex_macros(results))
    (OUT / "table_coefs.tex").write_text(tex_table(full, pre))

    print(f'n={results["n"]} train={results["n_train"]} test={results["n_test"]} base={results["base_rate"]:.3f}')
    for m in (pre, full):
        print(f'\n{m["name"]}: AUC {m["auc"]:.3f}  Brier {m["brier"]:.3f}')
        for c in m["coefs"]:
            print(f'  {c["label"]:<36} b={c["beta"]:+.3f} se={c["se"]:.3f} OR={c["or"]:.2f} p={c["p"]:.4f}')
    print(f"\nprogram-level r (n>=15) = {corr:.2f}")


if __name__ == "__main__":
    main()
