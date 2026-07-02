# 🎨 Guía: Personalización de Personajes (Agregar Accesorios)

## 🎯 Objetivo
Permitir que los usuarios agreguen accesorios a sus personajes de plantas (chupayas, gorros navideños, etc.) sin regenerar la imagen completa con DALL-E.

---

## 💡 Opciones para Personalización

### **Opción 1: Superposición de Imágenes con PIL/Pillow** ⭐ (RECOMENDADA)

**¿Qué es?**
- Usar Python PIL (Pillow) para superponer imágenes de accesorios sobre el personaje base
- El personaje base se genera una vez con DALL-E
- Los accesorios son imágenes PNG con transparencia que se superponen

**Ventajas:**
- ✅ **Económico:** Solo pagas DALL-E una vez por personaje base
- ✅ **Rápido:** Superponer imágenes es instantáneo
- ✅ **Flexible:** Puedes tener muchos accesorios diferentes
- ✅ **Reversible:** Puedes quitar accesorios fácilmente
- ✅ **No requiere regenerar:** No necesitas llamar a DALL-E cada vez

**Desventajas:**
- ⚠️ Necesitas crear/obtener imágenes de accesorios (PNG con transparencia)
- ⚠️ Requiere ajustar posición y tamaño del accesorio

**Implementación:**

```python
from PIL import Image
import requests
from io import BytesIO

def add_accessory_to_character(
    character_url: str,
    accessory_url: str,
    position: str = "top"  # "top", "head", "body", etc.
) -> str:
    """
    Superpone un accesorio sobre el personaje base.
    
    Args:
        character_url: URL del personaje base (Cloudinary)
        accessory_url: URL del accesorio (PNG con transparencia)
        position: Posición del accesorio
    
    Returns:
        str: URL de la imagen resultante en Cloudinary
    """
    # 1. Descargar imagen del personaje
    char_response = requests.get(character_url)
    character_img = Image.open(BytesIO(char_response.content))
    
    # 2. Descargar imagen del accesorio
    acc_response = requests.get(accessory_url)
    accessory_img = Image.open(BytesIO(acc_response.content))
    
    # 3. Redimensionar accesorio si es necesario (ej: 30% del ancho del personaje)
    char_width, char_height = character_img.size
    acc_width = int(char_width * 0.3)  # 30% del ancho
    acc_aspect_ratio = accessory_img.height / accessory_img.width
    acc_height = int(acc_width * acc_aspect_ratio)
    accessory_img = accessory_img.resize((acc_width, acc_height), Image.Resampling.LANCZOS)
    
    # 4. Calcular posición según el tipo
    if position == "top" or position == "head":
        # Centrar en la parte superior
        x = (char_width - acc_width) // 2
        y = int(char_height * 0.1)  # 10% desde arriba
    elif position == "body":
        x = (char_width - acc_width) // 2
        y = int(char_height * 0.4)  # 40% desde arriba
    else:
        x = (char_width - acc_width) // 2
        y = int(char_height * 0.1)
    
    # 5. Superponer accesorio (respetando transparencia)
    character_img.paste(accessory_img, (x, y), accessory_img)
    
    # 6. Subir resultado a Cloudinary
    output_buffer = BytesIO()
    character_img.save(output_buffer, format='PNG')
    output_buffer.seek(0)
    
    result_url = upload_image(output_buffer, folder="plantcare/plants/characters/customized")
    return result_url
```

**Uso:**

```python
# Personaje base (ya generado)
character_url = "https://res.cloudinary.com/.../character_base.png"

# Accesorio (chupaya, gorro navideño, etc.)
accessory_url = "https://res.cloudinary.com/.../accessories/chupaya.png"

# Agregar accesorio
customized_url = add_accessory_to_character(
    character_url=character_url,
    accessory_url=accessory_url,
    position="top"
)

# Guardar nueva URL en DB
# UPDATE plants SET character_image_url = customized_url WHERE id = plant_id
```

---

### **Opción 2: Regenerar con DALL-E Incluyendo Accesorio**

**¿Qué es?**
- Modificar el prompt de DALL-E para incluir el accesorio
- Regenerar la imagen completa con el accesorio incluido

**Ventajas:**
- ✅ **Más realista:** El accesorio se integra perfectamente con el personaje
- ✅ **No necesitas imágenes de accesorios:** DALL-E los genera

