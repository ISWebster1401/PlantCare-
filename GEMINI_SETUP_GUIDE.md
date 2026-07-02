# 🚀 Guía: Configuración de Google Imagen (Vertex AI)

## 📋 Resumen

Hemos migrado de DALL-E a **Google Imagen** para generar personajes de plantas. Google Imagen ofrece:
- ✅ **Tier gratuito:** 100 imágenes/día con Imagen 3
- ✅ **Mejor calidad:** Estilo 3D/Pixar-like como solicitaste
- ✅ **Más económico:** $0.03 por imagen (vs $0.04 de DALL-E)

---

## 🎯 Paso 1: Crear Proyecto en Google Cloud

1. **Ir a Google Cloud Console:**
   - https://console.cloud.google.com/

2. **Crear un nuevo proyecto:**
   - Click en "Select a project" → "New Project"
   - Nombre: `plantcare-ai` (o el que prefieras)
   - Click "Create"

3. **Habilitar APIs necesarias:**
   - Vertex AI API
   - Imagen API (si está disponible como servicio separado)

---

## 🔑 Paso 2: Configurar Autenticación

### Opción A: Service Account (Recomendado para producción)

1. **Crear Service Account:**
   - Ir a "IAM & Admin" → "Service Accounts"
   - Click "Create Service Account"
   - Nombre: `plantcare-imagen`
   - Rol: `Vertex AI User` o `AI Platform Developer`

2. **Crear clave JSON:**
   - Click en el service account creado
   - Tab "Keys" → "Add Key" → "Create new key"
   - Tipo: JSON
   - Descargar el archivo JSON

3. **Configurar variable de entorno:**
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/ruta/al/archivo.json"
   ```
   
   O en tu `.env`:
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=/ruta/al/archivo.json
   ```

### Opción B: gcloud CLI (Para desarrollo local)

1. **Instalar gcloud CLI:**
   ```bash
   # macOS
   brew install google-cloud-sdk
   
   # Linux
   curl https://sdk.cloud.google.com | bash
   ```

2. **Autenticarse:**
   ```bash
   gcloud auth login
   gcloud config set project TU_PROJECT_ID
   gcloud auth application-default login
   ```

---

## 💰 Paso 3: Configurar Facturación (Opcional para tier gratuito)

**Nota:** El tier gratuito de 100 imágenes/día NO requiere facturación activa.

Si quieres más imágenes:
1. Ir a "Billing" en Google Cloud Console
2. Agregar método de pago
3. Configurar alertas de presupuesto

**Precios:**
- **Imagen 3:** $0.03 por imagen (después del tier gratuito)
- **Imagen 4 Fast:** $0.02 por imagen
- **Imagen 4 Standard:** $0.04 por imagen

---

## 🔧 Paso 4: Configurar Variables de Entorno

Agregar a tu `.env`:

```env
# Google Cloud / Vertex AI
GOOGLE_APPLICATION_CREDENTIALS=/ruta/al/service-account.json
GEMINI_IMAGE_MODEL=imagegeneration@006  # Imagen 3 (más económico)
# O usar: imagen-4-fast-generate-001 para Imagen 4 Fast
```

**Nota:** `GEMINI_API_KEY` no es necesario para Vertex AI, solo para Gemini API (que es diferente).

---

## 🧪 Paso 5: Probar la Configuración

```python
# Test rápido
from app.api.core.gemini_config import generate_character_with_gemini

result = await generate_character_with_gemini(
    plant_type="Manto de Eva",
    plant_name="Test",
    mood="happy"
)
print(f"Imagen generada: {result}")
```

---

## 📝 Paso 6: Actualizar Código (Ya hecho ✅)

El código ya está actualizado para usar Google Imagen:
- ✅ `back/app/api/core/gemini_config.py` - Función de generación
- ✅ `back/app/api/routes/plants.py` - Endpoint actualizado
- ✅ `back/app/api/core/config.py` - Variables de entorno
- ✅ `back/requirements.txt` - Dependencias agregadas

---

## 🎨 Cómo Funciona el Prompt Dinámico

El sistema ahora:
1. **Detecta el tipo de planta** (ej: "Manto de Eva", "Monstera Deliciosa")
2. **Busca características** en la base de datos de plantas
3. **Construye el prompt** dinámicamente:

