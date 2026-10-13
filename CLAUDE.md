# PlantCare

App de cuidado de plantas gamificada. Escaneas una planta con la cámara, la IA
la identifica y se convierte en un personaje 3D que cuidas: si la riegas está
feliz, si la abandonas se marchita. Hay rachas, logros, una tienda de accesorios
y un ranking entre amigos.

No es un proyecto de curso: es un emprendimiento con socio e inversión. Hay
reunión de avances los lunes.

Sebastián (el dueño) escribe en español de Chile, informal. Respóndele igual.

## ⚠️ Nunca trabajar dentro de ~/Documents

El repositorio **tiene que vivir fuera de iCloud Drive**. La ruta canónica es:

```
~/dev/plantCare-
```

`~/Documents` está sincronizado con iCloud y eso rompe cosas de forma difícil de
diagnosticar: Metro y watchman se cuelgan con `EDEADLK` (errno 35), los binds de
Docker fallan, y git se corrompe. Ya pasó: en octubre de 2026 iCloud borró la
copia que estaba en `~/Documents/GitHub` y el proyecto se recuperó solo porque
existía este clon aparte.

Si alguien pide clonar el proyecto, clonar a `~/dev/`, nunca a `~/Documents`.

## Estructura

| Carpeta | Qué es |
|---|---|
| `back/` | API FastAPI + pgdbtoolkit. Lo único que se mantiene activo |
| `mobile/` | La app: Expo SDK 54 / React Native, se prueba en Expo Go en iPhone |
| `front-react/`, `front/` | Webs antiguas, sin mantención |
| `tools/` | Utilidades sueltas |

## Levantar el entorno

```bash
# Backend (Postgres y Redis van en docker-compose)
cd ~/dev/plantCare-/back && docker-compose up -d

# App móvil. Esto lo corre Sebastián, no el agente: necesita ver el QR
cd ~/dev/plantCare-/mobile && npm start
```

El teléfono tiene que estar en la misma WiFi que el notebook. `mobile/constants/Config.ts`
deduce la IP del backend desde el host al que Metro ya conectó el teléfono, así
que no hay que configurar IPs a mano. La variable `EXPO_PUBLIC_API_URL` la
sobrescribe cuando exista un backend público.

Verificar que el backend responde: `curl http://localhost:8000/health`

## Cosas que cuestan descubrir

**pgdbtoolkit devuelve DataFrames de pandas.** Eso trae dos trampas que ya
costaron bugs:
- `NaT is not None` es `True`. Para fechas usar `pd.isna()`, no `is not None`.
- `order_by` espera lista de tuplas: `[("created_at", "DESC")]`. Pasar el string
  `"created_at DESC"` hace que itere sus caracteres y reviente.

**FastAPI resuelve rutas en orden de declaración.** Las rutas literales van
ANTES que las de parámetro, o `/plants/accessories` entra como `plant_id` y
devuelve 422.

**Los modelos 3D de meshy.ai vienen solo con geometría**: sin materiales, sin
normales, sin UVs y sin cara. `Model3DViewer.tsx` los pinta, les calcula las
normales y les dibuja ojos y boca proceduralmente. Por eso el visor controla por
completo la apariencia del personaje.

**En el visor rota el modelo, no la cámara.** Los accesorios se agregan como
hijos del modelo para heredar escala y rotación.

**Las notificaciones push no funcionan en Expo Go** desde SDK 53. Las locales sí,
y son las que se usan. Una notificación local lleva su texto fijo desde que se
agenda, así que el recordatorio se reprograma cada vez que se abre el jardín.

**Expo Go solo abre proyectos propios** desde mayo de 2026. Para que otra persona
pruebe la app hay que agregarla a la organización de Expo, o repartir un APK.

**Supabase en plan gratis se pausa tras una semana sin actividad.** Despertarlo
antes de cualquier demo. Deja de pasar cuando haya un backend hospedado
consultándolo a diario.

**Verificar tipos antes de cada demo**: `cd mobile && npx tsc --noEmit`. Varios
bugs vivieron meses porque los tipos del front decían una cosa y la API devolvía
otra, y nadie corría el chequeo.

## Decisiones de diseño y su razón

**El estado de salud se calcula al leer**, no se guarda (`back/app/api/core/health.py`).
Así una planta se marchita sola con los días sin necesidad de un proceso en
segundo plano que se pueda quedar atrasado. El intervalo entre riegos depende del
tipo: un cactus aguanta 14 días, un helecho 3.

