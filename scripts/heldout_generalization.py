"""
Held-out generalization for the final evaluation.

Mid-semester model selection used 5-fold cross-validation on all 100 films,
so every film influenced which family was deployed. This script answers the
examiner's request to test generalization on unseen films:

  1. Stratified 80/20 split by budget category (seed 7). The 40 test films
     are not used to fit the scored model.
  2. Model family is re-selected by 5-fold CV on the 160 training films only.
  3. The winner is refit on all 160 and scored once on the 40.
  4. A tier-shift stress test trains on two budget tiers and scores the third.

The deployed forest in the Go service is still the one fit on all 100 films
after the mid-semester selection. The numbers here are a separate evaluation
model, not that deployed artifact. Entity counts in the benchmark are
researcher-estimated, so this is unseen-film generalization inside the
benchmark, not a test on screenplays from outside it.
"""
import json
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from compare_shoot_day_models import (  # noqa: E402
    CSV_PATH,
    DecisionTree,
    GradientBoosting,
    LinearRegression,
    RandomForest,
    load_dataset,
    metrics,
)

SEED = 7
OUT_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..",
    "backend",
    "handlers",
    "heldout_results.json",
)


def factories():
    return [
        ("Linear Regression", lambda: LinearRegression()),
        ("Decision Tree", lambda: DecisionTree(max_depth=3, min_samples_leaf=5)),
        ("Random Forest", lambda: RandomForest(n_trees=50, max_depth=4, min_samples_leaf=3, max_features=3)),
        ("Gradient Boosting", lambda: GradientBoosting(n_estimators=50, learning_rate=0.1, max_depth=2, min_samples_leaf=5)),
    ]


def round_metrics(m):
    return {
        "maeDays": round(m[0], 2),
        "rmseDays": round(m[1], 2),
        "mapePct": round(m[2], 1),
        "r2": round(m[3], 3),
    }


def stratified_split(rows, test_fraction, rng):
    by_cat = {}
    for i, row in enumerate(rows):
        by_cat.setdefault(row[3], []).append(i)
    test_idx = []
    for cat in ("High", "Medium", "Low"):
        idxs = by_cat[cat][:]
        rng.shuffle(idxs)
        n_test = int(round(len(idxs) * test_fraction))
        test_idx.extend(idxs[:n_test])
    test_set = set(test_idx)
    train = [rows[i] for i in range(len(rows)) if i not in test_set]
    test = [rows[i] for i in range(len(rows)) if i in test_set]
    return train, test


def cv_on(train_rows, model_factory, seed):
    """5-fold CV inside the training split. Uses the global random stream
    the tree code reads, reseeded so the fold is reproducible."""
    random.seed(seed)
    idx = list(range(len(train_rows)))
    random.shuffle(idx)
    k = 5
    fold_size = len(idx) // k
    folds = [idx[i * fold_size:(i + 1) * fold_size] for i in range(k)]
    for extra, j in enumerate(idx[k * fold_size:]):
        folds[extra].append(j)

    y_true, y_pred = [], []
    for fi in range(k):
        held = set(folds[fi])
        tr = [train_rows[i] for i in range(len(train_rows)) if i not in held]
        te = [train_rows[i] for i in range(len(train_rows)) if i in held]
        model = model_factory().fit([r[0] for r in tr], [r[1] for r in tr])
        for r in te:
            y_true.append(r[1])
            y_pred.append(model.predict_one(r[0]))
    return metrics(y_true, y_pred)


def category_baseline(train_rows, test_rows):
    sums, counts = {}, {}
    for r in train_rows:
        sums[r[3]] = sums.get(r[3], 0.0) + r[1]
        counts[r[3]] = counts.get(r[3], 0) + 1
    means = {c: sums[c] / counts[c] for c in sums}
    global_mean = sum(r[1] for r in train_rows) / len(train_rows)
    y_true = [r[1] for r in test_rows]
    y_pred = [means.get(r[3], global_mean) for r in test_rows]
    return metrics(y_true, y_pred)


def score_split(train_rows, test_rows, model_factory):
    model = model_factory().fit([r[0] for r in train_rows], [r[1] for r in train_rows])
    y_true = [r[1] for r in test_rows]
    y_pred = [model.predict_one(r[0]) for r in test_rows]
    return metrics(y_true, y_pred), y_pred


