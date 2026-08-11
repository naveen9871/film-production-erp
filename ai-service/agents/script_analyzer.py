from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field
from typing import List
import logging
import os

logger = logging.getLogger(__name__)

# Note: We will use a mock or environment variable for the LLM based on user preference later.
# For now, we set up the structure of the agent using LangChain's structured output.

class ProductionElement(BaseModel):
    element_type: str = Field(description="The type of element: Character, Location, Prop, Costume, Equipment")
    name: str = Field(description="Name of the character, location, or prop")
    mentions: int = Field(description="Estimated number of times it appears in the text")
    estimated_days: float = Field(description="Estimated shoot days required")

class ScriptAnalysisResult(BaseModel):
    elements: List[ProductionElement] = Field(description="List of all extracted production elements")

def analyze_script_text(text: str) -> dict:
    """
    Analyzes the script text using Gemini 1.5 Flash to extract entities.
    """
    logger.debug(f"Analyzing script text of length: {len(text)}")
    
    try:
        llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0)
        structured_llm = llm.with_structured_output(ScriptAnalysisResult)
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an expert film producer breaking down a script. Extract Characters, Locations, Props, Costumes, and Equipment. Give reasonable estimates for mentions and shoot days based on the text."),
            ("human", "{text}")
        ])
        
        chain = prompt | structured_llm
        result = chain.invoke({"text": text})
        
        res_dict = result.dict()
        logger.debug(f"Script analysis complete. Extracted {len(res_dict.get('elements', []))} elements.")
        return res_dict
    except Exception as e:
        logger.error(f"Error calling LLM: {e}")
        # Fallback to empty if LLM fails
        return {"elements": []}
