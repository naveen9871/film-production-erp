# Benchmark Dataset Provenance & Data Dictionary

**Dataset:** `benchmark_films.csv` (200 Indian Feature Films)  
**Distribution:** 50 High-Budget (₹100 Cr+), 90 Medium-Budget (₹20–100 Cr), 60 Low-Budget (< ₹20 Cr)  
**Languages:** Hindi (133), Tamil (25), Telugu (17), Malayalam (17), Kannada (4), Marathi (2), plus one Telugu/Kannada and one Malayalam/Hindi co-production.

---

## 1. Field Classification & Provenance Matrix

Every column in `benchmark_films.csv` is explicitly categorized into one of three provenance tiers:
- **[Reported]**: Sourced directly from verifiable public industry reporting (trade publications, box-office registries, producer interviews).
- **[Estimated]**: Researcher-estimated based on production scale and industry standard ratios (used where granular internal accounting ledgers are proprietary).
- **[Derived]**: Computed algorithmically by the platform's models (Random Forest shoot-day predictor, bottom-up rate card engine).

| Column Name | Classification | Source / Methodology |
| :--- | :---: | :--- |
| `film_id` | **System ID** | Sequential identifier (1 to 100). |
| `title` | **[Reported]** | Official release title. |
| `year` | **[Reported]** | Theatrical release year (2008–2024). |
| `language` | **[Reported]** | Primary production language. |
| `genre` | **[Reported]** | Primary genre classification (Action, Drama, Thriller, Comedy, Sci-Fi, Epic). |
| `budget_category` | **[Reported]** | High (≥ ₹100 Cr), Medium (₹20–100 Cr), Low (< ₹20 Cr). |
| `actual_total_cr` | **[Reported]** | Total reported production budget in ₹ Crores (Sacnilk, Bollywood Hungama, Box Office India, Variety). |
| `total_shoot_days` | **[Reported / Estimated]** | Reported from director/crew press interviews where available (e.g., *RRR* 200d, *Baahubali 2* 185d, *Article 15* 32d, *Kalki 2898 AD* 220d, *Gangs of Wasseypur* 80d); estimated from industry shooting schedules for others. |
| `num_characters` | **[Estimated / Script]** | Total speaking and notable background characters across scenes. |
| `num_locations` | **[Estimated / Script]** | Total distinct interior and exterior scene settings. |
| `num_props` | **[Estimated / Script]** | Key action, handheld, and narrative prop count. |
| `num_costumes` | **[Estimated / Script]** | Wardrobe changes across principal and secondary characters. |
| `num_equipment` | **[Estimated / Script]** | Camera, lighting, sound, grip, and rigging units deployed. |
| `actual_*_cr` (Depts) | **[Estimated]** | Calibrated department spend ratios based on standard Indian production economics (Cast ATL 30–50%, VFX 15–35%, Locations 15–25%, Equipment 5–10%, Art 5–10%). Provided for reference since internal ledgers are proprietary. |
| `system_est_total_cr` | **[Derived]** | **True bottom-up rate-card calculation:** Sum of Cast ATL, Locations BTL, Equipment BTL, Art BTL, VFX BTL, and 10% BTL Contingency, computed using predicted shoot days and entity counts. |
| `system_est_*_cr` | **[Derived]** | Departmental line item subtotals computed by `backend/services/cost_estimator.go`. |
| `dept_mape_pct` | **[Derived]** | Absolute Percentage Error: $\frac{\lvert \text{system\_est\_total\_cr} - \text{actual\_total\_cr} \rvert}{\text{actual\_total\_cr}} \times 100\%$. |

---

## 2. Public Sources & Citations

1. **Trade Portals & Box Office Tracking:**
   - *Sacnilk Entertainment Tracking:* Total production budget figures for Telugu, Tamil, Hindi, and Kannada films.
   - *Bollywood Hungama:* Production budget announcements, cast signings, and print & advertising breakdowns.
   - *Box Office India:* Historical production costs and distributor share ledgers (2008–2023).
2. **Press Interviews & Production Logs (Shoot Days):**
   - S.S. Rajamouli on *RRR* and *Baahubali* (200 and 185 shoot days across principal photography).
   - Anubhav Sinha on *Article 15* (Completed in a 32-day continuous schedule in Lucknow).
   - Anurag Kashyap on *Gangs of Wasseypur* (~102 shoot days across two parts in Wasseypur, Varanasi, and Bihar).
   - Prashanth Neel on *KGF: Chapter 2* (~160 days of principal photography).
3. **Film Unions & Rate Card Reference Standards:**
   - Federation of Western India Cine Employees (FWICE) minimum wage scales for technicians and camera crew.
   - Cine & TV Artistes' Association (CINTAA) standard actor day-rate and contract structures.
   - All India Film Employees Confederation (AIFEC) equipment and studio floor day-rental standards.

