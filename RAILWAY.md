# Configurar la app en Railway

## Rama que usa Railway

Por defecto Railway suele usar `main`. Si tu proyecto está en `development`, en Railway:

1. Entra a tu **proyecto** → **Settings** (o el servicio).
2. Busca **Source** / **Branch** y cámbialo a `main` (o la rama que quieras).

## Dónde están las variables de entorno

**No están en la página principal del proyecto.** Hay que entrar al **servicio** (el que ejecuta tu app):

1. En [railway.app](https://railway.app) abre tu **proyecto**.
2. Haz clic en el **servicio** (el recuadro que corresponde a tu app, no al proyecto).
3. Arriba verás pestañas: **Deployments**, **Settings**, **Variables**, **Metrics**, etc.
4. Entra en la pestaña **Variables**.
5. Ahí puedes:
   - **New Variable**: añadir una a una (nombre y valor).
   - **RAW Editor**: pegar varias líneas tipo `NOMBRE=valor`.

Si no ves la pestaña **Variables**, asegúrate de haber hecho clic en el **servicio** (cuadro con nombre del repo/app), no en el nombre del proyecto.

## Variables opcionales para Google Drive

Si no las configuras, la app arranca igual; Google Drive no funcionará hasta que las agregues:

- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PRIVATE_KEY` (clave privada del JSON de la cuenta de servicio; puede tener `\n`, Railway la acepta)
- `GOOGLE_PROJECT_ID`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_DRIVE_FOLDER_ID` (opcional)

Puedes usar el **RAW Editor** y pegar algo como (con tus valores reales):

```
GOOGLE_CLIENT_EMAIL=tu-email@tu-proyecto.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_PROJECT_ID=tu-proyect-id
GOOGLE_CLIENT_ID=...
GOOGLE_DRIVE_FOLDER_ID=...
```

Después de guardar variables, Railway suele hacer un **nuevo deploy**; si no, lanza uno manualmente.
