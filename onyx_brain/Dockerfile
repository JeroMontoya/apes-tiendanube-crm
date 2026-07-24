# ============================================================
# ONYX BRAIN v23.0 — Dockerfile Optimizado (python:3.11-slim)
# Motor de Inteligencia Analítica para THE BLACK DIAMOND
# ============================================================

FROM python:3.11-slim AS base

# Prevenir escritura de archivos .pyc y forzar stdout/stderr sin buffer
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Instalar dependencias del sistema necesarias para compilar paquetes nativos (numpy/pandas)
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc g++ && \
    rm -rf /var/lib/apt/lists/*

# Copiar e instalar dependencias primero (aprovecha la caché de capas de Docker)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copiar el código fuente del microservicio
COPY . .

# Exponer el puerto estándar de Uvicorn
EXPOSE 8000

# Healthcheck nativo de Docker para orquestadores (Render, Railway, K8s)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Comando de arranque: Uvicorn con workers optimizados
# --workers 2: Suficiente para el tráfico inicial sin saturar la RAM del contenedor free-tier
# --host 0.0.0.0: Escucha en todas las interfaces (requerido por Docker)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
