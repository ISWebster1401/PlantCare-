from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os
import uvicorn
from .api.routes import humedad
from .api.core.database import close_db

#
# Crear aplicación FastAPI
app = FastAPI(
    title="API Sensor de Humedad", 
    description="API para gestionar datos de sensores de humedad del suelo",
    version="1.0.0"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Montar archivos estáticos si existe un directorio 'static'
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

# Incluir routers
app.include_router(humedad.router)

