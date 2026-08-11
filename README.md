# AI-Driven Multi-Model Script Analysis and Hierarchical Production Cost Estimation Platform

This repository contains the source code for an AI-assisted Film Production ERP platform. It is designed to automate screenplay analysis, generate hierarchical production cost estimates, and provide a unified dashboard for managing production budgets, expenses, and revenue.

This project was developed as part of an M.Tech Software Engineering dissertation.

## 🏗️ System Architecture

The platform follows a modern, modular three-tier microservices architecture orchestrated via Docker Compose:

1. **Frontend (Application Layer)**
   - **Tech Stack:** React, Vite, Lucide Icons
   - **Role:** An interactive Single Page Application (SPA) providing the producer-facing dashboard. Features include script uploading, budget generation, expense tracking, and profitability analysis.

2. **Backend (Business & Data Layer)**
   - **Tech Stack:** Go (Golang), Gin Web Framework, GORM
   - **Role:** The core REST API handling authentication (JWT/bcrypt), database operations, business logic for budget allocation and expense variance, and PDF report generation (`gofpdf`).

3. **AI Sidecar (Intelligent Layer)**
   - **Tech Stack:** Python, FastAPI, LangChain, Google Gemini 1.5 Flash
   - **Role:** A dedicated AI microservice that processes uploaded screenplays. It uses LLMs to intelligently extract scenes, characters, locations, props, and equipment, while estimating mentions and required shoot days.

4. **Database (Persistence Layer)**
   - **Tech Stack:** PostgreSQL
   - **Role:** Relational database storing users, productions, extracted script elements, budget items, expenses, and rights records. Ensures full traceability from a script element down to a budget line item.

---

## ✨ Key Features

- **Automated Script Breakdown:** Upload a script (text format) and let the AI extract Characters, Locations, Costumes, Props, and Equipment, complete with estimated shoot days.
- **Hierarchical Cost Estimation:** Transforms raw extracted entities into a structured, department-wise cost estimate using a configurable rate-card system.
- **Cost Traceability:** Every AI-generated budget line item maintains a database link back to the specific screenplay scene and entity that generated it.
- **Top-Down & Bottom-Up Budgeting:** Generate a bottom-up quote based on the script, or allocate a fixed top-down budget across lifecycle stages.
- **Expense Tracking:** Log real-world expenses against specific budget line items to track actuals vs. estimates.
- **Profitability Analysis:** Enter expected and actual revenue from satellite, theatrical, and digital rights to automatically calculate projected Profit/Loss and ROI.
- **Automated Reporting:** Generate and download a PDF Budget Report with a single click.

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
│   │   └── pages/           # UI Components (Dashboard, Budget, etc.)
│   └── Dockerfile
│
├── backend/                 # Go Gin API
│   ├── main.go              # App entrypoint, DB init, Routes
│   ├── handlers/            # HTTP Controllers (Auth, Budget, Script, etc.)
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

This platform serves to answer the research question: *How can the orchestration of specialised pre-trained AI models be designed to transform raw screenplay text into a structured, explainable, and editable hierarchical production budget?*

The system's effectiveness can be evaluated against:
1. **Extraction Accuracy:** Precision/Recall of the Gemini-powered entity extraction.
2. **Cost Estimation Error:** Variance between the generated quote and benchmark historical budgets.
3. **Usability:** The ability for producers to seamlessly navigate from a raw script upload to a final PDF budget report in a single cohesive flow.