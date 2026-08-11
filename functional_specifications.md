# Functional Specifications
**Product:** AI-Assisted Film Production ERP Platform  
**Version:** 1.0 (MVP)

---

## 1. Introduction
### 1.1 Purpose
This document defines the functional specifications for the AI-Assisted Film Production ERP Platform. The system aims to automate the pre-production planning process by converting unstructured screenplay text into structured, hierarchical production cost estimates and providing a lifecycle management dashboard for tracking expenses and revenue.

### 1.2 Target Audience
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

### 3.3 Script Analysis Engine (AI Integration)
**Description:** Orchestrates the extraction of production requirements from a screenplay.
- **FR-SCR-01:** The system shall allow the user to upload a screenplay document (Text format in MVP, extensible to PDF/FDX).
- **FR-SCR-02:** The system shall parse the screenplay to identify distinct Scenes and save them to the database.
- **FR-SCR-03:** The system shall transmit the script text to an AI Sidecar powered by Google Gemini 1.5 Flash.
- **FR-SCR-04:** The AI model shall extract production entities classified into specific types: `Character`, `Location`, `Prop`, `Costume`, and `Equipment`.
- **FR-SCR-05:** For each extracted entity, the AI shall estimate the number of mentions and the required "Shoot Days".
- **FR-SCR-06:** The extracted entities shall be presented in a tabular format for user review.

### 3.4 Budget Management Engine
**Description:** Generates and manages the financial estimates for the production.
- **FR-BUD-01 (Bottom-Up Quote):** The system shall generate an automatic budget quote by applying pre-configured rate cards to the AI-extracted entities.
- **FR-BUD-02 (Department Mapping):** The system shall correctly map extracted entities to standard production departments (e.g., Characters -> Cast, Locations -> Locations, Props/Costumes -> Art Department).
- **FR-BUD-03 (Top-Down Allocation):** Alternatively, the system shall allow the user to input a fixed total budget and automatically allocate it across lifecycle stages based on industry-standard percentages for the selected film genre.
- **FR-BUD-04 (Traceability):** Every AI-generated budget line item must maintain a database linkage (`ElementID` and `SceneID`) back to the specific screenplay text that necessitated it.

### 3.5 Expense Tracking
**Description:** Records actual spend against the estimated budget.
- **FR-EXP-01:** The system shall allow users to log an expense by specifying the Amount, Date, Vendor, and Description.
- **FR-EXP-02:** Every logged expense MUST be explicitly linked to an existing Budget Line Item.
- **FR-EXP-03:** Upon logging an expense, the system shall automatically and safely (preventing race conditions) increment the `ActualCost` of the linked Budget Line Item.
- **FR-EXP-04:** The system shall display a chronological ledger of all logged expenses.

### 3.6 Revenue & Rights Management
**Description:** Tracks income streams and computes profitability.
- **FR-REV-01:** The system shall allow the user to record Rights Sales categorized by type (Satellite, Audio, Theatrical, OTT, Overseas).
- **FR-REV-02:** The user can record both "Expected Revenue" (during negotiation) and "Actual Revenue" (upon contract signing).
- **FR-REV-03:** The system shall calculate the "Total Actual Cost" (sum of all expenses).
- **FR-REV-04:** The system shall calculate Projected Profit/Loss (Total Expected Revenue - Total Actual Cost) and Return on Investment (ROI) percentages.

### 3.7 Reporting
**Description:** Generates shareable financial artifacts.
- **FR-REP-01:** The system shall generate a formatted PDF report summarizing the budget.
- **FR-REP-02:** The PDF report must include the Production Title, Total Budget, and a detailed breakdown of each department's Estimated vs Actual costs.

---

## 4. System Workflows

### 4.1 The "Script-to-Budget" Workflow
1. User creates a new Production (e.g., "Blockbuster 2026").
2. User navigates to **Script Analysis** and uploads `script.txt`.
3. System parses scenes and triggers the AI Sidecar.
4. AI extracts `Characters`, `Locations`, and `Props`, returning JSON to the backend.
5. User navigates to **Budget Engine** and clicks "Generate AI Quote".
6. System applies the `rate_cards.json` to the extracted entities and populates the Budget Table.

### 4.2 The "Cost Control" Workflow
1. User reviews the populated Budget Table.
2. During production, user navigates to **Expenses**.
3. User selects a budget line item (e.g., "Location: COFFEE SHOP") from a dropdown and enters an expense of ₹15,000 for "Cafe Rental".
4. System updates the Actual Cost for that line item.
5. User navigates to **Dashboard** and sees the "Total Spent" and "Remaining" figures update in real-time.
