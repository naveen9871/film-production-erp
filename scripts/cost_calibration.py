"""
Per-scale calibration of the rate-card cost estimate.

The rate card underestimates 180 of the 200 benchmark films. This script
fits one multiplicative correction per production scale (Small / Medium /
Large, derived from the predicted shoot days exactly as the Go service
does) and checks whether the corrected total beats the category-mean
baseline on films the correction was not fitted on.

  1. Same stratified 80/20 split as heldout_generalization.py (seed 7):
     factors are fitted on the 160 training films and scored once on the 40.
  2. 5-fold cross-validation over all 200 films, for a less noisy estimate.

The scale is known before any budget is reported, so the correction only
uses information the live system has. The baseline uses the reported
budget tier, which the live system does not have, so the comparison is
generous to the baseline.

For a multiplicative factor k, the absolute percentage error of film i is
(e_i / a_i) * |k - a_i / e_i|, so the factor that minimises MAPE is the
median of the ratios a_i / e_i weighted by e_i / a_i.
"""
import csv
import json
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from heldout_generalization import SEED, stratified_split  # noqa: E402
from compare_shoot_day_models import load_dataset  # noqa: E402

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
CSV_PATH = os.path.join(ROOT, "backend", "handlers", "benchmark_films.csv")
FOREST_PATH = os.path.join(ROOT, "backend", "services", "shoot_day_forest.json")
OUT_PATH = os.path.join(ROOT, "backend", "handlers", "cost_calibration.json")
SCALES = ("Small", "Medium", "Large")
TIERS = ("High", "Medium", "Low")
MIN_FILMS_PER_SCALE = 5

with open(FOREST_PATH) as f:
    FOREST = json.load(f)


def predict_days(features):
    preds = []
    for node in FOREST["trees"]:
        while not node.get("leaf", False):
            node = node["left"] if features[node["feature"]] <= node["threshold"] else node["right"]
        preds.append(node["value"])
    return sum(preds) / len(preds)


def derive_scale(days):
    """Same thresholds as DeriveProductionScale in backend/services/cost_estimator.go."""
    if days >= 150:
        return "Large"
    if days >= 60:
        return "Medium"
    return "Small"


def load_films():
    films = {}
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            features = [int(r[k]) for k in ("num_characters", "num_locations", "num_props", "num_costumes", "num_equipment")]
            films[r["title"]] = {
                "title": r["title"],
                "tier": r["budget_category"],
                "scale": derive_scale(predict_days(features)),
                "actual": float(r["actual_total_cr"]),
                "est": float(r["system_est_total_cr"]),
            }
    return films


def weighted_median(values, weights):
    pairs = sorted(zip(values, weights))
    half = sum(weights) / 2
    acc = 0.0
    for v, w in pairs:
        acc += w
        if acc >= half:
            return v
    return pairs[-1][0]


def fit_factors(train):
    def factor(group):
        return weighted_median([f["actual"] / f["est"] for f in group], [f["est"] / f["actual"] for f in group])

    overall = factor(train)
    factors = {}
    for s in SCALES:
        group = [f for f in train if f["scale"] == s]
        factors[s] = factor(group) if len(group) >= MIN_FILMS_PER_SCALE else overall
    return factors, overall


def fit_power(train):
    """log(actual) = a_s + b_s * log(est), least squares per scale."""
    import math

    def ols(group):
        xs = [math.log(f["est"]) for f in group]
        ys = [math.log(f["actual"]) for f in group]
        mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
        sxx = sum((x - mx) ** 2 for x in xs)
        b = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sxx if sxx > 0 else 1.0
        return my - b * mx, b

    overall = ols(train)
    params = {}
    for s in SCALES:
        group = [f for f in train if f["scale"] == s]
        params[s] = ols(group) if len(group) >= MIN_FILMS_PER_SCALE else overall
    return params


def kfold(items, k, seed):
    idx = list(range(len(items)))
    random.Random(seed).shuffle(idx)
    return [[items[i] for i in idx[j::k]] for j in range(k)]


def cv_mape(train, predictor_factory, k=5):
    import math
    folds = kfold(train, k, SEED)
    errs = []
    for j in range(k):
        tr = [f for i, fold in enumerate(folds) if i != j for f in fold]
        predict = predictor_factory(tr)
        errs.extend(ape(predict(f), f["actual"]) for f in folds[j])
    return sum(errs) / len(errs)


def factor_predictor(train):
    factors, _ = fit_factors(train)
    return lambda f: f["est"] * factors[f["scale"]]


def power_predictor(train):
    import math
    params = fit_power(train)
    return lambda f: math.exp(params[f["scale"]][0] + params[f["scale"]][1] * math.log(f["est"]))


def ape(pred, actual):
    return abs(pred - actual) / actual * 100


