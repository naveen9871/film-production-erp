import React, { useState, useEffect } from 'react';
import { fetchEvaluationMetrics, fetchExtractionTestSet, fetchShootDayModel, predictShootDaysAdHoc, fetchAblationReport, fetchConfusionMatrix } from '../api';
import {
  Target, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  BarChart2, Loader2, RefreshCw, Info, Clock, Layers, GitBranch, Grid
} from 'lucide-react';

const ENTITY_COLORS = {
  Character:  { bg: '#EEF0FC', color: '#4A55C0', border: '#C7CCF5' },
  Location:   { bg: '#E4F8F0', color: '#057A55', border: '#A7F3D0' },
  Prop:       { bg: '#F2ECFE', color: '#6D28D9', border: '#DDD6FE' },
  Costume:    { bg: '#FBF0E1', color: '#B45309', border: '#FDE68A' },
  Equipment:  { bg: '#EAF1FE', color: '#1D4ED8', border: '#BFDBFE' },
};

const MetricGauge = ({ label, value = 0, max = 1, color, description }) => {
  const safeVal = typeof value === 'number' ? value : 0;
  const pct = Math.round((safeVal / max) * 100);
  const getGradeColor = (v) => {
    if (v >= 0.80) return '#0E9F6E';
    if (v >= 0.60) return '#D9822B';
    return '#E5484D';
  };
  const barColor = color || getGradeColor(safeVal);

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px' }}>{label}</div>
          {description && <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '2px' }}>{description}</div>}
        </div>
        <div style={{ fontSize: '28px', fontWeight: 800, color: barColor, fontFamily: 'var(--font-mono)' }}>
          {(safeVal * 100).toFixed(1)}%
        </div>
      </div>
      <div style={{ width: '100%', height: '6px', background: 'var(--border-soft)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%', background: barColor,
          borderRadius: '3px', transition: 'width 0.8s cubic-bezier(.4,0,.2,1)'
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>0%</span>
        <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>Target: 80%</span>
        <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>100%</span>
      </div>
    </div>
  );
};

const EntityTypeRow = ({ stat }) => {
  const style = ENTITY_COLORS[stat.entityType] || { bg: '#F5F5F9', color: '#555', border: '#ddd' };
  const f1Color = stat.f1Score >= 0.8 ? '#0E9F6E' : stat.f1Score >= 0.6 ? '#D9822B' : '#E5484D';
  const barW = Math.round(stat.f1Score * 100);

  return (
    <tr>
      <td>
        <span style={{
          display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '12px',
          fontWeight: 600, background: style.bg, color: style.color, border: `1px solid ${style.border}`
        }}>
          {stat.entityType}
        </span>
      </td>
      <td className="num">{stat.aiExtracted}</td>
      <td className="num" style={{ color: '#0E9F6E' }}>{stat.userVerified}</td>
      <td className="num" style={{ color: '#E5484D' }}>{stat.userRejected}</td>
      <td className="num" style={{ color: '#D9822B' }}>{stat.userAdded}</td>
      <td className="num">{(stat.precision * 100).toFixed(1)}%</td>
      <td className="num">{(stat.recall * 100).toFixed(1)}%</td>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ flex: 1, height: '5px', background: 'var(--border-soft)', borderRadius: '3px' }}>
            <div style={{ width: `${barW}%`, height: '100%', background: f1Color, borderRadius: '3px', transition: 'width 0.8s' }} />
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: f1Color, fontWeight: 600, minWidth: '38px' }}>
            {(stat.f1Score * 100).toFixed(1)}%
          </span>
        </div>
      </td>
    </tr>
  );
};

