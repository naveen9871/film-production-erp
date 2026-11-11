# Final Demo Runbook

Hierarchical Production Cost Estimation for Film Pre-Production. Naveen Mupparaju, 2024TM93514.

Target length is 12–15 minutes of demo, followed by questions. Every number below was produced by the system on 5 November 2026, so if the live screen shows something different, something changed.

---

## 1. Setup (do this 30 minutes before)

Open three terminals at the repo root.

```bash
# Terminal 1: backend on :8080
export PATH="$HOME/.local/go/bin:$PATH"
cd backend && DB_DRIVER=sqlite go run .

# Terminal 2: frontend on :3000
cd frontend && npm run dev

# Terminal 3: kept free for the live checks in section 4
export PATH="$HOME/.local/go/bin:$PATH"
```

Then:

1. Open http://localhost:3000 and log in as `producer` / `password`.
2. In the **Production** dropdown at the top of the sidebar, pick **Fresh Demo Film**. Do the demo there, not on "Blockbuster 2026", which holds seeded sample data.
3. Do one full dry run of section 2, including the upload and the quote. That confirms everything works and leaves the screens populated in case the live upload fails.
4. Keep `demo_script.txt` open in an editor tab so you can show the raw screenplay.
5. Back up the database first (`cp backend/film_erp.db backend/film_erp.db.bak`). The demo writes to it.

---

## 2. Walkthrough

### 2.1 Problem (1 minute, no screen needed)

> "A line producer budgets a film by reading the script and listing every character, location and prop, which takes days per script. The biggest unknown is how many days the shoot will take, because the screenplay never says, yet every day-rate cost depends on it. My system extracts the entities, predicts shoot days with a validated model, and builds a budget in which every line traces back to a scene."

### 2.2 The screenplay (30 seconds)

