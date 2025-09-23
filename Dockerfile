# Use Python 3.11 oficial como base
FROM python:3.11-slim

# Evitar mensajes interactivos y minimizar tamaño
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1

# Actualizar paquetes e instalar dependencias del sistema necesarias
RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    g++ \
    libffi-dev \
    libssl-dev \
    libjpeg-dev \
    zlib1g-dev \
    libfreetype6-dev \
    libpq-dev \
    git \
    && rm -rf /var/lib/apt/lists/*

# Crear directorio de la app
WORKDIR /app

# Copiar requirements primero para aprovechar cache
COPY requirements.txt .

# Instalar dependencias
RUN pip install --upgrade pip setuptools wheel
RUN pip install -r requirements.txt

# Copiar todo el código
COPY . .

# Puerto que expondrá Cloud Run
ENV PORT 8080

# Entrypoint para FastAPI
#CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
#CMD ["uvicorn", "backend:app", "--host", "0.0.0.0", "--port", "8080"]
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]


