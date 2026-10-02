# Functional Specifications
**Product:** AI-Assisted Film Production ERP Platform  
**Version:** 1.0 (MVP)

---

## 1. Introduction
### 1.1 Purpose
This document defines the functional specifications for the AI-Assisted Film Production ERP Platform. The system automates the pre-production planning process by converting unstructured screenplay text into structured, hierarchical production cost estimates. Supporting modules for expense tracking, revenue management, and reporting provide production lifecycle context that allows generated estimates to be validated against real-world actuals.

### 1.2 Scope Clarification
The **core research contribution** of this system is the **Script-to-Budget AI Pipeline** (modules 3.3 and 3.4). All other modules (3.5–3.7) serve as *Production Lifecycle Support* — they exist to validate and contextualise the core estimates, not as independent contributions.

| Module | Classification | Thesis Relevance |
|---|---|---|
| 3.3 Script Analysis Engine | **Core Contribution** | AI entity extraction, the primary AI research component |
| 3.4 Budget Management Engine | **Core Contribution** | Hierarchical cost estimation from extracted entities |
| 3.5 Expense Tracking | Lifecycle Support | Provides actuals to measure cost-estimation accuracy |
| 3.6 Revenue & Rights Management | Lifecycle Support | Provides profitability context for budget decisions |
| 3.7 Reporting | Lifecycle Support | Delivers the final artefact (PDF budget) to producers |
| 3.8 Evaluation Dashboard | **Core Contribution** | Formalised accuracy measurement (Precision, Recall, MAPE) |

### 1.3 Target Audience
Film Producers, Line Producers, Production Managers, and Independent Filmmakers.

---

## 2. User Roles & Access

| Role | Description | Access Level |
|---|---|---|
| **Producer (Primary User)** | The main decision-maker managing the financial lifecycle of the film. | Full read/write access to all modules for their assigned productions. |
| **System Admin** | Manages system-wide configurations such as global rate cards. | Backend configuration access (via database/config files). |

*Note: The MVP currently supports a single "Producer" persona via JWT authentication.*

---

## 3. Core Functional Modules

### 3.1 Authentication & Authorization
**Description:** Secures access to the ERP platform.
- **FR-AUTH-01:** The system shall authenticate users via a secure login form requiring a Username and Password.
- **FR-AUTH-02:** Passwords must be securely hashed in the database using bcrypt.
- **FR-AUTH-03:** Upon successful authentication, the system shall issue a JWT (JSON Web Token) valid for 24 hours.
- **FR-AUTH-04:** All subsequent API requests to protected routes must include the JWT in the `Authorization` header.

### 3.2 Dashboard & Executive Summary
**Description:** Provides an at-a-glance view of the production's financial health.
- **FR-DASH-01:** The dashboard shall display the "Total Estimated Budget" aggregated from all active budget line items.
- **FR-DASH-02:** The dashboard shall display the "Total Spent" aggregated from all verified expenses.
- **FR-DASH-03:** The system shall calculate and display the "Remaining Budget" (Estimated - Spent).
- **FR-DASH-04:** The system shall visually flag cost overruns (e.g., displaying the "Total Spent" in red if it exceeds the "Total Estimated Budget").

---

### [CORE] 3.3 Script Analysis Engine (AI Integration)
**Description:** Orchestrates the extraction of production requirements from a screenplay. This is the primary AI research component of the dissertation.

- **FR-SCR-01:** The system shall allow the user to upload a screenplay document (Text format in MVP, extensible to PDF/FDX).
- **FR-SCR-02:** The system shall parse the screenplay to identify distinct Scenes and save them to the database.
- **FR-SCR-03:** The system shall transmit the script text to an AI Sidecar powered by Google Gemini 1.5 Flash via LangChain structured output.
- **FR-SCR-04:** The AI model shall extract production entities classified into the following five canonical types: `Character`, `Location`, `Prop`, `Costume`, and `Equipment`.
- **FR-SCR-05:** For each extracted entity, the AI shall estimate:
  - `mentions`: The number of times the entity appears or is referenced in the screenplay.
  - `estimatedDays`: The estimated number of shoot days the entity requires.
- **FR-SCR-06:** The extracted entities shall be presented in a tabular format for user review.
- **FR-SCR-07:** Users shall be able to edit, correct, or remove any AI-extracted entity to improve accuracy.
- **FR-SCR-08:** The system shall support script versioning. Re-uploading a script generates a new version and computes a diff report (scenes added, removed, modified; elements added, removed).

### [CORE] 3.4 Budget Management Engine
**Description:** Generates and manages the hierarchical financial estimates for the production from AI-extracted entities.

- **FR-BUD-01 (Bottom-Up Quote):** The system shall generate an automatic budget quote by applying pre-configured rate cards to the AI-extracted entities.
- **FR-BUD-02 (Department Mapping):** The system shall correctly map extracted entity types to standard production departments:
  - `Character` → **Cast** (ATL)
  - `Location` → **Locations** (BTL)
  - `Prop`, `Costume` → **Art Department** (BTL)
  - `Equipment` → **Camera/Electrical** (BTL)
- **FR-BUD-03 (Hierarchical Structure):** The budget shall be organised hierarchically:
  - **Level 1:** ATL (Above The Line) vs. BTL (Below The Line) sections
  - **Level 2:** Department (Cast, Locations, Art Dept, Camera, etc.)
  - **Level 3:** Individual line items per extracted entity
