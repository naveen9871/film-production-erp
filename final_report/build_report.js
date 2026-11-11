// Builds the final dissertation report as a Word document.
// Run from the repo root after make_figures.py:
//   NODE_PATH=/tmp/frdocx/node_modules node final_report/build_report.js
const fs = require("fs");
const path = require("path");
const {
  AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, ImageRun, LevelFormat,
  NumberFormat, PageNumber, Packer, Paragraph, ShadingType, Table, TableCell, TableOfContents,
  TableRow, TextRun, WidthType, TabStopType,
} = require("docx");

const ROOT = path.join(__dirname, "..");
const FIG = path.join(__dirname, "figures");
const SHOTS = path.join(__dirname, "screenshots");
const OUT = path.join(__dirname, "Naveen_Mupparaju_2024TM93514_Final_Report.docx");

const FONT = "Times New Roman";
const CONTENT_WIDTH = 9026; // A4 with 1-inch margins, in DXA
const TEAL = "0F766E";

// ── Citations, numbered in order of first use (IEEE style) ──────────────
const REFS = {
  koster: "R. Koster, The On Production Budget Book. Boston: Focal Press, 1997.",
  honthaner: "E. L. Honthaner, The Complete Film Production Handbook, 4th ed. Burlington: Focal Press, 2010.",
  moviemagic: "Entertainment Partners, \"Movie Magic Budgeting and Movie Magic Scheduling,\" product documentation, 2024.",
  sharda: "R. Sharda and D. Delen, \"Predicting box-office success of motion pictures with neural networks,\" Expert Systems with Applications, vol. 30, no. 2, pp. 243–254, 2006.",
  eliashberg: "J. Eliashberg, S. K. Hui and Z. J. Zhang, \"From story line to box office: A new approach for green-lighting movie scripts,\" Management Science, vol. 53, no. 6, pp. 881–893, 2007.",
  lash: "M. T. Lash and K. Zhao, \"Early predictions of movie success: The who, what, and when of profitability,\" Journal of Management Information Systems, vol. 33, no. 3, pp. 874–903, 2016.",
  agarwal: "A. Agarwal, S. Balasubramanian, J. Zheng and S. Dash, \"Parsing screenplays for extracting social networks from movies,\" in Proc. 3rd Workshop on Computational Linguistics for Literature (EACL), 2014, pp. 50–58.",
  lample: "G. Lample, M. Ballesteros, S. Subramanian, K. Kawakami and C. Dyer, \"Neural architectures for named entity recognition,\" in Proc. NAACL-HLT, 2016, pp. 260–270.",
  brown: "T. B. Brown et al., \"Language models are few-shot learners,\" in Advances in Neural Information Processing Systems 33, 2020.",
  boehm: "B. W. Boehm, Software Engineering Economics. Englewood Cliffs: Prentice Hall, 1981.",
  cart: "L. Breiman, J. Friedman, R. Olshen and C. Stone, Classification and Regression Trees. Belmont: Wadsworth, 1984.",
  breiman: "L. Breiman, \"Random forests,\" Machine Learning, vol. 45, no. 1, pp. 5–32, 2001.",
  friedman: "J. H. Friedman, \"Greedy function approximation: A gradient boosting machine,\" Annals of Statistics, vol. 29, no. 5, pp. 1189–1232, 2001.",
  kohavi: "R. Kohavi, \"A study of cross-validation and bootstrap for accuracy estimation and model selection,\" in Proc. IJCAI, 1995, pp. 1137–1143.",
  hastie: "T. Hastie, R. Tibshirani and J. Friedman, The Elements of Statistical Learning, 2nd ed. New York: Springer, 2009.",
  lundberg: "S. M. Lundberg and S.-I. Lee, \"A unified approach to interpreting model predictions,\" in Advances in Neural Information Processing Systems 30, 2017.",
  budgets: "Sacnilk, Bollywood Hungama and Box Office India, film production budget and release records (accessed 2026).",
  stack: "Gin Web Framework, GORM and React official documentation (accessed 2026).",
};
const citeOrder = [];
function cite(...keys) {
  const nums = keys.map((k) => {
    if (!REFS[k]) throw new Error(`unknown reference ${k}`);
    if (!citeOrder.includes(k)) citeOrder.push(k);
    return citeOrder.indexOf(k) + 1;
  });
  return `[${nums.join(", ")}]`;
}

// ── Inline markup: **bold**, _italic_, [[placeholder]] ──────────────────
function runs(text, base = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|_[^_]+_|\[\[[^\]]+\]\])/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), ...base }));
    const tok = m[0];
    if (tok.startsWith("**")) out.push(new TextRun({ text: tok.slice(2, -2), bold: true, ...base }));
    else if (tok.startsWith("[[")) out.push(new TextRun({ text: tok.slice(2, -2), highlight: "yellow", ...base }));
    else out.push(new TextRun({ text: tok.slice(1, -1), italics: true, ...base }));
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), ...base }));
  return out;
}

const P = (text, opts = {}) => new Paragraph({
  children: runs(text, opts.run || {}),
  alignment: opts.align || AlignmentType.JUSTIFIED,
  spacing: { after: opts.after ?? 160, line: 360 },
  keepNext: opts.keepNext,
});
const center = (text, size, bold = false, after = 120) => new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after },
  children: [new TextRun({ text, size, bold, font: FONT })],
});
const H1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)], pageBreakBefore: true });
const H2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
const H3 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(text)] });
const bullet = (text) => new Paragraph({
  numbering: { reference: "bullets", level: 0 },
  spacing: { after: 80, line: 340 },
  children: runs(text),
});
const numbered = (ref) => (text) => new Paragraph({
  numbering: { reference: ref, level: 0 },
  spacing: { after: 80, line: 340 },
  children: runs(text),
});
// ── Tables ───────────────────────────────────────────────────────────────
const border = { style: BorderStyle.SINGLE, size: 4, color: "9CA3AF" };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

// Borderless, centred name/ID block for the cover and title pages.
function identityBlock(headers, values) {
  const colW = Math.floor(CONTENT_WIDTH / headers.length);
  const w = headers.map(() => colW);
  const cell = (text, i, bold) => new TableCell({
    borders: noBorders,
    width: { size: w[i], type: WidthType.DXA },
    children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
      children: [new TextRun({ text, bold, size: 24 })] })],
  });
  return new Table({
    width: { size: colW * headers.length, type: WidthType.DXA },
    columnWidths: w,
    alignment: AlignmentType.CENTER,
    borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder },
    rows: [
      new TableRow({ children: headers.map((h, i) => cell(h, i, true)) }),
      new TableRow({ children: values.map((v, i) => cell(v, i, false)) }),
    ],
  });
}

function table(headers, rows, widths, opts = {}) {
  const total = widths.reduce((a, b) => a + b, 0);
  const scale = CONTENT_WIDTH / total;
  const w = widths.map((x) => Math.round(x * scale));
  w[w.length - 1] += CONTENT_WIDTH - w.reduce((a, b) => a + b, 0);
  const numericCols = opts.numeric || [];
  const cell = (text, i, header, highlight) => new TableCell({
    borders,
    width: { size: w[i], type: WidthType.DXA },
    shading: header
      ? { fill: "E6F2F1", type: ShadingType.CLEAR, color: "auto" }
      : highlight ? { fill: "F0FDF4", type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({
      alignment: numericCols.includes(i) && !header ? AlignmentType.RIGHT : AlignmentType.LEFT,
      children: runs(String(text), { size: 20, bold: header || undefined }),
    })],
  });
  const highlightRows = opts.highlight || [];
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: w,
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, i, true)) }),
      ...rows.map((r, ri) => new TableRow({ children: r.map((c, i) => cell(c, i, false, highlightRows.includes(ri))) })),
    ],
  });
}

let tableNo = 0;
let figNo = 0;
const tableCaptions = new WeakSet();
const tableCaption = (text) => {
  const p = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 80 },
    keepNext: true,
    children: [new TextRun({ text: `Table ${++tableNo}: `, bold: true, size: 20 }), ...runs(text, { size: 20, italics: true })],
  });
  tableCaptions.add(p);
  return p;
};

// Tables are written as table-then-caption; BITS format puts the title above.
function captionsAboveTables(children) {
  const out = [...children];
  for (let i = 0; i < out.length - 1; i++) {
    if (out[i] instanceof Table && tableCaptions.has(out[i + 1])) {
      [out[i], out[i + 1]] = [out[i + 1], out[i]];
      i++;
    }
  }
  const spacer = [];
  for (let i = 0; i < out.length; i++) {
    spacer.push(out[i]);
    if (out[i] instanceof Table) spacer.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
  }
  return spacer;
}