**Desventajas:**
- ❌ **Caro:** $0.04 cada vez que agregas/quitas un accesorio
- ❌ **Lento:** 10-30 segundos por regeneración
- ❌ **Inconsistente:** Cada regeneración puede variar el personaje

**Implementación:**

```python
async def generate_character_with_accessory(
    plant_type: str,
    plant_name: str,
    mood: str = "happy",
    accessory: str = None  # "chupaya", "christmas_hat", etc.
) -> str:
    """Genera personaje con accesorio usando DALL-E"""
    
    accessory_prompts = {
        "chupaya": "wearing a traditional Chilean chupaya hat",
        "christmas_hat": "wearing a red and white Christmas hat",
        "sombrero": "wearing a Mexican sombrero",
        "crown": "wearing a small golden crown",
    }
    
    accessory_text = ""
    if accessory and accessory in accessory_prompts:
        accessory_text = f", {accessory_prompts[accessory]}"
    
    prompt = f"""A single, simple, cute kawaii character based on a {plant_type} plant.
Style: Clean, minimal, Tamagotchi-like. Big eyes, rounded shapes, friendly expression.
The character should look like a {plant_type} but as a simple mascot.
Mood: {mood_descriptions.get(mood, 'neutral')}.
Name: {plant_name}.
IMPORTANT: Only ONE character, centered. No duplicates, no multiple characters, just one single character.
Background: Pure white background (#FFFFFF). No colors, no gradients, no decorations, just solid white.
{accessory_text if accessory_text else ""}
The character should be clearly visible against the white background."""
    
    # Llamar a DALL-E...
    dalle_url = await generate_character_with_dalle(...)
    character_url = upload_image_from_url(dalle_url, folder="plantcare/plants/characters")
    return character_url
```

**Costo:** $0.04 por cada cambio de accesorio

---

### **Opción 3: Usar Cloudinary Transformations + Overlays**

**¿Qué es?**
- Usar las transformaciones de Cloudinary para superponer imágenes
- No necesitas descargar/editar imágenes en tu servidor

**Ventajas:**
- ✅ **Rápido:** Transformaciones en la nube
- ✅ **No consume recursos del servidor:** Cloudinary hace el trabajo
- ✅ **URLs dinámicas:** Puedes generar URLs con diferentes accesorios sin guardar múltiples imágenes

**Desventajas:**
- ⚠️ Requiere tener los accesorios como imágenes en Cloudinary
- ⚠️ Menos control sobre posicionamiento preciso

**Implementación:**

```python
def get_character_with_accessory_url(
    character_public_id: str,
    accessory_public_id: str,
    position: str = "top"
) -> str:
    """
    Genera URL de Cloudinary con accesorio superpuesto.
    No modifica la imagen original, solo genera una URL transformada.
    """
    from cloudinary import CloudinaryImage
    
    # URL base del personaje
    base_url = f"https://res.cloudinary.com/{cloud_name}/image/upload"
    
    # Transformaciones
    transformations = [
        {"width": 1024, "height": 1024, "crop": "limit"},
        {
            "overlay": accessory_public_id,  # ID público del accesorio en Cloudinary
            "width": "0.3",  # 30% del ancho
            "x": "0",  # Centrado horizontalmente
            "y": "-0.2",  # 20% desde arriba
            "gravity": "north",  # Anclar al norte (arriba)
        }
    ]
    
    # Construir URL
    url = f"{base_url}/{','.join([str(t) for t in transformations])}/{character_public_id}.png"
    return url
```

**Ejemplo de URL generada:**
```
https://res.cloudinary.com/tu-cloud/image/upload/w_1024,h_1024,c_limit,l_chupaya,w_0.3,x_0,y_-0.2,g_north/v1234567890/plantcare/plants/characters/character_123.png
```

---

## 🎯 Recomendación: Opción 1 (PIL/Pillow) + Opción 3 (Cloudinary)

### **Estrategia Híbrida:**

1. **Generar personaje base** con DALL-E (una vez, $0.04)
2. **Crear biblioteca de accesorios** (chupayas, gorros, etc.) como PNGs con transparencia
3. **Subir accesorios a Cloudinary** en carpeta `plantcare/accessories/`
4. **Cuando usuario selecciona accesorio:**
   - Opción A: Usar PIL para superponer y subir resultado a Cloudinary
   - Opción B: Usar Cloudinary transformations para generar URL dinámica

### **Ventajas de la Estrategia Híbrida:**
- ✅ Económico (solo pagas DALL-E una vez)
- ✅ Rápido (superposición instantánea)
- ✅ Flexible (muchos accesorios posibles)
- ✅ Escalable (puedes agregar más accesorios sin costo adicional)