- **FR-BUD-04 (Top-Down Allocation):** The system shall allow the user to input a fixed total budget and automatically allocate it across lifecycle stages based on industry-standard percentages for the selected film genre.
- **FR-BUD-05 (Traceability):** Every AI-generated budget line item must maintain a database linkage (`ElementID` and `SceneID`) back to the specific screenplay text that necessitated it.
- **FR-BUD-06 (Rate Cards):** The cost estimation formula for each line item is: `EstimatedCost = Quantity × UnitRate × (1 + FringeRate)`, where rate card configuration governs `UnitRate` and `FringeRate`.

---

### [Lifecycle Support] 3.5 Expense Tracking
**Description:** Records actual spend against the estimated budget. Provides the "actuals" data required to measure cost-estimation accuracy (see §3.8).

- **FR-EXP-01:** The system shall allow users to log an expense by specifying the Amount, Date, Vendor, and Description.
- **FR-EXP-02:** Every logged expense MUST be explicitly linked to an existing Budget Line Item.
- **FR-EXP-03:** Upon logging an expense, the system shall automatically and safely (preventing race conditions) increment the `ActualCost` of the linked Budget Line Item.
- **FR-EXP-04:** The system shall display a chronological ledger of all logged expenses.

### [Lifecycle Support] 3.6 Revenue & Rights Management
**Description:** Tracks income streams and computes profitability.

- **FR-REV-01:** The system shall allow the user to record Rights Sales categorized by type (Satellite, Audio, Theatrical, OTT, Overseas).
- **FR-REV-02:** The user can record both "Expected Revenue" (during negotiation) and "Actual Revenue" (upon contract signing).
- **FR-REV-03:** The system shall calculate the "Total Actual Cost" (sum of all expenses).
- **FR-REV-04:** The system shall calculate Projected Profit/Loss (Total Expected Revenue - Total Actual Cost) and Return on Investment (ROI) percentages.

### [Lifecycle Support] 3.7 Reporting
**Description:** Generates shareable financial artifacts.

- **FR-REP-01:** The system shall generate a formatted PDF report summarizing the budget.
- **FR-REP-02:** The PDF report must include the Production Title, Total Budget, and a detailed breakdown of each department's Estimated vs Actual costs.

---

### [CORE] 3.8 Evaluation Dashboard
**Description:** Provides formalised, quantitative measurement of the system's two primary performance objectives — extraction accuracy and cost-estimation error. This module directly addresses the dissertation's evaluation criteria.

#### 3.8.1 Extraction Accuracy Metrics

- **FR-EVAL-01:** The system shall compute **Precision** as the fraction of AI-extracted entities that are correct (i.e., present in the user-verified ground truth):
  ```
  Precision = TP / (TP + FP)
  ```
  where TP = correctly extracted entities (verified by user), FP = wrongly extracted entities (rejected by user).

- **FR-EVAL-02:** The system shall compute **Recall** as the fraction of true entities that were successfully extracted:
  ```
  Recall = TP / (TP + FN)
  ```
  where FN = entities missed by the AI (manually added by user post-analysis).

- **FR-EVAL-03:** The system shall compute **F1-Score** as the harmonic mean of Precision and Recall:
  ```
  F1 = 2 × Precision × Recall / (Precision + Recall)
  ```

- **FR-EVAL-04:** All three metrics shall be computed **per entity type** (Character, Location, Prop, Costume, Equipment) and as an **overall aggregate**.

#### 3.8.2 Cost-Estimation Error Metrics

- **FR-EVAL-05:** The system shall compute the **Mean Absolute Percentage Error (MAPE)** of the estimated budget against actual recorded expenses:
  ```
  MAPE = (1/n) × Σ | (Estimated_i − Actual_i) / Actual_i | × 100%
  ```

- **FR-EVAL-06:** The system shall compute **Variance %** per department:
  ```
  Variance% = (Estimated − Actual) / Actual × 100%
  ```

- **FR-EVAL-07:** The Evaluation Dashboard shall display a visual breakdown by department, colour-coding departments that exceed ±25% variance.

- **FR-EVAL-08:** The evaluation metrics endpoint shall be available at `GET /api/productions/{id}/evaluate`.

---

## 4. System Workflows

### 4.1 The "Script-to-Budget" Workflow (Core Research Flow)
1. User creates a new Production (e.g., "Blockbuster 2026").
2. User navigates to **Script Analysis** and uploads `script.txt`.
3. System parses scenes and triggers the AI Sidecar.
4. AI extracts `Characters`, `Locations`, `Props`, `Costumes`, and `Equipment`, returning JSON to the backend.
5. User reviews extracted entities in the **Scene Builder**, correcting any errors.
6. User navigates to **Budget Engine** and clicks "Generate AI Quote".
7. System applies the `rate_cards.json` to the extracted entities and populates the hierarchical Budget Table (ATL/BTL, by Department).

### 4.2 The "Cost Control" Workflow (Lifecycle Support)
1. User reviews the populated Budget Table.
2. During production, user navigates to **Expenses**.
3. User selects a budget line item (e.g., "Location: COFFEE SHOP") from a dropdown and enters an expense of ₹15,000 for "Cafe Rental".
4. System updates the Actual Cost for that line item.
5. User navigates to **Dashboard** and sees the "Total Spent" and "Remaining" figures update in real-time.

### 4.3 The "Evaluation" Workflow (Research Measurement)
1. User navigates to **Evaluation Dashboard**.
2. System computes Precision, Recall, F1 from the ratio of AI-extracted vs. user-verified entities.
3. System computes MAPE and per-department Variance % from the budget estimates vs. logged actuals.
4. Results are displayed visually with charts and downloadable as part of the PDF report.