function pngSize(file) {
  const buf = fs.readFileSync(file);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function figure(file, caption, widthIn = 6.2, dir = FIG) {
  const full = path.join(dir, file);
  const { w, h } = pngSize(full);
  const maxHeight = 8.0 * 96;
  let width = Math.round(widthIn * 96);
  let height = Math.round((width * h) / w);
  if (height > maxHeight) {
    width = Math.round((width * maxHeight) / height);
    height = maxHeight;
  }
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 60 },
      keepNext: true,
      children: [new ImageRun({ type: "png", data: fs.readFileSync(full), transformation: { width, height } })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: `Fig. ${++figNo}: `, bold: true, size: 20 }), ...runs(caption, { size: 20, italics: true })],
    }),
  ];
}

const screenshot = (file, caption) => figure(file, caption, 6.2, SHOTS);

// ── Content ──────────────────────────────────────────────────────────────
// Appendix A: cover page
const coverPage = [
  new Paragraph({ spacing: { before: 1400 }, children: [] }),
  center("A REPORT", 28, true, 120),
  center("ON", 24, true, 240),
  center("HIERARCHICAL PRODUCTION COST ESTIMATION", 32, true, 60),
  center("FOR FILM PRE-PRODUCTION", 32, true, 480),
  center("BY", 24, true, 240),
  identityBlock(["Name of the Student", "ID No."], ["Naveen Mupparaju", "2024TM93514"]),
  new Paragraph({ spacing: { before: 480 }, children: [] }),
  center("AT", 24, true, 240),
  center("Affinsys AI Pvt. Ltd., Bangalore", 26, true, 1400),
  center("BIRLA INSTITUTE OF TECHNOLOGY & SCIENCE, PILANI", 26, true, 120),
  center("November, 2026", 24, false, 0),
];

// Appendix B: title page (inner cover)
const titlePage = [
  new Paragraph({ pageBreakBefore: true, spacing: { before: 1000 }, children: [] }),
  center("A REPORT", 28, true, 120),
  center("ON", 24, true, 240),
  center("HIERARCHICAL PRODUCTION COST ESTIMATION", 32, true, 60),
  center("FOR FILM PRE-PRODUCTION", 32, true, 480),
  center("BY", 24, true, 240),
  identityBlock(["Name of the Student", "ID No.", "Degree Program"], ["Naveen Mupparaju", "2024TM93514", "M.Tech Software Engineering"]),
  center("Research Area: Software Engineering / Enterprise Systems / Applied Artificial Intelligence", 22, false, 0),
  new Paragraph({ spacing: { before: 360 }, children: [] }),
  center("Prepared in partial fulfilment of the", 24, false, 60),
  center("SEZG628T Dissertation / Project / Project Work", 24, true, 360),
  center("AT", 24, true, 240),
  center("Affinsys AI Pvt. Ltd., Bangalore", 26, true, 1200),
  center("BIRLA INSTITUTE OF TECHNOLOGY & SCIENCE, PILANI", 26, true, 120),
  center("November, 2026", 24, false, 0),
];

const certificate = [
  new Paragraph({ pageBreakBefore: true, children: [] }),
  center("CERTIFICATE", 28, true, 480),
  P("This is to certify that the Dissertation entitled **Hierarchical Production Cost Estimation for Film Pre-Production** and submitted by **Mr. Naveen Mupparaju**, ID No. **2024TM93514**, in partial fulfilment of the requirements of SEZG628T Dissertation, embodies the work done by him under my supervision."),
  new Paragraph({ spacing: { before: 1200 }, children: [new TextRun("Signature of the Supervisor")] }),
  new Paragraph({ spacing: { before: 200 }, children: [new TextRun("Name: Nitin Radhakrishnan")] }),
  new Paragraph({ children: runs("Designation: Senior Product Engineer, Affinsys AI Pvt. Ltd.") }),
  new Paragraph({ children: [new TextRun("Place: Bangalore")] }),
  new Paragraph({ children: [new TextRun("Date:")] }),
];

const acknowledgements = [
  new Paragraph({ pageBreakBefore: true, children: [] }),
  center("ACKNOWLEDGEMENTS", 28, true, 480),
  P("I would like to express my sincere gratitude to everyone who supported and guided me throughout this dissertation."),
  P("I am deeply thankful to my supervisor, Mr. Nitin Radhakrishnan, Senior Product Engineer at Affinsys AI Pvt. Ltd., for his continuous technical guidance and feedback. I also thank my additional examiner, Mr. Mohan Chowdary, Senior Project Lead at Affinsys AI Pvt. Ltd., for his review of the work, and Affinsys AI Pvt. Ltd. for providing the support and environment needed to carry out this work."),
  P("I sincerely thank my Faculty Mentor, Purab Nandi, of the BITS Pilani Work Integrated Learning Programmes Division, for academic guidance and timely reviews, and the examiners at the abstract and mid-semester reviews. Their comments asked for a larger validation set, better extraction recall, a test on unseen films and validation against actual production records, and they shaped the evaluation reported here."),
  P("Finally, I thank my family for their constant encouragement and patience throughout this programme."),
  new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 480 }, children: [new TextRun({ text: "Naveen Mupparaju", bold: true })] }),
  new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun("Bangalore, November 2026")] }),
];

// Appendix C: abstract sheet, which must fit on one page
function sheetFields(pairs) {
  const w = [3200, CONTENT_WIDTH - 3200];
  const cell = (children, width) => new TableCell({
    borders: noBorders,
    width: { size: width, type: WidthType.DXA },
    margins: { top: 20, bottom: 20, left: 0, right: 80 },
    children: [new Paragraph({ spacing: { after: 0, line: 252 }, children })],
  });
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: w,
    borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder },
    rows: pairs.map(([label, value]) => new TableRow({
      children: [
        cell([new TextRun({ text: label, bold: true, size: 22 })], w[0]),
        cell(runs(value, { size: 22 }), w[1]),
      ],
    })),
  });
}
const sheetPara = (text) => new Paragraph({
  alignment: AlignmentType.JUSTIFIED,
  spacing: { after: 80, line: 264 },
  children: runs(text, { size: 22 }),
});
const abstract = [
  new Paragraph({ pageBreakBefore: true, alignment: AlignmentType.CENTER, spacing: { after: 0 },
    children: [new TextRun({ text: "BIRLA INSTITUTE OF TECHNOLOGY AND SCIENCE, PILANI", bold: true, size: 24 })] }),
  center("(RAJASTHAN)", 22, true, 0),
  center("WILP Division", 22, true, 200),
  sheetFields([
    ["Organization:", "Affinsys AI Pvt. Ltd."],
    ["Location:", "Bangalore, Karnataka"],
    ["Duration:", "[[N months]]"],
    ["Date of Start:", "[[DD/MM/2026]]"],
    ["Date of Submission:", "[[DD/11/2026]]"],
    ["Title of the Project:", "Hierarchical Production Cost Estimation for Film Pre-Production"],
    ["ID No./Name of the student:", "2024TM93514 / Naveen Mupparaju"],
    ["Name and Designation of Supervisor:", "Mr. Nitin Radhakrishnan, Senior Product Engineer, Affinsys AI Pvt. Ltd."],
    ["Name and Designation of Additional Examiner:", "Mr. Mohan Chowdary, Senior Project Lead, Affinsys AI Pvt. Ltd."],
    ["Name of the Faculty mentor:", "Purab Nandi, BITS Pilani WILP Division"],
    ["Key Words:", "Film Pre-Production, Screenplay Breakdown, Entity Extraction, Shoot-Day Prediction, Random Forest, Cost Estimation, Hierarchical Budgeting, Model Validation"],
    ["Project Areas:", "Software Engineering, Enterprise Systems, Applied Artificial Intelligence"],
  ]),
  new Paragraph({ spacing: { before: 160, after: 60 }, children: [new TextRun({ text: "Abstract:", bold: true, size: 22 })] }),
  sheetPara("Film budgets are built from a manual screenplay breakdown that is slow, inconsistent between producers and hard to audit. This project builds a hierarchical cost-estimation system for film pre-production in which every budget line traces back to the scene and screenplay element that produced it. A deterministic extractor identifies characters, locations, props, costumes and equipment in screenplay text. Their counts feed a Random Forest that predicts total shoot days, which sets the production scale and drives a rate-card engine that produces an Above-the-Line / Below-the-Line budget. The system is built in Go and React, with an evaluation dashboard that regenerates every reported figure."),
  sheetPara("On a benchmark of 200 Indian films, the model's cross-validated mean absolute error is 11.70 shoot days (R² 0.887), 22% lower than a budget-tier average. On 40 films held out from training and model selection, it is 8.19 days against 12.81 for the baseline. It does not extrapolate to a budget tier missing from training. Entity extraction reaches 100% precision and 91.0% recall on a 12-scene labelled corpus, measured as a development-set result. Against publicly reported budgets, the uncalibrated rate card shows 59.6% error, no better than the tier average, because it systematically underestimates. A per-scale calibration fitted on 160 training films lowers the error on the 40 held-out films to 48.1%, against 51.1% for the baseline."),
  new Paragraph({ spacing: { before: 480 }, tabStops: [{ type: TabStopType.LEFT, position: 5400 }],
    children: [new TextRun({ text: "Signature of Student\tSignature of your Supervisor", bold: true, size: 22 })] }),
  new Paragraph({ spacing: { before: 80 }, tabStops: [{ type: TabStopType.LEFT, position: 5400 }],
    children: [new TextRun({ text: "Date:\tDate:", size: 22 })] }),
];
const contents = [
  new Paragraph({ pageBreakBefore: true, children: [] }),
  center("TABLE OF CONTENTS", 28, true, 240),
  new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }),
  P("_If page numbers are missing, right-click the table of contents and choose Update Field._", { align: AlignmentType.LEFT }),
];

