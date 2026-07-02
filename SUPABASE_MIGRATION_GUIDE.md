# 🚀 Guía de Migración: Cloudinary → Supabase Storage

## 📋 Resumen

Hemos migrado completamente de **Cloudinary** a **Supabase Storage** para el almacenamiento de imágenes. Esta guía te ayudará a completar la migración.

---

## ✅ Cambios Realizados

### 1. **Nuevo Módulo: `supabase_storage.py`**
- ✅ Creado módulo completo con funciones equivalentes a Cloudinary
- ✅ `upload_image()` - Sube imágenes binarias
- ✅ `upload_image_from_url()` - Descarga y sube desde URL
- ✅ `delete_image()` - Elimina imágenes
- ✅ `get_public_url()` - Obtiene URLs públicas

### 2. **Configuración Actualizada**
- ✅ Variables de entorno agregadas en `config.py`
- ✅ Validación de configuración en startup
- ✅ `env.example` actualizado

### 3. **Código Actualizado**
- ✅ `plants.py` - Usa Supabase Storage
- ✅ `character_customization.py` - Usa Supabase Storage
- ✅ `main.py` - Inicializa Supabase al startup

---

## 🔧 Paso 1: Configurar Supabase

### 1.1 Crear Proyecto en Supabase

1. **Ir a Supabase:**
   - https://supabase.com/
   - Crear cuenta o iniciar sesión

2. **Crear nuevo proyecto:**
   - Click "New Project"
   - Nombre: `plantcare` (o el que prefieras)
   - Contraseña de base de datos (guardarla)
   - Región: Elegir la más cercana
   - Click "Create new project"

3. **Esperar a que se cree** (2-3 minutos)

### 1.2 Crear Bucket de Storage

1. **Ir a Storage:**
   - En el menú lateral: "Storage"
   - Click "New bucket"

2. **Configurar bucket:**
   - **Name:** `plantcare`
   - **Public bucket:** ✅ **SÍ** (marcar como público para URLs públicas)
   - **File size limit:** 10MB (o el que prefieras)
   - **Allowed MIME types:** `image/jpeg,image/jpg,image/png`
   - Click "Create bucket"

3. **Configurar políticas (si es necesario):**
   - Por defecto, si el bucket es público, las imágenes son accesibles
   - Si necesitas más control, puedes configurar políticas RLS (Row Level Security)

### 1.3 Obtener Credenciales

1. **Ir a Settings → API:**
   - **Project URL:** Copiar (ej: `https://xxxxx.supabase.co`)
   - **Service Role Key:** Copiar (⚠️ **NO usar anon key**, usar **service_role key**)

2. **⚠️ IMPORTANTE:**
   - Usa **Service Role Key** (no anon key)
   - La service_role key tiene permisos completos
   - **NUNCA** expongas esta key en el frontend

---

## 🔑 Paso 2: Configurar Variables de Entorno

Agregar a tu `.env`:

```env
# Configuración de Supabase Storage
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # service_role key
SUPABASE_STORAGE_BUCKET=plantcare
```

**Ejemplo completo:**
```env
SUPABASE_URL=https://abcdefghijklmnop.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjQxMjM0NTY3LCJleHAiOjE5NTY4MTA1Njd9.xxxxx
SUPABASE_STORAGE_BUCKET=plantcare
```

---

## 📦 Paso 3: Instalar Dependencias

```bash
cd back
pip install -r requirements.txt
```

Esto instalará:
- `supabase>=2.0.0` - Cliente de Supabase

---

## 🧪 Paso 4: Probar la Configuración

### 4.1 Verificar Inicialización

Al iniciar el servidor, deberías ver:
```
✅ Supabase Storage configurado: https://xxxxx.supabase.co
   Bucket: plantcare
```

Si ves un warning, verifica las variables de entorno.

### 4.2 Probar Subida de Imagen

Puedes probar manualmente:

```python
from app.api.core.supabase_storage import upload_image
from io import BytesIO

# Crear imagen de prueba
test_image = BytesIO(b"fake image data")
test_image.name = "test.jpg"

# Subir
url = upload_image(test_image, folder="test")
print(f"URL: {url}")
```

---

## 📁 Estructura de Carpetas en Supabase

Las imágenes se organizan así en el bucket:

```
plantcare/
├── plants/
│   ├── original/          # Fotos originales subidas por usuarios
│   ├── renders/            # Renders de modelos 3D
│   └── characters/        # Personajes (si se usan)
├── accessories/            # Accesorios para personalización
│   ├── chupaya.png
│   ├── christmas_hat.png
│   └── ...
└── avatars/                # Avatares de usuarios (si se usan)
```

---

## 🔄 Migración de Imágenes Existentes (Opcional)