Show `demo_script.txt`: five scenes, a police drama (police station, Rajan's apartment, Marine Drive, court room, evidence room).

Point out the conventions the extractor uses:
- Scene headings (`INT. COURT ROOM - DAY`).
- Character cues above dialogue (`PRIYA`).
- CAPITALISED objects in action lines (`LEATHER NOTEBOOK`).
- A character introduced in capitals with no dialogue (`JUDGE KRISHNAMURTHY`).

### 2.3 Script Analysis: upload and extraction (3 minutes)

Click **Script Analysis**, choose `demo_script.txt`, and upload.

Expected result: **5 scenes, 35 entities, 38.0 predicted shoot days.**

| Type | Count | What to say |
|---|---|---|
| Character | 6 | PRIYA and RAJAN come from dialogue cues. JUDGE KRISHNAMURTHY, ADVOCATE MEHTA, CONSTABLE RAJ and COURT STENOGRAPHER never speak. They are recognised by the role word in their capitalised introduction. |
| Location | 4 | Taken from the scene headings. POLICE STATION is used twice but counted once. |
| Prop | 19 | From the glossary (Briefcase, Knife, Torch) or capitalised phrases (Leather Notebook, Cctv Footage). |
| Costume | 6 | BLACK ROBES becomes **Robe**: the plural is merged into the costume and not filed as a prop. |
| Equipment | 0 | Correct, because this script names no film equipment. |

The **Est. Days** column is scene-based: the sum of the predicted days of the scenes the entity appears in. PRIYA shows 22 and RAJAN 22.5 because each is in three of the five scenes; POLICE STATION shows 13.5 because it is used twice. The **Category** column shows the cast grade (Lead at 40% or more of the schedule, Supporting at 15% or more).

Talking point:

> "At mid-semester the extractor filed THE FOLLOWING MORNING as a character and missed a quarter of the entities. Here, no transition line becomes a character and no character becomes a prop. Those were the two failure modes I fixed."

### 2.4 Budget Engine: hierarchical quote (3 minutes)

Click **Budget Engine**, then **⚡ Generate AI Quote**. Uploading a script does not regenerate the budget; this button does.

Expected result: **₹60.6 lakh** total.

| Department | Amount | How it was built |
|---|---|---|
| Cast (ATL) | ₹38.0 lakh | PRIYA and RAJAN are graded **Lead** (in scenes totalling about 22 of 38 days) at ₹15 lakh per film each. The other four are **Supporting** at ₹2 lakh per film each. |
| Locations | ₹19.0 lakh | Charged per day at ₹50,000. Police Station is 13.5 days because it appears in two scenes. All locations add up to 38 days. |
| Art + Wardrobe | ₹1.55 lakh | Charged per item. |
| Contingency | ₹2.06 lakh | 10% of Below-the-Line. |

Show:
1. The ATL/BTL grouping.
2. The **Qty & Unit** column (`/film`, `/day`, `/item`).
3. A line's source scene, which is the traceability point.
4. That a producer can edit any line.

Say this yourself, before the examiner does:

> "₹60 lakh is low for a 38-day film. That is the same result my benchmark found: the rate card underestimates 180 of 200 real films, and the cost total is no better than a tier average. The validated parts are the shoot-day prediction and the extraction. The rate card needs calibrating, and I say that in the report."

### 2.5 Scene breakdown (1 minute, optional, API only)

No page displays this yet, so show it in the browser's network tab or with curl:

```bash
TOKEN=$(curl -s -X POST localhost:8080/api/login -H 'Content-Type: application/json' \
  -d '{"username":"producer","password":"password"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
curl -s localhost:8080/api/productions/2/explainability -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | less
```

Expected per-scene days are 6.8, 6.8, 8.5, 9.1 and 6.8, adding up to the 38-day prediction. The court room scene is heaviest because four characters are on screen. Marine Drive carries the exterior and night multipliers.

The production ID is 2 for "Fresh Demo Film". Check it with `curl -s localhost:8080/api/productions -H "Authorization: Bearer $TOKEN"`.

### 2.6 Evaluation Dashboard (4 minutes): the most important part

Click **Evaluation**.

**Tab "Shoot-Day Prediction"**
- 200-film, 5-fold CV table. Random Forest has MAE 11.70 days and R² 0.887. Gradient Boosting is at 11.50. The category-mean baseline is at 14.96. Random Forest is 21.8% better than the baseline.
- Why Random Forest is deployed despite Gradient Boosting being 0.2 days better: when model selection is repeated on only the 160 training films, Random Forest wins, and the margin is within noise.
- **Held-out panel.** On 40 films never used for training or selection, MAE is **8.19 days against 12.81** for the baseline, a 36% improvement.
- **Tier-shift table.** Training on Medium and Low budgets and testing on High gives R² −4.08. Say: "Trees can't extrapolate. A forest that has never seen a 150-day shoot can't predict one. I report this as a limit on where the model can be used."

**Tab "Extraction Accuracy"**
- The top panel, **Metric 1 (live producer verification)**, reads **0%** until you tick Verify on entities in Scene Builder. That is expected: it scores the live production against the producer's own verification. Scroll past it to Metric 1b, or say: "This one fills in as the producer verifies; the fixed test is below."
- The 12-scene corpus with 78 labelled entities is re-run live on page load: **P 100%, R 91.0%, F1 95.3%** (mid-semester was 92 / 75 on 2 scenes).
- The 7 misses are deliberate: Grandmother (lowercase, no cue) and six lowercase objects outside the glossary. Say: "These are what a rule-based extractor can't see. They're the case for the LLM path."
- Caveat, said unprompted: "I wrote the new scenes and the rules together, so this is a development-set score, not a blind one."

**Tab "Cost Estimation"**
- The mid-semester figure of 9.7% was measured against department splits I estimated myself. The examiner asked for actual records, and the only actual records are reported total budgets. Against those the error is **59.6% MAPE, with the baseline at 59.4%**.
- By tier: High 48.2% against 49.2%, Medium 63.6% against 53.2% (worse), Low 63.0% against 77.1%.
- Scroll to the last panel, **Metric 2c (calibration)**. One factor per production scale, chosen by CV on the 160 training films and scored on the same 40 held-out films as the shoot-day holdout: **48.1% against a 51.1% baseline** (uncalibrated 59.9%). Under 5-fold CV over all 200 films it is 51.9% against 59.8%. Say: "Calibration turns the cost estimate from no better than average into better than average on unseen films. It's still far from 20%, because star fees aren't in the script."
- The top panel (Metric 2, live production) shows "—" for MAPE because no expenses are logged for the demo film. The benchmark panel below it is the one to show.

### 2.7 Reproducibility (1 minute, terminal 3)

```bash
cd backend && go test ./... && cd ..         # extraction corpus, demo script, holdout artifact, explainability
python3 scripts/heldout_generalization.py     # re-runs the 160/40 split; prints MAE 8.19
python3 scripts/cost_calibration.py           # same split; prints holdout MAPE 48.1% vs 51.1%
```

> "Every number in the report has a script or endpoint that regenerates it."

### 2.8 Close (30 seconds)

> "In summary: shoot-day prediction is validated on unseen films and beats the baseline by a third. Extraction recall went from 75 to 91 percent. The raw rate card underestimates; calibrated on training films, it beats the baseline on unseen films, 48 against 51 percent. That's still far from 20 percent, and star fees are the reason."

---

## 3. Likely questions

**Your mid-semester R² was 0.98. Why is it 0.887 now?**
The original 100 films had consistent hand-entered entity counts that tracked shoot days closely. The new 100 have counts from genre-and-tier profiles, independent of shoot days. The error roughly doubled, and the 200-film number is the more realistic one.

**The entity counts in the benchmark aren't from real scripts?**
Correct. Full Indian screenplays aren't public. The extractor (tested on labelled scenes) and the model (tested on benchmark counts) are validated separately. End-to-end testing on real scripts is the first item of future work.

**Why does the holdout score better than cross-validation?**
With 40 films that is sampling variation, so I don't claim it as an improvement. The fair comparison is against the baseline on the same 40 films: 8.19 against 12.81.

**Your uncalibrated cost estimate is no better than the average. What's the contribution?**
The traceable, editable budget structure and the validated shoot-day driver. I measured the rate card's bias (it underestimates 90% of films, worst in the Medium tier) and corrected it with one factor per scale fitted on training films only. On the 40 unseen films that gives 48.1% against 51.1% for the baseline, and the baseline is even given the reported budget tier.

**Isn't calibrating on the benchmark cheating?**
The factors are fitted on the 160 training films and scored once on the 40 held out, the same split as the shoot-day holdout. The method (factor vs power law) was chosen by CV on the training films only. The scale it keys on comes from predicted shoot days, which the system knows before any budget exists.

**Why does the calibrated estimate still underestimate 151 films?**
The factor that minimises percentage error is biased low, because overestimating a small film costs more percentage points than underestimating a large one.

**Is the Budget Engine page calibrated?**
No. The factors were fitted to the film-level benchmark costing. The scene-level engine hasn't been scored against reported budgets, so applying them there would be unvalidated.

**Why is the Medium tier worst?**
Medium films range from ₹12 Cr to ₹100 Cr. Many are predicted under 60 days and land on the Small rate card.

**Why not use Gradient Boosting?**
It's 0.2 days better on one split. Random Forest is chosen when selection uses only training data, and it's more stable. Either is defensible.

**How do you know the extractor generalises?**
I don't, beyond the three sample scripts. A blind test, with scenes labelled by someone who hasn't seen the rules, is planned. I'd rather state that than overclaim.

**What happens when a producer edits an entity?**
The prediction and budget are recalculated from the edited entity set (`POST /productions/{id}/recalculate`), and manually set lines are kept.

**Where is the AI?**
The shoot-day model is the validated ML component. The Gemini extraction path exists but is not scored. I chose the deterministic extractor for the evaluated path because its results are reproducible.

---

## 4. If something breaks

| Problem | Fix |
|---|---|
| Port 8080 or 3000 already in use | `lsof -i :8080` and kill the process, or restart the terminal |
| Login fails | The seed password is `password` unless `SEED_PASSWORD` is set. Check that terminal 1 printed no seed errors. |
| Upload shows 0 entities | Make sure the `.txt` file was uploaded, not a PDF. Re-upload `demo_script.txt`. |
| Budget is empty | Click **Generate AI Quote**. Uploading does not create the budget. |
| Evaluation tab spins | The backend is down. Check terminal 1. |
| Anything else live | Switch to the screens from the dry run and say "here's the same run from this morning". |
| Database in a bad state | `cp backend/film_erp.db.bak backend/film_erp.db` and restart the backend |

---

## 5. Screenshots for report Chapter 6

The report already embeds current screenshots from `final_report/screenshots/`: Executive Summary, Script Analysis, Scene Builder, Budget Engine, the two halves of the Shoot-Day tab, the Metric 1b extraction panels and the Cost tab. They were taken from a fresh copy of the database after uploading `demo_script.txt` and clicking Generate AI Quote, so a live run should show the same numbers.