const ABBREVIATIONS = [
  ["AI", "Artificial Intelligence"], ["API", "Application Programming Interface"],
  ["ATL / BTL", "Above the Line / Below the Line (budget sections)"], ["CART", "Classification and Regression Trees"],
  ["CV", "Cross-Validation"], ["ERP", "Enterprise Resource Planning"],
  ["INT. / EXT.", "Interior / Exterior (screenplay scene heading)"], ["LLM", "Large Language Model"],
  ["MAE", "Mean Absolute Error"], ["MAPE", "Mean Absolute Percentage Error"],
  ["ML", "Machine Learning"], ["NER", "Named Entity Recognition"],
  ["NLP", "Natural Language Processing"], ["OLS", "Ordinary Least Squares"],
  ["R²", "Coefficient of determination"], ["REST", "Representational State Transfer"],
  ["RMSE", "Root Mean Square Error"], ["WILP", "Work Integrated Learning Programmes"],
];
const abbreviations = [
  new Paragraph({ pageBreakBefore: true, children: [] }),
  center("LIST OF ABBREVIATIONS", 28, true, 240),
  table(["Abbreviation", "Meaning"], ABBREVIATIONS, [2400, 6600]),
];

// Chapter 1
const ch1 = [
  H1("1. Introduction"),
  H2("1.1 Background and problem"),
  P("A feature-film budget is built bottom-up from a screenplay breakdown. A line producer reads the script, lists every character, location, prop, costume and piece of special equipment, estimates how long each is needed, and prices it against department rates. The breakdown takes days for a single script, differs from one producer to the next, and has to be redone each time the script is revised."),
  P("The quantity that drives most of that budget is the number of shooting days. Locations, equipment rentals and crew are priced per day, and cast are contracted for a number of days. A screenplay does not state its own shoot duration. Estimating it is the core problem this dissertation addresses, and it is the component the abstract-stage examiners asked the evaluation to focus on."),
  H2("1.2 Objectives"),
  numbered("objectives")("Parse unstructured screenplay text into scenes and extract production entities of five types: Character, Location, Prop, Costume and Equipment."),
  numbered("objectives")("Predict total shoot days from script-derived entity counts using a supervised regression model, selected by comparing several model families."),
  numbered("objectives")("Generate a hierarchical, editable, department-wise ATL/BTL budget in which every line item is traceable to its source scene and entity."),
  numbered("objectives")("Provide an Evaluation Dashboard and re-runnable scripts that reproduce every reported accuracy figure."),
  numbered("objectives")("Validate the model on films excluded from training and the cost estimates against reported production budgets."),
  H2("1.3 Scope"),
  P("Automatic script-based estimation covers pre-production. Post-production, marketing, revenue and rights are implemented as producer-editable modules around the core estimate, as set out in the approved outline. The scored extraction path is the deterministic rule-based extractor. A Gemini-based extraction path is implemented but not scored (Section 8.2)."),
  H2("1.4 Response to the mid-semester evaluation"),
  P("The mid-semester evaluation (25 October 2026) asked for four improvements. Table 1 lists each one with what was done and the measured outcome. Several outcomes are worse than the corresponding mid-semester figures. They are reported because they are what the requested tests produced."),
  table(
    ["Examiner comment", "What was done", "Measured outcome"],
    [
      ["Expand the validation dataset", "Benchmark grown from 100 to 200 films. Extraction corpus grown from 2 scenes to 12.", "200 films (50 High, 90 Medium, 60 Low). 78 labelled entities."],
      ["Improve entity-extraction recall", "Dialogue-block cue detection, transition-slug rejection, larger glossary, capitalised-phrase classification", "Recall 75% → 91.0%. Precision 92% → 100% (development set)."],
      ["Test generalization on unseen films", "Stratified 40-film holdout with model selection on the remaining 160. Budget-tier shift test.", "MAE 8.19 days vs 12.81 baseline. Fails when a whole tier is unseen."],
      ["Validate cost estimates against actual production records", "Error measured against reported total budgets, not estimated department splits", "59.6% MAPE vs 59.4% baseline; 48.1% vs 51.1% on unseen films after calibration. Mid-semester 9.7% withdrawn."],
    ],
    [2300, 3600, 3100],
  ),
  tableCaption("Mid-semester examiner comments and how each was addressed"),
  H2("1.5 Summary of the literature survey"),
  H3("1.5.1 Production budgeting practice"),
  P(`Standard production handbooks describe the same workflow: a line producer marks up a breakdown sheet for each scene, listing cast, extras, props, wardrobe, vehicles and special equipment. The sheets are turned into a shooting schedule, and the schedule is priced into a budget with Above-the-Line and Below-the-Line sections and fringes ${cite("koster", "honthaner")}. Commercial tools such as Movie Magic Budgeting and Scheduling ${cite("moviemagic")} store and total these breakdowns, but the tagging of entities and the estimate of shoot days are still done by hand. This dissertation automates exactly those two manual steps and keeps the budget structure the handbooks describe.`),
  H3("1.5.2 Machine learning on film data"),
  P(`Most published machine learning on films predicts commercial outcomes, not production cost. Sharda and Delen ${cite("sharda")} predicted box-office classes from pre-release attributes with neural networks. Eliashberg et al. ${cite("eliashberg")} predicted return on investment from features of the story line, and Lash and Zhao ${cite("lash")} predicted profitability early in a film's life. This work shows that script-level information carries predictive signal. None of these studies estimates how long a production will take to shoot, which is the quantity a pre-production budget depends on. That gap is the focus here.`),
  H3("1.5.3 Screenplay text processing"),
  P(`Agarwal et al. ${cite("agarwal")} parsed screenplays into scene headings, character cues, dialogue and action using their formatting conventions, and found rule-based parsing reliable because those conventions are standardised. General named-entity recognisers ${cite("lample")} need labelled training data, and no labelled corpus exists for production entities such as props or costumes. Large language models can extract entities from a few examples ${cite("brown")}, but their output varies between runs and versions. For these reasons the scored path in this work is a deterministic extractor built on screenplay conventions, and the language-model path is kept as an optional alternative.`),
  H3("1.5.4 Estimation models and validation"),
  P(`Parametric cost estimation in software engineering, such as COCOMO ${cite("boehm")}, predicts effort from measurable size drivers. This project applies the same idea to film by predicting shoot days from entity counts. The candidate models are regression trees ${cite("cart")}, random forests ${cite("breiman")} and gradient boosting ${cite("friedman")}, with linear regression as a reference ${cite("hastie")}. Models are compared by k-fold cross-validation, which gives a less biased estimate of accuracy than a single split ${cite("kohavi")}. Additive attribution methods such as SHAP ${cite("lundberg")} can explain ensemble predictions. This work uses a simpler rule-based scene breakdown instead, because a producer has to be able to read it as a schedule.`),
  H3("1.5.5 Gap addressed"),
  P("The literature describes how productions are budgeted, shows that script content predicts commercial outcomes, and provides methods for parsing screenplays and fitting tree ensembles. No work found in this survey connects these pieces into a pipeline that runs from screenplay text to predicted shoot days to a traceable line-item budget, validated against real productions. That pipeline is the contribution of this dissertation."),
];

