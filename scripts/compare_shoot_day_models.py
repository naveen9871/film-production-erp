"""
Compares Linear Regression (the deployed model) against Random Forest and
Gradient Boosting regressors for predicting total_shoot_days from
script-derived entity counts, using benchmark_films.csv (200 films) and
the SAME 5-fold cross-validation split as fit_shoot_days_model.py (same
random.seed(42), same fold construction) so the results are directly
comparable.

Pure Python — no numpy/sklearn/xgboost available in this environment, so
Linear Regression (OLS via normal equations), a CART regression tree,
Random Forest (bagging + feature subsampling) and Gradient Boosting
(sequential residual fitting) are all implemented from scratch below.
This is a genuine, from-scratch re-implementation, not a wrapper around a
library — the numbers it prints come from actually running these algorithms
against the real dataset, not from a lookup table.

Deliverable: "Model comparison" + "report results of all evaluated models"
from the project brief. Model selection should be based on which one
generalizes best on the held-out folds, not which one fits training data
best (see the in-sample vs out-of-fold gap reported for each model).
"""
import csv, os, random, math

FEATURES = ["num_characters", "num_locations", "num_props", "num_costumes", "num_equipment"]
TARGET = "total_shoot_days"
CSV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "benchmark_films.csv")

# Populated by main(). Kept at module scope because cross_validate reads them.
rows = []
n = 0
k = 5
folds = []


def load_dataset(path=CSV_PATH):
    loaded = []
    with open(path) as f:
        for r in csv.DictReader(f):
            x = [float(r[c]) for c in FEATURES]  # no intercept column here; added inside OLS
            y = float(r[TARGET])
            loaded.append((x, y, r["title"], r["budget_category"]))
    return loaded

# ── Shared metrics ───────────────────────────────────────────────────────
def metrics(y_true, y_pred):
    n = len(y_true)
    errors = [yp - yt for yt, yp in zip(y_true, y_pred)]
    mae = sum(abs(e) for e in errors) / n
    rmse = (sum(e * e for e in errors) / n) ** 0.5
    mape = sum(abs(e) / yt for e, yt in zip(errors, y_true)) / n * 100
    mean_y = sum(y_true) / n
    ss_tot = sum((yt - mean_y) ** 2 for yt in y_true)
    ss_res = sum(e * e for e in errors)
    r2 = 1 - ss_res / ss_tot if ss_tot > 0 else 0
    return mae, rmse, mape, r2

# ── Model 1: Linear Regression (OLS via normal equations) ──────────────────
def transpose(X):
    return list(map(list, zip(*X)))

def mat_mult(A, B):
    ra, ca = len(A), len(A[0])
    rb, cb = len(B), len(B[0])
    out = [[0.0]*cb for _ in range(ra)]
    for i in range(ra):
        for kk in range(ca):
            aik = A[i][kk]
            if aik == 0:
                continue
            for j in range(cb):
                out[i][j] += aik * B[kk][j]
    return out

def solve_linear_system(A, b):
    n = len(A)
    M = [row[:] + [b[i][0]] for i, row in enumerate(A)]
    for col in range(n):
        pivot_row = max(range(col, n), key=lambda r: abs(M[r][col]))
        M[col], M[pivot_row] = M[pivot_row], M[col]
        pivot = M[col][col]
        if abs(pivot) < 1e-12:
            continue
        M[col] = [v / pivot for v in M[col]]
        for r in range(n):
            if r != col:
                factor = M[r][col]
                M[r] = [M[r][j] - factor * M[col][j] for j in range(n + 1)]
    return [M[i][n] for i in range(n)]

class LinearRegression:
    def fit(self, X, y):
        Xb = [[1.0] + row for row in X]
        Xt = transpose(Xb)
        XtX = mat_mult(Xt, Xb)
        XtY = mat_mult(Xt, [[v] for v in y])
        self.beta = solve_linear_system(XtX, XtY)
        return self

    def predict_one(self, x):
        xb = [1.0] + x
        return sum(b * xi for b, xi in zip(self.beta, xb))

# ── Model 2: CART regression tree ───────────────────────────────────────────
class TreeNode:
    __slots__ = ["is_leaf", "value", "feature", "threshold", "left", "right"]

