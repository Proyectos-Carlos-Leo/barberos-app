# 📧 SETUP: Bot de Gmail para confirmaciones de citas

Tu app ahora envía emails automáticos con el folio cuando el cliente agenda una cita.

## 🔧 Pasos para activar

### 1️⃣ Crear contraseña de aplicación en Google

**IMPORTANTE:** No uses tu contraseña de Gmail normal. Crea una contraseña especial para aplicaciones:

1. Abre https://myaccount.google.com/apppasswords
   (Si no ves esta opción, activa 2FA primero: https://myaccount.google.com/security)

2. Selecciona:
   - App: **Mail**
   - Dispositivo: **Windows / Mac / Linux**

3. Google te dará una contraseña de **16 caracteres**. Cópiala.

---

### 2️⃣ Configurar variables de entorno en Firebase

Ve a Firebase Console → tu proyecto → Configuración del proyecto → Functions:

1. Click en **"Variables de entorno de Cloud Functions"**
2. Agrega 2 variables:
   - **GMAIL_USER**: tu-email@gmail.com
   - **GMAIL_PASSWORD**: la-contraseña-de-16-caracteres (la que copiaste en paso 1)

3. Click "Guardar"

---

### 3️⃣ Instalar Firebase CLI

```bash
npm install -g firebase-tools
```

### 4️⃣ Desplegar las funciones

```bash
cd barberos-app
firebase login
firebase deploy --only functions
```

Si te pregunta qué proyecto, selecciona `barberos-app-174cb`.

---

### 5️⃣ Verificar que funciona

1. Ve a tu app: https://barberos-app-mu.vercel.app
2. Agenda una cita **CON TU PROPIO EMAIL**
3. En 5-10 segundos deberías recibir un email con:
   - ✂️ Confirmación de la cita
   - 📋 Folio (código de 6 caracteres)
   - 📅 Fecha y hora
   - 👤 Barbero seleccionado
   - 💰 Precio

---

## 📋 Qué hace el bot automáticamente

**Cuando un cliente agenda una cita:**
1. La cita se crea en Firebase
2. Cloud Function se dispara
3. Lee detalles de: barbería, barbero, servicio
4. Genera HTML bonito
5. Envía email al cliente

**El cliente recibe:**
- Folio para referencia
- Detalles completos de su cita
- Datos de la barbería
- Instrucciones para cambiar/cancelar

---

## 🐛 Si no funciona

### Revisa los logs:

```bash
firebase functions:log
```

### Errores comunes:

| Error | Solución |
|-------|----------|
| "Invalid SMTP credentials" | La contraseña no es correcta. Repite pasos 1-2. |
| "No email variable set" | Configura variables en Firebase (paso 2). |
| "Email no se envía" | El cliente necesita un `email` en su perfil. Verifica que ingrese su email. |
| "Gmail rechaza el acceso" | Activa: https://myaccount.google.com/lesssecureapps (si no está ya activo) |

---

## 🎨 Personalizar el template

El email que se envía está en `functions/index.js`. 

Para cambiar el diseño, colores, o contenido:
1. Edita `functions/index.js` → sección `emailHTML`
2. Vuelve a desplegar: `firebase deploy --only functions`

---

## 💡 Próximas mejoras (opcionales)

- [ ] Recordatorio de cita 24h antes por email
- [ ] Enviar confirmación al admin también
- [ ] Generar PDF de la cita adjunto
- [ ] Traducir a otros idiomas

---

## ⚡ Requisitos

- ✅ Firebase CLI instalado
- ✅ Cuenta Gmail con 2FA activo
- ✅ Variables de entorno configuradas
- ✅ Proyecto Firebase con permisos

¡Listo! Tu bot de Gmail está activo 🚀