// Chapter 2
const ch2 = [
  H1("2. System Overview and Architecture"),
  P("The platform is organised around one validated AI component, the shoot-day prediction model, and the extraction and costing stages that feed it and consume its output. Fig. 1 shows the components."),
  ...figure("fig01_architecture.png", "System architecture. The Go service holds the online pipeline; model training and benchmark generation run offline in Python.", 6.3),
  H2("2.1 Components"),
  P("**Screenplay parser.** Splits raw text into scenes on INT./EXT./INT-EXT. headings and records the location, interior or exterior flag, and time of day for each scene."),
  P("**Entity extractor.** Finds the five entity types in each scene and records the scene each entity came from and how often it is mentioned (Section 3.2)."),
  P("**Shoot-day model.** A 50-tree Random Forest embedded in the Go service as frozen decision trees. It predicts total shoot days from the five entity counts (Section 3.3)."),
  P("**Cost engine.** Prices each entity against a configurable rate card at the production scale implied by the predicted days. It assembles a department-wise ATL/BTL budget with a contingency line (Section 3.4)."),
  P("**Scene explainability.** Breaks the film-level shoot-day total into per-scene estimates with the reasons for each, reconciled to the model's total (Section 3.5)."),
  P("**Evaluation framework.** A dashboard and a set of /validation endpoints that serve every figure in Chapter 5, backed by scripts in the repository (Section 3.6)."),
  P("**Supporting modules.** Budget versioning, expense logging with variance tracking, vendors and purchase orders, equipment rentals, artist contracts, revenue and rights, and PDF reports."),
  H2("2.2 Technology"),
  table(
    ["Layer", "Technology", "Role"],
    [
      ["Frontend", "React, Vite", "Script upload, entity review, budget tree, Evaluation Dashboard"],
      ["Backend", "Go, Gin, GORM", "REST API, parsing, extraction, model inference, costing, validation endpoints"],
      ["Persistence", "SQLite (local) or PostgreSQL", "Productions, scenes, entities, budget lines, expenses, audit log"],
      ["Offline ML", "Python (no external ML libraries)", "Model comparison, forest export, holdout test, benchmark generation"],
      ["Optional AI", "Python FastAPI, LangChain, Gemini", "Alternative extraction path, not scored"],
    ],
    [1700, 2900, 4400],
  ),
  tableCaption("Technology stack"),
  P(`The backend and frontend frameworks are documented in ${cite("stack")}. The four candidate model families are implemented from scratch in Python, so the comparison does not depend on library defaults and the deployed forest can be exported as plain JSON trees.`),
  H2("2.3 Design decisions"),
  P("**Hierarchical traceability.** Every generated budget line keeps the IDs of the entity and scene that produced it, so a revised scene can be traced to the lines it affects."),
  P("**Deterministic extraction first.** The scored extractor is rule-based and produces the same output for the same input, which is what allows a fixed test corpus to give a reproducible score."),
  P("**Train offline, serve frozen.** Models are fitted offline and embedded as frozen artifacts. Nothing is retrained during a budgeting session, so estimates do not drift."),
  P("**Reproducible by construction.** Each reported number has a script or endpoint that regenerates it (Appendix A)."),
];

// Chapter 3
const ch3 = [
  H1("3. Design and Implementation"),
  H2("3.1 Scene parsing"),
  P("Each line is matched against a scene-heading pattern covering INT., EXT., INT/EXT. and I/E. A match starts a new scene, and the heading supplies the location and time of day. Scene text keeps its blank lines, because the extractor uses them to separate dialogue blocks from action. Page length is estimated at 55 lines per page, the usual screenplay convention."),
  H2("3.2 Entity extraction"),
  P("The mid-semester extractor matched a short keyword list line by line and treated any all-capitals line as a character name. It recalled 75% of the labelled entities and wrongly read the transition line THE FOLLOWING MORNING as a character. The final extractor works in four steps."),
  numbered("extract")("**Dialogue-block cues.** Each scene is split into blocks at blank lines. A character cue is the first line of a block that has dialogue under it. Cues may include initials and punctuation (DR. SHARMA). Transition slugs (FOLLOWING, LATER, CUT TO, FADE and similar) are rejected."),
  numbered("extract")("**Production glossary.** About 150 prop, costume and equipment phrases, matched longest first so that BOOM POLE is not also counted as POLE. Plural spellings that should merge with the singular (ROBES → Robe) are listed explicitly, because a general plural rule would also match verbs such as watches and ties."),
  numbered("extract")("**Capitalised-phrase classification.** Screenplays capitalise both a character's first appearance and significant objects. A capitalised action phrase not covered by the glossary is skipped if it names a known character. If it contains a role word (JUDGE, CONSTABLE, GUARD, COMMANDER) it is filed as a non-speaking character. Anything else is filed as a prop."),
  numbered("extract")("**Locations** are taken directly from parsed scene headings."),
  P("The role-word step was added after running the extractor on the demonstration screenplay, where the first version filed JUDGE KRISHNAMURTHY and ADVOCATE MEHTA as props. On that screenplay the final extractor finds 6 characters, 4 locations, 19 props and 6 costumes, and names no character as a prop."),
  H2("3.3 Shoot-day prediction"),
  P(`The feature vector for a production is the count of each of the five entity types across all scenes. Four model families were compared under identical 5-fold cross-validation ${cite("kohavi")}, split at the film level so that no film appears in both the training and test folds of a round:`),
  bullet(`**Linear Regression**, ordinary least squares ${cite("hastie")}.`),
  bullet(`**Decision Tree**, a single CART regression tree ${cite("cart")} (depth 3, minimum leaf 5).`),
  bullet(`**Random Forest** ${cite("breiman")}, 50 bagged trees (depth 4, minimum leaf 3, 3 of 5 features considered per split). This is the deployed model.`),
  bullet(`**Gradient Boosting** ${cite("friedman")}, 50 sequential depth-2 trees with learning rate 0.1.`),
  P("The deployed forest is exported to JSON and embedded in the Go binary, which predicts by walking the trees. A category-mean predictor, which returns the average shoot days of the film's budget tier, is the baseline every model is compared against."),
  H2("3.4 Hierarchical cost estimation"),
  P("The predicted shoot days set the production scale: Large at 150 days or more, Medium at 60 or more, otherwise Small. Each entity is then priced as:", { keepNext: true }),
  P("**Line cost = rate (scale, department, category) × quantity × (1 + department fringe)**", { align: AlignmentType.CENTER }),
  P("An entity's shoot days are the days of the scenes it appears in, taken from the scene breakdown in Section 3.5, which is reconciled to the film-level prediction. Characters map to Cast (Above the Line) and are graded by their share of the shoot: Lead at 40% or more of the predicted days, Supporting at 15% or more, otherwise Background. Locations map to Locations, props and costumes to the Art Department, and equipment to Camera/Electrical, all Below the Line."),
  P("The quantity depends on how each rate is charged. Lead and Supporting cast are charged a fee per film, as Indian artist contracts usually are. Props and costumes are charged per item. Background cast, locations and equipment are charged per shoot day, so a location used in scenes totalling 13.5 days is costed for 13.5 days, and the location lines of a production add up to its predicted shoot days. Department fringe rates configured on the rate card are applied (for example 18% on cast), department totals are rolled up, and a contingency of 10% of Below-the-Line is added. Every line keeps its entity and scene IDs, and the producer can edit any line."),
  H2("3.5 Scene-level explainability"),
  P("Ensemble predictions do not explain themselves, so the system adds a simple rule-based breakdown for producers. Each scene starts at about 4 shooting hours per page (minimum 1.5). That rises by 25% for exteriors and 35% for night scenes. It adds 0.6 hours per character beyond two, 1.5 hours for six or more characters, 2.5 hours when action or stunt words appear, and 0.8 hours per equipment item. The scene hours are then scaled so that they add up to the model's film-level total. Each scene lists the reasons behind its estimate. A character counts in every scene whose text names it, not only the scene where it first appeared. The breakdown is served at /productions/{id}/explainability and also supplies the per-entity days used for costing (Section 3.4). It explains the prediction; it does not change it."),
  H2("3.6 Evaluation framework"),
  P("The Evaluation Dashboard has three tabs: shoot-day prediction, extraction accuracy and cost estimation. Every panel reads from an endpoint or file that can be regenerated:"),
  table(
    ["Result", "Source"],
    [
      ["Model comparison (5-fold CV)", "scripts/compare_shoot_day_models.py → GET /validation/shoot-day-model"],
      ["Unseen-film holdout and tier shift", "scripts/heldout_generalization.py → heldout_results.json → GET /validation/held-out"],
      ["Extraction precision / recall", "Fixed corpus re-run on each request → GET /validation/extraction-test-set"],
      ["Confusion matrix, ablation", "GET /validation/confusion-matrix, GET /validation/ablation-report"],
      ["Cost error vs reported budgets", "generate_benchmark_films.py → benchmark_films.csv → Cost tab"],
      ["Calibrated cost on unseen films", "scripts/cost_calibration.py → cost_calibration.json → GET /validation/cost-calibration"],
      ["Regression tests", "go test ./... (extraction corpus, demo screenplay, holdout and calibration artifacts, cost figures)"],
    ],
    [3300, 5700],
  ),
  tableCaption("Where each reported result is computed"),
];

