# SecuritySystem

## Contexto

SecuritySystem es una aplicación web mobile-first de comunicación privada. Mantiene el acceso mediante usuario y contraseña y la mensajería entre usuarios, pero elimina el calendario, el modelo de grupos abiertos y cualquier notificación externa de mensajes.

La prioridad es proteger la privacidad: no debe existir un directorio público de usuarios, los datos deben estar limitados por autorización y el cliente debe consultar los mensajes al entrar en la aplicación.

## Requisitos funcionales

### Autenticación

- Mantener registro e inicio de sesión mediante usuario/email y contraseña con Firebase Authentication.
- No mostrar contraseñas ni almacenarlas en texto plano.
- Aplicar límites de intentos, sesiones revocables y reglas de Firestore basadas en `request.auth.uid`.
- No habilitar proveedores sociales ni registros públicos adicionales sin una decisión explícita de seguridad.

### Mensajes y notas

- Mantener la creación, edición y eliminación de mensajes/notas personales.
- Permitir enviar un mensaje a un contacto autorizado o a un grupo privado.
- El destinatario debe aceptar una solicitud antes de establecer una relación de comunicación.
- Diferenciar siempre solicitudes pendientes, mensajes propios y mensajes recibidos.
- No exponer contenido a usuarios que no sean destinatarios autorizados.

### Grupos privados

- Solo un usuario autenticado puede crear un grupo.
- El grupo no aparece en búsquedas públicas ni tiene una URL pública.
- Las invitaciones deben ser tokens criptográficamente aleatorios de al menos 256 bits, de un solo uso, revocables y con caducidad.
- Un token solo crea una solicitud pendiente; nunca incorpora directamente al usuario.
- El propietario o un administrador debe aprobar explícitamente cada solicitud.
- El propietario puede rechazar solicitudes, expulsar miembros y revocar dispositivos.
- Separar permisos de propietario, administrador y miembro aplicando mínimo privilegio.
- No usar códigos cortos predecibles ni enlaces reutilizables.
- Al cambiar la composición del grupo se deben rotar las claves del grupo para impedir que un miembro expulsado lea mensajes posteriores.
- El servidor no debe conocer el contenido de los mensajes ni permitir leer la lista completa de grupos o usuarios.

## Política de notificaciones

SecuritySystem **no debe enviar notificaciones push, avisos del sistema, SMS ni correos al llegar mensajes nuevos**. No se deben solicitar permisos de notificación ni registrar tokens FCM/APNs.

El usuario debe entrar en la aplicación para consultar mensajes y solicitudes pendientes. Mientras la aplicación está abierta puede actualizarse la interfaz mediante el canal autenticado. Los estados pendientes solo pueden mostrarse dentro de la aplicación, después de autenticar al usuario.

## Privacidad y seguridad

- No usar el email, teléfono o nombre visible como identificador interno.
- No crear búsquedas globales ni permitir enumeración de usuarios, grupos o invitaciones.
- Guardar solo los datos imprescindibles y aplicar reglas estrictas de lectura y escritura.
- Usar librerías criptográficas auditadas; no implementar criptografía propia.
- Cifrar en el cliente los datos sensibles antes de sincronizarlos cuando sea viable.
- No registrar contenido de mensajes en logs.
- Documentar claramente qué metadatos conserva Firebase y durante cuánto tiempo.
- No prometer borrado físicamente irrecuperable: una captura o un dispositivo comprometido quedan fuera del control de la aplicación.

## Stack y arquitectura

- React + Vite, diseño responsive y navegación protegida.
- Firebase Authentication para credenciales.
- Firestore para sincronización autenticada, con reglas por usuario, grupo y rol.
- Service worker únicamente para cache y actualización de la aplicación; no debe procesar `push` ni mostrar notificaciones.
- El proyecto y la aplicación deben identificarse siempre como **SecuritySystem**.

## Validación obligatoria

La implementación debe incluir o comprobar:

1. Login y logout con usuario y contraseña.
2. Acceso denegado a datos de otro usuario.
3. Token de grupo no predecible, de un solo uso y con expiración.
4. Solicitud de incorporación pendiente hasta la aprobación del administrador.
5. Rechazo y expulsión sin conservar permisos.
6. Rotación de permisos al cambiar miembros.
7. Ausencia de FCM, APNs, Web Push y notificaciones locales para mensajes.
8. No existen rutas, integraciones ni notificaciones relacionadas con calendarios.
9. Ausencia de referencias al nombre anterior del proyecto.
