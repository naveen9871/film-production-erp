"""
Fits an OLS multiple linear regression predicting total_shoot_days from
script-derived entity counts (num_characters, num_locations, num_props,
num_costumes, num_equipment), using the 100-film benchmark dataset.

Pure Python (no numpy/sklearn available in this environment) — implements
the normal-equation solve via Gauss-Jordan elimination by hand, and 5-fold
cross-validation for an honest generalization estimate.
"""
import csv, os, random

random.seed(42)

FEATURES = ["num_characters", "num_locations", "num_props", "num_costumes", "num_equipment"]
TARGET = "total_shoot_days"

CSV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "benchmark_films.csv")

rows = []
with open(CSV_PATH) as f:
    for r in csv.DictReader(f):
        x = [1.0] + [float(r[c]) for c in FEATURES]  # intercept + features
        y = float(r[TARGET])
        rows.append((x, y, r["title"], r["budget_category"]))

n = len(rows)
p = len(FEATURES) + 1  # incl. intercept

def matmul_t(X, Y=None):
    """Compute X^T X (if Y is None) or X^T Y."""
    if Y is None:
        Y = X
        out_cols = len(Y[0])
    else:
        out_cols = 1
    result = [[0.0] * (out_cols if Y is X else len(Y[0]) if isinstance(Y[0], list) else 1) for _ in range(len(X[0]))]
    return result

def transpose(X):
    return list(map(list, zip(*X)))

def mat_mult(A, B):
    ra, ca = len(A), len(A[0])
    rb, cb = len(B), len(B[0])
    assert ca == rb
    out = [[0.0]*cb for _ in range(ra)]
    for i in range(ra):
        for k in range(ca):
            aik = A[i][k]
            if aik == 0:
                continue
            for j in range(cb):
                out[i][j] += aik * B[k][j]
    return out

def solve_linear_system(A, b):
    """Solve Ax = b via Gauss-Jordan elimination. A: n x n, b: n x 1 (as list of lists)."""
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

def fit_ols(train_rows):
    X = [r[0] for r in train_rows]
    Y = [[r[1]] for r in train_rows]
    Xt = transpose(X)
    XtX = mat_mult(Xt, X)
    XtY = mat_mult(Xt, Y)
    beta = solve_linear_system(XtX, XtY)
    return beta

def predict(beta, x):
    return sum(b * xi for b, xi in zip(beta, x))

def metrics(y_true, y_pred):
    n = len(y_true)
    errors = [yp - yt for yt, yp in zip(y_true, y_pred)]
    abs_errors = [abs(e) for e in errors]
    mae = sum(abs_errors) / n
    rmse = (sum(e*e for e in errors) / n) ** 0.5
    mape = sum(abs(e) / yt for e, yt in zip(errors, y_true)) / n * 100
    mean_y = sum(y_true) / n
    ss_tot = sum((yt - mean_y) ** 2 for yt in y_true)
    ss_res = sum(e*e for e in errors)
    r2 = 1 - ss_res / ss_tot if ss_tot > 0 else 0
    return mae, rmse, mape, r2

# ── 5-fold cross-validation (shuffled) ──────────────────────────────────────
indices = list(range(n))
random.shuffle(indices)
k = 5
fold_size = n // k
folds = [indices[i*fold_size:(i+1)*fold_size] for i in range(k)]
# distribute remainder
for i, idx in enumerate(indices[k*fold_size:]):
    folds[i].append(idx)

oof_true, oof_pred, oof_title, oof_cat = [], [], [], []
fold_metrics = []

for fi in range(k):
    test_idx = set(folds[fi])
    train_rows = [rows[i] for i in range(n) if i not in test_idx]
    test_rows = [rows[i] for i in range(n) if i in test_idx]
    beta = fit_ols(train_rows)
    yt = [r[1] for r in test_rows]
    yp = [predict(beta, r[0]) for r in test_rows]
    for r, p in zip(test_rows, yp):
        oof_true.append(r[1]); oof_pred.append(p); oof_title.append(r[2]); oof_cat.append(r[3])
    fold_metrics.append(metrics(yt, yp))

print("=== Per-fold metrics (MAE, RMSE, MAPE%, R2) ===")
for i, m in enumerate(fold_metrics):
    print(f"Fold {i+1}: MAE={m[0]:.2f}d  RMSE={m[1]:.2f}d  MAPE={m[2]:.1f}%  R2={m[3]:.3f}")

overall = metrics(oof_true, oof_pred)
print(f"\n=== Overall out-of-fold (5-fold CV) ===")
print(f"MAE={overall[0]:.2f} days  RMSE={overall[1]:.2f} days  MAPE={overall[2]:.1f}%  R2={overall[3]:.3f}")

# per-category breakdown
print("\n=== By budget category (out-of-fold) ===")
for cat in ["High", "Medium", "Low"]:
    cat_true = [t for t, c in zip(oof_true, oof_cat) if c == cat]
    cat_pred = [p for p, c in zip(oof_pred, oof_cat) if c == cat]
    if cat_true:
        m = metrics(cat_true, cat_pred)
        print(f"{cat:7s} (n={len(cat_true):2d}): MAE={m[0]:.2f}d  RMSE={m[1]:.2f}d  MAPE={m[2]:.1f}%  R2={m[3]:.3f}")

# ── Final model fit on ALL 100 films (for deployment) ───────────────────────
beta_full = fit_ols(rows)
print("\n=== Final coefficients (fit on all 100 films, for deployment) ===")
labels = ["intercept"] + FEATURES
for lbl, b in zip(labels, beta_full):
    print(f"{lbl:20s} {b:+.4f}")

# sanity: in-sample fit metrics (NOT the generalization estimate -- CV above is)
yp_full = [predict(beta_full, r[0]) for r in rows]
yt_full = [r[1] for r in rows]
m_full = metrics(yt_full, yp_full)
print(f"\nIn-sample (train==test, optimistic) fit: MAE={m_full[0]:.2f}d RMSE={m_full[1]:.2f}d MAPE={m_full[2]:.1f}% R2={m_full[3]:.3f}")

# baseline: naive category-mean predictor, same CV folds, for comparison
print("\n=== Baseline: category-mean predictor (same CV folds) ===")
baseline_true, baseline_pred = [], []
for fi in range(k):
    test_idx = set(folds[fi])
    train_rows = [rows[i] for i in range(n) if i not in test_idx]
    test_rows = [rows[i] for i in range(n) if i in test_idx]
    cat_sum = {}
    cat_cnt = {}
    for r in train_rows:
        cat_sum[r[3]] = cat_sum.get(r[3], 0) + r[1]
        cat_cnt[r[3]] = cat_cnt.get(r[3], 0) + 1
    for r in test_rows:
        pred = cat_sum[r[3]] / cat_cnt[r[3]]
        baseline_true.append(r[1])
        baseline_pred.append(pred)
bm = metrics(baseline_true, baseline_pred)
print(f"Baseline MAE={bm[0]:.2f}d RMSE={bm[1]:.2f}d MAPE={bm[2]:.1f}% R2={bm[3]:.3f}")
print(f"Model improvement over baseline: {(bm[0]-overall[0])/bm[0]*100:.1f}% lower MAE, {(bm[2]-overall[2])/bm[2]*100:.1f}% lower MAPE")
