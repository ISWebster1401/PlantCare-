import psycopg2
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# Configuración de la base de datos
DB_CONFIG = {
    'host': 'localhost',
    'user': 'postgres',
    'password': 'postgres',
    'database': 'PlantCare'
}

# Modelos Pydantic
class HumedadData(BaseModel):
    humedad: float = Field(..., description="Valor de humedad del suelo")

class DatoHumedad(BaseModel):
    id: int
    valor: float
    fecha: str

class MensajeRespuesta(BaseModel):
    mensaje: str

# Función para conectar a la base de datos
def get_db_connection():
    """
    Crea y devuelve una conexión a la base de datos PostgreSQL
    """
    try:
        return psycopg2.connect(**DB_CONFIG)
    except psycopg2.Error as err:
        raise Exception(f"Error al conectar a la base de datos: {err}")

def guardar_humedad_db(dato: HumedadData) -> MensajeRespuesta:
    """
    Guarda un valor de humedad en la base de datos
    
    Args:
        dato: Objeto con el valor de humedad a guardar
        
    Returns:
        Mensaje de confirmación
        
    Raises:
        Exception: Si ocurre un error al guardar en la BD
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT INTO sensor_humedad_suelo (valor) VALUES (%s)", (dato.humedad,))
        conn.commit()
        return {"mensaje": "Dato guardado correctamente"}
    except Exception as e:
        if conn:
            conn.rollback()
        raise Exception(f"Error al guardar datos: {str(e)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def leer_humedad_db() -> List[DatoHumedad]:
    """
    Lee los últimos 20 registros de humedad de la base de datos
    
    Returns:
        Lista de los últimos 20 registros ordenados por fecha descendente
        
    Raises:
        Exception: Si ocurre un error al leer de la BD
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, valor, fecha FROM sensor_humedad_suelo ORDER BY fecha DESC LIMIT 20")
        datos = cursor.fetchall()
        
        # Convertir a lista de diccionarios
        resultados = [
            {"id": r[0], "valor": r[1], "fecha": r[2].strftime("%Y-%m-%d %H:%M:%S")} 
            for r in datos
        ]
        
        return resultados
    except Exception as e:
        raise Exception(f"Error al leer datos: {str(e)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()