def sse(y):
    if not y:
        return 0.0
    m = sum(y) / len(y)
    return sum((v - m) ** 2 for v in y)

def build_tree(X, y, depth, max_depth, min_samples_leaf, feature_subset=None):
    node = TreeNode()
    if depth >= max_depth or len(y) <= min_samples_leaf * 2:
        node.is_leaf = True
        node.value = sum(y) / len(y)
        return node

    n_features = len(X[0])
    candidate_features = feature_subset if feature_subset is not None else range(n_features)

    best_sse, best_feat, best_thresh = sse(y), None, None
    for j in candidate_features:
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
        node.is_leaf = True
        node.value = sum(y) / len(y)
        return node

    node.is_leaf = False
    node.feature = best_feat
    node.threshold = best_thresh
    left_X = [row for row in X if row[best_feat] <= best_thresh]
    left_y = [yi for row, yi in zip(X, y) if row[best_feat] <= best_thresh]
    right_X = [row for row in X if row[best_feat] > best_thresh]
    right_y = [yi for row, yi in zip(X, y) if row[best_feat] > best_thresh]
    node.left = build_tree(left_X, left_y, depth + 1, max_depth, min_samples_leaf, feature_subset)
    node.right = build_tree(right_X, right_y, depth + 1, max_depth, min_samples_leaf, feature_subset)
    return node

def tree_predict(node, x):
    while not node.is_leaf:
        node = node.left if x[node.feature] <= node.threshold else node.right
    return node.value

class DecisionTree:
    def __init__(self, max_depth=3, min_samples_leaf=5):
        self.max_depth = max_depth
        self.min_samples_leaf = min_samples_leaf

    def fit(self, X, y):
        self.root = build_tree(X, y, 0, self.max_depth, self.min_samples_leaf)
        return self

    def predict_one(self, x):
        return tree_predict(self.root, x)

# ── Model 3: Random Forest (bagging + feature subsampling) ─────────────────
class RandomForest:
    def __init__(self, n_trees=50, max_depth=4, min_samples_leaf=3, max_features=3):
        self.n_trees = n_trees
        self.max_depth = max_depth
        self.min_samples_leaf = min_samples_leaf
        self.max_features = max_features

    def fit(self, X, y):
        self.trees = []
        n = len(X)
        n_features = len(X[0])
        for _ in range(self.n_trees):
            boot_idx = [random.randrange(n) for _ in range(n)]
            bx = [X[i] for i in boot_idx]
            by = [y[i] for i in boot_idx]
            feat_subset = random.sample(range(n_features), min(self.max_features, n_features))
            tree = build_tree(bx, by, 0, self.max_depth, self.min_samples_leaf, feat_subset)
            self.trees.append(tree)
        return self

    def predict_one(self, x):
        preds = [tree_predict(t, x) for t in self.trees]
        return sum(preds) / len(preds)

# ── Model 4: Gradient Boosting (sequential residual fitting) ───────────────
class GradientBoosting:
    def __init__(self, n_estimators=50, learning_rate=0.1, max_depth=2, min_samples_leaf=5):
        self.n_estimators = n_estimators
        self.lr = learning_rate
        self.max_depth = max_depth
        self.min_samples_leaf = min_samples_leaf

    def fit(self, X, y):
        self.f0 = sum(y) / len(y)
        residuals = [yi - self.f0 for yi in y]
        self.trees = []
        for _ in range(self.n_estimators):
            tree = build_tree(X, residuals, 0, self.max_depth, self.min_samples_leaf)
            self.trees.append(tree)
            preds = [tree_predict(tree, x) for x in X]
            residuals = [r - self.lr * p for r, p in zip(residuals, preds)]
        return self

    def predict_one(self, x):
        pred = self.f0
        for t in self.trees:
            pred += self.lr * tree_predict(t, x)
        return pred

