// Final viva deck. Run from the repo root:
//   NODE_PATH=/tmp/frdocx/node_modules node final_report/build_deck.js
// Numbers match final_report/numbers.json, backend/handlers/heldout_results.json
// and backend/handlers/cost_calibration.json.
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");

const SKILL_SCRIPTS = "/Users/nmupparaju/.claude/skills/synced/c6665590-0a59-4ce5-9abe-142d5b061f5a_4875b0c9-5400-4973-bbfd-a82a1a25a750/pptx/scripts";
const { applyTheme } = require(path.join(SKILL_SCRIPTS, "apply_theme.js"));

const HERE = __dirname;
const FIG = path.join(HERE, "figures");
const SHOTS = path.join(HERE, "screenshots");
const OUT = path.join(HERE, "Naveen_Mupparaju_2024TM93514_Final_Viva.pptx");

const THEME = {
  name: "Midnight Executive Final",
  headFontFace: "Cambria",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "1A1A2E", lt1: "FFFFFF", dk2: "1E2761", lt2: "EEF2FB",
    accent1: "1E2761", accent2: "4A55C0", accent3: "0E9F6E", accent4: "C0392B",
    accent5: "CADCFC", accent6: "6B7280", hlink: "4A55C0", folHlink: "6B7280",
  },
};
const HEX = THEME.colors;

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 in
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = "Hierarchical Production Cost Estimation for Film Pre-Production: Final Viva";
pres.author = "Naveen Mupparaju";
const C = pres.SchemeColor;

const W = 13.333;
const MX = 0.6;
const CW = W - 2 * MX;

// ── Layouts ──────────────────────────────────────────────────────────────
pres.defineSlideMaster({
  title: "TITLE_DARK",
  background: { color: C.text2 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: MX, y: 2.2, w: 11.5, h: 1.9, fontSize: 40, bold: true, color: C.background1, align: "left", valign: "bottom", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: MX, y: 4.25, w: 11.5, h: 0.6, fontSize: 20, color: C.accent5, margin: 0 }, text: "" } },
  ],
});

pres.defineSlideMaster({
  title: "CONTENT",
  background: { color: C.background1 },
  margin: [0.5, 0.6, 0.6, 0.6],
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: MX, y: 0.35, w: CW, h: 0.85, fontSize: 30, bold: true, color: C.text2, align: "left", valign: "middle", margin: 0 }, text: "" } },
    { text: { text: "Naveen Mupparaju  ·  2024TM93514  ·  Final Evaluation", options: { x: MX, y: 7.0, w: 7, h: 0.3, fontSize: 10, color: C.accent6, margin: 0 } } },
  ],
  slideNumber: { x: 12.2, y: 7.0, w: 0.55, h: 0.3, fontSize: 10, color: C.accent6, align: "right" },
});

pres.defineSlideMaster({
  title: "CONTENT_DARK",
  background: { color: C.text2 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: MX, y: 0.35, w: CW, h: 0.85, fontSize: 30, bold: true, color: C.background1, align: "left", valign: "middle", margin: 0 }, text: "" } },
  ],
  slideNumber: { x: 12.2, y: 7.0, w: 0.55, h: 0.3, fontSize: 10, color: C.accent5, align: "right" },
});

// ── Helpers ──────────────────────────────────────────────────────────────
function pngSize(file) {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

// Fit an image inside a box, centred, keeping its aspect ratio.
function fitImage(slide, file, box, opts = {}) {
  const { w, h } = pngSize(file);
  let iw = box.w;
  let ih = (iw * h) / w;
  if (ih > box.h) { ih = box.h; iw = (ih * w) / h; }
  const x = box.x + (box.w - iw) / 2;
  const y = opts.top ? box.y : box.y + (box.h - ih) / 2;
  slide.addImage({ path: file, x, y, w: iw, h: ih, altText: opts.alt || "", objectName: opts.name || path.basename(file) });
  return { x, y, w: iw, h: ih };
}

const shadow = () => ({ type: "outer", color: "1E2761", opacity: 0.12, blur: 6, offset: 2, angle: 90 });

function card(slide, x, y, w, h, name, fill = C.background2) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: { color: fill }, line: { color: fill }, shadow: shadow(), objectName: name });
}

function text(slide, t, o) {
  slide.addText(t, { isTextBox: true, margin: 0, color: C.text1, fontSize: 16, valign: "top", ...o });
}

function bullets(slide, items, o) {
  const runs = items.map((it, i) => {
    const parts = Array.isArray(it) ? it : [{ text: it }];
    return parts.map((p, j) => ({
      text: p.text,
      options: {
        bold: p.bold, color: p.color,
        bullet: j === 0 ? { indent: 18 } : undefined,
        breakLine: j === parts.length - 1 && i < items.length - 1,
        paraSpaceAfter: 8,
      },
    }));
  }).flat();
  slide.addText(runs, { isTextBox: true, margin: 0, color: C.text1, fontSize: 16, valign: "top", ...o });
}