// Chapter 4
const ch4 = [
  H1("4. Benchmark Dataset"),
  H2("4.1 Composition"),
  P("The benchmark contains 200 released Indian feature films: 50 High-budget (₹100 Cr and above), 90 Medium-budget (₹20–100 Cr) and 60 Low-budget (below ₹20 Cr). By language there are 133 Hindi, 25 Tamil, 17 Telugu, 17 Malayalam, 4 Kannada and 2 Marathi films, plus two bilingual productions. Release years run from 2008 to 2024. The first 100 films are the mid-semester set. The second 100 were added for the final evaluation and keep the same tier proportions."),
  H2("4.2 Provenance of each field"),
  P("Every column is classed as reported, estimated or derived. The distinction matters because it limits what the benchmark can prove."),
  table(
    ["Field", "Class", "Source"],
    [
      ["Title, year, language, genre, budget tier", "Reported", "Release records"],
      ["Total production budget (₹ Cr)", "Reported (rounded)", `Trade press and box-office trackers ${cite("budgets")}`],
      ["Total shoot days", "Reported or estimated", "Director and crew interviews where available, otherwise schedule estimates"],
      ["Entity counts (5 features)", "Estimated", "Original 100: hand-entered from production scale. Added 100: a genre-and-tier profile with a ±15% title-seeded variation. Not computed from shoot days."],
      ["Department spend", "Estimated", "Standard department ratios that sum to the reported total"],
      ["System estimate", "Derived", "Predicted shoot days → scale → rate-card costing"],
    ],
    [2600, 1700, 4700],
  ),
  tableCaption("Field provenance in benchmark_films.csv"),
  P("**Limitation.** Full screenplays for these films are not publicly available, so the entity counts are estimates, not extractor output. The extractor and the shoot-day model are therefore validated separately. An end-to-end test on real screenplays remains future work."),
  H2("4.3 Feature relationships"),
  P("All five features correlate strongly with shoot days (Pearson r from 0.90 to 0.93) and with each other (Fig. 2). Feature-importance rankings should therefore be read as indicative, not as clean attributions."),
  ...figure("fig02_dataset.png", "Shoot-day distribution by budget tier, and each feature's correlation with total shoot days (200 films)."),
];