const DeptRow = ({ dept, formatINR }) => {
  const absV = Math.abs(dept.variancePct);
  const over = dept.isOverBudget;
  const vColor = absV > 25 ? '#E5484D' : absV > 10 ? '#D9822B' : '#0E9F6E';

  return (
    <tr>
      <td style={{ fontWeight: 500 }}>{dept.department}</td>
      <td className="num mono">{formatINR(dept.estimated)}</td>
      <td className="num mono">{dept.actual > 0 ? formatINR(dept.actual) : <span className="text-faint">—</span>}</td>
      <td className="num">
        {dept.actual > 0 ? (
          <span style={{ color: vColor, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
            {dept.variancePct > 0 ? '+' : ''}{dept.variancePct.toFixed(1)}%
          </span>
        ) : <span className="text-faint">—</span>}
      </td>
      <td className="num">
        {dept.actual > 0 ? (
          <span style={{ color: dept.absErrorPct > 25 ? '#E5484D' : '#0E9F6E', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
            {dept.absErrorPct.toFixed(1)}%
          </span>
        ) : <span className="text-faint">—</span>}
      </td>
      <td>
        {dept.actual > 0 ? (
          <span className="badge" style={{
            background: absV > 25 ? '#FDECEC' : '#E4F8F0',
            color: absV > 25 ? '#E5484D' : '#0E9F6E',
            border: `1px solid ${absV > 25 ? '#FCA5A5' : '#6EE7B7'}`
          }}>
            {absV > 25 ? (over ? 'Over Budget' : 'Under Est.') : 'Within Range'}
          </span>
        ) : <span className="badge">No Actuals</span>}
      </td>
    </tr>
  );
};

const Tooltip = ({ text }) => (
  <span title={text} style={{ cursor: 'help', marginLeft: '6px', color: 'var(--text-faint)', display: 'inline-flex', verticalAlign: 'middle' }}>
    <Info size={13} />
  </span>
);

const EVAL_TABS = [
  { key: 'shootdays', label: 'Shoot-Day Prediction' },
  { key: 'extraction', label: 'Extraction Accuracy' },
  { key: 'cost', label: 'Cost Estimation' },
];

const Evaluation = ({ productionId }) => {
  const [activeTab, setActiveTab] = useState('shootdays');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filmSearch, setFilmSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [expandedFilm, setExpandedFilm] = useState(null);
  const [testSet, setTestSet] = useState(null);
  const [testSetLoading, setTestSetLoading] = useState(false);
  const [shootModel, setShootModel] = useState(null);
  const [ablation, setAblation] = useState(null);
  const [confMatrix, setConfMatrix] = useState(null);
  const [calc, setCalc] = useState({ characters: 20, locations: 15, props: 60, costumes: 40, equipment: 25 });
  const [calcResult, setCalcResult] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);

  const load = async () => {
    const pid = productionId || 1;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchEvaluationMetrics(pid);
      setData(res.data);
    } catch (err) {
      setError('Failed to load evaluation metrics. Ensure a script has been analysed and a budget generated.');
      console.error(err);
    }
    setLoading(false);
  };

  const loadTestSet = async () => {
    setTestSetLoading(true);
    try {
      const res = await fetchExtractionTestSet();
      setTestSet(res.data);
    } catch (err) {
      console.error(err);
    }
    setTestSetLoading(false);
  };

  const loadShootModel = async () => {
    try {
      const res = await fetchShootDayModel();
      setShootModel(res.data);
    } catch (err) { console.error(err); }
  };

  const loadAblation = async () => {
    try {
      const res = await fetchAblationReport();
      setAblation(res.data);
    } catch (err) { console.error(err); }
  };

  const loadConfMatrix = async () => {
    try {
      const res = await fetchConfusionMatrix();
      setConfMatrix(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { load(); loadTestSet(); loadShootModel(); loadAblation(); loadConfMatrix(); }, [productionId]);

  // Calls the actual deployed model (Random Forest) rather than re-implementing
  // tree traversal client-side, so this can never drift from what's deployed.
  useEffect(() => {
    const handle = setTimeout(async () => {
      setCalcLoading(true);
      try {
        const res = await predictShootDaysAdHoc(calc);
        setCalcResult(res.data.predictedShootDays);
      } catch (err) {
        console.error(err);
      }
      setCalcLoading(false);
    }, 300); // debounce while typing
    return () => clearTimeout(handle);
  }, [calc]);

  const formatINR = (amt) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt || 0);

  return (
    <div className="screen active" id="evaluation">
      <div className="page-head">
        <div>
          <div className="page-title">Evaluation Dashboard</div>
          <div className="page-sub">
            Formalised accuracy measurement — Shoot-Day Prediction (MAE / R²), Extraction (Precision / Recall / F1) &amp; Cost Estimation Error (MAPE / Variance%)
          </div>
        </div>
        <button className="btn" onClick={load} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <RefreshCw size={14} className={loading ? 'spinner' : ''} /> Refresh
        </button>
      </div>

      {/* Methodology callout */}
      <div style={{
        background: 'var(--primary-soft)', border: '1px solid #C7CCF5', borderRadius: 'var(--radius)',
        padding: '16px 20px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'flex-start'
      }}>
        <BarChart2 size={18} color="var(--primary-strong)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '13px', color: 'var(--primary-strong)', lineHeight: '1.6' }}>
          <b>Evaluation Methodology:</b>&nbsp;
          <b>Precision</b> = TP / (TP+FP) &nbsp;|&nbsp;
          <b>Recall</b> = TP / (TP+FN) &nbsp;|&nbsp;
          <b>F1</b> = 2·P·R / (P+R)&nbsp;&nbsp;
          where TP = AI-extracted &amp; user-verified, FP = AI-extracted &amp; user-rejected, FN = user-added (AI missed).&nbsp;&nbsp;
          <b>MAPE</b> = mean(|Est−Act| / Act × 100) per department where Actual &gt; 0.
        </div>
      </div>

      {/* Tab bar — splits the dashboard into focused views instead of one long scroll */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
        {EVAL_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 18px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              background: 'transparent', border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-faint)',
              marginBottom: '-1px', transition: 'color 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════
          SECTION 0 — SHOOT-DAY PREDICTION MODEL (core AI/ML contribution)
          A screenplay never states its own shoot duration — every other
          cost driver (set rental days, equipment days, crew day-rates)
          depends on this number, so this is the model this dissertation
          is evaluated on.
      ══════════════════════════════════════════════════════════ */}
      <div className="panel" style={{ marginBottom: '24px', border: '1px solid var(--primary)', display: activeTab === 'shootdays' ? 'block' : 'none' }}>
        <div className="panel-head">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} color="var(--primary)" /> Metric 0 — Shoot-Day Prediction Model
          </h3>
          <span className="hint">Core AI/ML contribution · Random Forest (best of 4 compared) · 5-fold cross-validated on 100 films</span>
        </div>
        <div className="panel-body">
          <div style={{
            background: 'var(--primary-soft)', border: '1px solid #C7CCF5', borderRadius: 'var(--radius-sm)',
            padding: '14px 18px', marginBottom: '20px', fontSize: '13px', color: 'var(--primary-strong)'
          }}>
            A screenplay's story never states how many days it will take to shoot — but every other cost driver
            (set rental days, equipment rental days, cast/crew day-rates) depends on that number. This model predicts
            total production shoot days from script-derived entity counts alone (characters, locations, props,
            costumes, equipment). Four model families were fit and cross-validated on identical folds; the
            best-generalizing one was deployed — not the only one tried. Reproduce with{' '}
            <code style={{ background: 'rgba(0,0,0,0.06)', padding: '1px 5px', borderRadius: '4px' }}>
              {shootModel?.reproduceCommand || 'python3 scripts/compare_shoot_day_models.py'}
            </code>.
          </div>

          {!shootModel && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '30px 0', color: 'var(--text-dim)' }}>
              <Loader2 size={20} className="spinner" />
            </div>
          )}

          {shootModel && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase' }}>MAE</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '26px' }}>{(shootModel.overallMaeDays ?? 0).toFixed(2)}d</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>vs baseline {(shootModel.baselineMaeDays ?? 0).toFixed(1)}d</div>
                </div>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase' }}>RMSE</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '26px' }}>{(shootModel.overallRmseDays ?? 0).toFixed(2)}d</div>
                </div>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase' }}>MAPE</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '26px', color: (shootModel.overallMapePct ?? 0) <= 20 ? '#0E9F6E' : '#D9822B' }}>
                    {(shootModel.overallMapePct ?? 0).toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '11px', color: '#0E9F6E' }}>−{(shootModel.improvementMapePct ?? 0).toFixed(0)}% vs baseline</div>
                </div>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase' }}>R²</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '26px' }}>{(shootModel.overallR2 ?? 0).toFixed(3)}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>n = {shootModel.sampleSize ?? 100} films</div>
                </div>
              </div>

              {shootModel.modelComparison && shootModel.modelComparison.length > 0 && (
                <>
                  <h4 style={{ marginBottom: '12px', color: 'var(--text-dim)', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '.4px' }}>
                    Model comparison — all models tried, not just the winner
                  </h4>
                  <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Model</th>
                          <th className="num">MAE (days)</th>
                          <th className="num">RMSE (days)</th>
                          <th className="num">MAPE</th>
                          <th className="num">R²</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {shootModel.modelComparison.map((m) => (
                          <tr key={m.model} style={m.deployed ? { background: 'var(--success-soft)' } : undefined}>
                            <td style={{ fontWeight: m.deployed ? 700 : 500 }}>{m.model}</td>
                            <td className="num mono">{(m.maeDays ?? 0).toFixed(2)}</td>
                            <td className="num mono">{(m.rmseDays ?? 0).toFixed(2)}</td>
                            <td className="num mono">{(m.mapePct ?? 0).toFixed(1)}%</td>
                            <td className="num mono">{(m.r2 ?? 0).toFixed(3)}</td>
                            <td>
                              {m.deployed && (
                                <span className="badge" style={{ background: '#E4F8F0', color: '#065F46', border: '1px solid #6EE7B7' }}>
                                  Deployed
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <h4 style={{ marginBottom: '12px', color: 'var(--text-dim)', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '.4px' }}>
                Deployed model — accuracy by budget category
              </h4>
              {shootModel.byCategory && shootModel.byCategory.length > 0 && (
                <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Budget Category</th>
                        <th className="num">Films</th>
                        <th className="num">MAE (days)</th>
                        <th className="num">RMSE (days)</th>
                        <th className="num">MAPE</th>
                        <th className="num">R²</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shootModel.byCategory.map((c) => (
                        <tr key={c.category}>
                          <td style={{ fontWeight: 600 }}>{c.category}</td>
                          <td className="num">{c.filmCount}</td>
                          <td className="num mono">{(c.maeDays ?? 0).toFixed(2)}</td>
                          <td className="num mono">{(c.rmseDays ?? 0).toFixed(2)}</td>
                          <td className="num mono" style={{ color: (c.mapePct ?? 0) <= 20 ? '#0E9F6E' : '#E5484D' }}>{(c.mapePct ?? 0).toFixed(1)}%</td>
                          <td className="num mono">{(c.r2 ?? 0).toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div style={{ fontSize: '12px', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', marginBottom: '20px', wordBreak: 'break-word' }}>
                {shootModel.modelFormula}
              </div>

              {shootModel.limitations && shootModel.limitations.length > 0 && (
                <div style={{
                  background: 'var(--warning-soft)', border: '1px solid #FDE68A', borderRadius: 'var(--radius-sm)',
                  padding: '14px 18px', marginBottom: '20px', fontSize: '12px', color: '#92400E'
                }}>
                  <b>Known limitations (stated, not hidden):</b>
                  <ul style={{ margin: '8px 0 0', paddingLeft: '18px' }}>
                    {shootModel.limitations.map((l, i) => <li key={i} style={{ marginBottom: '4px' }}>{l}</li>)}
                  </ul>
                </div>
              )}

              {/* Live what-if calculator — mirrors the deployed Go model */}
              <h4 style={{ marginBottom: '12px', color: 'var(--text-dim)', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '.4px' }}>
                Try it — predicted shoot days for a given entity count
              </h4>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '12px' }}>
                {['characters', 'locations', 'props', 'costumes', 'equipment'].map((k) => (
                  <label key={k} style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--text-faint)', textTransform: 'capitalize' }}>
                    {k}
                    <input
                      type="number" min="0" value={calc[k]}
                      onChange={(e) => setCalc({ ...calc, [k]: Math.max(0, parseInt(e.target.value) || 0) })}
                      style={{
                        width: '80px', padding: '6px 8px', borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '13px'
                      }}
                    />
                  </label>
                ))}
                <div style={{
                  padding: '8px 20px', background: 'var(--success-soft)', border: '1px solid #6EE7B7',
                  borderRadius: 'var(--radius-sm)', textAlign: 'center'
                }}>
                  <div style={{ fontSize: '10px', color: '#047857' }}>Predicted Shoot Days</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '20px', color: '#0E9F6E', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    {calcLoading && <Loader2 size={14} className="spinner" />}
                    {calcResult !== null ? calcResult : '—'}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {loading && activeTab !== 'shootdays' && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0', gap: '12px', color: 'var(--text-dim)' }}>
          <Loader2 size={24} className="spinner" /> Computing metrics...
        </div>
      )}

      {error && activeTab !== 'shootdays' && (
        <div style={{ background: 'var(--danger-soft)', border: '1px solid #FCA5A5', borderRadius: 'var(--radius)', padding: '20px', color: '#B91C1C', display: 'flex', gap: '10px' }}>
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '1px' }} /> {error}
        </div>
      )}

      {!data && !loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '14px', color: 'var(--text-dim)' }}>
          <Loader2 size={32} className="spinner" color="var(--primary)" />
          <div style={{ fontSize: '14px' }}>Loading evaluation metrics...</div>
          <button className="btn" onClick={load} style={{ marginTop: '6px' }}>
            Fetch Metrics
          </button>
        </div>
      )}

      {data && !loading && (
        <>
          {/* ══════════════════════════════════════════════════════════
              SECTION 1 — EXTRACTION ACCURACY
          ══════════════════════════════════════════════════════════ */}
          <div className="panel" style={{ marginBottom: '24px', display: activeTab === 'extraction' ? 'block' : 'none' }}>
            <div className="panel-head">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={16} color="var(--primary)" /> Metric 1 — Extraction Accuracy
              </h3>
              <span className="hint">
                {data.totalAiExtracted} AI-extracted &nbsp;·&nbsp; {data.totalUserVerified} verified &nbsp;·&nbsp; {data.totalUserRejected} rejected &nbsp;·&nbsp; {data.totalUserAdded} manually added
              </span>
            </div>
            <div className="panel-body">
              {/* Overall gauges */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
                <MetricGauge
                  label="Overall Precision"
                  description="TP / (TP + FP)"
                  value={data.overallPrecision}
                />
                <MetricGauge
                  label="Overall Recall"
                  description="TP / (TP + FN)"
                  value={data.overallRecall}
                />
                <MetricGauge
                  label="Overall F1-Score"
                  description="Harmonic mean of P & R"
                  value={data.overallF1Score}
                  color="var(--primary)"
                />
              </div>

              {/* Per entity type breakdown */}
              <h4 style={{ marginBottom: '12px', color: 'var(--text-dim)', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '.4px' }}>
                Breakdown by Entity Type
              </h4>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Entity Type</th>
                      <th className="num">AI Extracted</th>
                      <th className="num" title="True Positives — AI extracted & user verified">
                        TP (Verified)<Tooltip text="True Positives: AI extracted and user verified as correct" />
                      </th>
                      <th className="num" title="False Positives — AI extracted & user rejected">
                        FP (Rejected)<Tooltip text="False Positives: AI extracted but user rejected / removed" />
                      </th>
                      <th className="num" title="False Negatives — missed by AI, user added manually">
                        FN (Missed)<Tooltip text="False Negatives: User had to manually add — AI missed these" />
                      </th>
                      <th className="num">Precision</th>
                      <th className="num">Recall</th>
                      <th style={{ minWidth: '160px' }}>F1-Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.extractionByType.map((stat) => (
                      <EntityTypeRow key={stat.entityType} stat={stat} />
                    ))}
                  </tbody>
                </table>
              </div>

              {data.totalAiExtracted === 0 && (
                <div className="text-dim text-center" style={{ padding: '32px 0' }}>
                  No extraction data yet. Upload and analyse a script first.
                </div>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════
              SECTION 1b — FIXED GROUND-TRUTH EXTRACTION TEST
          ══════════════════════════════════════════════════════════ */}
          <div className="panel" style={{ marginBottom: '24px', display: activeTab === 'extraction' ? 'block' : 'none' }}>
            <div className="panel-head">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={16} color="var(--violet)" /> Metric 1b — Fixed Ground-Truth Extraction Test
              </h3>
              <button className="btn" onClick={loadTestSet} disabled={testSetLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RefreshCw size={14} className={testSetLoading ? 'spinner' : ''} /> Re-run
              </button>
            </div>
            <div className="panel-body">
              <div style={{
                background: 'var(--violet-soft)', border: '1px solid #DDD6FE', borderRadius: 'var(--radius-sm)',
                padding: '14px 18px', marginBottom: '20px', fontSize: '13px', color: '#5B21B6'
              }}>
                <b>Why this exists:</b> Metric 1 above is computed from live production data, which changes every
                session and isn't reproducible as a stated result. This panel re-runs the same deterministic
                rule-based extractor (no LLM call) against a fixed, hand-labeled 2-scene screenplay corpus — the
                numbers below are exactly reproducible on every run.
              </div>

              {testSetLoading && !testSet && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0', color: 'var(--text-dim)' }}>
                  <Loader2 size={20} className="spinner" />
                </div>
              )}

              {testSet && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    <MetricGauge label="Overall Precision" description="Fixed corpus" value={testSet.overallPrecision} />
                    <MetricGauge label="Overall Recall" description="Fixed corpus" value={testSet.overallRecall} />
                    <MetricGauge label="Overall F1-Score" description="Fixed corpus" value={testSet.overallF1Score} color="var(--violet)" />
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Entity Type</th>
                          <th className="num">Ground Truth</th>
                          <th>True Positives</th>
                          <th>False Positives</th>
                          <th>False Negatives</th>
                          <th className="num">Precision</th>
                          <th className="num">Recall</th>
                          <th className="num">F1</th>
                        </tr>
                      </thead>
                      <tbody>
                        {testSet.byType.map((t) => (
                          <tr key={t.entityType}>
                            <td>
                              <span style={{
                                display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '12px',
                                fontWeight: 600, ...(ENTITY_COLORS[t.entityType] ? {
                                  background: ENTITY_COLORS[t.entityType].bg, color: ENTITY_COLORS[t.entityType].color,
                                  border: `1px solid ${ENTITY_COLORS[t.entityType].border}`
                                } : { background: '#F5F5F9', color: '#555', border: '1px solid #ddd' })
                              }}>
                                {t.entityType}
                              </span>
                            </td>
                            <td className="num">{t.groundTruth}</td>
                            <td style={{ fontSize: '12px', color: '#0E9F6E' }}>{Array.isArray(t.truePositives) && t.truePositives.length > 0 ? t.truePositives.join(', ') : '—'}</td>
                            <td style={{ fontSize: '12px', color: '#E5484D' }}>{Array.isArray(t.falsePositives) && t.falsePositives.length > 0 ? t.falsePositives.join(', ') : '—'}</td>
                            <td style={{ fontSize: '12px', color: '#D9822B' }}>{Array.isArray(t.falseNegatives) && t.falseNegatives.length > 0 ? t.falseNegatives.join(', ') : '—'}</td>
                            <td className="num mono">{(t.precision * 100).toFixed(0)}%</td>
                            <td className="num mono">{(t.recall * 100).toFixed(0)}%</td>
                            <td className="num mono">{(t.f1Score * 100).toFixed(0)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-faint)', marginTop: '12px' }}>
                    {testSet.corpusDescription}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════
              SECTION 1b — F1 SCORE BREAKDOWN BY ENTITY TYPE
          ══════════════════════════════════════════════════════════ */}
          {testSet && testSet.byType && (
            <div className="panel" style={{ marginBottom: '24px', display: activeTab === 'extraction' ? 'block' : 'none' }}>
              <div className="panel-head">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={16} color="var(--violet)" /> Metric 1b — F1 Score Breakdown by Entity Type
                </h3>
                <span className="hint">Per-category Precision / Recall / F1 on the fixed ground-truth corpus</span>
              </div>
              <div className="panel-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {testSet.byType.map((t) => {
                    const style = ENTITY_COLORS[t.entityType] || { bg: '#F5F5F9', color: '#555', border: '#ddd' };
                    const f1Color = t.f1Score >= 0.8 ? '#0E9F6E' : t.f1Score >= 0.6 ? '#D9822B' : '#E5484D';
                    const pColor = t.precision >= 0.8 ? '#0E9F6E' : t.precision >= 0.6 ? '#D9822B' : '#E5484D';
                    const rColor = t.recall >= 0.8 ? '#0E9F6E' : t.recall >= 0.6 ? '#D9822B' : '#E5484D';
                    return (
                      <div key={t.entityType} style={{ background: 'var(--surface)', borderRadius: '10px', padding: '16px 20px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 700, background: style.bg, color: style.color, border: `1px solid ${style.border}` }}>
                            {t.entityType}
                            <span style={{ fontWeight: 400, fontSize: '11px' }}>GT: {t.groundTruth}</span>
                          </span>
                          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                            <span style={{ color: pColor }}>P: {(t.precision * 100).toFixed(0)}%</span>
                            <span style={{ color: rColor }}>R: {(t.recall * 100).toFixed(0)}%</span>
                            <span style={{ color: f1Color, fontSize: '14px' }}>F1: {(t.f1Score * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                        {/* Triple bar chart */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          {[['Precision', t.precision, pColor], ['Recall', t.recall, rColor], ['F1-Score', t.f1Score, f1Color]].map(([label, val, color]) => (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '10px', color: 'var(--text-faint)', width: '58px', fontWeight: 600 }}>{label}</span>
                              <div style={{ flex: 1, height: '6px', background: 'var(--border-soft)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${Math.round(val * 100)}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.8s cubic-bezier(.4,0,.2,1)' }} />
                              </div>
                              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700, color, minWidth: '36px', textAlign: 'right' }}>{(val * 100).toFixed(0)}%</span>
                            </div>
                          ))}
                        </div>
                        {/* TP / FP / FN pills */}
                        <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {(t.truePositives || []).map(n => (
                            <span key={n} style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '10px', background: '#DCFCE7', color: '#166534', border: '1px solid #86efac', fontWeight: 600 }}>✓ {n}</span>
                          ))}
                          {(t.falsePositives || []).map(n => (
                            <span key={n} style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '10px', background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5', fontWeight: 600 }}>✗ {n}</span>
                          ))}
                          {(t.falseNegatives || []).map(n => (
                            <span key={n} style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '10px', background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', fontWeight: 600 }}>? {n}</span>
                          ))}
                        </div>
                        <div style={{ marginTop: '6px', fontSize: '10px', color: 'var(--text-faint)', display: 'flex', gap: '12px' }}>
                          <span style={{ color: '#166534' }}>✓ TP (correct)</span>
                          <span style={{ color: '#991B1B' }}>✗ FP (false alarm)</span>
                          <span style={{ color: '#92400E' }}>? FN (missed)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              SECTION 1c — CONFUSION MATRIX
          ══════════════════════════════════════════════════════════ */}
          {confMatrix && confMatrix.matrix && (
            <div className="panel" style={{ marginBottom: '24px', display: activeTab === 'extraction' ? 'block' : 'none' }}>
              <div className="panel-head">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Grid size={16} color="var(--primary)" /> Metric 1c — Confusion Matrix (Entity Type Classification)
                </h3>
                <span className="hint">Rows = Actual · Columns = Predicted by rule-based extractor · Diagonal = True Positives</span>
              </div>
              <div className="panel-body">
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'separate', borderSpacing: '4px', minWidth: '540px' }}>
                    <thead>
                      <tr>
                        <th style={{ fontSize: '10px', color: 'var(--text-faint)', textAlign: 'right', paddingRight: '8px', fontWeight: 600 }}>Actual \ Predicted →</th>
                        {confMatrix.labels.map(lbl => (
                          <th key={lbl} style={{ fontSize: '10px', color: 'var(--text-faint)', textAlign: 'center', padding: '4px 8px', fontWeight: 700, whiteSpace: 'nowrap' }}>{lbl}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {confMatrix.matrix.map((row, ri) => (
                        <tr key={ri}>
                          <td style={{ fontSize: '11px', fontWeight: 700, textAlign: 'right', paddingRight: '8px', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                            {confMatrix.labels[ri]}
                          </td>
                          {row.map((cell, ci) => {
                            const isDiag = ri === ci;
                            const hasVal = cell > 0;
                            const bg = isDiag && hasVal ? '#DCFCE7' : hasVal ? '#FEE2E2' : 'var(--surface-sunk)';
                            const color = isDiag && hasVal ? '#166534' : hasVal ? '#991B1B' : 'var(--text-faint)';
                            return (
                              <td key={ci} style={{
                                textAlign: 'center', padding: '8px 12px', borderRadius: '6px',
                                background: bg, color, fontWeight: hasVal ? 800 : 400,
                                fontFamily: 'var(--font-mono)', fontSize: '14px',
                                border: isDiag ? '2px solid #86efac' : '1px solid var(--border)',
                                minWidth: '44px',
                              }}>
                                {cell}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: '14px', fontSize: '11px', color: 'var(--text-faint)', lineHeight: 1.7 }}>
                  <span style={{ background: '#DCFCE7', color: '#166534', padding: '1px 8px', borderRadius: '4px', border: '1px solid #86efac', marginRight: '8px', fontWeight: 700 }}>Green diagonal</span> = True Positives (correctly classified)
                  &nbsp;&nbsp;<span style={{ background: '#FEE2E2', color: '#991B1B', padding: '1px 8px', borderRadius: '4px', border: '1px solid #FCA5A5', marginRight: '8px', fontWeight: 700 }}>Red off-diagonal</span> = Misclassified or missed
                  &nbsp;&nbsp;<strong>"(missed)" column</strong> = False Negatives (in ground truth, not extracted)
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '8px' }}>{confMatrix.note}</p>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              SECTION 1d — ABLATION STUDY: EFFECT OF FUZZY DEDUPLICATION
          ══════════════════════════════════════════════════════════ */}
          {ablation && (
            <div className="panel" style={{ marginBottom: '24px', border: '1px solid var(--violet)', borderLeft: '4px solid var(--violet)', display: activeTab === 'extraction' ? 'block' : 'none' }}>
              <div className="panel-head">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <GitBranch size={16} color="var(--violet)" /> Metric 1d — Ablation Study: Fuzzy-String Deduplication
                </h3>
                <span className="hint">Controlled comparison: Deployed (with dedup) vs. Ablated (without dedup)</span>
              </div>
              <div className="panel-body">
                <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: '18px', fontSize: '12px', color: '#5B21B6', lineHeight: 1.65 }}>
                  <strong>What is being ablated?</strong> The fuzzy-string deduplication pass unifies near-duplicate entity names
                  (e.g. "KNIFE", "Knife", "a rusted knife") into a single canonical entity before computing P/R/F1.
                  Without it, the same physical item produces multiple FP entries, artificially degrading precision.
                  The table below shows measured impact across entity types.
                </div>

                {/* Side-by-side summary */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  {[ablation.withDedup, ablation.withoutDedup].map((cond, idx) => (
                    <div key={idx} style={{
                      background: idx === 0 ? '#F0FDF4' : '#FFF7ED',
                      border: `1px solid ${idx === 0 ? '#86efac' : '#fed7aa'}`,
                      borderRadius: '10px', padding: '16px',
                    }}>
                      <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '12px', color: idx === 0 ? '#166534' : '#9a3412', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {idx === 0 ? '✅ Deployed' : '⚠️ Ablated'} — {cond.label}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                        {[['Precision', cond.overallPrecision], ['Recall', cond.overallRecall], ['F1-Score', cond.overallF1]].map(([label, val]) => (
                          <div key={label} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.7)', borderRadius: '8px', padding: '8px 4px' }}>
                            <div style={{ fontSize: '10px', color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
                            <div style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: idx === 0 ? '#166534' : '#9a3412' }}>
                              {((val || 0) * 100).toFixed(0)}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Per-entity-type delta table */}
                <h4 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--text-faint)', marginBottom: '10px' }}>F1 Delta per Entity Type (Deployed − Ablated)</h4>
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Entity Type</th>
                        <th className="num">F1 (with dedup)</th>
                        <th className="num">F1 (without dedup)</th>
                        <th className="num">ΔF1</th>
                        <th>Interpretation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(ablation.withDedup.byType || []).map((wt, i) => {
                        const wo = (ablation.withoutDedup.byType || [])[i] || {};
                        const delta = ablation.deltaF1?.[wt.entityType] || 0;
                        const deltaColor = delta > 0 ? '#0E9F6E' : delta < 0 ? '#E5484D' : 'var(--text-faint)';
                        const interp = delta > 0.05 ? 'Significant improvement' : delta > 0 ? 'Minor improvement' : delta === 0 ? 'No change' : 'Degraded';
                        return (
                          <tr key={wt.entityType}>
                            <td><span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: (ENTITY_COLORS[wt.entityType] || {}).bg, color: (ENTITY_COLORS[wt.entityType] || {}).color, border: `1px solid ${(ENTITY_COLORS[wt.entityType] || {}).border}` }}>{wt.entityType}</span></td>
                            <td className="num" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#0E9F6E' }}>{((wt.f1Score || 0) * 100).toFixed(0)}%</td>
                            <td className="num" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>{((wo.f1Score || 0) * 100).toFixed(0)}%</td>
                            <td className="num" style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: deltaColor }}>{delta > 0 ? '+' : ''}{(delta * 100).toFixed(0)}%</td>
                            <td style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{interp}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: '14px', background: 'var(--primary-soft)', border: '1px solid #C7CCF5', borderRadius: 'var(--radius-sm)', padding: '12px 16px', fontSize: '12px', color: 'var(--primary-strong)', lineHeight: 1.6 }}>
                  <strong>Conclusion:</strong> {ablation.conclusion}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              SECTION 2 — COST ESTIMATION ERROR
          ══════════════════════════════════════════════════════════ */}
          <div className="panel" style={{ display: activeTab === 'cost' ? 'block' : 'none' }}>
            <div className="panel-head">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={16} color="var(--success)" /> Metric 2 — Cost-Estimation Error
              </h3>
              {data.hasActualData ? (
                <span className="hint">
                  Est: {formatINR(data.totalEstimated)} &nbsp;·&nbsp; Act: {formatINR(data.totalActual)} &nbsp;·&nbsp; Variance: {data.totalVariancePct > 0 ? '+' : ''}{data.totalVariancePct.toFixed(1)}%
                </span>
              ) : (
                <span className="hint" style={{ color: 'var(--warning)' }}>Log expenses to compute MAPE</span>
              )}
            </div>
            <div className="panel-body">

              {/* MAPE summary card */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
                <div style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', padding: '20px', gridColumn: '1 / 2'
                }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: '6px' }}>
                    Overall MAPE
                    <Tooltip text="Mean Absolute Percentage Error = mean(|Est − Act| / Act × 100) per department" />
                  </div>
                  {data.hasActualData ? (
                    <>
                      <div style={{
                        fontSize: '36px', fontWeight: 800, fontFamily: 'var(--font-mono)',
                        color: data.overallMape <= 20 ? '#0E9F6E' : data.overallMape <= 35 ? '#D9822B' : '#E5484D'
                      }}>
                        {data.overallMape.toFixed(1)}%
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-faint)', marginTop: '4px' }}>
                        Target: ≤ 20% — {data.overallMape <= 20 ? '✅ Within target' : '⚠️ Exceeds target'}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '20px', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', marginTop: '6px' }}>—</div>
                  )}
                </div>

                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: '6px' }}>
                    Total Estimated
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>
                    {formatINR(data.totalEstimated)}
                  </div>
                </div>

                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: '6px' }}>
                    Total Actual Spend
                  </div>
                  {data.hasActualData ? (
                    <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: data.totalActual > data.totalEstimated ? '#E5484D' : '#0E9F6E' }}>
                      {formatINR(data.totalActual)}
                    </div>
                  ) : (
                    <div style={{ fontSize: '16px', color: 'var(--text-faint)', marginTop: '4px' }}>No expenses logged yet</div>
                  )}
                </div>
              </div>

              {/* Per department table */}
              <h4 style={{ marginBottom: '12px', color: 'var(--text-dim)', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '.4px' }}>
                Department-wise Variance
              </h4>
              {data.costByDepartment && data.costByDepartment.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Department</th>
                        <th className="num">Estimated</th>
                        <th className="num">Actual</th>
                        <th className="num">
                          Variance %
                          <Tooltip text="(Estimated − Actual) / Actual × 100. Positive = over-estimated." />
                        </th>
                        <th className="num">
                          Abs. Error %
                          <Tooltip text="|Estimated − Actual| / Actual × 100 — used to compute MAPE" />
                        </th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.costByDepartment.map((dept) => (
                        <DeptRow key={dept.department} dept={dept} formatINR={formatINR} />
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-dim text-center" style={{ padding: '32px 0' }}>
                  No budget data yet. Generate a budget quote first.
                </div>
              )}

              {!data.hasActualData && data.costByDepartment && data.costByDepartment.length > 0 && (
                <div style={{
                  marginTop: '20px', background: 'var(--warning-soft)', border: '1px solid #FDE68A',
                  borderRadius: 'var(--radius-sm)', padding: '14px 18px', color: '#92400E',
                  fontSize: '13px', display: 'flex', gap: '10px', alignItems: 'flex-start'
                }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                  MAPE cannot be computed yet — no actual expenses have been logged. Navigate to <b>Expense Ledger</b> to log real-world spend against budget line items, then return here to see live accuracy scores.
                </div>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════
              SECTION 3 — BENCHMARK FILM COMPARISON (100-film dataset)
          ══════════════════════════════════════════════════════════ */}
          {data.benchmarkFilms && data.benchmarkFilms.length > 0 && (() => {
            const catColorMap = {
              High:   { bg: '#FDECEC', color: '#B91C1C', border: '#FCA5A5' },
              Medium: { bg: '#FBF0E1', color: '#92400E', border: '#FDE68A' },
              Low:    { bg: '#E4F8F0', color: '#065F46', border: '#6EE7B7' },
            };
            const mapeColorFor = (m) => m <= 15 ? '#0E9F6E' : m <= 20 ? '#D9822B' : '#E5484D';

            const filteredFilms = data.benchmarkFilms.filter((f) => {
              const matchesCategory = categoryFilter === 'All' || f.budgetCategory === categoryFilter;
              const matchesSearch = f.title.toLowerCase().includes(filmSearch.toLowerCase());
              return matchesCategory && matchesSearch;
            });

            return (
              <div className="panel" style={{ marginTop: '24px', display: activeTab === 'cost' ? 'block' : 'none' }}>
                <div className="panel-head">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BarChart2 size={16} color="var(--violet)" /> Metric 2b — Benchmark Film Validation
                  </h3>
                  <span className="hint">{data.benchmarkFilmCount} Indian films · High / Medium / Low budget · Publicly reported data</span>
                </div>
                <div className="panel-body">

                  {/* Explanation */}
                  <div style={{
                    background: 'var(--violet-soft)', border: '1px solid #DDD6FE',
                    borderRadius: 'var(--radius-sm)', padding: '14px 18px', marginBottom: '24px',
                    fontSize: '13px', color: '#5B21B6'
                  }}>
                    <b>Methodology:</b> For each of {data.benchmarkFilmCount} films, the rate-card system is applied to an equivalent entity set
                    (characters, locations, props, costumes, equipment). MAPE = mean(|System Estimate − Reported Actual| / Reported Actual × 100)
                    across departments. Budget figures are sourced from trade publications and production house press releases.
                    Target: MAPE ≤ 20% across all budget categories.
                  </div>

                  {/* Baseline-vs-system explainer */}
                  <div style={{
                    background: 'var(--warning-soft)', border: '1px solid #FDE68A', borderRadius: 'var(--radius-sm)',
                    padding: '14px 18px', marginBottom: '20px', fontSize: '13px', color: '#92400E'
                  }}>
                    <b>Baseline comparison:</b> "Baseline" = a naive predictor that just guesses the average total
                    budget of other films in the same tier (leave-one-out category mean) — the standard null-model
                    baseline. The system's MAPE is compared against it below; a lower system MAPE than baseline MAPE
                    is what demonstrates the script-driven hierarchical estimate is actually adding value.
                  </div>

                  {/* Category summary cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${data.benchmarkByCategory.length}, 1fr)`, gap: '12px', marginBottom: '20px' }}>
                    {data.benchmarkByCategory.map((cat) => {
                      const cc = catColorMap[cat.category] || catColorMap.Medium;
                      const mapeColor = mapeColorFor(cat.avgMape);
                      return (
                        <div key={cat.category} style={{
                          background: 'var(--surface)', border: '1px solid var(--border)',
                          borderRadius: 'var(--radius)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px'
                        }}>
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: '12px',
                            fontSize: '10px', fontWeight: 700, background: cc.bg, color: cc.color,
                            border: `1px solid ${cc.border}`, width: 'fit-content'
                          }}>
                            {cat.category} Budget
                          </span>
                          <div style={{ fontSize: '12px', color: 'var(--text-faint)' }}>{cat.filmCount} films</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '4px' }}>
                            <div>
                              <div style={{ fontSize: '10px', color: 'var(--text-faint)' }}>System Avg MAPE</div>
                              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '24px', color: mapeColor }}>
                                {cat.avgMape.toFixed(1)}%
                              </div>
                              <div style={{ fontSize: '10px', color: 'var(--text-faint)' }}>± {cat.stdDevMape.toFixed(1)} std dev</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '10px', color: 'var(--text-faint)' }}>vs Baseline</div>
                              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '14px', color: 'var(--text-faint)', textDecoration: 'line-through' }}>
                                {cat.baselineAvgMape.toFixed(1)}%
                              </div>
                              <div style={{ fontSize: '10px', color: cat.improvementPct >= 0 ? '#0E9F6E' : '#E5484D', fontWeight: 700 }}>
                                {cat.improvementPct >= 0 ? '−' : '+'}{Math.abs(cat.improvementPct).toFixed(0)}% error
                              </div>
                            </div>
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-faint)' }}>range {cat.minMape.toFixed(1)}–{cat.maxMape.toFixed(1)}%</div>
                        </div>
                      );
                    })}
                    <div style={{
                      background: 'var(--success-soft)', border: '1px solid #6EE7B7',
                      borderRadius: 'var(--radius)', padding: '16px', display: 'flex', flexDirection: 'column',
                      justifyContent: 'center', alignItems: 'center', gap: '4px'
                    }}>
                      <div style={{ fontSize: '11px', color: '#047857', fontWeight: 600, textTransform: 'uppercase' }}>Overall MAPE ({data.benchmarkFilmCount} films)</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '28px', color: '#0E9F6E' }}>
                        {data.benchmarkOverallMape.toFixed(1)}%
                      </div>
                      <div style={{ fontSize: '11px', color: '#047857' }}>
                        Target: ≤ 20% {data.benchmarkOverallMape <= 20 ? '✅' : '⚠️'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '4px' }}>
                        Baseline: {data.benchmarkBaselineOverallMape.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Search + category filter */}
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '14px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Search film title…"
                      value={filmSearch}
                      onChange={(e) => setFilmSearch(e.target.value)}
                      style={{
                        flex: 1, maxWidth: '280px', padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '13px'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {['All', 'High', 'Medium', 'Low'].map((c) => (
                        <button
                          key={c}
                          className="btn"
                          onClick={() => setCategoryFilter(c)}
                          style={{
                            fontSize: '12px', padding: '6px 12px',
                            background: categoryFilter === c ? 'var(--primary)' : 'var(--surface)',
                            color: categoryFilter === c ? '#fff' : 'var(--text)',
                          }}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                    <span className="hint" style={{ marginLeft: 'auto' }}>{filteredFilms.length} of {data.benchmarkFilmCount} shown</span>
                  </div>

                  {/* Per-film table — click a row to expand department breakdown */}
                  <div style={{ overflow: 'auto', maxHeight: '520px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Film</th>
                          <th>Category</th>
                          <th className="num">Shoot Days</th>
                          <th className="num">Reported (₹ Cr)</th>
                          <th className="num">System Est. (₹ Cr)</th>
                          <th className="num">MAPE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredFilms.map((film) => {
                          const cc = catColorMap[film.budgetCategory] || catColorMap.Medium;
                          const mapeColor = mapeColorFor(film.mape);
                          const isExpanded = expandedFilm === film.filmId;
                          return (
                            <React.Fragment key={film.filmId}>
                              <tr
                                onClick={() => setExpandedFilm(isExpanded ? null : film.filmId)}
                                style={{ cursor: 'pointer' }}
                              >
                                <td style={{ fontWeight: 600 }}>{film.title} <span className="text-faint" style={{ fontWeight: 400 }}>({film.year})</span></td>
                                <td>
                                  <span className="badge" style={{ background: cc.bg, color: cc.color, border: `1px solid ${cc.border}` }}>
                                    {film.budgetCategory}
                                  </span>
                                </td>
                                <td className="num mono">{film.shootDays}</td>
                                <td className="num mono">{film.totalActualCr}</td>
                                <td className="num mono">{film.totalEstCr}</td>
                                <td className="num">
                                  <span style={{ color: mapeColor, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                                    {film.mape.toFixed(1)}%
                                  </span>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr>
                                  <td colSpan={6} style={{ background: 'var(--surface-sunk)', padding: '12px 16px' }}>
                                    <table style={{ width: '100%' }}>
                                      <thead>
                                        <tr>
                                          <th>Department</th>
                                          <th className="num">Reported (₹ Cr)</th>
                                          <th className="num">System Est. (₹ Cr)</th>
                                          <th className="num">Variance %</th>
                                          <th className="num">Abs. Error %</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {film.departments.map((dept, di) => {
                                          const vColor = Math.abs(dept.variancePct) > 25 ? '#E5484D'
                                            : Math.abs(dept.variancePct) > 15 ? '#D9822B' : '#0E9F6E';
                                          return (
                                            <tr key={di}>
                                              <td className="text-dim">{dept.department}</td>
                                              <td className="num mono">{dept.actual}</td>
                                              <td className="num mono">{dept.estimated}</td>
                                              <td className="num">
                                                <span style={{ color: vColor, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                                                  {dept.variancePct > 0 ? '+' : ''}{dept.variancePct?.toFixed(1)}%
                                                </span>
                                              </td>
                                              <td className="num">
                                                <span style={{ color: dept.absErrPct > 20 ? '#E5484D' : '#0E9F6E', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                                                  {dept.absErrPct?.toFixed(1)}%
                                                </span>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                        {filteredFilms.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-dim text-center" style={{ padding: '24px 0' }}>
                              No films match "{filmSearch}".
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
};

export default Evaluation;

