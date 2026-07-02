# ⚡ Quick Start: Migración a Supabase Storage

## 🚀 Pasos Rápidos (5 minutos)

### 1. Crear Proyecto Supabase
1. Ir a https://supabase.com/
2. Crear cuenta / Iniciar sesión
3. Click "New Project"
4. Nombre: `plantcare`
5. Contraseña DB: (guárdala)
6. Región: Más cercana
7. Click "Create" y esperar 2-3 min

### 2. Crear Bucket
1. Dashboard → "Storage" (menú lateral)
2. Click "New bucket"
3. Nombre: `plantcare`
4. ✅ **Público:** Sí (marcar checkbox)
5. Click "Create bucket"

### 3. Obtener Credenciales
1. Dashboard → "Settings" → "API"
2. Copiar:
   - **Project URL:** `https://xxxxx.supabase.co`
   - **service_role key:** (la clave secreta, NO anon key)

### 4. Configurar `.env`
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # service_role key
SUPABASE_STORAGE_BUCKET=plantcare
```

### 5. Instalar Dependencias
```bash
cd back
pip install supabase
```

### 6. Probar
```bash
# Reiniciar servidor
python -m uvicorn app.main:app --reload
```

Deberías ver en los logs:
```
✅ Supabase Storage configurado: https://xxxxx.supabase.co
   Bucket: plantcare
✅ Cliente de Supabase inicializado correctamente
```

---

## ✅ Listo!

Ahora todas las imágenes se subirán a Supabase Storage en lugar de Cloudinary.

**Estructura en Supabase:**
```
plantcare/                    (bucket)
├── plants/
│   ├── original/             (fotos originales)
│   └── renders/              (renders 3D)
└── accessories/              (accesorios)
```

---

## 🔍 Verificar que Funciona

1. **Subir una planta** desde el frontend
2. **Verificar en Supabase Dashboard:**
   - Storage → `plantcare` bucket
   - Deberías ver la imagen en `plants/original/`
3. **Verificar URL pública:**
   - La URL debería ser: `https://xxxxx.supabase.co/storage/v1/object/public/plantcare/...`
   - Debería abrir la imagen en el navegador

---

## ❌ Si Algo Falla

### Error: "Supabase no está configurado"
- Verifica que `.env` tenga `SUPABASE_URL` y `SUPABASE_KEY`
- Reinicia el servidor después de cambiar `.env`

### Error: "Bucket not found"
- Verifica que el bucket `plantcare` existe en Supabase
- Verifica que `SUPABASE_STORAGE_BUCKET=plantcare` en `.env`

### Error: "Permission denied"
- Verifica que usas la **service_role key**, no la anon key
- Verifica que el bucket es **público** (para lectura)

### Error: "Module 'supabase' not found"
```bash
pip install supabase
```

---

## 📚 Documentación Completa

Ver `SUPABASE_MIGRATION_GUIDE.md` para detalles completos.
