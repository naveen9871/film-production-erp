from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os

from agents.script_analyzer import analyze_script_text
from agents.budget_assistant import run_budget_assistant

app = FastAPI(title="Film ERP AI Sidecar")

class ScriptUpload(BaseModel):
    text: str

class AssistantQuery(BaseModel):
    session_id: str
    query: str
    budget_context: dict

@app.post("/analyze-script")
async def analyze_script(upload: ScriptUpload):
    try:
        # LangChain logic to extract entities
        result = analyze_script_text(upload.text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/budget-assistant")
async def budget_assistant(query: AssistantQuery):
    try:
        # LangGraph logic to update budget based on chat
        result = run_budget_assistant(query.session_id, query.query, query.budget_context)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
