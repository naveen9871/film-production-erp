import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# Simple mock structure for the LangGraph Budget Assistant.
# Once an LLM is chosen, this will be expanded with a StateGraph to handle turns.

MOCK_RESPONSES = {
    "london": "Shooting in London will likely increase your Locations budget by 30% due to higher day rates and permits. Shall I recalculate the Quote with London rates?",
    "sports car": "Replacing the sports car with a standard sedan will save approximately 2 Lakhs on your Equipment/Prop budget. Would you like me to update the line item?"
}

def run_budget_assistant(session_id: str, query: str, budget_context: Dict[str, Any]) -> dict:
    """
    Runs the LangGraph conversational agent to assist with budget scenarios.
    Returns the agent's response and any updated budget state.
    """
    
    # Future: use session_id to retrieve/persist conversation history from a store
    logger.debug(f"Handling budget query for session {session_id}. Query: {query}")
    logger.debug(f"Initial budget context size: {len(budget_context)} keys")
    
    # Simple mock response using a dispatch table
    query_lower = query.lower()
    response = "I'm your AI Budget Assistant. I can help you model 'what-if' scenarios based on your current budget. What would you like to explore?"
    
    for key, mock_response in MOCK_RESPONSES.items():
        if key in query_lower:
            response = mock_response
            break
            
    logger.debug(f"Agent response: {response}")
        
    return {
        "response": response,
        "updated_context": budget_context # Unchanged in mock
    }
