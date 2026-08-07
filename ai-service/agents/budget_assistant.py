from typing import Dict, Any

# Simple mock structure for the LangGraph Budget Assistant.
# Once an LLM is chosen, this will be expanded with a StateGraph to handle turns.

def run_budget_assistant(session_id: str, query: str, budget_context: Dict[str, Any]) -> dict:
    """
    Runs the LangGraph conversational agent to assist with budget scenarios.
    Returns the agent's response and any updated budget state.
    """
    
    # Simple mock response
    if "london" in query.lower():
        response = "Shooting in London will likely increase your Locations budget by 30% due to higher day rates and permits. Shall I recalculate the Quote with London rates?"
    elif "sports car" in query.lower():
        response = "Replacing the sports car with a standard sedan will save approximately 2 Lakhs on your Equipment/Prop budget. Would you like me to update the line item?"
    else:
        response = "I'm your AI Budget Assistant. I can help you model 'what-if' scenarios based on your current budget. What would you like to explore?"
        
    return {
        "response": response,
        "updated_context": budget_context # Unchanged in mock
    }
