import os
import pandas as pd
from fastapi import APIRouter
from fastapi.concurrency import run_in_threadpool
from supabase import create_client, Client
from cachetools import TTLCache, cached

router = APIRouter()

# Supabase Client Init
supabase_url = os.environ.get("VITE_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY")

if not supabase_url or not supabase_key:
    print("WARNING: Supabase credentials not found in environment.")

supabase: Client = create_client(supabase_url or "", supabase_key or "")

# Caché en memoria: guarda resultados por 15 minutos (900 segundos) para hasta 100 resultados
competitor_cache = TTLCache(maxsize=100, ttl=900)

def fetch_competitor_data_sync():
    """Función síncrona que hace la llamada de red bloqueante a Supabase."""
    return supabase.table("competitor_price_benchmark").select("*").execute()

@router.get("/competitor-alert")
async def check_competitor_prices():
    """
    Rastrea precios de la competencia en Supabase y alerta si estamos fuera del mercado.
    Implementación ONYX v23.0 usando Pandas, Asincronía y Caché.
    """
    try:
        # Usamos caché de forma manual para manejar correctamente el contexto asíncrono
        # La llave puede ser constante ya que es un fetch global
        cache_key = "global_competitor_data"
        if cache_key in competitor_cache:
            response_data = competitor_cache[cache_key]
        else:
            # Ejecutamos la petición síncrona y pesada en un ThreadPool para no bloquear el hilo principal
            response = await run_in_threadpool(fetch_competitor_data_sync)
            response_data = response.data
            competitor_cache[cache_key] = response_data
            
        if not response_data:
            return {"status": "OPTIMAL", "message": "No hay datos de competencia registrados."}
            
        # El análisis de pandas en memoria es lo suficientemente rápido para el Event Loop, 
        # pero si el DataFrame fuera inmenso, también deberíamos mandarlo al threadpool.
        def analyze_pandas(data):
            df = pd.DataFrame(data)
            alerts = df[df['price_difference_pct'] <= -10.0]
            if not alerts.empty:
                return alerts[['apes_sku', 'apes_product_name', 'apes_price', 'competitor_name', 'competitor_price', 'price_difference_pct']].to_dict('records')
            return None
            
        alert_data = await run_in_threadpool(analyze_pandas, response_data)
        
        if alert_data:
            return {
                "status": "CRITICAL", 
                "action": "Ajustar precios o aumentar valor percibido", 
                "data": alert_data
            }
            
        return {"status": "OPTIMAL", "message": "Precios competitivos."}
    except Exception as e:
        return {"status": "ERROR", "message": f"Fallo al analizar competencia: {str(e)}"}