// Chapter 5
const ch5 = [
  H1("5. Evaluation and Results"),
  H2("5.1 Methodology"),
  P("Four questions are answered, each by an independent and re-runnable measurement. How accurately does the model predict shoot days on films it was cross-validated on? How accurately on films excluded from training altogether? How completely does the extractor find entities in screenplay text? How close are the resulting cost estimates to reported production budgets? Every comparison includes a naive baseline, because a single accuracy number does not show whether the model adds anything."),
  H2("5.2 Shoot-day model: cross-validation on 200 films"),
  table(
    ["Model", "MAE (days)", "RMSE (days)", "MAPE", "R²", "In-sample MAE"],
    [
      ["Gradient Boosting", "11.50", "15.97", "18.4%", "0.894", "8.58"],
      ["Random Forest (deployed)", "11.70", "16.49", "18.8%", "0.887", "8.62"],
      ["Linear Regression", "12.43", "17.07", "21.3%", "0.878", "11.69"],
      ["Decision Tree", "13.78", "17.82", "22.0%", "0.867", "10.55"],
      ["Category-mean baseline", "14.96", "n/a", "24.5%", "0.840", "n/a"],
    ],
    [2900, 1250, 1300, 1050, 1000, 1500],
    { numeric: [1, 2, 3, 4, 5], highlight: [1] },
  ),
  tableCaption("Out-of-fold shoot-day accuracy, 5-fold cross-validation, n = 200"),
  ...figure("fig03_models.png", "Model comparison on 200 films. The deployed Random Forest is highlighted."),
  P("Random Forest reduces MAE by 21.8% and MAPE by 23.2% relative to the category-mean baseline. Gradient Boosting is 0.20 days better on this split. Random Forest remains deployed for two reasons: the margin is small, and Random Forest is the model selected when the comparison is repeated using only the 160 training films of the holdout protocol (Table 7). Both tree ensembles fit their training data more closely than they generalize (in-sample MAE about 8.6 days against about 11.6 out of fold). Linear Regression shows a smaller gap but higher error."),
  table(
    ["Tier", "Films", "MAE (days)", "RMSE (days)", "MAPE", "R²"],
    [
      ["High", "50", "18.79", "25.20", "13.0%", "0.057"],
      ["Medium", "90", "11.67", "14.50", "20.5%", "0.395"],
      ["Low", "60", "5.83", "7.86", "21.1%", "0.535"],
    ],
    [1800, 1200, 1500, 1500, 1400, 1300],
    { numeric: [1, 2, 3, 4, 5] },
  ),
  tableCaption("Deployed Random Forest by budget tier (cross-validation)"),
  P("High-budget films have the lowest percentage error but an R² near zero. The model places them at the right scale but explains little of the variation among them. Within a tier it is little better than the tier average, and most of its accuracy comes from distinguishing one tier from another."),
  H2("5.3 Shoot-day model: unseen films"),
  P("Forty films (10 High, 18 Medium, 12 Low) were held out by stratified random split with a fixed seed. Model selection was repeated by 5-fold cross-validation on the remaining 160 (Table 7). The selected model was refitted on all 160 and scored once on the 40."),
  table(
    ["Model", "CV MAE", "CV MAPE", "CV R²"],
    [
      ["Random Forest (selected)", "12.91", "20.6%", "0.868"],
      ["Linear Regression", "13.22", "22.7%", "0.865"],
      ["Gradient Boosting", "13.33", "21.0%", "0.867"],
      ["Decision Tree", "14.69", "23.7%", "0.840"],
    ],
    [3800, 1700, 1700, 1700],
    { numeric: [1, 2, 3], highlight: [0] },
  ),
  tableCaption("Model selection repeated on the 160 training films only"),
  table(
    ["", "Films", "MAE (days)", "RMSE (days)", "MAPE", "R²"],
    [
      ["Random Forest, all held-out films", "40", "8.19", "10.84", "13.9%", "0.949"],
      ["Category-mean baseline", "40", "12.81", "16.03", "21.5%", "0.888"],
      ["Random Forest, High", "10", "10.12", "11.74", "6.6%", "0.594"],
      ["Random Forest, Medium", "18", "8.36", "11.85", "14.6%", "0.221"],
      ["Random Forest, Low", "12", "6.32", "8.13", "19.1%", "0.753"],
    ],
    [3100, 900, 1300, 1300, 1100, 1000],
    { numeric: [1, 2, 3, 4, 5], highlight: [0] },
  ),
  tableCaption("Accuracy on 40 films excluded from training and model selection"),
  ...figure("fig04_holdout.png", "Predicted against actual shoot days for the 40 held-out films.", 4.6),
  P("On unseen films drawn from the same mix of tiers, the model's MAE is 36.1% lower than the baseline's. The holdout error is lower than the cross-validation error. With 40 films that difference is within the expected sampling variation and should not be read as an improvement."),
  H3("Budget-tier shift"),
  P("A stricter test trains a fresh Random Forest on two budget tiers and scores the third, so that the test films are at a production scale the model has never seen."),
  table(
    ["Trained on", "Tested on", "Films", "MAE (days)", "MAPE", "R²"],
    [
      ["Medium + Low", "High", "50", "52.73", "32.6%", "−4.084"],
      ["High + Low", "Medium", "90", "13.30", "21.7%", "0.228"],
      ["High + Medium", "Low", "60", "21.01", "77.7%", "−2.936"],
    ],
    [2000, 1500, 1000, 1500, 1400, 1600],
    { numeric: [2, 3, 4, 5] },
  ),
  tableCaption("Generalization to an unseen budget tier"),
  ...figure("fig05_tier_shift.png", "Error when one budget tier is absent from training. R² below zero means the predictions are worse than the tier mean."),
  P("Tree ensembles cannot predict outside the range of their training targets. A forest that has never seen a 150-day shoot cannot predict one. Medium films, which lie between the other two tiers, are predicted reasonably well. The two extreme tiers fail. In practice, the model can be used for a production whose scale is represented in the training data, and not otherwise."),
  H2("5.4 Entity extraction"),
  P("The mid-semester corpus had 2 scenes and 16 labelled entities. The final corpus keeps those scenes and adds ten more (police station, highway, temple, newsroom, village well, laboratory, railway platform, palace, classroom and forest), giving 12 scenes and 78 entities. It includes cases the extractor is expected to miss: a sentence-case role with no cue (Grandmother) and lowercase objects not in the glossary (kaleidoscope, anklet, incense, textbook, crate, projector)."),
  table(
    ["Entity type", "Ground truth", "Precision", "Recall", "F1", "Mid-sem recall"],
    [
      ["Character", "17", "100%", "94.1%", "97.0%", "100%"],
      ["Location", "12", "100%", "100%", "100%", "100%"],
      ["Prop", "27", "100%", "81.5%", "89.8%", "60%"],
      ["Costume", "11", "100%", "100%", "100%", "50%"],
      ["Equipment", "11", "100%", "90.9%", "95.2%", "75%"],
      ["**Overall**", "**78**", "**100%**", "**91.0%**", "**95.3%**", "**75%**"],
    ],
    [2000, 1500, 1350, 1300, 1300, 1550],
    { numeric: [1, 2, 3, 4, 5] },
  ),
  tableCaption("Extraction accuracy on the 12-scene corpus (71 true positives, 0 false positives, 7 misses)"),
  ...figure("fig06_extraction.png", "Recall by entity type, mid-semester against final."),
  P("**How to read this result.** The ten added scenes and the final extractor rules were written in the same development pass, and the role-word list was checked against the three sample screenplays in the repository. This is a development-set score. It shows that the earlier misses are fixed, but it is not a blind estimate of accuracy on new screenplays. Prop recall is the weakest category, because the extractor cannot find lowercase objects that are not in its glossary. That is the gap the Gemini extraction path is meant to close (Section 8.2)."),
  H2("5.5 Cost estimation against reported budgets"),
  P("At mid-semester, cost error was measured against department-level figures that were themselves researcher estimates. The examiner asked for validation against actual production records. The only actual records available for these films are their publicly reported total budgets, so the final evaluation measures the system's total against the reported total. The baseline is a leave-one-out category mean: the average reported budget of the other films in the same tier."),
  P("Full screenplays for the benchmark films are not available, so the benchmark costs each film at film level in generate_benchmark_films.py: predicted shoot days select the scale using the same 150- and 60-day thresholds as the service, and per-day department rates are applied for the predicted days. This follows the structure of the service's rate card but is a separate calculation, not a call to the Go engine."),
  table(
    ["Tier", "Films", "System MAPE", "Baseline MAPE", "Change vs baseline", "Films underestimated"],
    [
      ["High", "50", "48.2%", "49.2%", "−2.0%", "38 of 50"],
      ["Medium", "90", "63.6%", "53.2%", "+19.6% (worse)", "87 of 90"],
      ["Low", "60", "63.0%", "77.1%", "−18.3%", "55 of 60"],
      ["**Overall**", "**200**", "**59.6%**", "**59.4%**", "**+0.4%**", "**180 of 200**"],
    ],
    [1400, 1000, 1500, 1600, 1900, 1900],
    { numeric: [1, 2, 3] },
  ),
  tableCaption("Cost-estimate error against publicly reported total budgets"),
  ...figure("fig07_cost.png", "System cost error compared with the category-mean baseline, by tier."),
  P("Overall, the cost estimate is no better than the category average, and it underestimates 180 of the 200 films. The error is a consistent bias rather than random noise, and the largest bias is in the Medium tier. Medium films have reported budgets from ₹12 Cr to ₹100 Cr and shoot schedules from about 35 to 120 days. Many are predicted below 60 days, which puts them on the Small rate card. That card is priced for productions under ₹20 Cr."),
  P("The mid-semester figure of 9.7% compared the system with department splits I had estimated myself, so it did not test the system against an independent record. It is withdrawn. An earlier version of the benchmark script also used tier thresholds of 120 and 55 days, which the deployed service never used. With those thresholds the overall error was 54.1%. All figures in this report use the service's actual thresholds of 150 and 60 days."),
  H2("5.6 Calibrating the rate card"),
  P("Because the error in Table 11 is mostly a consistent underestimate, a correction fitted on known films should remove part of it. The correction is one multiplicative factor per production scale (Small, Medium, Large). The scale comes from the predicted shoot days, so it is known before any budget is reported. For a factor k, film i has percentage error (e_i / a_i)·|k − a_i / e_i|, where e_i is the estimate and a_i the reported budget. The factor that minimises the mean percentage error is therefore the median of the ratios a_i / e_i, weighted by e_i / a_i."),
  P("The calibration follows the shoot-day holdout protocol and uses the same split. The method was chosen by 5-fold cross-validation on the 160 training films only: the per-scale factor gave 51.7% against 59.5% uncalibrated, and a per-scale power law in log space gave 87.4%. The factors were then fitted on all 160 training films (Small ×2.17, Medium ×1.67, Large ×1.00) and scored once on the 40 held-out films. The baseline is the mean reported budget of the training films in the same reported tier. This gives the baseline information that the live system does not have, so the comparison is generous to the baseline."),
  table(
    ["Evaluation", "Films", "Uncalibrated", "Calibrated", "Baseline"],
    [
      ["Holdout: High", "10", "53.4%", "48.8%", "51.2%"],
      ["Holdout: Medium", "18", "63.6%", "39.4%", "37.7%"],
      ["Holdout: Low", "12", "59.9%", "60.6%", "71.1%"],
      ["**Holdout: overall**", "**40**", "**59.9%**", "**48.1%**", "**51.1%**"],
      ["5-fold CV, all 200 films", "200", "59.6%", "51.9%", "59.8%"],
    ],
    [3000, 1000, 1700, 1700, 1600],
    { numeric: [1, 2, 3, 4] },
  ),
  tableCaption("Cost-estimate error (MAPE) before and after per-scale calibration"),
  P("Calibration lowers the error on unseen films from 59.9% to 48.1%, and the calibrated estimate now beats the baseline overall, both on the holdout and under cross-validation. The largest gain is in the Medium tier, where the Small-scale factor corrects the films that the uncalibrated rate card priced as small productions. Calibration still does not beat the baseline for the Medium tier on the holdout (39.4% against 37.7%). The error remains high: films with similar entity counts and schedules have very different reported budgets, largely because of star fees, which no count derived from a script can capture. The calibrated estimate still falls below the reported budget for 151 of 200 films. This is expected, because the factor that minimises percentage error is biased low."),
  P("The factors correct the film-level benchmark costing described in Section 5.5. The scene-level engine behind the Budget Engine page is not calibrated, because it has not itself been scored against reported budgets. The result is reproduced by scripts/cost_calibration.py and shown on the Evaluation Dashboard (Figure 16)."),
  H2("5.7 Mid-semester and final results compared"),
  table(
    ["Measure", "Mid-semester", "Final"],
    [
      ["Benchmark size", "100 films", "200 films"],
      ["Shoot-day MAE, cross-validation (Random Forest)", "5.20 days", "11.70 days"],
      ["Shoot-day R², cross-validation", "0.980", "0.887"],
      ["Shoot-day MAE, unseen films", "not measured", "8.19 days (baseline 12.81)"],
      ["Unseen budget tier", "not measured", "Fails (R² below 0 for High and Low)"],
      ["Extraction corpus", "2 scenes, 16 entities", "12 scenes, 78 entities"],
      ["Extraction precision / recall", "92% / 75%", "100% / 91.0% (development set)"],
      ["Cost error", "9.7% vs estimated department splits", "59.6% vs reported totals (baseline 59.4%)"],
      ["Cost error after calibration, unseen films", "not measured", "48.1% (baseline 51.1%)"],
    ],
    [3800, 2400, 2800],
  ),
  tableCaption("Mid-semester and final results"),
  P("The mid-semester shoot-day and cost figures were optimistic. The 100 original films were entered with consistent, closely related entity counts, which made shoot days easy to predict. The added 100 films have counts drawn from genre and tier profiles, independent of their shoot days, and the error roughly doubled. The 200-film figures are the better estimate of real-world performance."),
];