Esa función prefiere la humedad real del suelo si existe lectura de sensor, y
solo cae a la estimación por días cuando no hay. El sensor físico lo está
fabricando un amigo de Sebastián; cuando empiece a reportar `soil_moisture`
toma el control sin que haya que reescribir nada.

**Los accesorios de la tienda son geometría procedural**, no un `.glb` por
accesorio. Con 6 accesorios y 15 especies, modelarlos daría 90 archivos, y
permitir combinaciones daría cientos. Como hijos del modelo son 6 objetos.

**Los tres ánimos (healthy / warning / critical) se dibujan sobre el mismo
modelo**: cambian color del cuerpo, párpados, brillo del ojo, cejas, boca y
postura. Tener un `.glb` por ánimo sería 3× descarga, y variantes generadas por
separado en meshy se ven como plantas distintas, no como la misma en otro ánimo.

**El visor mide el perfil de anchura del modelo por altura** para dimensionar los
accesorios. Usar el ancho máximo le ponía a un peral un sombrero del porte de su
base. Las anclas (`faceY`, `headY`, `scarfY`) se pueden ajustar por archivo
`.glb` en `ANCHOR_OVERRIDES`.

**Una amistad es una sola fila**, no dos espejo: dos filas se desincronizan en
cuanto una se pierda. Las consultas miran las dos direcciones.

**El saldo de la tienda es puntos ganados menos gastados**, sin contador aparte
que se pueda desincronizar.

## Dónde está cada cosa

| Qué | Archivo |
|---|---|
| Salud de la planta | `back/app/api/core/health.py` |
| Rachas | `back/app/api/core/streaks.py` |
| Logros | `back/app/api/core/achievements.py` |
| Amigos y ranking | `back/app/api/core/friends.py` |
| Tienda | `back/app/api/routes/store.py` |
| Visor 3D, cara y accesorios | `mobile/components/Model3DViewer.tsx` |
| Recordatorios de riego | `mobile/services/notifications.ts` |
| Paleta (tema Herbario) | `mobile/constants/DesignSystem.ts` |
| Guía de despliegue | `back/DEPLOY.md` |

## Infraestructura

- **Supabase** `PlantCare-v2` (`axahnwmfguujxkelmolu`, `sa-east-1`): base de
  datos, fotos de plantas y modelos 3D. Plan gratis. El proyecto viejo
  (`aqjmqemjfvzgmllceiks`) murió por pausa prolongada; no usarlo.
- **Dominio** `goplantcare.com` en GoDaddy. El plan es `api.goplantcare.com`
  para el backend.
- **Railway**: `plantcare-production-af3a.up.railway.app`. Ver estado abajo.
- Redis está en `docker-compose` y en el código, pero **ningún endpoint lo
  consulta**. No hace falta desplegarlo.

## Estado al 12 de octubre de 2026

Funcionando en local: escaneo e identificación, personaje 3D con cara y ánimos,
riego, rachas, 11 logros, tienda con accesorios y colores de ojos, ranking de
amigos, recordatorios locales, llamada de voz con la planta.

**Bloqueado**: el deploy en Railway responde **502 "Application failed to
respond"**. El build pasa y el servicio aparece Online, pero el proxy no alcanza
la app. Las dos causas probables, sin confirmar porque faltan los logs de
runtime:
1. El puerto del dominio generado no coincide con donde escucha uvicorn. El
   `Dockerfile` usa `${PORT:-8000}`; si Railway no inyecta `PORT`, la app queda
   en 8000 y el dominio apunta a otro puerto. Se arregla agregando `PORT=8080`
   a las variables.
2. La app crashea al arrancar por una variable mal pegada.

Para avanzar hace falta el log de **Deployments → View logs → Deploy** y buscar
la línea `Uvicorn running on http://0.0.0.0:XXXX`.

La base de datos ya está migrada a Supabase: 10 usuarios reales, 12 plantas, 9
modelos 3D, y los riegos, logros, items, rachas y la amistad. Quedaron fuera 100
cuentas `testuser*@loadtest.com` de una prueba de carga antigua, que no tenían
ningún dato asociado.

Pendiente tras el primer arranque contra Supabase: 7 filas de
`pokedex_user_unlocks`, documentadas en `back/DEPLOY.md`, que no se pudieron
migrar antes porque referencian el catálogo que siembra el backend.

## Al trabajar en este repositorio

Sebastián pidió **commitear y pushear cada cambio a `origin main`**, sin
preguntar cada vez.

El repositorio es **público**: nunca commitear `.env`, claves ni tokens.
