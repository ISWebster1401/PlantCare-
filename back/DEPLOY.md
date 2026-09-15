# Desplegar el backend

La base de datos ya vive en Supabase (proyecto `PlantCare-v2`,
`axahnwmfguujxkelmolu`, región `sa-east-1`), junto con las fotos y los modelos
3D que ya se servían desde ahí. El contenedor de FastAPI es lo único que falta
hospedar.

Redis no se incluye a propósito: está inicializado en el código pero ninguna
ruta lo consulta, así que desplegarlo sería pagar por un servicio que nadie usa.

## Variables de entorno

Se pegan en la interfaz de Railway (Variables → Raw Editor). Los valores con
`←` los tienes que completar tú; ninguno debe quedar escrito en el repositorio.

```
# Base de datos: Supabase → Project Settings → Database → Connection info
DB_HOST=db.axahnwmfguujxkelmolu.supabase.co
DB_PORT=5432
DB_USER=postgres
DB_DATABASE=postgres
DB_PASSWORD=          ← la contraseña que pusiste al crear el proyecto Supabase

# Almacenamiento de fotos y modelos 3D (ya en uso)
SUPABASE_URL=https://axahnwmfguujxkelmolu.supabase.co
SUPABASE_KEY=         ← service_role, en Project Settings → API
SUPABASE_BUCKET=plantcare

# Identificación de plantas y llamada de voz
OPENAI_API_KEY=       ← tu clave de OpenAI
PLANT_ID_PROVIDER=openai

# Sesiones. Genera uno nuevo para producción, distinto al de desarrollo:
#   python3 -c "import secrets; print(secrets.token_urlsafe(48))"
SECRET_KEY=           ←

# Correos de verificación
SENDGRID_API_KEY=     ← si quieres que el registro envíe correos
```

Si no tienes a mano la contraseña de la base, Supabase permite generar una nueva
en Project Settings → Database → Reset database password.

## Pasos

1. **Railway** → New Project → Deploy from GitHub repo → `PlantCare-`
2. En Settings del servicio, **Root Directory: `back`**. Sin esto intenta
   construir el repositorio completo, que incluye la app móvil.
3. Pegar las variables de arriba.
4. Railway entrega una URL tipo `plantcare-production.up.railway.app`.
   Comprobar que responde antes de tocar el dominio:
   `curl https://<esa-url>/health`
5. **Dominio**: en Railway, Settings → Networking → Custom Domain →
   `api.goplantcare.com`. Railway entrega un destino CNAME.
6. **GoDaddy** → DNS → Add Record → tipo `CNAME`, nombre `api`, valor el que
   entregó Railway.
7. **La app móvil**: definir `EXPO_PUBLIC_API_URL=https://api.goplantcare.com/api`.
   Sin esa variable la app deduce la IP de la red local, que es el
   comportamiento correcto para desarrollo.

## Al primer arranque

El backend crea las tablas que falten y siembra el catálogo de la pokédex (100
plantas). El resto de los datos ya está migrado.

Después del primer arranque quedan pendientes 7 filas de `pokedex_user_unlocks`,
que no se pudieron migrar antes porque apuntan al catálogo:

```sql
INSERT INTO public.pokedex_user_unlocks (id, user_id, catalog_entry_id, discovered_photo_url, discovered_at) VALUES
 (1, 5, 12, NULL, '2026-01-13 05:12:55.23259'),
 (3, 5, 1,  NULL, '2026-01-13 06:48:59.186904'),
 (4, 5, 2,  NULL, '2026-01-13 06:48:59.201905'),
 (5, 5, 29, NULL, '2026-01-13 06:48:59.216942'),
 (6, 5, 30, NULL, '2026-01-13 06:48:59.231852'),
 (7, 5, 31, NULL, '2026-01-13 06:48:59.247159'),
 (10, 206, 29, 'https://axahnwmfguujxkelmolu.supabase.co/storage/v1/object/public/plantcare/pokedex/20260724_192359_240f133a.bin?', '2026-07-24 19:24:05.532632');
SELECT setval('public.pokedex_user_unlocks_id_seq', (SELECT max(id) FROM public.pokedex_user_unlocks));
```

## Lo que quedó fuera de la migración

Las 100 cuentas `testuser*@loadtest.com` de una prueba de carga antigua. No
tienen ni una planta, riego ni logro asociado, así que dejarlas fuera no pierde
nada y evita que producción nazca con 100 usuarios falsos inflando cualquier
métrica. Siguen en la base local por si hicieran falta.

## Plan gratis de Supabase

Alcanza de sobra para hoy: 500 MB de base (se usan ~11 MB) y 1 GB de archivos
(~45 MB en modelos 3D).

El límite a vigilar es el tráfico: **5 GB al mes**, y cada modelo 3D pesa unos
6 MB, así que son unas 780 aperturas mensuales. Con el equipo y algunos testers
sobra; con usuarios reales se queda corto y ahí corresponde evaluar el plan Pro.

Un proyecto gratis se pausa tras una semana **sin actividad**. Con el backend
consultando la base a diario eso deja de ocurrir.
