"""
Builds every chart in the final report from the repo's own artifacts:
benchmark_films.csv and backend/handlers/heldout_results.json.
Writes PNGs to final_report/figures and the computed numbers to
final_report/numbers.json, which build_report.js reads.

Run from the repo root:  python3 final_report/make_figures.py
"""
import csv
import json
import os

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.patches import FancyBboxPatch  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "final_report", "figures")
os.makedirs(OUT, exist_ok=True)

TIERS = ["High", "Medium", "Low"]
TIER_COLOR = {"High": "#B91C1C", "Medium": "#D97706", "Low": "#047857"}
FEATURES = ["num_characters", "num_locations", "num_props", "num_costumes", "num_equipment"]
FEATURE_LABEL = ["Characters", "Locations", "Props", "Costumes", "Equipment"]

plt.rcParams.update({
    "font.family": "DejaVu Sans",
    "font.size": 10,
    "axes.spines.top": False,
    "axes.spines.right": False,
    "axes.titleweight": "bold",
})

rows = list(csv.DictReader(open(os.path.join(ROOT, "benchmark_films.csv"))))
heldout = json.load(open(os.path.join(ROOT, "backend", "handlers", "heldout_results.json")))


def save(fig, name):
    fig.tight_layout()
    fig.savefig(os.path.join(OUT, name), dpi=200)
    plt.close(fig)


def pearson(xs, ys):
    n = len(xs)
    mx, my = sum(xs) / n, sum(ys) / n
    cov = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    vx = sum((x - mx) ** 2 for x in xs) ** 0.5
    vy = sum((y - my) ** 2 for y in ys) ** 0.5
    return cov / (vx * vy)


# ── Figure 1: architecture ────────────────────────────────────────────────
def fig_architecture():
    fig, ax = plt.subplots(figsize=(10, 5.6))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 6.6)
    ax.axis("off")

    def box(x, y, w, h, title, body, color):
        ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.05,rounding_size=0.12",
                                    linewidth=1.2, edgecolor=color, facecolor=color + "18"))
        ax.text(x + w / 2, y + h - 0.28, title, ha="center", va="top", fontsize=10.5,
                fontweight="bold", color=color)
        ax.text(x + w / 2, y + h - 0.68, body, ha="center", va="top", fontsize=8.6, color="#333333",
                linespacing=1.35)

    def arrow(x0, y0, x1, y1, label=""):
        ax.annotate("", xy=(x1, y1), xytext=(x0, y0),
                    arrowprops=dict(arrowstyle="-|>", color="#555555", lw=1.2))
        if label:
            ax.text((x0 + x1) / 2, (y0 + y1) / 2 + 0.12, label, ha="center", fontsize=8, color="#555555")

    box(0.1, 3.4, 2.1, 2.3, "React frontend", "Script upload\nEntity review\nBudget tree\nEvaluation\nDashboard", "#4338CA")
    box(2.9, 0.4, 4.4, 5.9, "Go backend (Gin + GORM)", "", "#0F766E")
    box(3.15, 4.15, 1.85, 1.15, "Script parser", "scene headings\nINT/EXT, time", "#0F766E")
    box(5.2, 4.15, 1.85, 1.15, "Entity extractor", "cues, glossary,\ncaps pass", "#0F766E")
    box(3.15, 2.6, 1.85, 1.15, "Shoot-day model", "frozen 50-tree\nRandom Forest", "#0F766E")
    box(5.2, 2.6, 1.85, 1.15, "Cost engine", "rate card x days\nATL/BTL, fringes", "#0F766E")
    box(3.15, 0.75, 3.9, 1.35, "Validation API", "/validation/* : CV results, holdout,\nextraction test, ablation, confusion matrix", "#0F766E")
    box(8.0, 3.4, 1.9, 2.3, "SQLite /\nPostgreSQL", "\n\nproductions\nscenes, entities\nbudget lines", "#6B7280")
    box(8.0, 0.4, 1.9, 2.3, "Offline Python", "compare models\nexport forest\nholdout test\nbenchmark CSV", "#9333EA")

    arrow(2.2, 4.6, 2.9, 4.6, "REST")
    arrow(5.0, 4.7, 5.2, 4.7)
    arrow(6.1, 4.15, 6.1, 3.75)
    arrow(5.2, 3.15, 5.0, 3.15)
    arrow(7.3, 4.6, 8.0, 4.6)
    arrow(8.0, 1.5, 7.3, 1.5, "artifacts")
    ax.text(5.1, 6.5, "Optional: Gemini extraction path (Python sidecar), not the scored path",
            ha="center", fontsize=8.5, style="italic", color="#666666")
    save(fig, "fig01_architecture.png")


