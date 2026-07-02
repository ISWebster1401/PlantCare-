# 🌱 Explicación: Reconocimiento de Plantas y Generación de Imágenes

## 📋 Flujo Completo de Creación de Planta

### 1️⃣ **Subida de Foto Original** (`POST /api/plants/`)

**Archivo:** `back/app/api/routes/plants.py` → `create_plant()`

```python
# Validación de tipo de archivo
allowed_extensions = {".jpg", ".jpeg", ".png"}
allowed_content_types = {"image/jpeg", "image/jpg", "image/png"}

# Subir a Cloudinary
original_photo_url = upload_image(file.file, folder="plantcare/plants/original")
```

**¿Qué hace?**
- Valida que el archivo sea JPEG/JPG/PNG (por extensión y `content-type`).
- Sube la foto del usuario a **Cloudinary** en la carpeta `plantcare/plants/original`.
- Obtiene una **URL pública permanente** de Cloudinary (ej: `https://res.cloudinary.com/.../plantcare/plants/original/abc123.jpg`).

**Resultado:** `original_photo_url` = URL de Cloudinary de la foto original.

---

### 2️⃣ **Identificación de la Planta con IA** (`identify_plant_with_vision()`)

**Archivo:** `back/app/api/core/openai_config.py` → `identify_plant_with_vision()`

**Modelo usado:** **GPT-4o Vision** (multimodal, puede analizar imágenes)

**Proceso:**

```python
client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": """Eres un experto botánico especializado en identificación precisa de plantas de TODO tipo: suculentas, cactus, plantas de interior, plantas de exterior, árboles, arbustos, hierbas, flores, etc.

IMPORTANTE: Analiza cuidadosamente las características visuales de la planta:
- Forma y disposición de las hojas
- Textura y grosor de las hojas
- Patrones de crecimiento
- Color y forma del tallo
- Presencia de espinas, pelos o estructuras especiales
- Tamaño y forma general de la planta
- Flores, frutos o estructuras reproductivas si están visibles

Identifica el género y especie exacta cuando sea posible. Para plantas comunes, proporciona el nombre común más específico y el nombre científico.

Proporciona la siguiente información en formato JSON:
{
    "plant_type": "nombre común específico y preciso (ej: 'Monstera Deliciosa', 'Ficus Lyrata', 'Pothos Dorado', 'Cactus de Navidad', 'Aloe Vera', 'Crassula Ovata', 'Rosa', 'Lavanda', etc.)",
    "scientific_name": "nombre científico completo con género y especie si es posible (ej: 'Monstera deliciosa', 'Ficus lyrata', 'Epipremnum aureum', 'Echeveria elegans', etc.)",
    "care_level": "Fácil/Medio/Difícil",
    "care_tips": "3-5 tips específicos y detallados de cuidado para esta especie en particular, separados por punto y coma. Incluye frecuencia de riego, tipo de luz, tipo de suelo, y necesidades específicas",
    "optimal_humidity_min": número entre 20-50 (% humedad mínima ideal del suelo para esta especie),
    "optimal_humidity_max": número entre 50-80 (% humedad máxima ideal del suelo para esta especie),
    "optimal_temp_min": número entre 10-20 (°C temperatura mínima que tolera),
    "optimal_temp_max": número entre 20-30 (°C temperatura máxima que tolera)
}"""
                },
                {
                    "type": "image_url",
                    "image_url": {"url": original_photo_url}  # ← La URL de Cloudinary
                }
            ]
        }
    ],
    max_tokens=800
)
```

**¿Qué hace?**
1. Envía la **URL de la imagen** (de Cloudinary) a GPT-4o Vision.
2. El modelo analiza la imagen y devuelve un **JSON** con:
   - `plant_type`: nombre común específico (ej: "Monstera Deliciosa", "Ficus Lyrata", "Cactus de Navidad", "Aloe Vera", "Rosa", "Lavanda", etc.)
   - `scientific_name`: nombre científico completo (ej: "Monstera deliciosa", "Ficus lyrata", "Schlumbergera truncata", "Aloe vera", etc.)
   - `care_level`: dificultad de cuidado (Fácil/Medio/Difícil)
   - `care_tips`: consejos específicos de cuidado para esa especie
   - Rangos óptimos de humedad y temperatura según la especie

**Resultado:** Diccionario Python con toda la información de la planta identificada.

**Nota importante:** El sistema identifica **cualquier tipo de planta** (suculentas, cactus, plantas de interior, plantas de exterior, árboles, arbustos, hierbas, flores, etc.). El prompt incluye ejemplos específicos de suculentas para mejorar la precisión en ese grupo, pero funciona igualmente bien con todos los tipos de plantas.

---

### 3️⃣ **Generación del Personaje con DALL-E 3** (`generate_character_with_dalle()`)

**Archivo:** `back/app/api/core/openai_config.py` → `generate_character_with_dalle()`

**Modelo usado:** **DALL-E 3** (generación de imágenes)

**Proceso:**

```python
prompt = f"""Create an adorable kawaii character mascot based on a {plant_type} plant.
Style: Tamagotchi-like, chibi proportions, big expressive eyes, rounded shapes.
The character should have recognizable features of a {plant_type}.
Current mood: {mood} - {mood_descriptions.get(mood, 'neutral')}.
Character name: {plant_name}.
Art style: Cute, childlike, friendly, pastel colors with vibrant accents.
Background: Simple solid color or subtle gradient."""

response = client.images.generate(
    model="dall-e-3",
    prompt=prompt,
    size="1024x1024",
    quality="standard",
    n=1
)

dalle_url = response.data[0].url  # ← URL temporal de OpenAI
```

