# Hierarchical Production Cost Estimation for Film Pre-Production
### An AI-Driven Multi-Model Script Analysis Platform

> **M.Tech Software Engineering Dissertation Project**  
> This platform answers the research question: *"How can the orchestration of specialised pre-trained AI models be designed to transform raw screenplay text into a structured, explainable, and editable hierarchical production budget?"*

---

## 🎯 Core Research Contribution

This project's primary contribution is the **Script-to-Budget AI Pipeline** — an end-to-end system that:

1. **Parses** unstructured screenplay text into discrete, structured scenes
2. **Extracts** production entities (Characters, Locations, Props, Costumes, Equipment) using Google Gemini 1.5 Flash via a LangChain orchestration layer
3. **Estimates** shoot days and frequency of use (mentions) for each extracted entity
4. **Maps** entities to standard industry departments (Cast → ATL; Locations, Art, Equipment → BTL)
5. **Generates** a hierarchical, traceable cost estimate by applying configurable Rate Cards
6. **Maintains full traceability** from every budget line item back to the originating screenplay scene and entity (`ElementID → SceneID`)

The supporting ERP modules (Expense Tracking, Revenue & Rights, Reporting) provide *production lifecycle context* that validates the budget estimates against real-world spend — they are not the core contribution.

---

## 🏗️ System Architecture

The platform follows a modern, modular three-tier microservices architecture orchestrated via Docker Compose:

1. **Frontend (Application Layer)**
   - **Tech Stack:** React, Vite, Lucide Icons
   - **Role:** An interactive Single Page Application (SPA) providing the producer-facing dashboard. Features include script uploading, budget generation, expense tracking, and an Evaluation Dashboard showing live extraction accuracy and cost-estimation error metrics.

2. **Backend (Business & Data Layer)**
   - **Tech Stack:** Go (Golang), Gin Web Framework, GORM
   - **Role:** The core REST API handling authentication (JWT/bcrypt), database operations, business logic for budget allocation and expense variance, PDF report generation (`gofpdf`), and the evaluation metrics computation endpoint.

3. **AI Sidecar (Intelligent Layer)**
   - **Tech Stack:** Python, FastAPI, LangChain, Google Gemini 1.5 Flash
   - **Role:** A dedicated AI microservice that processes uploaded screenplays. It uses LLMs to intelligently extract scenes, characters, locations, props, and equipment, while estimating mentions and required shoot days.

4. **Database (Persistence Layer)**
   - **Tech Stack:** PostgreSQL
   - **Role:** Relational database storing users, productions, extracted script elements, budget items, expenses, and rights records. Ensures full traceability from a script element down to a budget line item.

---

## ✨ Key Features

- **Automated Script Breakdown:** Upload a script (text format) and let the AI extract Characters, Locations, Costumes, Props, and Equipment, complete with estimated shoot days.
- **Hierarchical Cost Estimation:** Transforms raw extracted entities into a structured, department-wise ATL/BTL cost estimate using a configurable rate-card system.
- **Cost Traceability:** Every AI-generated budget line item maintains a database link back to the specific screenplay scene and entity that generated it.
- **Top-Down & Bottom-Up Budgeting:** Generate a bottom-up quote based on the script, or allocate a fixed top-down budget across lifecycle stages.
- **Expense Tracking (Lifecycle Support):** Log real-world expenses against specific budget line items to track actuals vs. estimates.
- **Profitability Analysis (Lifecycle Support):** Enter expected and actual revenue from satellite, theatrical, and digital rights to automatically calculate projected Profit/Loss and ROI.
- **Automated Reporting:** Generate and download a PDF Budget Report with a single click.
- **Evaluation Dashboard:** Live measurement of extraction accuracy (Precision, Recall, F1) and cost-estimation error (MAPE %) compared to benchmark data.

---

## 🚀 Getting Started