// Chapter 6
const ch6 = [
  H1("6. System Demonstration"),
  P("The figures in this chapter are screenshots of the running system (React frontend, Go backend, SQLite database) taken during the demonstration walkthrough. The demonstration screenplay is demo_script.txt, a five-scene police drama included in the repository. Table 14 lists what the system produced for it."),
  table(
    ["Stage", "Output for demo_script.txt"],
    [
      ["Scene parsing", "5 scenes: 4 interior, 1 exterior; 4 at night"],
      ["Characters (6)", "PRIYA, RAJAN, JUDGE KRISHNAMURTHY, ADVOCATE MEHTA, CONSTABLE RAJ, COURT STENOGRAPHER"],
      ["Locations (4)", "POLICE STATION, RAJAN'S APARTMENT, MARINE DRIVE, COURT ROOM"],
      ["Props and costumes", "19 props (Leather Notebook, Briefcase, Knife, Police Jeep and others); 6 costumes (Coat, Gloves, Robe, Shirt, Suit, Uniform)"],
      ["Predicted shoot days", "38.0 days, Small scale"],
      ["Scene breakdown", "6.8, 6.8, 8.5, 9.1 and 6.8 days; the court-room scene is heaviest (four characters on screen)"],
      ["Cast grading", "PRIYA and RAJAN Lead (22 and 22.5 days); the other four Supporting"],
      ["Generated budget", "₹60.6 lakh: Cast ₹38.0 lakh, Locations ₹19.0 lakh, Art ₹0.95 lakh, Wardrobe ₹0.6 lakh, contingency ₹2.06 lakh"],
    ],
    [2500, 6500],
  ),
  tableCaption("System output for the demonstration screenplay"),
  P("The ₹60.6 lakh total is low for a 38-day production, which is consistent with the systematic underestimate measured on the benchmark (Section 5.5). The live engine is not calibrated (Section 5.6). In use, the producer would adjust the cast fees, which are the largest lines."),
  H2("6.1 Login and Executive Summary"),
  P("The producer signs in (demonstration account producer / password) and selects a production. The Executive Summary shows the estimated budget, spend to date, the remaining budget and the allocation by department. Figure 8 shows the demonstration production after its budget was generated. No expenses have been logged, so the spend is ₹0, and the projected return reads −100% until revenue is entered."),
  ...screenshot("01_dashboard.png", "Executive Summary for the demonstration production, with the ₹60.6 lakh estimate split by department."),
  H2("6.2 Script Analysis"),
  P("The producer uploads the screenplay as a plain-text file. The parser splits it into scenes at each INT./EXT. heading, and the extractor lists every character, location, prop, costume and equipment item it finds. The Est. Days column is the sum of the predicted days of the scenes in which the entity appears, so PRIYA, who is in three of the five scenes, is estimated at 22 days. Characters who cover at least 40% of the predicted schedule are graded Lead, and those covering at least 15% are graded Supporting."),
  ...screenshot("02_script_analysis.png", "Script Analysis after uploading demo_script.txt: 35 entities with scene-based shoot days. JUDGE KRISHNAMURTHY and CONSTABLE RAJ are graded Supporting."),
  H2("6.3 Scene Builder and producer verification"),
  P("Scene Builder lists the extracted entities by type. The producer ticks Verify for each correct entity and uses Add Entity for anything the extractor missed. These choices are the ground truth for the live extraction metric (Metric 1 on the Evaluation Dashboard), which therefore reads 0% until at least one entity has been verified. Recalculate Days & Cost re-runs the shoot-day prediction and the budget after any change."),
  ...screenshot("07_scene_builder.png", "Scene Builder: the six extracted characters with their cast grades and scene-based days, awaiting producer verification."),
  H2("6.4 Budget Engine"),
  P("Generate AI Quote prices every entity against the active rate card and groups the lines into Above-the-Line and Below-the-Line departments. Lead and Supporting cast are billed per film, props and costumes per item, and locations and equipment per shoot day. Every line carries a Scene ID link back to the screenplay, and the producer can override any line."),
  ...screenshot("03_budget.png", "Budget Engine: ATL and BTL hierarchy generated from the extracted entities, with billing units and scene traceability."),
  H2("6.5 Evaluation Dashboard"),
  P("The Evaluation Dashboard reports the three results of Chapter 5 from the running service. The figures are computed when the page loads, not copied from this report. The Shoot-Day tab opens with the 200-film model comparison and the per-tier error of the deployed Random Forest, together with its stated limitations (Figure 12)."),
  ...screenshot("04a_eval_models.png", "Shoot-Day Prediction tab: cross-validated comparison of four model families and the deployed model's error by budget tier."),
  P("Further down the same tab, the generalization panel reports the 40-film holdout, the model selection redone on the 160 training films and the budget-tier shift test. It ends with a calculator that predicts shoot days for any entity counts (Figure 13)."),
  ...screenshot("04b_eval_holdout.png", "Generalization on unseen films: holdout MAE 8.19 days against a 12.81-day baseline, and R² below zero when a whole budget tier is left out of training."),
  P("The Extraction tab (Figure 14) re-runs the deterministic extractor on the fixed 12-scene corpus and lists every true positive and every miss by entity type."),
  ...screenshot("05_eval_extraction.png", "Extraction Accuracy tab: fixed 12-scene corpus, precision 100%, recall 91.0%, F1 95.3%."),
  P("The Cost tab (Figure 15) shows the live production's estimate against logged expenses (empty here) and, below it, the 200-film benchmark against reported budgets, with the category-mean baseline for each tier."),
  ...screenshot("06_eval_cost.png", "Cost Estimation tab: benchmark error against reported budgets, 59.6% overall against a 59.4% baseline."),
  P("The last panel on the Cost tab (Figure 16) shows the calibration of Section 5.6: the method selection on the training films, the fitted factors and the holdout error by tier."),
  ...screenshot("06b_eval_calibration.png", "Calibrated cost estimate on unseen films: 48.1% holdout error against a 51.1% baseline."),
];

// Chapter 7
const ch7 = [
  H1("7. Discussion and Limitations"),
  H2("7.1 What the results support"),
  bullet("Script-derived entity counts predict shoot days substantially better than the tier average, both under cross-validation and on films excluded from training, provided the production's scale is represented in the training data."),
  bullet("The deterministic extractor recovers characters, locations and capitalised objects reliably, and its remaining misses fall into identifiable categories."),
  bullet("The hierarchical pipeline works end to end. Every budget line traces back to a scene, a producer can override any line, and every reported number can be reproduced."),
  H2("7.2 What the results do not support"),
  bullet("**Absolute budget totals.** Uncalibrated, the rate card underestimates 90% of the benchmark films. Calibration brings the error on unseen films below the tier average, but at 48.1% it is still far from the 20% target. Totals should be used as a structured starting point for a producer to adjust, not as a forecast."),
  bullet("**Extrapolation.** The model cannot predict a production larger or smaller than anything in its training data."),
  bullet("**Within-tier precision for large films.** Among High-budget films, R² is near zero, so the model cannot separate a 120-day epic from a 200-day one."),
  H2("7.3 Threats to validity"),
  bullet("**Estimated features.** Benchmark entity counts are estimates, not extractor output from real screenplays. The model is trained on estimated counts but, in use, runs on extracted counts, and the two may differ."),
  bullet("**Development-set extraction score.** The extraction corpus and the final rules were developed together."),
  bullet("**Benchmark costing.** The cost errors in Sections 5.5 and 5.6 come from a film-level version of the rate card, because the benchmark films have no screenplays to extract from. The scene-level engine used in the live system has not been scored against reported budgets, and the calibration factors are not applied to it."),
  bullet("**Reported totals.** Trade-reported budgets are rounded and sometimes include marketing. Shoot days mix interview figures and schedule estimates."),
  bullet("**Sample size.** A 40-film holdout leaves wide error bars. Per-tier holdout figures rest on 10 to 18 films each."),
];