def by_category(test_rows, y_pred):
    out = []
    for cat in ("High", "Medium", "Low"):
        pairs = [(r[1], p) for r, p in zip(test_rows, y_pred) if r[3] == cat]
        if not pairs:
            continue
        m = metrics([a for a, _ in pairs], [p for _, p in pairs])
        entry = round_metrics(m)
        entry["category"] = cat
        entry["filmCount"] = len(pairs)
        out.append(entry)
    return out


def main():
    rows = load_dataset()
    rng = random.Random(SEED)
    train, test = stratified_split(rows, 0.2, rng)

    selection = []
    for name, factory in factories():
        m = cv_on(train, factory, SEED)
        entry = round_metrics(m)
        entry["model"] = name
        selection.append(entry)
        print(f"train-CV {name:20s} MAE={m[0]:.2f} MAPE={m[2]:.1f}% R2={m[3]:.3f}")

    winner_name = min(selection, key=lambda e: e["maeDays"])["model"]
    winner_factory = dict(factories())[winner_name]

    random.seed(SEED)
    holdout_m, preds = score_split(train, test, winner_factory)
    base_m = category_baseline(train, test)
    print(f"HOLDOUT {winner_name} MAE={holdout_m[0]:.2f} MAPE={holdout_m[2]:.1f}% R2={holdout_m[3]:.3f}")
    print(f"BASELINE category-mean MAE={base_m[0]:.2f} MAPE={base_m[2]:.1f}%")

    films = []
    for r, p in zip(test, preds):
        films.append({
            "title": r[2],
            "category": r[3],
            "actualDays": r[1],
            "predictedDays": round(p, 1),
            "absErrorDays": round(abs(p - r[1]), 1),
        })
    films.sort(key=lambda f: (-{"High": 3, "Medium": 2, "Low": 1}[f["category"]], f["title"]))

    tier_shift = []
    for held_cat in ("High", "Medium", "Low"):
        tr = [r for r in rows if r[3] != held_cat]
        te = [r for r in rows if r[3] == held_cat]
        random.seed(SEED)
        m, _ = score_split(tr, te, lambda: RandomForest(n_trees=50, max_depth=4, min_samples_leaf=3, max_features=3))
        entry = round_metrics(m)
        entry["trainOn"] = "+".join(c for c in ("High", "Medium", "Low") if c != held_cat)
        entry["testOn"] = held_cat
        entry["testCount"] = len(te)
        tier_shift.append(entry)
        print(f"TIER train {entry['trainOn']:14s} test {held_cat:6s} MAE={m[0]:.2f} MAPE={m[2]:.1f}% R2={m[3]:.3f}")

    holdout = round_metrics(holdout_m)
    baseline = round_metrics(base_m)
    improvement = round((baseline["maeDays"] - holdout["maeDays"]) / baseline["maeDays"] * 100, 1)
    held_counts = {c: sum(1 for r in test if r[3] == c) for c in ("High", "Medium", "Low")}
    held_note = ", ".join(f"{held_counts[c]} {c}" for c in ("High", "Medium", "Low"))

    report = {
        "methodology": (
            f"Stratified 80/20 split by budget category, seed 7 "
            f"({held_note} held out of {len(rows)} films). "
            f"Four model families were cross-validated on the {len(train)} training films only. "
            f"The lowest training-CV MAE was refit on all {len(train)} and scored once on the {len(test)}. "
            "The tier-shift rows train a fresh Random Forest on two budget tiers and score the third. "
            "This is not the deployed forest, which was fit on the original 100 films after mid-semester selection."
        ),
        "seed": SEED,
        "dataset": os.path.basename(CSV_PATH),
        "trainCount": len(train),
        "testCount": len(test),
        "selectionOnTrain": selection,
        "selectedModel": winner_name,
        "holdout": holdout,
        "baseline": baseline,
        "improvementMaePct": improvement,
        "byCategory": by_category(test, preds),
        "films": films,
        "tierShift": tier_shift,
        "limitations": [
            "Entity counts in this benchmark are researcher-estimated from production scale, not counted by the extractor from full screenplays. The holdout therefore tests unseen films inside this table, not scripts the system has never been shown.",
            "Reported shoot days mix press-reported figures and schedule estimates. See BENCHMARK_PROVENANCE.md.",
            "A 40-film holdout still has a wide error bar. The tier-shift test is the stricter check, because a whole budget tier is absent from training.",
        ],
        "reproduceCommand": "python3 scripts/heldout_generalization.py",
    }

    out = os.path.normpath(OUT_PATH)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
        f.write("\n")
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