# ── Figure 2: dataset ─────────────────────────────────────────────────────
def fig_dataset():
    fig, (a, b) = plt.subplots(1, 2, figsize=(10, 4))
    data = [[float(r["total_shoot_days"]) for r in rows if r["budget_category"] == t] for t in TIERS]
    bp = a.boxplot(data, patch_artist=True, widths=0.55)
    a.set_xticks([1, 2, 3], [f"{t}\n(n={len(d)})" for t, d in zip(TIERS, data)])
    for patch, t in zip(bp["boxes"], TIERS):
        patch.set_facecolor(TIER_COLOR[t] + "55")
        patch.set_edgecolor(TIER_COLOR[t])
    for med in bp["medians"]:
        med.set_color("#111111")
    a.set_ylabel("Total shoot days")
    a.set_title("Shoot days by budget tier (200 films)")

    ys = [float(r["total_shoot_days"]) for r in rows]
    corr = [pearson([float(r[f]) for r in rows], ys) for f in FEATURES]
    bars = b.barh(FEATURE_LABEL, corr, color="#0F766E")
    b.set_xlim(0, 1)
    b.invert_yaxis()
    for bar, c in zip(bars, corr):
        b.text(c + 0.01, bar.get_y() + bar.get_height() / 2, f"{c:.2f}", va="center", fontsize=9)
    b.set_xlabel("Pearson r with total shoot days")
    b.set_title("Feature correlation")
    save(fig, "fig02_dataset.png")
    return dict(zip(FEATURE_LABEL, [round(c, 2) for c in corr]))


# ── Figure 3: model comparison (numbers from compare_shoot_day_models.py) ─
CV_200 = [
    ("Gradient\nBoosting", 11.50, 18.4, 0.894),
    ("Random Forest\n(deployed)", 11.70, 18.8, 0.887),
    ("Linear\nRegression", 12.43, 21.3, 0.878),
    ("Decision\nTree", 13.78, 22.0, 0.867),
    ("Category-mean\nbaseline", 14.96, 24.5, 0.840),
]


def fig_models():
    fig, (a, b) = plt.subplots(1, 2, figsize=(10, 4))
    names = [m[0] for m in CV_200]
    colors = ["#94A3B8", "#0F766E", "#94A3B8", "#94A3B8", "#E5E7EB"]
    bars = a.bar(names, [m[1] for m in CV_200], color=colors, edgecolor="#475569")
    for bar, m in zip(bars, CV_200):
        a.text(bar.get_x() + bar.get_width() / 2, m[1] + 0.2, f"{m[1]:.2f}", ha="center", fontsize=9)
    a.set_ylabel("Out-of-fold MAE (days)")
    a.set_title("MAE, 5-fold CV, 200 films")
    a.tick_params(axis="x", labelsize=8)
    bars = b.bar(names, [m[3] for m in CV_200], color=colors, edgecolor="#475569")
    for bar, m in zip(bars, CV_200):
        b.text(bar.get_x() + bar.get_width() / 2, m[3] + 0.003, f"{m[3]:.3f}", ha="center", fontsize=9)
    b.set_ylim(0.8, 0.91)
    b.set_ylabel("Out-of-fold R²")
    b.set_title("R², 5-fold CV, 200 films")
    b.tick_params(axis="x", labelsize=8)
    save(fig, "fig03_models.png")