// Chapter 8
const ch8 = [
  H1("8. Conclusion and Future Work"),
  H2("8.1 Conclusion"),
  P("This dissertation built and evaluated a system that turns a screenplay into a traceable, department-wise production budget. Its central component, a Random Forest that predicts shoot days from five script-derived counts, cuts error by about a third relative to a tier-average baseline on 40 films it was never trained on. The uncalibrated cost engine is no better than the tier average, but a per-scale calibration fitted on training films brings its error on unseen films to 48.1%, below the 51.1% baseline. The final evaluation also found where the system stops working: the shoot-day model fails when the production's budget tier is absent from training, and cost error remains far above the 20% target. All of these results were produced by the tests the mid-semester examiner asked for, and all of them are reported here."),
  H2("8.2 Future work"),
  numbered("future")("**Calibrating the live engine.** Score the scene-level engine against reported budgets on films whose screenplays are available, and fit its own calibration in the same way as Section 5.6. Star fees, which dominate Indian Above-the-Line budgets and cannot be derived from a script, should become an explicit producer input; they are the main source of the remaining error."),
  numbered("future")("**Blind extraction test.** Have someone who has not seen the extractor label new screenplay excerpts, to obtain an unbiased precision and recall."),
  numbered("future")("**LLM extraction path.** Score the implemented Gemini path on the same corpus and compare it with the deterministic baseline, particularly on lowercase props."),
  numbered("future")("**Real screenplays end to end.** Where full scripts can be obtained, run extraction and prediction on them and compare with the production's actual schedule."),
  numbered("future")("**Interval estimates.** Report a range of shoot days, using the spread of the forest's tree predictions, rather than a single number."),
];

const references = [
  H1("References"),
  ...citeOrder.map((k) => REFS[k]).map((r, i) => new Paragraph({
    spacing: { after: 120, line: 320 },
    indent: { left: 540, hanging: 540 },
    children: [new TextRun(`[${i + 1}]  ${r}`)],
  })),
];

const appendix = [
  H1("Appendix A: Reproducing the Results"),
  P("All commands run from the repository root."),
  table(
    ["Step", "Command"],
    [
      ["Regenerate the 200-film benchmark", "python3 generate_benchmark_films.py"],
      ["Model comparison (Table 5)", "python3 scripts/compare_shoot_day_models.py"],
      ["Holdout and tier shift (Tables 7–9)", "python3 scripts/heldout_generalization.py"],
      ["Cost calibration (Table 12)", "python3 scripts/cost_calibration.py"],
      ["Backend tests (extraction corpus, demo script, holdout, cost figures)", "cd backend && go test ./..."],
      ["Report figures", "python3 final_report/make_figures.py"],
      ["Run the backend", "cd backend && DB_DRIVER=sqlite go run ."],
      ["Run the frontend", "cd frontend && npm run dev   (http://localhost:3000)"],
      ["Scene breakdown for a production", "GET /api/productions/{id}/explainability"],
    ],
    [3800, 5200],
  ),
  tableCaption("Reproduction commands"),
  H1("Appendix B: Validation API Endpoints"),
  P("All endpoints are under /api and require a login token."),
  table(
    ["Method", "Endpoint", "Returns"],
    [
      ["POST", "/scripts/{id}/analyze", "Parses an uploaded screenplay, extracts entities and predicts shoot days"],
      ["POST", "/budget/{id}/quote", "Generates the hierarchical budget from the extracted entities"],
      ["POST", "/productions/{id}/recalculate", "Re-predicts shoot days and regenerates the budget after entity edits"],
      ["GET", "/productions/{id}/explainability", "Per-scene shoot-time breakdown, reconciled to the prediction"],
      ["GET", "/validation/shoot-day-model", "200-film cross-validation results for the four models"],
      ["GET", "/validation/held-out", "40-film holdout and budget-tier shift results"],
      ["GET", "/validation/cost-calibration", "Per-scale rate-card calibration scored on the 40-film holdout"],
      ["GET", "/validation/extraction-test-set", "Live precision and recall on the 12-scene corpus"],
      ["GET", "/validation/confusion-matrix", "Entity-type confusion matrix"],
      ["GET", "/validation/ablation-report", "Feature ablation for the shoot-day model"],
    ],
    [1100, 3500, 4400],
  ),
  tableCaption("Endpoints used in the evaluation and demonstration"),
];

const CHECKLIST = [
  "Is the final report neatly formatted with all the elements required for a technical Report?",
  "Is the Cover page in proper format as given in Annexure A?",
  "Is the Title page (Inner cover page) in proper format?",
  "(a) Is the Certificate from the Supervisor in proper format? (b) Has it been signed by the Supervisor?",
  "Is the Abstract included in the report properly written within one page? Have the technical keywords been specified properly?",
  "Is the title of your report appropriate? The title should be adequately descriptive, precise and must reflect scope of the actual work done. Uncommon abbreviations / Acronyms should not be used in the title.",
  "Have you included the List of abbreviations / Acronyms?",
  "Does the Report contain a summary of the literature survey?",
  "Does the Table of Contents include page numbers? Are the Pages numbered properly? (Ch. 1 should start on Page # 1) Are the Figures numbered properly? (Figure Numbers and Figure Titles should be at the bottom of the figures) Are the Tables numbered properly? (Table Numbers and Table Titles should be at the top of the tables) Are the Captions for the Figures and Tables proper? Are the Appendices numbered properly? Are their titles appropriate?",
  "Is the conclusion of the Report based on discussion of the work?",
  "Are References or Bibliography given at the end of the Report? Have the References been cited properly inside the text of the Report? Are all the references cited in the body of the report?",
  "Is the report format and content according to the guidelines? The report should not be a mere printout of a PowerPoint Presentation, or a user manual. Source code of software need not be included in the report.",
];
const checklist = [
  new Paragraph({ pageBreakBefore: true, children: [] }),
  center("Checklist of Items for the Final Dissertation / Project / Project Work Report", 26, true, 120),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
    children: [new TextRun({ text: "This checklist is attached as the last page of the final report, completed, verified and signed by the student.", italics: true, size: 20 })] }),
  table(["#", "Item", "Yes / No"], CHECKLIST.map((q, i) => [String(i + 1), q, "Yes"]), [500, 7300, 1200]),
  new Paragraph({ spacing: { before: 300, after: 120 }, children: [new TextRun({ text: "Declaration by Student:", bold: true })] }),
  P("I certify that I have properly verified all the items in this checklist and ensure that the report is in proper format as specified in the course handout."),
  new Paragraph({ spacing: { before: 480 }, tabStops: [{ type: TabStopType.LEFT, position: 5000 }],
    children: [new TextRun("Place: Bangalore\tSignature of the Student")] }),
  new Paragraph({ spacing: { before: 160 }, tabStops: [{ type: TabStopType.LEFT, position: 5000 }],
    children: [new TextRun("Date: _______________\tName: Naveen Mupparaju")] }),
  new Paragraph({ spacing: { before: 80 }, tabStops: [{ type: TabStopType.LEFT, position: 5000 }],
    children: [new TextRun("\tID No.: 2024TM93514")] }),
];

const numberingConfig = ["objectives", "extract", "future"].map((ref) => ({
  reference: ref,
  levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 540, hanging: 360 } } } }],
}));

const PAGE_MARGIN = { top: 1440, bottom: 1440, left: 1440, right: 1440 };
const pageFooter = () => new Footer({
  children: [new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ children: ["Page ", PageNumber.CURRENT], size: 20 })],
  })],
});
const runningHeader = () => new Header({
  children: [new Paragraph({
    alignment: AlignmentType.RIGHT,
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "9CA3AF", space: 4 } },
    children: [new TextRun({ text: "Hierarchical Production Cost Estimation for Film Pre-Production | Final Report", size: 18, color: "6B7280" })],
  })],
});

const doc = new Document({
  creator: "Naveen Mupparaju",
  title: "Hierarchical Production Cost Estimation for Film Pre-Production — Final Report",
  features: { updateFields: true },
  styles: {
    default: { document: { run: { font: FONT, size: 24 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 32, bold: true, color: TEAL },
        paragraph: { spacing: { before: 240, after: 240 }, keepNext: true, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 26, bold: true },
        paragraph: { spacing: { before: 280, after: 120 }, keepNext: true, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 24, bold: true, italics: true },
        paragraph: { spacing: { before: 200, after: 100 }, keepNext: true, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] },
      ...numberingConfig,
    ],
  },
  sections: [
    {
      properties: { page: { margin: PAGE_MARGIN } },
      children: [...coverPage, ...titlePage],
    },
    {
      properties: { page: { margin: PAGE_MARGIN, pageNumbers: { start: 1, formatType: NumberFormat.LOWER_ROMAN } } },
      footers: { default: pageFooter() },
      children: [...certificate, ...acknowledgements, ...abstract, ...contents, ...abbreviations],
    },
    {
      properties: { page: { margin: PAGE_MARGIN, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } } },
      headers: { default: runningHeader() },
      footers: { default: pageFooter() },
      children: captionsAboveTables([
        ...ch1, ...ch2, ...ch3, ...ch4, ...ch5, ...ch6, ...ch7, ...ch8, ...references, ...appendix, ...checklist,
      ]),
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUT, buf);
  console.log(`wrote ${OUT} (${tableNo} tables, ${figNo} figures)`);
});
