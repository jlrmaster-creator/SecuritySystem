# SecureChat

Aplicación de mensajería privada Zero-Knowledge y End-to-End Encrypted (E2EE) sin historial en base de datos.
El servidor actúa **únicamente como relay efímero en memoria RAM**.

## Arquitectura

- **Frontend:** PWA pura (HTML/CSS/JS) sin frameworks. Criptografía con `libsodium.js` (X25519, Ed25519, ChaCha20-Poly1305, Argon2id).
- **Backend Relay:** Node.js + TypeScript + WebSocket. Estado efímero puramente en RAM. TTL en todas las estructuras (mensajes, sesiones, invitaciones).

## Características principales

1. **Solo invitación:** No hay registro público. Cada usuario requiere un token one-time.
2. **Zero Knowledge Backend:** El servidor no ve los mensajes, ni conoce los números de teléfono (se usa HMAC-BLAKE2b). No almacena historial. Todo en RAM con TTL.
3. **Criptografía robusta:** 
   - Intercambio de claves X25519 (ECDH)
   - Firma de identidad con Ed25519
   - Cifrado de mensajes simétrico con ChaCha20-Poly1305
   - Almacenamiento local cifrado con clave derivada del PIN (Argon2id)
4. **Disappearing Messages:** Los mensajes se eliminan del dispositivo tras el TTL configurado.
5. **No DB:** No se usa PostgreSQL, MySQL, Redis ni nada similar para persistencia.

---

## Cómo ejecutar en desarrollo

### 1. Iniciar el Backend (Relay)

```bash
cd relay
npm install
npm run dev
```

Al iniciar, el relay imprimirá un **MASTER INVITE TOKEN** en la consola. Cópialo.

### 2. Iniciar el Frontend (Cliente)

Para probar la PWA localmente, simplemente sirve la carpeta `client` con cualquier servidor estático local.
Por ejemplo, usando `npx`:

```bash
npx serve client
```

Abre `http://localhost:3000` (o el puerto que te indique serve) en dos ventanas del navegador distintas o modo incógnito.

### 3. Flujo de prueba

1. **Usuario A:** Abre la app, introduce el **MASTER INVITE TOKEN**. Completa el registro (teléfono falso + PIN). Se conecta al WS.
2. **Usuario A:** Ve a la pantalla de Chats y haz clic en "Invitar a alguien". Se generará un nuevo código de un solo uso. Cópialo.
3. **Usuario B:** En una ventana de incógnito, introduce el código del paso 2. Regístrate con otro número falso + PIN.
4. **Usuario B:** Ve a "Nueva conversación". Introduce el número falso de **Usuario A**.
5. **Usuario A:** Recibe una solicitud de contacto de B. Acepta.
6. Ahora ambos pueden chatear cifradamente.

---

## Despliegue en Producción

### Frontend
El frontend es estático. Puede alojarse en **GitHub Pages**, **Vercel**, **Netlify**, o cualquier CDN.

### Backend (Relay)
El backend requiere Node.js.
Puedes usar el `Dockerfile` incluido en la carpeta `relay`.

```bash
cd relay
docker build -t securechat-relay .
docker run -p 3000:3000 securechat-relay
```

> **IMPORTANTE:** Para que la criptografía web funcione en dispositivos móviles, la aplicación DEBE servirse bajo `HTTPS` (contexto seguro). Si el frontend está en HTTPS, el WebSocket también debe ser `wss://`.