**Ejemplo para "Manto de Eva":**
```
Personaje original inspirado en una planta 'Manto de Eva' 
(hojas grandes, textura suave, curvas orgánicas), 
cuerpo hecho de hojas superpuestas como capas de tela verde, 
ojos grandes y expresivos integrados en el centro de una hoja principal, 
pequeñas venas foliares visibles, 
postura amistosa, iluminación suave de invernadero, 
fondo desenfocado con plantas, alta calidad, mucho detalle, 
estilo ilustración 3D / Pixar-like, colores naturales, 
sin texto, sin marcas de agua.
```

**Ejemplo para "Monstera Deliciosa":**
```
Personaje original inspirado en una planta 'Monstera Deliciosa' 
(hojas grandes con agujeros característicos, forma de corazón), 
cuerpo formado por hojas perforadas superpuestas, 
ojos grandes y expresivos integrados en el centro de una hoja principal, 
venas prominentes y agujeros naturales (fenestraciones), 
postura amistosa, iluminación suave de invernadero, 
fondo desenfocado con plantas, alta calidad, mucho detalle, 
estilo ilustración 3D / Pixar-like, colores naturales, 
sin texto, sin marcas de agua.
```

---

## 🗄️ Base de Datos de Plantas

El sistema tiene una base de datos de características por tipo de planta en `gemini_config.py`:

```python
plant_db = {
    "manto de eva": {
        "leaves_description": "hojas grandes, textura suave, curvas orgánicas",
        "structure": "cuerpo hecho de hojas superpuestas como capas de tela verde",
        "details": "pequeñas venas foliares visibles",
    },
    "monstera": {...},
    "cactus": {...},
    # etc.
}
```

**Para agregar más plantas:**
1. Editar `get_plant_characteristics()` en `gemini_config.py`
2. Agregar entrada en `plant_db` con características específicas

---

## ⚠️ Troubleshooting

### Error: "No se encontraron credenciales"
**Solución:** Configurar `GOOGLE_APPLICATION_CREDENTIALS` o usar `gcloud auth application-default login`

### Error: "Permission denied"
**Solución:** Verificar que el service account tenga rol `Vertex AI User`

### Error: "API not enabled"
**Solución:** Habilitar Vertex AI API en Google Cloud Console

### Error: "Quota exceeded"
**Solución:** Has excedido el tier gratuito (100 imágenes/día). Esperar o activar facturación.

---

## 💡 Alternativa: Usar API Key Simple (Si Vertex AI es muy complejo)

Si Vertex AI es demasiado complejo, podemos usar una alternativa más simple:

1. **Replicate API** (tiene modelos de imagen, algunos gratuitos)
2. **Stability AI** (Stable Diffusion, tiene tier gratuito)
3. **Hugging Face Inference API** (algunos modelos gratuitos)

Pero **Google Imagen es la mejor opción** por calidad y precio.

---

## 📊 Comparación de Costos

| Servicio | Tier Gratuito | Precio por Imagen | Calidad |
|----------|--------------|-------------------|---------|
| **Google Imagen 3** | 100/día | $0.03 | ⭐⭐⭐⭐⭐ |
| **DALL-E 3** | 0 | $0.04 | ⭐⭐⭐⭐ |
| **Imagen 4 Fast** | 100/día | $0.02 | ⭐⭐⭐⭐⭐ |
| **Imagen 4 Standard** | 10-50/día | $0.04 | ⭐⭐⭐⭐⭐ |

**Recomendación:** Usar **Imagen 3** para empezar (100 gratis/día, $0.03 después).

---

## ✅ Checklist de Configuración

- [ ] Proyecto creado en Google Cloud
- [ ] Vertex AI API habilitada
- [ ] Service Account creado con rol `Vertex AI User`
- [ ] Clave JSON descargada
- [ ] `GOOGLE_APPLICATION_CREDENTIALS` configurado
- [ ] `GEMINI_IMAGE_MODEL` configurado en `.env`
- [ ] Dependencias instaladas (`pip install -r requirements.txt`)
- [ ] Prueba exitosa de generación

---

## 🚀 Siguiente Paso: Modelo 3D

Como mencionaste, la imagen generada será usada para crear un modelo 3D después. Algunas opciones:

1. **Blender + Python** (gratis, pero requiere trabajo)
2. **Three.js** (para web, gratis)
3. **Unity/Unreal** (gratis para desarrollo, requiere licencia para comercial)
4. **API de generación 3D** (como Luma AI, pero de pago)

¿Quieres que investigue opciones para el modelo 3D?