---

## 📋 Implementación Paso a Paso

### **Paso 1: Crear Biblioteca de Accesorios**

1. **Diseñar accesorios** (o usar recursos gratuitos):
   - Chupaya (sombrero chileno)
   - Gorro navideño
   - Corona
   - Anteojos
   - Etc.

2. **Formato requerido:**
   - PNG con transparencia
   - Tamaño recomendado: 512x512px o 1024x1024px
   - Fondo transparente

3. **Subir a Cloudinary:**
   ```
   plantcare/accessories/chupaya.png
   plantcare/accessories/christmas_hat.png
   plantcare/accessories/crown.png
   ```

### **Paso 2: Crear Endpoint para Agregar Accesorio**

```python
# back/app/api/routes/plants.py

@router.post("/{plant_id}/add-accessory")
async def add_accessory_to_plant(
    plant_id: int,
    accessory_type: str = Form(...),  # "chupaya", "christmas_hat", etc.
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db),
):
    """Agrega un accesorio al personaje de la planta."""
    # 1. Obtener planta
    plant = await get_plant_by_id(db, plant_id, current_user["id"])
    if not plant:
        raise HTTPException(404, "Planta no encontrada")
    
    # 2. Obtener URLs
    character_url = plant["character_image_url"]
    accessory_url = f"https://res.cloudinary.com/{cloud_name}/image/upload/plantcare/accessories/{accessory_type}.png"
    
    # 3. Superponer accesorio
    customized_url = add_accessory_to_character(
        character_url=character_url,
        accessory_url=accessory_url,
        position="top"
    )
    
    # 4. Actualizar en DB
    await db.execute_query(
        "UPDATE plants SET character_image_url = %s WHERE id = %s",
        (customized_url, plant_id)
    )
    
    return {"character_image_url": customized_url}
```

### **Paso 3: Frontend - Selector de Accesorios**

```typescript
// front-react/src/components/PlantAccessories.tsx

const accessories = [
  { id: "chupaya", name: "Chupaya", icon: "🇨🇱" },
  { id: "christmas_hat", name: "Gorro Navideño", icon: "🎄" },
  { id: "crown", name: "Corona", icon: "👑" },
];

const addAccessory = async (plantId: number, accessoryId: string) => {
  const formData = new FormData();
  formData.append("accessory_type", accessoryId);
  
  await api.post(`/plants/${plantId}/add-accessory`, formData);
  // Refrescar planta para mostrar nuevo personaje
};
```

---

## 🎨 Accesorios por Temporada/Fecha

### **Lógica Automática:**

```python
def get_seasonal_accessories() -> List[str]:
    """Retorna accesorios disponibles según la fecha."""
    from datetime import datetime
    
    month = datetime.now().month
    
    accessories = []
    
    # Septiembre (Fiestas Patrias Chile)
    if month == 9:
        accessories.append("chupaya")
    
    # Diciembre (Navidad)
    if month == 12:
        accessories.append("christmas_hat")
    
    # Año Nuevo
    if month == 1:
        accessories.append("party_hat")
    
    # San Valentín
    if month == 2:
        accessories.append("heart_glasses")
    
    return accessories
```

---

## 📊 Comparación de Opciones

| Opción | Costo por Cambio | Velocidad | Calidad | Flexibilidad |
|--------|-----------------|-----------|---------|--------------|
| **PIL/Pillow** | $0.00 | ⚡ Instantáneo | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **DALL-E Regenerate** | $0.04 | 🐌 10-30s | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Cloudinary Transform** | $0.00 | ⚡ Instantáneo | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## ✅ Recomendación Final

**Usar Opción 1 (PIL/Pillow):**
1. Más económico (solo pagas DALL-E una vez)
2. Más rápido (superposición instantánea)
3. Más flexible (puedes tener muchos accesorios)
4. Mejor control sobre posicionamiento

**Próximos pasos:**
1. Modificar prompt de DALL-E para fondo blanco y 1 personaje ✅ (ya hecho)
2. Crear biblioteca de accesorios (PNG con transparencia)
3. Implementar función `add_accessory_to_character` con PIL
4. Crear endpoint `/plants/{id}/add-accessory`
5. Agregar UI en frontend para seleccionar accesorios

---

## 🚀 Código de Ejemplo Completo

Ver archivo: `back/app/api/core/character_customization.py` (por crear)
