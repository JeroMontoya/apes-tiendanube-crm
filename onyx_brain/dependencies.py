import os
from fastapi import Security, HTTPException, status
from fastapi.security.api_key import APIKeyHeader

API_KEY_NAME = "X-ONYX-API-KEY"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

def get_api_key(api_key_header: str = Security(api_key_header)):
    """
    Verifica que la petición contenga el API Key interno válido para comunicarse con ONYX Brain.
    """
    expected_api_key = os.environ.get("ONYX_API_KEY")
    
    if not expected_api_key:
        # En modo estricto, si no hay key configurada en el servidor, bloqueamos todo
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Configuración crítica de seguridad faltante en el servidor (ONYX_API_KEY no definida)."
        )

    if api_key_header == expected_api_key:
        return api_key_header
        
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Acceso Denegado: Credenciales ONYX inválidas."
    )