# ── Figure 4: holdout scatter ─────────────────────────────────────────────
def fig_holdout():
    fig, ax = plt.subplots(figsize=(6.2, 5.2))
    films = heldout["films"]
    for t in TIERS:
        pts = [f for f in films if f["category"] == t]
        ax.scatter([f["actualDays"] for f in pts], [f["predictedDays"] for f in pts],
                   s=40, color=TIER_COLOR[t], label=f"{t} (n={len(pts)})", alpha=0.85, edgecolor="white")
    lo = 0
    hi = max(max(f["actualDays"] for f in films), max(f["predictedDays"] for f in films)) * 1.08
    ax.plot([lo, hi], [lo, hi], color="#9CA3AF", linestyle="--", linewidth=1, label="Perfect prediction")
    ax.set_xlim(lo, hi)
    ax.set_ylim(lo, hi)
    ax.set_xlabel("Actual shoot days")
    ax.set_ylabel("Predicted shoot days")
    h = heldout["holdout"]
    ax.set_title(f"Unseen films: MAE {h['maeDays']:.2f} d, R² {h['r2']:.3f}")
    ax.legend(frameon=False, fontsize=9)
    save(fig, "fig04_holdout.png")


# ── Figure 5: tier shift ──────────────────────────────────────────────────
def fig_tier_shift():
    fig, (a, b) = plt.subplots(1, 2, figsize=(10, 3.8))
    ts = heldout["tierShift"]
    labels = [f"Test on {r['testOn']}\n(train {r['trainOn']})" for r in ts]
    cols = [TIER_COLOR[r["testOn"]] for r in ts]
    bars = a.bar(labels, [r["mapePct"] for r in ts], color=cols)
    a.axhline(heldout["holdout"]["mapePct"], color="#111111", linestyle="--", linewidth=1)
    a.text(2.45, heldout["holdout"]["mapePct"] + 1.5, "mixed-tier holdout", ha="right", fontsize=8)
    for bar, r in zip(bars, ts):
        a.text(bar.get_x() + bar.get_width() / 2, r["mapePct"] + 1, f"{r['mapePct']:.1f}%", ha="center", fontsize=9)
    a.set_ylabel("MAPE")
    a.set_title("Error when a budget tier is unseen")
    a.tick_params(axis="x", labelsize=8)
    bars = b.bar(labels, [r["r2"] for r in ts], color=cols)
    b.axhline(0, color="#111111", linewidth=0.8)
    for bar, r in zip(bars, ts):
        y = r["r2"]
        if y >= 0:
            b.text(bar.get_x() + bar.get_width() / 2, y + 0.12, f"{y:.2f}", ha="center", fontsize=9)
        else:
            b.text(bar.get_x() + bar.get_width() / 2, y + 0.25, f"{y:.2f}", ha="center", fontsize=9,
                   color="white", fontweight="bold")
    b.set_ylabel("R²")
    b.set_title("R² below 0 = worse than predicting the mean")
    b.tick_params(axis="x", labelsize=8)
    save(fig, "fig05_tier_shift.png")


# ── Figure 6: extraction, mid-semester vs final ───────────────────────────
EXTRACTION_FINAL = [  # (type, ground truth, TP, FP) on the 12-scene corpus
    ("Character", 17, 16, 0),
    ("Location", 12, 12, 0),
    ("Prop", 27, 22, 0),
    ("Costume", 11, 11, 0),
    ("Equipment", 11, 10, 0),
]
EXTRACTION_MID_RECALL = {"Character": 1.00, "Location": 1.00, "Prop": 0.60, "Costume": 0.50, "Equipment": 0.75}


def extraction_table():
    out = []
    tp_all = fp_all = fn_all = 0
    for t, gt, tp, fp in EXTRACTION_FINAL:
        fn = gt - tp
        p = tp / (tp + fp) if tp + fp else 0
        r = tp / gt
        f1 = 2 * p * r / (p + r) if p + r else 0
        out.append({"type": t, "gt": gt, "precision": p, "recall": r, "f1": f1})
        tp_all += tp
        fp_all += fp
        fn_all += fn
    p = tp_all / (tp_all + fp_all)
    r = tp_all / (tp_all + fn_all)
    out.append({"type": "Overall", "gt": tp_all + fn_all, "precision": p, "recall": r,
                "f1": 2 * p * r / (p + r), "tp": tp_all, "fp": fp_all, "fn": fn_all})
    return out


