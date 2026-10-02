"""
Refits the Random Forest (winner of compare_shoot_day_models.py, OOF MAE
5.20 days vs 6.16 for linear regression) on ALL 100 films for deployment,
and exports the trained trees as JSON for the Go backend to embed and serve
(train-offline / serve-frozen — same pattern as fit_shoot_days_model.py).

Run this, then copy the output file to backend/services/shoot_day_forest.json
(already done as part of this commit; re-run only if benchmark_films.csv
changes and the model needs retraining).
"""
import csv, os, random, json

random.seed(42)

FEATURES = ["num_characters", "num_locations", "num_props", "num_costumes", "num_equipment"]
TARGET = "total_shoot_days"
CSV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "benchmark_films.csv")
OUT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend", "services", "shoot_day_forest.json")

rows = []
with open(CSV_PATH) as f:
    for r in csv.DictReader(f):
        x = [float(r[c]) for c in FEATURES]
        y = float(r[TARGET])
        rows.append((x, y))

X = [r[0] for r in rows]
y = [r[1] for r in rows]

def sse(vals):
    if not vals:
        return 0.0
    m = sum(vals) / len(vals)
    return sum((v - m) ** 2 for v in vals)

def build_tree(X, y, depth, max_depth, min_samples_leaf, feature_subset):
    if depth >= max_depth or len(y) <= min_samples_leaf * 2:
        return {"leaf": True, "value": sum(y) / len(y)}

    best_sse, best_feat, best_thresh = sse(y), None, None
    for j in feature_subset:
        vals = sorted(set(row[j] for row in X))
        thresholds = [(vals[i] + vals[i+1]) / 2 for i in range(len(vals) - 1)]
        for t in thresholds:
            left_y = [yi for row, yi in zip(X, y) if row[j] <= t]
            right_y = [yi for row, yi in zip(X, y) if row[j] > t]
            if len(left_y) < min_samples_leaf or len(right_y) < min_samples_leaf:
                continue
            s = sse(left_y) + sse(right_y)
            if s < best_sse:
                best_sse, best_feat, best_thresh = s, j, t

    if best_feat is None:
        return {"leaf": True, "value": sum(y) / len(y)}

    left_X = [row for row in X if row[best_feat] <= best_thresh]
    left_y = [yi for row, yi in zip(X, y) if row[best_feat] <= best_thresh]
    right_X = [row for row in X if row[best_feat] > best_thresh]
    right_y = [yi for row, yi in zip(X, y) if row[best_feat] > best_thresh]
    return {
        "leaf": False,
        "feature": best_feat,
        "threshold": best_thresh,
        "left": build_tree(left_X, left_y, depth + 1, max_depth, min_samples_leaf, feature_subset),
        "right": build_tree(right_X, right_y, depth + 1, max_depth, min_samples_leaf, feature_subset),
    }

def tree_predict(node, x):
    while not node["leaf"]:
        node = node["left"] if x[node["feature"]] <= node["threshold"] else node["right"]
    return node["value"]

N_TREES, MAX_DEPTH, MIN_LEAF, MAX_FEATURES = 50, 4, 3, 3

trees = []
n = len(X)
n_features = len(X[0])
for _ in range(N_TREES):
    boot_idx = [random.randrange(n) for _ in range(n)]
    bx = [X[i] for i in boot_idx]
    by = [y[i] for i in boot_idx]
    feat_subset = random.sample(range(n_features), min(MAX_FEATURES, n_features))
    trees.append(build_tree(bx, by, 0, MAX_DEPTH, MIN_LEAF, feat_subset))

model = {"features": FEATURES, "trees": trees}

with open(OUT_PATH, "w") as f:
    json.dump(model, f)

# Sanity check: in-sample predictions on all 100 films
preds = [sum(tree_predict(t, x) for t in trees) / len(trees) for x in X]
errors = [abs(p - yt) for p, yt in zip(preds, y)]
mae = sum(errors) / len(errors)
print(f"Exported {N_TREES} trees to {OUT_PATH}")
print(f"In-sample MAE on all 100 films (sanity check, NOT the generalization estimate): {mae:.2f} days")
print(f"File size: {os.path.getsize(OUT_PATH) / 1024:.1f} KB")