def tier_means(train):
    sums, counts = {}, {}
    for f in train:
        sums[f["tier"]] = sums.get(f["tier"], 0.0) + f["actual"]
        counts[f["tier"]] = counts.get(f["tier"], 0) + 1
    return {t: sums[t] / counts[t] for t in sums}


def score(test, factors, means):
    """Per-film APE of the raw estimate, the calibrated estimate and the baseline."""
    out = []
    for f in test:
        out.append({
            **f,
            "raw": ape(f["est"], f["actual"]),
            "calibratedEst": f["est"] * factors[f["scale"]],
            "calibrated": ape(f["est"] * factors[f["scale"]], f["actual"]),
            "baseline": ape(means[f["tier"]], f["actual"]),
        })
    return out


def summarise(scored):
    def avg(rows, key):
        return round(sum(r[key] for r in rows) / len(rows), 1) if rows else None

    by_tier = []
    for t in TIERS:
        rows = [r for r in scored if r["tier"] == t]
        by_tier.append({
            "category": t,
            "filmCount": len(rows),
            "rawMapePct": avg(rows, "raw"),
            "calibratedMapePct": avg(rows, "calibrated"),
            "baselineMapePct": avg(rows, "baseline"),
        })
    return {
        "filmCount": len(scored),
        "rawMapePct": avg(scored, "raw"),
        "calibratedMapePct": avg(scored, "calibrated"),
        "baselineMapePct": avg(scored, "baseline"),
        "byCategory": by_tier,
    }


def main():
    films = load_films()
    rows = load_dataset()
    train_rows, test_rows = stratified_split(rows, 0.2, random.Random(SEED))
    train = [films[r[2]] for r in train_rows]
    test = [films[r[2]] for r in test_rows]

    raw_train = sum(ape(f["est"], f["actual"]) for f in train) / len(train)
    selection = [
        {"method": "Uncalibrated rate card", "cvMapePct": round(raw_train, 1)},
        {"method": "Per-scale factor", "cvMapePct": round(cv_mape(train, factor_predictor), 1)},
        {"method": "Per-scale power law", "cvMapePct": round(cv_mape(train, power_predictor), 1)},
    ]
    for s in selection:
        print(f"train-CV {s['method']:24s} MAPE={s['cvMapePct']}%")

    factors, _ = fit_factors(train)
    holdout_scored = score(test, factors, tier_means(train))
    holdout = summarise(holdout_scored)
    print("factors (fit on 160):", {k: round(v, 3) for k, v in factors.items()})
    print("HOLDOUT", json.dumps({k: v for k, v in holdout.items() if k != "byCategory"}))

    all_films = list(films.values())
    cv_scored = []
    folds = kfold(all_films, 5, SEED)
    for j in range(5):
        tr = [f for i, fold in enumerate(folds) if i != j for f in fold]
        fac, _ = fit_factors(tr)
        cv_scored.extend(score(folds[j], fac, tier_means(tr)))
    cv = summarise(cv_scored)
    print("CV", json.dumps({k: v for k, v in cv.items() if k != "byCategory"}))

    under_raw = sum(1 for f in cv_scored if f["est"] < f["actual"])
    under_cal = sum(1 for f in cv_scored if f["calibratedEst"] < f["actual"])
    report = {
        "methodology": (
            "One multiplicative factor per production scale (Small / Medium / Large, from the predicted shoot days "
            "with the service's 60- and 150-day thresholds). Each factor is the weighted median of actual/estimate "
            "ratios, which minimises percentage error. The method was chosen by 5-fold CV on the 160 training films, "
            f"fitted on all 160 and scored once on the same {len(test)} held-out films as the shoot-day holdout. "
            "The baseline is the mean reported budget of the training films in the same reported tier."
        ),
        "seed": SEED,
        "trainCount": len(train),
        "testCount": len(test),
        "selectionOnTrain": selection,
        "selectedMethod": "Per-scale factor",
        "factors": [
            {"scale": s, "factor": round(factors[s], 3), "trainFilms": sum(1 for f in train if f["scale"] == s)}
            for s in SCALES
        ],
        "holdout": holdout,
        "crossValidation": cv,
        "underestimatedRaw": under_raw,
        "underestimatedCalibrated": under_cal,
        "limitations": [
            "The factors correct the film-level benchmark costing. The scene-level engine behind the Budget Engine page is not calibrated, because it has not been scored against reported budgets.",
            "The baseline is given the reported budget tier, which the live system does not know, so the comparison is generous to the baseline.",
            "Error stays near 50%: films with similar entity counts and schedules have very different reported budgets, mostly because of star fees, which no script-derived count captures.",
        ],
        "reproduceCommand": "python3 scripts/cost_calibration.py",
    }
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
        f.write("\n")
    print(f"underestimated raw={under_raw} calibrated={under_cal} of {len(cv_scored)}")
    print(f"wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