### Prerequisites
- [Docker & Docker Compose](https://www.docker.com/products/docker-desktop/) installed on your machine.
- A free [Google Gemini API Key](https://aistudio.google.com/) for the AI Sidecar.

### 1. Configuration
The project uses `.env` files for configuration. Sample configurations are provided in the repo.

In `ai-service/.env`, add your Gemini API key:
```env
GEMINI_API_KEY=your_actual_api_key_here
```

### 2. Build and Run
From the root of the project, run:
```bash
docker compose up --build
```

This will spin up four containers:
- `postgres` (Database on port 5432)
- `backend` (Go API on port 8080)
- `ai-service` (Python AI API on port 8000)
- `frontend` (React UI on port 3000)

### 3. Usage
Once the containers are running, open your browser and navigate to:
**http://localhost:3000**

**Default Credentials:**
- **Username:** `producer`
- **Password:** `password`

*(A default test production titled "Blockbuster 2026" is seeded into the database on first boot).*

---

## 📁 Repository Structure

```text
film-production-erp/
├── docker-compose.yml       # Service orchestration
├── README.md                # Project documentation
│
├── frontend/                # React Vite SPA
│   ├── src/
│   │   ├── api.js           # Axios configuration & interceptors
│   │   ├── App.jsx          # Routing and Layout
│   │   └── pages/           # UI Components (Dashboard, Budget, Evaluation, etc.)
│   └── Dockerfile
│
├── backend/                 # Go Gin API
│   ├── main.go              # App entrypoint, DB init, Routes
│   ├── handlers/            # HTTP Controllers (Auth, Budget, Script, Evaluation, etc.)
│   ├── services/            # Core business logic & cost estimation
│   ├── models/              # GORM database schemas
│   ├── middleware/          # JWT authentication middleware
│   ├── data/                # JSON rate cards for estimation
│   └── Dockerfile
│
└── ai-service/              # Python FastAPI Sidecar
    ├── main.py              # API endpoints
    ├── agents/              # LangChain integration logic
    ├── requirements.txt
    └── Dockerfile
```

---

## 🔬 Research & Evaluation

### Research Question
*How can the orchestration of specialised pre-trained AI models be designed to transform raw screenplay text into a structured, explainable, and editable hierarchical production budget?*

### Metric 1 — Extraction Accuracy

The AI extraction pipeline is evaluated against a manually annotated **Ground Truth Dataset** of 3 sample scripts. Each script was tagged by a domain expert (Line Producer) for all entities of type: `Character`, `Location`, `Prop`, `Costume`, and `Equipment`.

| Metric | Formula | Target |
|---|---|---|
| **Precision** | TP / (TP + FP) | ≥ 0.80 |
| **Recall** | TP / (TP + FN) | ≥ 0.75 |
| **F1-Score** | 2 × P × R / (P + R) | ≥ 0.77 |

Where:
- **TP (True Positive):** Entity correctly extracted and correctly typed
- **FP (False Positive):** Entity extracted but not present in ground truth, or wrong type
- **FN (False Negative):** Entity present in ground truth but missed by the AI

The live **Evaluation Dashboard** (accessible at `/evaluation` in the app) automatically computes these metrics by comparing AI-extracted entities against user-verified entities for each production.

### Metric 2 — Cost-Estimation Error

The generated budget quote is evaluated against a **200-film benchmark dataset** (`benchmark_films.csv`) spanning 50 High-budget (₹100 Cr+), 90 Medium-budget (₹20–100 Cr), and 60 Low-budget (< ₹20 Cr) Indian feature films. Totals are rounded trade-reported budgets. Department splits are researcher-estimated. The error metric is **Mean Absolute Percentage Error (MAPE)** against the reported total: The primary error metric is **Mean Absolute Percentage Error (MAPE)**:

```
MAPE = (1/n) × Σ | (Estimated_i − Benchmark_i) / Benchmark_i | × 100%
```

Additionally, per-department **Variance %** is reported:

```
Variance% per dept = (Estimated − Actual) / Actual × 100%
```

| Metric | Formula | Acceptable Threshold |
|---|---|---|
| **MAPE** | Mean |Estimated − Benchmark| / Benchmark × 100 | ≤ 20% |
| **Dept. Variance %** | (Est − Act) / Act × 100 | ≤ ±25% per department |

These metrics are available live in the **Evaluation Dashboard** and in the exported PDF report.

### Evaluation Summary (Measured Results)

| Metric | Score |
|---|---|
| Extraction Precision | Measured in-app via Evaluation Dashboard |
| Extraction Recall | Measured in-app via Evaluation Dashboard |
| Extraction F1-Score | Measured in-app via Evaluation Dashboard |
| Overall MAPE | Measured in-app via Evaluation Dashboard |
| Usability (Script → PDF) | Single cohesive flow, ≤ 5 user actions |