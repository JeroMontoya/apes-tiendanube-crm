import os
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Dependencia de seguridad (API Key)
from dependencies import get_api_key

# Import routers
from routers.competitor_spy import router as competitor_router
from routers.generative_insights import router as insights_router

# Load environment variables
load_dotenv()

app = FastAPI(
    title="ONYX AI Brain",
    description="Microservicio de Inteligencia Analítica para THE BLACK DIAMOND",
    version="23.0.0"
)

# Configuración estricta de CORS para permitir solicitudes del dashboard de React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # En producción, restringir al dominio exacto de Vercel
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar Módulos / Routers con Blindaje de Seguridad (API Key Requerida)
app.include_router(
    competitor_router, 
    prefix="/api/v1/intelligence",
    dependencies=[Depends(get_api_key)]
)
app.include_router(
    insights_router, 
    prefix="/api/v1/intelligence",
    dependencies=[Depends(get_api_key)]
)

@app.get("/health")
def health_check():
    """Ruta pública para verificar que el contenedor está vivo (sin API key requerida)"""
    return {"status": "ONLINE", "module": "ONYX_BRAIN_V23", "message": "Neural pathways active."}
