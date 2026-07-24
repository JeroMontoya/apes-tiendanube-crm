import os
from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI

router = APIRouter()

class MarketingData(BaseModel):
    roas: float
    ga4_sessions: int
    cart_abandonment_rate: float

def generate_insights_sync(data: MarketingData, llm, prompt: str):
    """Llamada bloqueante a la API del LLM."""
    response = llm.invoke(prompt)
    return response.content if hasattr(response, 'content') else str(response)

@router.post("/generate-action-plan")
async def generate_action_plan(data: MarketingData):
    """
    Toma métricas frías y usa IA para generar directivas de negocio estoicas (LangChain).
    Implementación Asíncrona para no bloquear el Event Loop.
    """
    # Detect available LLM based on Env Vars
    openai_key = os.environ.get("OPENAI_API_KEY")
    gemini_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("VITE_GEMINI_API_KEY")

    if openai_key:
        llm = ChatOpenAI(temperature=0.2, model_name="gpt-4o")
        model_name = "OpenAI"
    elif gemini_key:
        os.environ["GOOGLE_API_KEY"] = gemini_key
        llm = ChatGoogleGenerativeAI(temperature=0.2, model="gemini-1.5-pro")
        model_name = "Gemini"
    else:
        raise HTTPException(status_code=500, detail="No LLM API keys configured (OpenAI or Gemini)")

    prompt = f"""
    Eres el estratega ONYX. Actúas con frialdad y lógica.
    Métricas actuales de la corporación: 
    - ROAS: {data.roas}
    - Sesiones: {data.ga4_sessions}
    - Abandono de Carrito: {data.cart_abandonment_rate}%
    
    Genera un plan de acción de 3 pasos directos, sin excusas y altamente accionable, para mejorar la conversión hoy.
    Formato: Devuelve únicamente los 3 puntos en viñetas Markdown.
    """
    
    try:
        # Ejecutamos la petición de red a la API de IA en un thread pool
        plan = await run_in_threadpool(generate_insights_sync, data, llm, prompt)
        return {"action_plan": plan, "model_used": model_name}
    except Exception as e:
        return {"error": f"LLM Generation failed: {str(e)}"}
