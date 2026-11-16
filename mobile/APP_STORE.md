# Publicar PlantCare en el App Store

La app ya está adaptada a las reglas de revisión de Apple. Este archivo es lo
que falta hacer a mano (cosas que dependen de la cuenta de desarrollador o de
decisiones de negocio) y los textos para pegar en App Store Connect.

## Antes de enviar: lo que nadie puede hacer por ti

1. **Cuenta Apple Developer** (US$99/año) activa.
2. **Backend arriba durante toda la revisión.** El revisor abre la app y, si el
   servidor no responde, rechaza (guía 2.1). Hoy Supabase gratis se pausa a la
   semana sin uso: hay que pasarlo a Pro antes de enviar. Comprobar con
   `curl https://plantcare-production-af3a.up.railway.app/health` → `healthy`.
3. **Cuenta de prueba para el revisor.** Crearla desde la app (Crear Cuenta),
   agregarle 1 o 2 plantas para que no vea todo vacío, y anotar el correo y la
   contraseña en "Sign-in information" de App Store Connect.
4. **Nombre en la tienda.** Los nombres son únicos en todo el App Store y
   "PlantCare" casi seguro está tomado. Tener una alternativa, por ejemplo
   "GoPlantCare" o "PlantCare: tu jardín". El nombre bajo el ícono puede seguir
   siendo PlantCare.
5. **Bundle ID.** Si `com.plantcare.mobile` ya lo registró otro equipo, cambiar
   `ios.bundleIdentifier` en `app.json` (por ejemplo `com.goplantcare.app`)
   antes del primer build. Después del primer envío ya no se puede cambiar.
6. **Capturas de pantalla** de iPhone 6.9" (1320 × 2868 px), mínimo 3. Como
   `supportsTablet` es `false`, no se piden capturas de iPad.
7. **Decidir el nombre "Pokédex".** Es marca registrada de Nintendo/The Pokémon
   Company. Dentro de la app el riesgo es bajo pero existe (guía 5.2.1); en el
   nombre, subtítulo, descripción o palabras clave de la tienda **no usarlo**.
   Lo más seguro es renombrar la pestaña a "Herbario" o "Colección".
8. **Revisar las páginas legales** (`web/privacidad.html`, `web/terminos.html`,
   `web/soporte.html`): usan el correo `plantcaare@gmail.com` como contacto y no
   nombran una razón social. Ajustar si corresponde.

## Enviar

```bash
cd ~/dev/plantCare-/mobile
eas build -p ios --profile production     # pide iniciar sesión en Apple y crea certificados
eas submit -p ios --latest                # sube el build a App Store Connect / TestFlight
```

`eas submit` crea la ficha de la app en App Store Connect la primera vez. Luego,
en App Store Connect: completar la ficha con los textos de abajo, elegir el
build y apretar "Submit for Review".

## Textos para App Store Connect

**Subtítulo (30):** Cuida tus plantas jugando

**Categoría:** Lifestyle (secundaria: Entertainment)

**Descripción:**

> Convierte tus plantas en personajes y cuídalas de verdad.
>
> Toma una foto de tu planta: PlantCare identifica la especie y le da vida como
> un personaje 3D. Si la riegas a tiempo está feliz; si la olvidas, se marchita.
>
> • Identificación de especies con una foto
> • Personaje 3D con ánimo según cómo la cuidas
> • Recordatorio diario de riego
> • Rachas y logros por ser constante
> • Tienda de accesorios que se ganan con puntos del juego
> • Ranking entre amigos
> • Conversa con tu planta por chat o por voz

**Palabras clave (100):** plantas,riego,jardín,cuidado,recordatorio,identificar,suculentas,cactus,jardinería,hogar

**URL de soporte:** https://goplantcare.com/soporte
**URL de marketing:** https://goplantcare.com
**URL de política de privacidad:** https://goplantcare.com/privacidad

**Notas para el revisor (App Review Information → Notes):**

> PlantCare requires an account because every feature (the user's plants,
> watering history, streaks, friends ranking) is tied to the account. A demo
> account is provided above.
>
> - Plant identification, chat and voice call use OpenAI. The app asks for
>   explicit consent before the first use (guideline 5.1.2(i)).
> - The in-app store only uses points earned by playing. There are no purchases
>   with real money and no digital goods are sold.
> - Account deletion: Profile → Configuración → Cuenta → Eliminar mi cuenta.
> - The microphone is only used during the voice call with a plant, started
>   from a plant's screen.
> - The app does not use any external hardware.

## Privacidad de la app (App Privacy → "nutrition labels")

Tracking: **No**. Datos recogidos, todos **vinculados al usuario** y con
propósito **App Functionality** únicamente:

| Tipo de dato | Qué es |
|---|---|
| Contact Info → Name, Email Address | Registro |
| User Content → Photos or Videos | Fotos de las plantas |
| User Content → Audio Data | Llamada de voz |
| User Content → Other User Content | Mensajes del chat, nombres de plantas |
| Identifiers → User ID | Id de la cuenta |

## Otras respuestas del formulario

- **Cifrado (export compliance):** ya declarado en `app.json`
  (`ITSAppUsesNonExemptEncryption: false`); no vuelve a preguntar.
- **Clasificación por edad:** responder con honestidad el cuestionario; la app
  incluye un asistente de IA generativa (chat y voz) y no tiene contenido
  restringido, compras ni publicidad.
- **Contenido de terceros / publicidad (IDFA):** No.
- **Inicio de sesión con terceros:** no hay (se quitó Google para no tener que
  ofrecer "Sign in with Apple", guía 4.8).

## Qué se adaptó en el código (para saber qué no deshacer)

- `app.json`: textos de permisos de cámara, fotos y micrófono; manifiesto de
  privacidad; declaración de cifrado; `supportsTablet: false`.
- Login: sin botón de Google.
- Registro: entra directo a la app y enlaza Términos y Privacidad (ya no deja al
  usuario esperando un código de correo).
- Configuración: enlaces reales a Privacidad, Términos y Soporte, y botón
  **Eliminar mi cuenta**, que borra de verdad en el backend (`DELETE /auth/me`).
- Consentimiento de IA antes del primer escaneo, chat o llamada
  (`services/aiConsent.ts`).
- Pestaña "Dispositivos" oculta: solo mostraba "Próximamente", motivo de rechazo.