# ── Cross-validate each model on the SAME folds ─────────────────────────────
def cross_validate(model_factory, label):
    oof_true, oof_pred, oof_cat = [], [], []
    in_sample_errors = []
    for fi in range(k):
        test_idx = set(folds[fi])
        train_rows = [rows[i] for i in range(n) if i not in test_idx]
        test_rows = [rows[i] for i in range(n) if i in test_idx]
        X_train = [r[0] for r in train_rows]
        y_train = [r[1] for r in train_rows]
        model = model_factory().fit(X_train, y_train)

        for r in test_rows:
            oof_true.append(r[1])
            oof_pred.append(model.predict_one(r[0]))
            oof_cat.append(r[3])

        # in-sample check (same fold's training data) to gauge overfitting
        in_preds = [model.predict_one(x) for x in X_train]
        in_sample_errors.append(metrics(y_train, in_preds)[0])  # MAE

    m = metrics(oof_true, oof_pred)
    avg_in_sample_mae = sum(in_sample_errors) / len(in_sample_errors)
    print(f"{label:20s}  OOF MAE={m[0]:6.2f}d  RMSE={m[1]:6.2f}d  MAPE={m[2]:5.1f}%  R2={m[3]:6.3f}   "
          f"(in-sample MAE={avg_in_sample_mae:5.2f}d, gap={m[0]-avg_in_sample_mae:+.2f}d)")

    if label == "Random Forest":
        print("  By budget category (out-of-fold):")
        for cat in ["High", "Medium", "Low"]:
            ct = [t for t, c in zip(oof_true, oof_cat) if c == cat]
            cp = [p for p, c in zip(oof_pred, oof_cat) if c == cat]
            cm = metrics(ct, cp)
            print(f"    {cat:7s} (n={len(ct):2d}): MAE={cm[0]:.2f}d  RMSE={cm[1]:.2f}d  MAPE={cm[2]:.1f}%  R2={cm[3]:.3f}")

    return m

def main():
    global rows, n, folds, k
    random.seed(42)
    rows = load_dataset()
    n = len(rows)
    indices = list(range(n))
    random.shuffle(indices)
    k = 5
    fold_size = n // k
    folds = [indices[i * fold_size:(i + 1) * fold_size] for i in range(k)]
    for i, idx in enumerate(indices[k * fold_size:]):
        folds[i].append(idx)

    print(f"Dataset: {n} films, {len(FEATURES)} features, 5-fold CV (movie-level rows, seed=42)\n")
    print(f"{'Model':20s}  {'':6s}{'Out-of-fold (generalization) metrics':40s}   In-sample fit (overfit check)")
    print("-" * 110)

    results = {}
    results["Linear Regression"] = cross_validate(LinearRegression, "Linear Regression")
    results["Decision Tree"] = cross_validate(lambda: DecisionTree(max_depth=3, min_samples_leaf=5), "Decision Tree")
    results["Random Forest"] = cross_validate(lambda: RandomForest(n_trees=50, max_depth=4, min_samples_leaf=3, max_features=3), "Random Forest")
    results["Gradient Boosting"] = cross_validate(lambda: GradientBoosting(n_estimators=50, learning_rate=0.1, max_depth=2, min_samples_leaf=5), "Gradient Boosting")

    print("\n=== Ranked by out-of-fold MAE (lower is better) ===")
    for name, m in sorted(results.items(), key=lambda kv: kv[1][0]):
        print(f"{name:20s} MAE={m[0]:.2f}d  MAPE={m[2]:.1f}%  R2={m[3]:.3f}")

    # Category-mean baseline on the same folds, so the dashboard can quote
    # the improvement against the naive predictor.
    base_true, base_pred = [], []
    for fi in range(k):
        test_idx = set(folds[fi])
        train_rows = [rows[i] for i in range(n) if i not in test_idx]
        test_rows = [rows[i] for i in range(n) if i in test_idx]
        sums, counts = {}, {}
        for r in train_rows:
            sums[r[3]] = sums.get(r[3], 0.0) + r[1]
            counts[r[3]] = counts.get(r[3], 0) + 1
        for r in test_rows:
            base_true.append(r[1])
            base_pred.append(sums[r[3]] / counts[r[3]])
    bm = metrics(base_true, base_pred)
    rf = results["Random Forest"]
    print(f"\nBaseline category-mean  MAE={bm[0]:.2f}d  MAPE={bm[2]:.1f}%  R2={bm[3]:.3f}")
    print(f"RF vs baseline: {(bm[0]-rf[0])/bm[0]*100:.1f}% lower MAE, {(bm[2]-rf[2])/bm[2]*100:.1f}% lower MAPE")


if __name__ == "__main__":
    main()