**¿Qué hace?**
1. Construye un **prompt detallado** que describe:
   - Estilo: kawaii, tipo Tamagotchi, ojos grandes, formas redondeadas
   - Características de la planta (ej: si es cactus, tiene espinas; si es helecho, tiene hojas)
   - Estado de ánimo actual (happy, sad, thirsty, overwatered, sick)
   - Nombre del personaje
   - Estilo artístico: colores pastel con acentos vibrantes
2. Llama a **DALL-E 3** con ese prompt.
3. DALL-E genera una imagen de **1024x1024px** y devuelve una **URL temporal**.

**Resultado:** `dalle_url` = URL temporal de OpenAI (ej: `https://oaidalleapiprodscus.blob.core.windows.net/...`)

**⚠️ Problema:** Esta URL es **temporal** y puede expirar o dejar de funcionar después de un tiempo.

---

### 4️⃣ **Guardar Personaje en Cloudinary** (`upload_image_from_url()`)

**Archivo:** `back/app/api/core/cloudinary_config.py` → `upload_image_from_url()`

**Proceso:**

```python
# En plants.py, después de generar con DALL-E:
character_url = upload_image_from_url(
    dalle_url, 
    folder="plantcare/plants/characters"
)
```

**¿Qué hace `upload_image_from_url()`?**
1. Toma la **URL temporal de DALL-E**.
2. Cloudinary puede **subir directamente desde una URL remota** (no necesitas descargarla manualmente).
3. Sube la imagen a Cloudinary en la carpeta `plantcare/plants/characters`.
4. Obtiene una **URL permanente de Cloudinary** (ej: `https://res.cloudinary.com/.../plantcare/plants/characters/xyz789.png`).

**Resultado:** `character_url` = URL permanente de Cloudinary del personaje.

---

### 5️⃣ **Guardar Todo en la Base de Datos**

**Archivo:** `back/app/api/routes/plants.py` → `create_plant()`

```python
plant_data_clean = {
    "user_id": current_user["id"],
    "plant_name": plant_name,  # ← Nombre que puso el usuario
    "plant_type": plant_data["plant_type"],  # ← De GPT-4o Vision
    "scientific_name": plant_data["scientific_name"],
    "care_tips": plant_data["care_tips"],
    "original_photo_url": original_photo_url,  # ← Cloudinary
    "character_image_url": character_url,  # ← Cloudinary (permanente)
    "character_mood": "happy",
    "health_status": "healthy",
    "optimal_humidity_min": plant_data["optimal_humidity_min"],
    "optimal_humidity_max": plant_data["optimal_humidity_max"],
    ...
}

# INSERT INTO plants (...)
```

**¿Qué se guarda?**
- **Foto original:** URL de Cloudinary (`original_photo_url`)
- **Personaje generado:** URL de Cloudinary (`character_image_url`) ← **Esta es la que se muestra en las tarjetas**
- Toda la información de identificación y cuidado

---

## 🔄 Resumen del Flujo Completo

```
Usuario sube foto
    ↓
[1] Cloudinary: Sube foto original → original_photo_url
    ↓
[2] GPT-4o Vision: Analiza imagen → plant_data (tipo, cuidados, rangos)
    ↓
[3] DALL-E 3: Genera personaje kawaii → dalle_url (temporal)
    ↓
[4] Cloudinary: Sube personaje desde URL → character_url (permanente)
    ↓
[5] PostgreSQL: Guarda todo en tabla `plants`
    ↓
Frontend: Muestra tarjeta con character_image_url (siempre funciona)
```

---

## 🎨 Por Qué las Imágenes Desaparecían Antes

**Antes:**
- `character_image_url` guardaba la **URL temporal de DALL-E**.
- Esas URLs expiran o dejan de funcionar después de un tiempo.
- Al recargar la página o después de horas, el navegador no podía cargar la imagen → tarjetas en blanco.

**Ahora:**
- `character_image_url` guarda la **URL permanente de Cloudinary**.
- Cloudinary es tu propio almacenamiento, controlado por ti.
- Las imágenes **nunca expiran** y siempre están disponibles.

---

## 📝 Archivos Clave

1. **`back/app/api/routes/plants.py`**
   - `create_plant()`: Orquesta todo el flujo
   - `identify_plant()`: Solo identifica (sin crear)
   - `generate_character()`: Solo genera personaje (sin crear)

2. **`back/app/api/core/openai_config.py`**
   - `identify_plant_with_vision()`: Usa GPT-4o Vision
   - `generate_character_with_dalle()`: Usa DALL-E 3

3. **`back/app/api/core/cloudinary_config.py`**
   - `upload_image()`: Sube archivo binario
   - `upload_image_from_url()`: Sube desde URL remota (nuevo)

---

## 🔧 Configuración Necesaria

**Variables de entorno (`.env`):**
```env
OPENAI_API_KEY=sk-...          # Para GPT-4o Vision y DALL-E 3
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

**Sin estas variables:**
- ❌ No se puede identificar plantas
- ❌ No se pueden generar personajes
- ❌ No se pueden subir imágenes