function stat(slide, x, y, w, h, value, label, sub, name, valueColor = C.text2) {
  card(slide, x, y, w, h, name);
  text(slide, value, { x: x + 0.3, y: y + 0.3, w: w - 0.6, h: 0.9, fontSize: 40, bold: true, color: valueColor, fontFace: THEME.headFontFace, objectName: `${name} value` });
  text(slide, label, { x: x + 0.3, y: y + 1.25, w: w - 0.6, h: 0.7, fontSize: 15, bold: true, objectName: `${name} label` });
  text(slide, sub, { x: x + 0.3, y: y + 1.95, w: w - 0.6, h: 0.6, fontSize: 13, color: C.accent6, objectName: `${name} note` });
}

function numberBadge(slide, x, y, n, name) {
  slide.addShape(pres.shapes.OVAL, { x, y, w: 0.5, h: 0.5, fill: { color: C.text2 }, line: { color: C.text2 }, objectName: `${name} badge` });
  text(slide, String(n), { x, y, w: 0.5, h: 0.5, fontSize: 16, bold: true, color: C.background1, align: "center", valign: "middle", objectName: `${name} number` });
}

const CHART_TEXT = { catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt", dataLabelFontFace: "+mn-lt", legendFontFace: "+mn-lt", titleFontFace: "+mn-lt" };
function chartStyle(extra = {}) {
  return {
    ...CHART_TEXT,
    catAxisLabelColor: HEX.dk1, valAxisLabelColor: HEX.accent6,
    catAxisLabelFontSize: 13, valAxisLabelFontSize: 11,
    valGridLine: { color: "E5E7EB", size: 0.75 }, catGridLine: { style: "none" },
    showValue: true, dataLabelFontSize: 12, dataLabelColor: HEX.dk1,
    showTitle: true, titleFontSize: 14, titleColor: HEX.dk1,
    ...extra,
  };
}

function tableRows(header, rows, opts = {}) {
  const head = header.map((h) => ({ text: h, options: { bold: true, color: C.background1, fill: { color: C.text2 }, fontSize: opts.fontSize || 14 } }));
  const body = rows.map((r, i) => r.map((c) => ({
    text: c,
    options: { fontSize: opts.fontSize || 14, color: C.text1, fill: { color: i % 2 ? C.background2 : C.background1 } },
  })));
  return [head, ...body];
}

const S = {};
function slide(section, master = "CONTENT") {
  if (!S[section]) { pres.addSection({ title: section }); S[section] = true; }
  return pres.addSlide({ masterName: master, sectionTitle: section });
}

// ── 1. Title ─────────────────────────────────────────────────────────────
{
  const s = slide("Introduction", "TITLE_DARK");
  s.addText("Hierarchical Production Cost Estimation for Film Pre-Production", { placeholder: "title" });
  s.addText("Final Evaluation Viva  ·  BITS SEZG628T Dissertation", { placeholder: "body" });
  s.addText([
    { text: "Naveen Mupparaju", options: { bold: true, breakLine: true } },
    { text: "2024TM93514  ·  M.Tech Software Engineering", options: { breakLine: true } },
    { text: "Affinsys AI Pvt. Ltd., Bangalore", options: { breakLine: true } },
    { text: "Supervisor: Nitin Radhakrishnan, Senior Product Engineer", options: { breakLine: true } },
    { text: "Additional examiner: Mohan Chowdary, Senior Project Lead" },
  ], { isTextBox: true, x: MX, y: 5.35, w: 8, h: 1.6, fontSize: 14, color: C.background1, margin: 0, valign: "top", objectName: "presenter details" });
  text(s, "November 2026", { x: 10.2, y: 6.6, w: 2.55, h: 0.35, fontSize: 14, color: C.accent5, align: "right", objectName: "date" });
  s.addNotes("Introduce yourself and the title. One-line summary: the system turns a screenplay into a traceable production budget, and the core contribution is a model that predicts how many days a film will take to shoot.");
}

// ── 2. Results at a glance ───────────────────────────────────────────────
{
  const s = slide("Introduction");
  s.addText("The final results at a glance", { placeholder: "title" });
  const w = (CW - 3 * 0.3) / 4;
  const y = 1.6;
  stat(s, MX, y, w, 2.75, "8.19 d", "Shoot-day error on 40 unseen films", "Baseline 12.81 days, 36% higher", "stat holdout");
  stat(s, MX + (w + 0.3), y, w, 2.75, "91.0%", "Extraction recall, 78 labelled entities", "Precision 100%; mid-semester recall 75%", "stat extraction");
  stat(s, MX + 2 * (w + 0.3), y, w, 2.75, "48.1%", "Calibrated cost error on unseen films", "Baseline 51.1%; uncalibrated 59.9%", "stat cost");
  stat(s, MX + 3 * (w + 0.3), y, w, 2.75, "200", "Indian films in the benchmark", "Up from 100: 50 High, 90 Medium, 60 Low", "stat dataset");
  text(s, "Script-derived counts predict shoot days well on films the model has never seen. Calibration makes the cost estimate better than a tier average, but cost error is still far above the 20% target.", { x: MX, y: 4.85, w: CW, h: 1.2, fontSize: 18, italic: true, color: C.text2, objectName: "takeaway" });
  s.addNotes("Lead with the four headline numbers. Every one of them is measured on data that was not used to build the thing being measured, and every one can be regenerated live from the Evaluation Dashboard. Then say plainly that cost is the weakest result.");
}

// ── 3. Problem ───────────────────────────────────────────────────────────
{
  const s = slide("Introduction");
  s.addText("A screenplay never says how long it will take to shoot", { placeholder: "title" });
  text(s, "Locations, equipment and crew are priced per day, and cast are contracted by the day. Shoot days drive most of a film budget, but they have to be estimated by a line producer reading the whole script.", { x: MX, y: 1.45, w: CW, h: 1.0, fontSize: 18 });
  const steps = [
    ["Screenplay", "Plain-text script, split into scenes at INT./EXT. headings"],
    ["Entities", "Characters, locations, props, costumes and equipment, with the scenes they appear in"],
    ["Shoot days", "Random Forest predicts total days from the five counts"],
    ["Budget", "Rate card prices each entity into an ATL / BTL budget"],
  ];
  const bw = 2.7, gap = (CW - 4 * bw) / 3, y = 2.95;
  steps.forEach(([h, d], i) => {
    const x = MX + i * (bw + gap);
    card(s, x, y, bw, 2.6, `step ${i + 1}`);
    numberBadge(s, x + 0.25, y + 0.25, i + 1, `step ${i + 1}`);
    text(s, h, { x: x + 0.25, y: y + 0.9, w: bw - 0.5, h: 0.45, fontSize: 18, bold: true, color: C.text2 });
    text(s, d, { x: x + 0.25, y: y + 1.4, w: bw - 0.5, h: 1.1, fontSize: 14 });
    if (i < 3) {
      s.addShape(pres.shapes.RIGHT_ARROW, { x: x + bw + gap / 2 - 0.2, y: y + 1.1, w: 0.4, h: 0.4, fill: { color: C.accent2 }, line: { color: C.accent2 }, objectName: `arrow ${i + 1}` });
    }
  });
  text(s, "Every budget line keeps a link to the scene that produced it, and a producer can edit any line.", { x: MX, y: 5.95, w: CW, h: 0.5, fontSize: 16, italic: true, color: C.accent6 });
  s.addNotes("Explain why shoot days are the key unknown. Walk the four steps left to right. Stress traceability: unlike a single total, each line can be traced back to a scene and edited.");
}

// ── 4. Mid-semester feedback ─────────────────────────────────────────────
{
  const s = slide("Introduction");
  s.addText("Mid-semester feedback and what changed", { placeholder: "title" });
  s.addTable(tableRows(
    ["Examiner comment", "What was done", "Measured outcome"],
    [
      ["Larger validation set", "Benchmark grown from 100 to 200 films across three budget tiers", "CV MAE 11.70 days, R² 0.887 (more realistic than 0.980)"],
      ["Better extraction recall", "12-scene, 78-entity corpus; dialogue cues, role words, larger glossary", "Recall 75% → 91.0%, precision 100%"],
      ["Test on unseen films", "Stratified 160 / 40 holdout and a budget-tier shift test", "8.19 vs 12.81 days; fails on an unseen tier"],
      ["Validate against actual records", "Error against reported total budgets, then per-scale calibration", "59.6% → 48.1% on unseen films (baseline 51.1%)"],
    ],
  ), { x: MX, y: 1.5, w: CW, colW: [2.9, 4.6, 4.633], rowH: 0.85, valign: "middle", border: { type: "solid", pt: 0.75, color: "D1D5DB" }, margin: 0.1, objectName: "feedback table" });
  text(s, "Some final numbers are worse than mid-semester. They are reported because they are what the requested tests produced.", { x: MX, y: 6.05, w: CW, h: 0.5, fontSize: 15, italic: true, color: C.accent6 });
  s.addNotes("Go row by row. The examiner asked for four things; each row shows the action and the measured result. Be upfront that R² dropped from 0.98 to 0.887 because the larger dataset is harder and more realistic, and that the mid-semester 9.7% cost figure was withdrawn.");
}

// ── 5. Architecture ──────────────────────────────────────────────────────
{
  const s = slide("Design");
  s.addText("System architecture", { placeholder: "title" });
  const img = fitImage(s, path.join(FIG, "fig01_architecture.png"), { x: MX, y: 1.4, w: 7.9, h: 5.3 }, { alt: "Architecture: React frontend, Go service with parser, extractor, shoot-day model and rate-card engine, SQLite, and offline Python training", name: "architecture diagram" });
  const x = img.x + img.w + 0.4;
  const items = [
    ["Traceable", "Each budget line links to a scene and an entity"],
    ["Deterministic extraction", "Rule-based path is scored, so results are reproducible"],
    ["Trained offline, served frozen", "50-tree forest embedded in Go; no retraining per request"],
    ["Reproducible", "Every reported number has a script or endpoint"],
  ];
  items.forEach(([h, d], i) => {
    const y = 1.5 + i * 1.3;
    numberBadge(s, x, y, i + 1, `decision ${i + 1}`);
    text(s, h, { x: x + 0.7, y: y - 0.02, w: W - MX - x - 0.7, h: 0.4, fontSize: 16, bold: true, color: C.text2 });
    text(s, d, { x: x + 0.7, y: y + 0.4, w: W - MX - x - 0.7, h: 0.75, fontSize: 14 });
  });
  s.addNotes("A single Go service with separate packages: parser, extractor, shoot-day model, rate-card engine. React frontend, SQLite. Model training and benchmark generation run offline in Python and the forest is exported to JSON and evaluated in Go.");
}

// ── 6. Dataset ───────────────────────────────────────────────────────────
{
  const s = slide("Design");
  s.addText("Benchmark: 200 Indian films", { placeholder: "title" });
  fitImage(s, path.join(FIG, "fig02_dataset.png"), { x: MX, y: 1.4, w: CW, h: 3.6 }, { alt: "Shoot-day distribution by budget tier and feature correlations with shoot days", name: "dataset figure" });
  const w = (CW - 2 * 0.3) / 3;
  const notes = [
    ["Reported", "Total budgets and shoot days from trade press, interviews and box-office trackers"],
    ["Estimated", "Entity counts per film, from production scale and genre; not extracted from real scripts"],
    ["Correlated", "Each count correlates 0.90 to 0.93 with shoot days, so feature rankings are indicative"],
  ];
  notes.forEach(([h, d], i) => {
    const x = MX + i * (w + 0.3);
    card(s, x, 5.25, w, 1.5, `dataset note ${i + 1}`);
    text(s, h, { x: x + 0.25, y: 5.4, w: w - 0.5, h: 0.4, fontSize: 16, bold: true, color: C.text2 });
    text(s, d, { x: x + 0.25, y: 5.82, w: w - 0.5, h: 0.85, fontSize: 13 });
  });
  s.addNotes("50 High, 90 Medium, 60 Low budget films. Be clear about provenance: budgets and shoot days are reported figures; entity counts are researcher estimates because full Indian screenplays are not public. That is the main threat to validity and it is stated in the report.");
}

// ── 7. Model comparison ──────────────────────────────────────────────────
{
  const s = slide("Results");
  s.addText("Four models compared under 5-fold cross-validation", { placeholder: "title" });
  s.addChart(pres.charts.BAR, [{ name: "MAE (days)", labels: ["Gradient Boosting", "Random Forest", "Linear Regression", "Decision Tree", "Tier-mean baseline"], values: [11.5, 11.7, 12.43, 13.78, 14.96] }], {
    x: MX, y: 1.4, w: 7.4, h: 5.3, barDir: "bar", chartColors: [HEX.accent1],
    ...chartStyle({ title: "Out-of-fold MAE, 200 films (lower is better)", dataLabelFormatCode: "0.00", valAxisMinVal: 0, valAxisMaxVal: 16, showLegend: false, catAxisOrientation: "maxMin" }),
    objectName: "model comparison chart", altText: "Bar chart of cross-validated MAE by model",
  });
  const x = MX + 7.8, w = W - MX - x;
  card(s, x, 1.5, w, 2.3, "deployed model card");
  text(s, "Random Forest deployed", { x: x + 0.3, y: 1.7, w: w - 0.6, h: 0.45, fontSize: 18, bold: true, color: C.text2 });
  text(s, "MAE 11.70 days  ·  R² 0.887", { x: x + 0.3, y: 2.2, w: w - 0.6, h: 0.45, fontSize: 16 });
  text(s, "21.8% lower error than predicting the tier average", { x: x + 0.3, y: 2.7, w: w - 0.6, h: 0.9, fontSize: 15, color: C.accent3, bold: true });
  bullets(s, [
    "Gradient Boosting is 0.20 days better on all 200 films.",
    "When selection is repeated on only the 160 training films, Random Forest wins, so the margin is within noise.",
    "50 trees, depth 4, 3 of 5 features per split.",
  ], { x, y: 4.1, w, h: 2.6, fontSize: 15 });
  s.addNotes("All four models used identical folds, split at film level so no film is in both train and test. Random Forest was deployed. If asked why not Gradient Boosting: 0.2 days on one split, and Random Forest is the winner when selection uses only training data.");
}

// ── 8. Holdout ───────────────────────────────────────────────────────────
{
  const s = slide("Results");
  s.addText("On 40 unseen films, error is 36% below the baseline", { placeholder: "title" });
  const w = 2.75;
  stat(s, MX, 1.5, w, 2.6, "8.19 d", "Random Forest MAE", "40 held-out films", "holdout model", C.accent3);
  stat(s, MX + w + 0.3, 1.5, w, 2.6, "12.81 d", "Tier-mean baseline", "same 40 films", "holdout baseline", C.accent6);
  s.addTable(tableRows(["Tier", "Films", "MAE (days)", "MAPE"], [["High", "10", "10.12", "6.6%"], ["Medium", "18", "8.36", "14.6%"], ["Low", "12", "6.32", "19.1%"]]), {
    x: MX, y: 4.4, w: 2 * w + 0.3, colW: [1.6, 1.0, 1.6, 1.6], rowH: 0.42, border: { type: "solid", pt: 0.75, color: "D1D5DB" }, margin: 0.08, objectName: "holdout by tier",
  });
  fitImage(s, path.join(FIG, "fig04_holdout.png"), { x: MX + 2 * w + 0.8, y: 1.4, w: W - MX - (MX + 2 * w + 0.8), h: 5.4 }, { alt: "Predicted against actual shoot days for the 40 held-out films", name: "holdout scatter" });
  s.addNotes("Stratified 80/20 split with a fixed seed: 10 High, 18 Medium, 12 Low held out. Model selection redone on the 160 training films only, refit, then scored once on the 40. The holdout MAE is lower than cross-validation; with 40 films that is sampling variation, so the fair claim is the comparison against the baseline on the same films.");
}

// ── 9. Tier shift ────────────────────────────────────────────────────────
{
  const s = slide("Results");
  s.addText("Limit: the model cannot extrapolate to an unseen budget tier", { placeholder: "title" });
  s.addChart(pres.charts.BAR, [{ name: "R²", labels: ["Test High (train Medium+Low)", "Test Medium (train High+Low)", "Test Low (train High+Medium)"], values: [-4.084, 0.228, -2.936] }], {
    x: MX, y: 1.4, w: 7.4, h: 5.3, barDir: "bar", chartColors: [HEX.accent4],
    ...chartStyle({ title: "R² when one budget tier is left out of training", dataLabelFormatCode: "0.00", valAxisMinVal: -5, valAxisMaxVal: 1, showLegend: false, catAxisOrientation: "maxMin", catAxisLabelPos: "low" }),
    objectName: "tier shift chart", altText: "Bar chart of R-squared for each held-out tier",
  });
  const x = MX + 7.8, w = W - MX - x;
  text(s, "R² below zero means worse than simply predicting the tier mean.", { x, y: 1.6, w, h: 0.9, fontSize: 17, bold: true, color: C.accent4 });
  bullets(s, [
    "Trees cannot predict outside the range of shoot days they were trained on.",
    "A forest that has never seen a 150-day shoot cannot predict one.",
    "So a new scale of production must be inside the training mix before the estimate is used.",
  ], { x, y: 2.7, w, h: 3.6, fontSize: 16 });
  s.addNotes("This is the stricter test the examiner asked for. Train on two tiers, test on the third. High and Low both fail badly; Medium survives because it sits between the other two. Present this as a defined limit on where the model can be used.");
}

// ── 10. Extraction ───────────────────────────────────────────────────────
{
  const s = slide("Results");
  s.addText("Extraction recall rose from 75% to 91%", { placeholder: "title" });
  const labels = ["Character", "Location", "Prop", "Costume", "Equipment"];
  s.addChart(pres.charts.BAR, [
    { name: "Mid-semester (2 scenes, 16 entities)", labels, values: [100, 100, 60, 50, 75] },
    { name: "Final (12 scenes, 78 entities)", labels, values: [94.1, 100, 81.5, 100, 90.9] },
  ], {
    x: MX, y: 1.4, w: 7.6, h: 5.3, barDir: "col", barGrouping: "clustered", chartColors: [HEX.accent5, HEX.accent1],
    ...chartStyle({ title: "Recall by entity type (%)", dataLabelFormatCode: "0", valAxisMinVal: 0, valAxisMaxVal: 100, showLegend: true, legendPos: "b", legendFontSize: 12, dataLabelFontSize: 11 }),
    objectName: "extraction recall chart", altText: "Clustered column chart of recall by entity type, mid-semester against final",
  });
  const x = MX + 8.0, w = W - MX - x;
  card(s, x, 1.5, w, 1.6, "extraction totals");
  text(s, "P 100%  ·  R 91.0%  ·  F1 95.3%", { x: x + 0.3, y: 1.7, w: w - 0.6, h: 0.5, fontSize: 18, bold: true, color: C.text2 });
  text(s, "71 found, 0 false alarms, 7 missed", { x: x + 0.3, y: 2.3, w: w - 0.6, h: 0.5, fontSize: 15 });
  bullets(s, [
    "Misses: a sentence-case role with no cue (Grandmother) and six lowercase objects outside the glossary.",
    "THE FOLLOWING MORNING is no longer filed as a character.",
    [{ text: "Development-set score: ", bold: true }, { text: "the new scenes and rules were written together." }],
  ], { x, y: 3.4, w, h: 3.3, fontSize: 15 });
  s.addNotes("The corpus is fixed and the extractor is re-run on every page load of the dashboard. Mid-semester and final use different corpora, so the per-type bars are indicative. Say the caveat unprompted: this is a development-set score, not a blind test; a blind test is future work.");
}

// ── 11. Cost vs reported ─────────────────────────────────────────────────
{
  const s = slide("Results");
  s.addText("Uncalibrated cost estimate: no better than the tier average", { placeholder: "title" });
  const labels = ["High (50)", "Medium (90)", "Low (60)", "Overall (200)"];
  s.addChart(pres.charts.BAR, [
    { name: "System", labels, values: [48.2, 63.6, 63.0, 59.6] },
    { name: "Tier-mean baseline", labels, values: [49.2, 53.2, 77.1, 59.4] },
  ], {
    x: MX, y: 1.4, w: 7.6, h: 5.3, barDir: "col", barGrouping: "clustered", chartColors: [HEX.accent1, HEX.accent6],
    ...chartStyle({ title: "MAPE against publicly reported total budgets (%)", dataLabelFormatCode: "0.0", valAxisMinVal: 0, valAxisMaxVal: 90, showLegend: true, legendPos: "b", legendFontSize: 12 }),
    objectName: "cost chart", altText: "Clustered column chart of cost error by tier, system against baseline",
  });
  const x = MX + 8.0, w = W - MX - x;
  stat(s, x, 1.5, w, 2.6, "180 / 200", "Films underestimated", "A consistent bias, worst in the Medium tier", "underestimate stat", C.accent4);
  bullets(s, [
    "Many Medium films are predicted under 60 days and land on the Small rate card.",
    [{ text: "Mid-semester 9.7% withdrawn: ", bold: true }, { text: "it compared against department splits I had estimated myself." }],
  ], { x, y: 4.4, w, h: 2.3, fontSize: 15 });
  s.addNotes("The examiner asked for actual records. The only actual records are publicly reported totals, so that is the ground truth. Against those, the raw rate card is no better than guessing the tier average. Because the error is a consistent underestimate rather than noise, it can be corrected, which is the next slide.");
}

// ── 12. Calibration ──────────────────────────────────────────────────────
{
  const s = slide("Results");
  s.addText("Calibration beats the baseline on unseen films", { placeholder: "title" });
  const labels = ["Holdout, 40 films", "5-fold CV, 200 films"];
  s.addChart(pres.charts.BAR, [
    { name: "Uncalibrated", labels, values: [59.9, 59.6] },
    { name: "Calibrated", labels, values: [48.1, 51.9] },
    { name: "Tier-mean baseline", labels, values: [51.1, 59.8] },
  ], {
    x: MX, y: 1.4, w: 7.0, h: 5.3, barDir: "col", barGrouping: "clustered", chartColors: [HEX.accent5, HEX.accent3, HEX.accent6],
    ...chartStyle({ title: "Cost MAPE (%)", dataLabelFormatCode: "0.0", valAxisMinVal: 0, valAxisMaxVal: 70, showLegend: true, legendPos: "b", legendFontSize: 12 }),
    objectName: "calibration chart", altText: "Clustered column chart of cost error before and after calibration",
  });
  const x = MX + 7.4, w = W - MX - x;
  text(s, "One factor per predicted production scale", { x, y: 1.5, w, h: 0.45, fontSize: 17, bold: true, color: C.text2 });
  s.addTable(tableRows(["Scale", "Factor", "Training films"], [["Small", "×2.17", "68"], ["Medium", "×1.67", "62"], ["Large", "×1.00", "30"]]), {
    x, y: 2.05, w, colW: [w * 0.34, w * 0.28, w * 0.38], rowH: 0.4, border: { type: "solid", pt: 0.75, color: "D1D5DB" }, margin: 0.08, objectName: "calibration factors",
  });
  bullets(s, [
    "Chosen by CV on the 160 training films: factor 51.7% vs power law 87.4%.",
    "Same 40 held-out films as the shoot-day test, scored once.",
    "Medium tier still slightly worse than baseline (39.4% vs 37.7%).",
    "Live Budget Engine is not calibrated.",
  ], { x, y: 3.85, w, h: 2.9, fontSize: 14 });
  s.addNotes("The factor is the weighted median of actual over estimate, which is exactly the factor that minimises percentage error. The scale comes from predicted shoot days, so it is known before any budget exists; the baseline even gets the reported tier, so the comparison favours the baseline. Still far from 20%, mostly because star fees are not in a script. It still underestimates 151 of 200 films, because minimising percentage error biases low.");
}

// ── 13. Mid-sem vs final ─────────────────────────────────────────────────
{
  const s = slide("Results");
  s.addText("Mid-semester and final results compared", { placeholder: "title" });
  s.addTable(tableRows(
    ["Measure", "Mid-semester", "Final"],
    [
      ["Benchmark size", "100 films", "200 films"],
      ["Shoot-day MAE, cross-validation", "5.20 days", "11.70 days"],
      ["Shoot-day R², cross-validation", "0.980", "0.887"],
      ["Shoot-day MAE, unseen films", "not measured", "8.19 days (baseline 12.81)"],
      ["Unseen budget tier", "not measured", "Fails (R² below 0 for High and Low)"],
      ["Extraction precision / recall", "92% / 75% on 16 entities", "100% / 91.0% on 78 entities"],
      ["Cost error", "9.7% vs my own department splits", "59.6% vs reported totals (baseline 59.4%)"],
      ["Cost error after calibration, unseen films", "not measured", "48.1% (baseline 51.1%)"],
    ],
    { fontSize: 15 },
  ), { x: MX, y: 1.4, w: CW, colW: [4.4, 3.5, 4.233], rowH: 0.5, valign: "middle", border: { type: "solid", pt: 0.75, color: "D1D5DB" }, margin: 0.08, objectName: "comparison table" });
  text(s, "The mid-semester figures were optimistic: the first 100 films had closely related counts that made shoot days easy to predict.", { x: MX, y: 6.5, w: CW, h: 0.4, fontSize: 15, italic: true, color: C.accent6 });
  s.addNotes("Explain the drop honestly: the original 100 films were entered with counts that tracked shoot days closely. The added 100 have counts drawn from genre and tier profiles, independent of their shoot days, so the error roughly doubled. The 200-film figures are the more realistic estimate.");
}

// ── 14. Demo ─────────────────────────────────────────────────────────────
{
  const s = slide("Demonstration");
  s.addText("Demonstration: from screenplay to budget", { placeholder: "title" });
  const shots = [
    ["02_script_analysis.png", "1  Upload: 35 entities with scene-based days and cast grades"],
    ["03_budget.png", "2  Quote: ATL / BTL lines, billing units and scene links"],
  ];
  const w = (CW - 0.4) / 2;
  shots.forEach(([f, cap], i) => {
    const x = MX + i * (w + 0.4);
    const img = fitImage(s, path.join(SHOTS, f), { x, y: 1.35, w, h: 4.1 }, { top: true, alt: cap, name: `demo shot ${i + 1}` });
    s.addShape(pres.shapes.RECTANGLE, { x: img.x, y: img.y, w: img.w, h: img.h, fill: { type: "none" }, line: { color: "D1D5DB", width: 0.75 }, objectName: `demo shot ${i + 1} frame` });
    text(s, cap, { x: img.x, y: 5.55, w: img.w + 0.6, h: 0.4, fontSize: 14, bold: true, color: C.text2 });
  });
  card(s, MX, 6.05, CW, 0.75, "demo summary");
  text(s, "demo_script.txt:  5 scenes  ·  35 entities  ·  38.0 predicted days  ·  ₹60.6 lakh (Cast ₹38.0 lakh, Locations ₹19.0 lakh)", { x: MX + 0.3, y: 6.05, w: CW - 0.6, h: 0.75, fontSize: 15, valign: "middle" });
  s.addNotes("Switch to the live app here. Log in as producer, pick Fresh Demo Film, upload demo_script.txt on Script Analysis, show the entities and scene-based days, then Budget Engine and Generate AI Quote. Say unprompted that ₹60 lakh is low for 38 days, which is the same underestimate the benchmark measured.");
}

// ── 15. Dashboard ────────────────────────────────────────────────────────
{
  const s = slide("Demonstration");
  s.addText("Evaluation dashboard: every number regenerated live", { placeholder: "title" });
  const w = (CW - 0.4) / 2;
  [["04b_eval_holdout.png", "Shoot-day tab: holdout, model selection on 160 films, tier shift"], ["06b_eval_calibration.png", "Cost tab: calibration scored on the same 40 unseen films"]].forEach(([f, cap], i) => {
    const x = MX + i * (w + 0.4);
    const img = fitImage(s, path.join(SHOTS, f), { x, y: 1.35, w, h: 4.4 }, { top: true, alt: cap, name: `dashboard shot ${i + 1}` });
    s.addShape(pres.shapes.RECTANGLE, { x: img.x, y: img.y, w: img.w, h: img.h, fill: { type: "none" }, line: { color: "D1D5DB", width: 0.75 }, objectName: `dashboard shot ${i + 1} frame` });
    text(s, cap, { x: img.x, y: img.y + img.h + 0.12, w, h: 0.4, fontSize: 14, bold: true, color: C.text2 });
  });
  text(s, "Reproduce:  scripts/heldout_generalization.py  ·  scripts/cost_calibration.py  ·  go test ./...", { x: MX, y: 6.4, w: CW, h: 0.4, fontSize: 12, color: C.accent6, fontFace: "Courier New" });
  s.addNotes("Open the Evaluation tab. Shoot-Day tab: model table, holdout panel, tier shift. Extraction tab: Metric 1 reads 0% until entities are verified in Scene Builder; scroll to Metric 1b. Cost tab: benchmark panel, then Metric 2c calibration at the bottom. Mention that backend tests pin these numbers to the report.");
}

// ── 16. Limitations ──────────────────────────────────────────────────────
{
  const s = slide("Conclusion");
  s.addText("Limitations and threats to validity", { placeholder: "title" });
  const items = [
    ["Estimated features", "Benchmark entity counts are estimates, not extractor output from real screenplays. The model and the extractor are validated separately."],
    ["Development-set extraction", "The 12-scene corpus and the final rules were written together; a blind test is still needed."],
    ["Film-level costing", "Benchmark costs use a film-level version of the rate card. The scene-level live engine is not scored or calibrated."],
    ["Star fees and sample size", "Star fees are not in a script and drive most remaining cost error. Per-tier holdout results rest on 10 to 18 films."],
  ];
  const w = (CW - 0.4) / 2, h = 2.4;
  items.forEach(([t, d], i) => {
    const x = MX + (i % 2) * (w + 0.4), y = 1.5 + Math.floor(i / 2) * (h + 0.3);
    card(s, x, y, w, h, `limitation ${i + 1}`);
    numberBadge(s, x + 0.3, y + 0.3, i + 1, `limitation ${i + 1}`);
    text(s, t, { x: x + 1.0, y: y + 0.32, w: w - 1.3, h: 0.45, fontSize: 18, bold: true, color: C.text2 });
    text(s, d, { x: x + 1.0, y: y + 0.9, w: w - 1.3, h: 1.35, fontSize: 15 });
  });
  s.addNotes("State these before the examiner does. The biggest one is that benchmark entity counts are estimates, because full Indian screenplays are not public. End-to-end testing on real scripts is the first item of future work.");
}

// ── 17. Conclusion ───────────────────────────────────────────────────────
{
  const s = slide("Conclusion", "CONTENT_DARK");
  s.addText("Conclusion and future work", { placeholder: "title" });
  const w = (CW - 0.6) / 2;
  text(s, "What the work shows", { x: MX, y: 1.5, w, h: 0.5, fontSize: 20, bold: true, color: C.accent5 });
  bullets(s, [
    "A screenplay can be turned into a traceable, editable ATL / BTL budget, end to end.",
    "Five script-derived counts predict shoot days 36% better than the tier average on unseen films.",
    "Calibration makes the cost estimate beat the baseline on unseen films, though error stays far above 20%.",
    "The model only works for production scales present in its training data.",
  ], { x: MX, y: 2.1, w, h: 4.6, fontSize: 16, color: C.background1 });
  const x = MX + w + 0.6;
  text(s, "Next steps", { x, y: 1.5, w, h: 0.5, fontSize: 20, bold: true, color: C.accent5 });
  bullets(s, [
    "Run extraction and prediction on real screenplays and compare with actual schedules.",
    "Blind extraction test labelled by someone who has not seen the rules.",
    "Score the Gemini extraction path on the same corpus.",
    "Make star fees an explicit producer input, then calibrate the live engine.",
    "Report shoot days as a range from the spread of the forest's trees.",
  ], { x, y: 2.1, w, h: 4.6, fontSize: 16, color: C.background1 });
  s.addNotes("Close with what the results support and what they do not. Then the next steps, each tied to a stated limitation.");
}

// ── 18. Thank you ────────────────────────────────────────────────────────
{
  const s = slide("Conclusion", "TITLE_DARK");
  s.addText("Thank you", { placeholder: "title" });
  s.addText("Questions and discussion", { placeholder: "body" });
  text(s, "Naveen Mupparaju  ·  2024tm93514@wilp.bits-pilani.ac.in", { x: MX, y: 6.3, w: 8, h: 0.4, fontSize: 14, color: C.background1 });
  s.addNotes("Likely questions: why R² dropped from 0.98; whether benchmark counts come from real scripts; why the holdout beats CV; whether calibrating on the benchmark is cheating; why Random Forest rather than Gradient Boosting. Answers are in DEMO_SCRIPT.md section 3.");
}

(async () => {
  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("wrote", OUT);
})().catch((e) => { console.error(e); process.exit(1); });