Si ya tienes imágenes en Cloudinary y quieres migrarlas:

### Opción A: Migración Manual (Recomendado)

1. **Descargar imágenes de Cloudinary:**
   ```python
   # Script de migración
   import cloudinary
   import requests
   from app.api.core.supabase_storage import upload_image_from_url
   
   # Para cada imagen en Cloudinary
   cloudinary_url = "https://res.cloudinary.com/..."
   supabase_url = upload_image_from_url(cloudinary_url, folder="plants/original")
   ```

2. **Actualizar URLs en base de datos:**
   ```sql
   UPDATE plants 
   SET original_photo_url = 'nueva_url_supabase'
   WHERE original_photo_url LIKE '%cloudinary%';
   ```

### Opción B: Migración Automática

Crear script que:
1. Lista todas las imágenes en Cloudinary
2. Descarga cada una
3. Sube a Supabase
4. Actualiza URLs en DB

---

## ⚠️ Diferencias Clave: Cloudinary vs Supabase

| Característica | Cloudinary | Supabase Storage |
|----------------|------------|------------------|
| **Transformaciones** | ✅ Automáticas (resize, crop, etc.) | ❌ No (necesitas hacerlo antes) |
| **CDN** | ✅ Global | ✅ Global (pero menos optimizado) |
| **Optimización** | ✅ Automática | ❌ Manual |
| **Precio** | 💰 Pago por uso | 💰 Gratis hasta 1GB, luego $0.021/GB |
| **URLs Públicas** | ✅ Automáticas | ✅ Si bucket es público |
| **Control de Acceso** | ✅ Políticas avanzadas | ✅ RLS (Row Level Security) |

### Transformaciones de Imágenes

**Cloudinary:**
```python
# Cloudinary hace transformaciones automáticas
url = "https://res.cloudinary.com/.../w_500,h_500,c_fill/image.jpg"
```

**Supabase:**
```python
# Supabase NO hace transformaciones
# Necesitas procesar la imagen antes de subirla
from PIL import Image
img = Image.open(file)
img = img.resize((500, 500))
# Luego subir
```

**Solución:** Si necesitas transformaciones, procesa las imágenes con PIL antes de subir.

---

## 🐛 Troubleshooting

### Error: "Supabase no está configurado"
**Solución:** Verifica que `SUPABASE_URL` y `SUPABASE_KEY` estén en `.env`

### Error: "Bucket not found"
**Solución:** 
1. Verifica que el bucket existe en Supabase Dashboard
2. Verifica que `SUPABASE_STORAGE_BUCKET` tiene el nombre correcto

### Error: "Permission denied"
**Solución:**
1. Verifica que estás usando **service_role key** (no anon key)
2. Verifica que el bucket es público o que tienes políticas RLS correctas

### Error: "File already exists"
**Solución:** El código ya maneja esto con `upsert: True`, pero si persiste:
- El archivo se sobrescribirá automáticamente
- O cambia el nombre del archivo

### URLs no funcionan
**Solución:**
1. Verifica que el bucket es **público**
2. Verifica que la URL tiene el formato correcto:
   ```
   https://{project_ref}.supabase.co/storage/v1/object/public/{bucket}/{path}
   ```

---

## 📊 Comparación de Costos

### Cloudinary
- **Free tier:** 25GB almacenamiento, 25GB bandwidth/mes
- **Después:** $0.10/GB almacenamiento, $0.10/GB bandwidth

### Supabase
- **Free tier:** 1GB almacenamiento, 2GB bandwidth/mes
- **Pro ($25/mes):** 100GB almacenamiento, 200GB bandwidth
- **Después:** $0.021/GB almacenamiento, $0.09/GB bandwidth

**Para PlantCare:**
- Si tienes < 1GB de imágenes: **Gratis** ✅
- Si tienes 1-100GB: **$25/mes** (Supabase Pro)
- Si tienes > 100GB: Comparar con Cloudinary

---

## ✅ Checklist de Migración

- [ ] Proyecto creado en Supabase
- [ ] Bucket `plantcare` creado y configurado como público
- [ ] Service Role Key obtenida
- [ ] Variables de entorno configuradas en `.env`
- [ ] Dependencias instaladas (`pip install -r requirements.txt`)
- [ ] Servidor inicia sin errores
- [ ] Probar subida de imagen funciona
- [ ] URLs públicas funcionan
- [ ] (Opcional) Migrar imágenes existentes de Cloudinary

---

## 🚀 Siguiente Paso

Una vez configurado, el sistema usará Supabase Storage automáticamente para:
- ✅ Fotos originales de plantas
- ✅ Renders de modelos 3D
- ✅ Accesorios de personalización
- ✅ Avatares de usuarios (si se implementan)

**¡La migración está completa!** 🎉