def fig_extraction(table):
    fig, ax = plt.subplots(figsize=(9, 3.8))
    types = [t[0] for t in EXTRACTION_FINAL]
    x = range(len(types))
    w = 0.38
    mid = [EXTRACTION_MID_RECALL[t] * 100 for t in types]
    fin = [row["recall"] * 100 for row in table[:-1]]
    ax.bar([i - w / 2 for i in x], mid, w, label="Mid-semester (2 scenes, 16 entities)", color="#CBD5E1")
    ax.bar([i + w / 2 for i in x], fin, w, label="Final (12 scenes, 78 entities)", color="#0F766E")
    for i, (m, f) in enumerate(zip(mid, fin)):
        ax.text(i - w / 2, m + 1.5, f"{m:.0f}", ha="center", fontsize=8.5)
        ax.text(i + w / 2, f + 1.5, f"{f:.0f}", ha="center", fontsize=8.5)
    ax.set_xticks(list(x), types)
    ax.set_ylim(0, 112)
    ax.set_ylabel("Recall (%)")
    ax.set_title("Extraction recall by entity type")
    ax.legend(frameon=False, fontsize=9, loc="lower left")
    save(fig, "fig06_extraction.png")


# ── Figure 7: cost error vs baseline ──────────────────────────────────────
def cost_table():
    out = []
    all_sys, all_base = [], []
    for t in TIERS:
        tier = [r for r in rows if r["budget_category"] == t]
        sys_err, base_err = [], []
        for r in tier:
            others = [float(o["actual_total_cr"]) for o in tier if o is not r]
            mean = sum(others) / len(others)
            actual = float(r["actual_total_cr"])
            base_err.append(abs(mean - actual) / actual * 100)
            sys_err.append(float(r["dept_mape_pct"]))
        all_sys += sys_err
        all_base += base_err
        s, b = sum(sys_err) / len(sys_err), sum(base_err) / len(base_err)
        out.append({"tier": t, "films": len(tier), "system": s, "baseline": b, "change": (s - b) / b * 100})
    s, b = sum(all_sys) / len(all_sys), sum(all_base) / len(all_base)
    out.append({"tier": "Overall", "films": len(rows), "system": s, "baseline": b, "change": (s - b) / b * 100})
    return out


def fig_cost(table):
    fig, ax = plt.subplots(figsize=(8.5, 3.8))
    labels = [r["tier"] for r in table]
    x = range(len(labels))
    w = 0.38
    ax.bar([i - w / 2 for i in x], [r["baseline"] for r in table], w, label="Category-mean baseline", color="#CBD5E1")
    ax.bar([i + w / 2 for i in x], [r["system"] for r in table], w, label="System estimate", color="#0F766E")
    for i, r in enumerate(table):
        ax.text(i - w / 2, r["baseline"] + 1.2, f"{r['baseline']:.1f}", ha="center", fontsize=8.5)
        ax.text(i + w / 2, r["system"] + 1.2, f"{r['system']:.1f}", ha="center", fontsize=8.5)
    ax.set_xticks(list(x), labels)
    ax.set_ylabel("MAPE vs reported total (%)")
    ax.set_ylim(0, 92)
    ax.set_title("Cost-estimate error against reported budgets (200 films)")
    ax.legend(frameon=False, fontsize=9, loc="upper left")
    save(fig, "fig07_cost.png")


def main():
    fig_architecture()
    corr = fig_dataset()
    fig_models()
    fig_holdout()
    fig_tier_shift()
    ext = extraction_table()
    fig_extraction(ext)
    cost = cost_table()
    fig_cost(cost)
    numbers = {"correlation": corr, "extraction": ext, "cost": cost, "heldout": heldout}
    with open(os.path.join(ROOT, "final_report", "numbers.json"), "w") as f:
        json.dump(numbers, f, indent=2)
    for r in ext:
        print(f"{r['type']:10s} P={r['precision']*100:5.1f} R={r['recall']*100:5.1f} F1={r['f1']*100:5.1f}")
    for r in cost:
        print(f"{r['tier']:8s} sys={r['system']:.1f} base={r['baseline']:.1f} change={r['change']:+.1f}%")
    print("correlation", corr)


if __name__ == "__main__":
    main()