---

## 3. Methodological Note for Examiners

In previous internal drafts, a synthetic error factor table (`ERRORS`) was utilized to simulate department-level variances. To ensure complete academic integrity and methodological rigor for the final thesis:
1. **The synthetic error factor table has been completely removed.**
2. **The system estimate is 100% computed bottom-up** by evaluating the screenplay entity counts through the frozen Random Forest shoot-day model, looking up department day-rates from `backend/data/rate_cards.json`, applying statutory fringes (Cast 18%, Locations 5%, Equipment 8%, Art 10%), and adding a 10% BTL contingency.
3. System accuracy is evaluated **strictly against reported total budgets (`actual_total_cr`)**. On 200 films the overall MAPE is **59.6%** (High 48.2%, Medium 63.6%, Low 63.0%). A leave-one-out category-mean baseline scores 59.4% (High 49.2%, Medium 53.2%, Low 77.1%). The estimate does not beat the baseline overall: it is 18.3% better on low-budget films, 2.0% better on high, and 19.6% worse on medium. The mid-semester figure of about 9.7% compared system output with researcher-estimated department splits. That comparison is withdrawn.

The film-level costing in `generate_benchmark_films.py` is a calibrated Python version of the rate-card logic, not a call into the Go service. Its scale thresholds match `DeriveProductionScale` in `backend/services/cost_estimator.go` (Large ≥ 150 predicted days, Medium ≥ 60). An earlier version of the script used 120 and 55, which the service never used, and reported 54.1%.

---

## 4. Final-evaluation measurements (mid-semester examiner comments)

The mid-semester comment asked for four things: a larger validation set, better entity-extraction recall, a test on unseen films, and cost checks against actual production records.

**Extraction.** The fixed corpus grew from 2 scenes and 16 labeled entities to 12 scenes and 78 labeled entities. The original two scenes are still in the corpus. On the final deterministic extractor the score is precision 100%, recall 91.0%, F1 95.3%, from 71 true positives, 0 false positives, and 7 false negatives. Mid-semester recall on the small set was 75%.

The extractor changes are dialogue-block character cues, rejection of transition slugs such as `THE FOLLOWING MORNING`, a longer production glossary, and a capitalized action-phrase pass. That pass files role introductions (`JUDGE KRISHNAMURTHY`) as cast and other capitalized objects as props. The seven misses are kept on purpose: Grandmother (sentence-case, no cue), and Kaleidoscope, Anklet, Incense, Textbook, Crate, Projector (lowercase, not in the glossary).

The added scenes and the final rules were written in the same development pass, and the role list was checked against the three sample screenplays in the repo. This is a development-set score. A blind check needs a screenplay excerpt labeled by someone who has not seen the extractor.

**Shoot days, 200 films.** 5-fold cross-validation on all 200, out-of-fold:

| Model | MAE (days) | MAPE | R² |
| :--- | ---: | ---: | ---: |
| Gradient Boosting | 11.50 | 18.4% | 0.894 |
| Random Forest (deployed) | 11.70 | 18.8% | 0.887 |
| Linear Regression | 12.43 | 21.3% | 0.878 |
| Decision Tree | 13.78 | 22.0% | 0.867 |
| Category-mean baseline | 14.96 | 24.5% | 0.840 |

The mid-semester 100-film result was Random Forest MAE 5.20 days, R² 0.980. That number does not survive the larger set. Gradient Boosting is 0.20 days ahead on the full 200. The deployed forest stays the Random Forest fit on the original 100: the margin is small, and selection on the 160-film training split still picks Random Forest.

**Unseen films.** `scripts/heldout_generalization.py` holds out 40 films stratified by budget tier, seed 7 (10 High, 18 Medium, 12 Low), and does not use them to fit the scored model. Scored once: MAE 8.19 days, MAPE 13.9%, R² 0.949, against a category-mean baseline of MAE 12.81 days and MAPE 21.5% (36.1% lower MAE).

The stricter test trains on two tiers and scores the tier left out:

| Trained on | Tested on | MAE (days) | MAPE | R² |
| :--- | :--- | ---: | ---: | ---: |
| Medium+Low | High | 52.73 | 32.6% | −4.084 |
| High+Low | Medium | 13.30 | 21.7% | 0.228 |
| High+Medium | Low | 21.01 | 77.7% | −2.936 |

The model does not extrapolate to a budget scale absent from training. Entity counts for the added 100 films are genre-and-scale estimates with a title-seeded jitter. They are not computed from shoot days. Neither test is a run on screenplays from outside the benchmark.

