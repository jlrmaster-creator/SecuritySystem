# Contexto y Rol

Actúa como un **arquitecto de software senior, especialista en ciberseguridad, privacidad, criptografía aplicada y desarrollo de aplicaciones de mensajería segura**.

Diseña y desarrolla una aplicación de mensajería instantánea privada, inspirada conceptualmente en aplicaciones como Signal, pero con un modelo de acceso mucho más restringido y orientado a la privacidad extrema.

La aplicación debe estar diseñada bajo el principio **Privacy by Design / Zero Knowledge**, minimizando al máximo la información que pueda conocer o almacenar el servidor.

El objetivo principal no es crear una red social ni una aplicación de mensajería convencional, sino un sistema de comunicación privada en el que **solo personas expresamente invitadas puedan acceder y comunicarse entre sí**.

---

# Consulta / Tarea

Diseña la arquitectura completa y la implementación de una aplicación de chat privado con las siguientes características:

## 1. Acceso exclusivamente por invitación

La aplicación no debe permitir un registro público.

Un usuario solo podrá acceder si recibe una invitación válida de otro usuario autorizado.

Las invitaciones deberán:

* Ser únicas.
* Tener un identificador/token criptográficamente seguro.
* Tener una caducidad configurable.
* Poder utilizarse una sola vez.
* No ser predecibles.
* No permitir generar cuentas ilimitadamente.
* Poder revocarse antes de ser utilizadas.
* Estar vinculadas a las políticas de invitación del usuario que las genera.

El sistema debe impedir que una persona pueda registrarse simplemente descargando la aplicación.

---

# 2. Identidad mediante número de teléfono

Cada usuario tendrá asociado un número de teléfono como identificador inicial.

Sin embargo, el número de teléfono debe tratarse como **información extremadamente sensible**.

El sistema debe evitar exponer innecesariamente los números de teléfono al servidor, a otros usuarios o a terceros.

Analiza e implementa, cuando sea técnicamente viable, mecanismos como:

* Hashing/HMAC de identificadores.
* Identificadores internos aleatorios.
* Separación entre identidad y contenido.
* Minimización de metadatos.
* Verificación de propiedad del número mediante OTP si resulta necesaria.
* No utilizar el número de teléfono como ID interno de la aplicación.

---

# 3. Contactar exclusivamente por invitación

Un usuario no podrá enviar mensajes libremente a cualquier número de teléfono.

Para iniciar una conversación con otra persona será necesario que exista una **invitación explícita**.

Flujo deseado:

1. Usuario A quiere contactar con Usuario B.
2. A introduce el número de teléfono de B.
3. El sistema genera una solicitud de contacto cifrada o protegida.
4. B recibe una invitación/solicitud.
5. B debe aceptar explícitamente.
6. Solo después de aceptar se establece el canal de comunicación.
7. Si B rechaza la solicitud, no debe establecerse ningún canal de comunicación permanente.

No debe existir un mecanismo de búsqueda pública de usuarios.

---

# 4. Mensajería efímera

Los mensajes deben tener un comportamiento similar a un sistema **ephemeral messaging / disappearing messages**, pero llevado al extremo.

Requisito principal:

> Los mensajes no deben almacenarse permanentemente.

El objetivo es que el servidor actúe únicamente como **relay temporal de mensajes cifrados**, nunca como almacén histórico.

Siempre que técnicamente sea posible:

* El mensaje debe cifrarse extremo a extremo antes de abandonar el dispositivo.
* El servidor no debe poder leer el contenido.
* El servidor no debe almacenar el historial de conversaciones.
* El mensaje debe permanecer únicamente el tiempo estrictamente necesario para su entrega.
* Una vez entregado y confirmado por el destinatario, debe eliminarse del relay.
* Una vez leído/aceptado por el destinatario, debe desaparecer del dispositivo según la política definida.
* No debe existir historial recuperable desde el servidor.

### Importante

Diferenciar claramente entre:

**"mensaje entregado"**

y

**"mensaje leído/aceptado".**

El sistema debe poder utilizar acknowledgements efímeros para saber si un mensaje ha sido recibido correctamente, sin convertir estos eventos en un historial permanente.

---

# 5. Ausencia de base de datos

La aplicación debe diseñarse con el requisito:

> **No utilizar una base de datos persistente tradicional para almacenar usuarios, mensajes, conversaciones o historial.**

No utilizar:

* PostgreSQL
* MySQL
* MongoDB
* Firebase Database
* Supabase Database
* Redis como almacenamiento permanente
* Bases de datos similares para guardar información de conversaciones.

El servidor debe funcionar, en la medida de lo posible, como un **relay stateless o prácticamente stateless**.

Si técnicamente resulta imprescindible mantener algún estado temporal para que el sistema funcione, debe:

* Ser estrictamente temporal.
* Mantener únicamente la información mínima.
* Tener TTL obligatorio.
* Eliminarse automáticamente.
* No contener mensajes en texto plano.
* No convertirse en un historial.
* No utilizarse para crear perfiles o tracking de usuarios.

Explica claramente qué información temporal es imprescindible y durante cuánto tiempo existe.

---

# 6. Cifrado extremo a extremo

Implementa un sistema de cifrado extremo a extremo robusto.

No diseñes criptografía propia.

Utiliza protocolos y primitivas criptográficas auditadas y ampliamente aceptadas.

Evalúa tecnologías/protocolos como:

* Signal Protocol.
* Double Ratchet.
* X3DH / mecanismos equivalentes de establecimiento de sesión.
* Ed25519.
* X25519.
* AES-256-GCM o ChaCha20-Poly1305.
* Perfect Forward Secrecy.
* Post-Compromise Security.

Los mensajes deben cifrarse en el dispositivo del remitente y descifrarse únicamente en el dispositivo del destinatario.

El servidor debe recibir únicamente datos cifrados.

---

# 7. Eliminación de mensajes

Define un mecanismo seguro para la eliminación.

Cuando un mensaje haya sido entregado:

1. El destinatario lo recibe cifrado.
2. El cliente lo descifra localmente.
3. Se confirma la recepción.
4. El relay elimina su copia temporal.
5. Cuando corresponda según la política de lectura, el cliente elimina el mensaje localmente.
6. Las claves efímeras asociadas al mensaje deben eliminarse cuando sea seguro hacerlo.

La eliminación debe considerarse una característica de seguridad, no simplemente una función de interfaz.

Explica las limitaciones reales:

* Un usuario puede realizar una captura de pantalla.
* Puede fotografiar la pantalla.
* Puede utilizar un dispositivo modificado.
* Puede copiar el contenido antes de que desaparezca.
* La eliminación de un archivo del almacenamiento físico no garantiza necesariamente que sea imposible recuperarlo mediante técnicas forenses.

La aplicación debe minimizar estos riesgos, pero **no prometer una eliminación físicamente irrecuperable que técnicamente no pueda garantizarse**.

---

# 8. Arquitectura Zero-Knowledge

Diseña la arquitectura intentando que el servidor conozca la mínima información posible.

Idealmente el servidor no debería conocer:

* Contenido de mensajes.
* Historial de conversaciones.
* Contactos.
* Agenda del usuario.
* Relaciones sociales completas.
* Claves privadas.
* Mensajes eliminados.
* Historial de mensajes.
* Información innecesaria sobre cuándo se leyó un mensaje.

El servidor podría conocer únicamente la información mínima imprescindible para actuar como relay.

Documenta explícitamente:

### Información que conoce el servidor

### Información que nunca debe conocer el servidor

### Información que existe temporalmente

### Información que se elimina automáticamente

---

# 9. Seguridad del dispositivo

Las claves privadas deben generarse y permanecer preferentemente en el dispositivo del usuario.

No deben enviarse al servidor.

Utiliza los mecanismos seguros disponibles en cada plataforma:

### iOS

* Keychain
* Secure Enclave cuando sea apropiado

### Android

* Android Keystore
* Hardware-backed Keystore cuando esté disponible

Considera:

* Protección mediante biometría.
* PIN/passcode.
* Bloqueo automático.
* Protección frente a screenshots cuando sea posible.
* Detección de dispositivos comprometidos/root/jailbreak cuando sea razonable.
* Borrado local de claves ante determinadas condiciones de seguridad.

---

# 10. Vinculación entre dispositivos

Define cómo funcionaría la aplicación si el usuario quiere utilizarla en más de un dispositivo.

Prioriza:

* Claves independientes por dispositivo.
* Vinculación explícita.
* Verificación entre dispositivos.
* No almacenar claves privadas en el servidor.
* Revocación inmediata de dispositivos perdidos.

Un dispositivo nuevo no debe obtener automáticamente el historial de conversaciones, porque dicho historial no debe existir en el servidor.

---

# 11. Notificaciones push

Diseña las notificaciones push respetando la privacidad.

Evita enviar:

* Texto del mensaje.
* Número de teléfono del remitente.
* Información innecesaria de la conversación.

La notificación debería ser genérica, por ejemplo:

> "Nuevo mensaje"

El contenido debe recuperarse de forma segura mediante el canal cifrado.

Analiza las implicaciones de APNs y Firebase Cloud Messaging y explica qué metadatos pueden quedar visibles para Apple o Google.

---

# 12. Servidor Relay

Diseña un backend extremadamente minimalista.

Su función principal será:

* Validar sesiones.
* Gestionar invitaciones temporales.
* Facilitar el establecimiento de conexiones.
* Transportar mensajes cifrados.
* Mantener mensajes pendientes únicamente durante el tiempo necesario.
* Emitir acknowledgements.
* Eliminar datos temporales automáticamente.

El backend **no debe descifrar mensajes**.

No debe existir un endpoint administrativo que permita leer conversaciones.

---

# 13. Prevención de abuso

Aunque la aplicación sea privada, analiza mecanismos para evitar:

* Spam.
* Generación masiva de invitaciones.
* Ataques de enumeración de números de teléfono.
* Brute force de invitaciones.
* Replay attacks.
* Suplantación de identidad.
* Robo de sesiones.
* Ataques Man-in-the-Middle.
* Denegación de servicio.
* Creación automatizada de cuentas.

Estos mecanismos no deben comprometer innecesariamente la privacidad.

---

# 14. Metadatos

Realiza un análisis específico de metadatos.

Minimiza o evita almacenar:

* IP histórica.
* Hora exacta de los mensajes.
* Relación entre usuarios.
* Lista de contactos.
* Última conexión.
* Estado online.
* Historial de actividad.
* Identificadores persistentes innecesarios.
* Logs de conversaciones.

Si algún log es imprescindible para seguridad operacional, establece:

* Qué contiene.
* Por qué es necesario.
* Cuánto tiempo permanece.
* Cómo se anonimiza.
* Cómo se elimina automáticamente.

---

# 15. Logs y monitorización

No registrar mensajes ni contenido sensible.

Los logs del backend deben diseñarse bajo el principio de minimización.

Evita logs como:

```text
User A sent message to User B at 13:42
```

Siempre que sea posible, utilizar eventos técnicos anónimos y temporales.

Define una política de logging segura.

---

# 16. Tecnología

Propón un stack tecnológico moderno, seguro y mantenible.

Puedes evaluar, por ejemplo:

### Cliente móvil

* React Native
* Flutter
* Swift/Kotlin nativo

### Backend

* Rust
* Go
* Node.js/TypeScript

### Comunicación

* WebSocket
* WebRTC cuando sea apropiado
* HTTPS/TLS 1.3

Explica qué stack recomendarías y por qué.

Prioriza:

1. Seguridad.
2. Privacidad.
3. Simplicidad.
4. Mantenibilidad.
5. Rendimiento.
6. Coste operacional.

---

# 17. Modelo de datos

Aunque no exista una base de datos persistente, define claramente qué estructuras temporales necesita el sistema.

Por ejemplo:

```text
EphemeralSession
EphemeralInvitation
EncryptedMessageBuffer
DeliveryReceipt
DeviceSession
```

Cada estructura debe incluir TTL y reglas de eliminación.

No debe existir una entidad persistente equivalente a:

```text
MessageHistory
ConversationHistory
UserDatabase
ContactDatabase
```

---

# 18. Threat Model

Antes de implementar la solución, crea un modelo de amenazas.

Analiza como mínimo:

* Atacante externo.
* Servidor comprometido.
* Administrador malicioso.
* Robo del dispositivo.
* Dispositivo comprometido.
* Interceptación de tráfico.
* Ataque MITM.
* Replay attacks.
* Enumeración de usuarios.
* Robo de tokens de invitación.
* Compromiso de una cuenta.
* Compromiso de una clave.
* Análisis de tráfico.
* Correlación temporal.
* Notificaciones push.
* Backups del dispositivo.
* Capturas de pantalla.
* Ingeniería social.

Para cada amenaza indica:

**Amenaza → impacto → probabilidad → mitigación.**

---

# 19. Auditoría de seguridad

La arquitectura debe diseñarse para poder ser auditada.

Incluye:

* Separación clara de componentes.
* Código criptográfico basado en librerías auditadas.
* Tests de seguridad.
* Tests de penetración.
* Tests de replay.
* Tests de autenticación.
* Tests de autorización.
* Tests de eliminación de mensajes.
* Tests de expiración de tokens.
* Tests de fugas de información.
* Tests de memoria.
* Tests de almacenamiento local.

No considerar la aplicación "segura" simplemente porque utiliza cifrado.

---

# 20. Experiencia de usuario

La interfaz debe ser extremadamente sencilla.

Pantallas principales:

### Pantalla 1 — Invitación

* Introducir código/enlace de invitación.
* Validar invitación.
* Crear identidad.

### Pantalla 2 — Verificación

* Verificar número de teléfono.
* Configurar nombre/alias opcional.
* Crear claves.

### Pantalla 3 — Chats

Mostrar únicamente conversaciones activas.

No debe existir:

* Feed.
* Perfil público.
* Buscador global.
* Lista pública de usuarios.
* Historial remoto.

### Pantalla 4 — Nueva conversación

Introducir número de teléfono.

El sistema deberá generar una solicitud de contacto.

### Pantalla 5 — Solicitudes

Aceptar/rechazar solicitudes.

### Pantalla 6 — Seguridad

Mostrar:

* Dispositivos vinculados.
* Claves de seguridad.
* Verificación de contacto.
* Revocar dispositivo.
* Bloqueo de aplicación.
* Configuración de desaparición de mensajes.

---

# 21. Principios fundamentales

La aplicación debe seguir estos principios:

**Privacy by Design**

**Security by Design**

**Data Minimization**

**Zero Trust**

**Zero Knowledge cuando sea viable**

**Ephemeral by Default**

**End-to-End Encryption**

**No Message History**

**No Public Registration**

**Invitation Only**

**Least Privilege**

---

# Criterios de calidad

La solución final debe:

1. Ser técnicamente realista.
2. No inventar propiedades criptográficas.
3. No desarrollar algoritmos criptográficos propios.
4. Utilizar protocolos y librerías reconocidas.
5. Minimizar radicalmente los metadatos.
6. No utilizar una base de datos persistente para mensajes.
7. No almacenar conversaciones.
8. No permitir registro público.
9. Requerir invitación para acceder.
10. Requerir aceptación explícita para iniciar una conversación.
11. Eliminar mensajes del relay después de su entrega.
12. Evitar que el servidor pueda leer mensajes.
13. Explicar claramente cualquier información que necesariamente deba existir temporalmente.
14. Implementar TTL y eliminación automática.
15. Contemplar dispositivos comprometidos y ataques de red.
16. No realizar promesas de seguridad que no puedan garantizarse técnicamente.

---

# Cómo debe ser la respuesta

Entrega el resultado como un **documento técnico completo**, dividido en las siguientes secciones:

1. Resumen ejecutivo.
2. Requisitos funcionales.
3. Requisitos de seguridad.
4. Requisitos de privacidad.
5. Arquitectura general.
6. Diagrama de componentes.
7. Flujo de registro mediante invitación.
8. Flujo de invitación a un contacto.
9. Flujo de establecimiento de sesión.
10. Flujo de envío de mensaje.
11. Flujo de recepción y eliminación.
12. Arquitectura de cifrado.
13. Gestión de claves.
14. Arquitectura del backend relay.
15. Estructuras de datos temporales.
16. Estrategia de TTL y eliminación.
17. Gestión de notificaciones push.
18. Gestión de dispositivos.
19. Threat Model.
20. Análisis de metadatos.
21. Arquitectura recomendada del cliente.
22. Arquitectura recomendada del backend.
23. Stack tecnológico recomendado.
24. API propuesta.
25. Estructura del proyecto.
26. Pseudocódigo de los procesos críticos.
27. Tests necesarios.
28. Plan de auditoría de seguridad.
29. Riesgos y limitaciones.
30. Roadmap MVP → producción.

Cuando exista una contradicción entre **comodidad y privacidad**, prioriza la privacidad.

Cuando exista una contradicción entre **funcionalidad y seguridad**, prioriza la seguridad.

Y cuando un requisito sea técnicamente imposible de garantizar al 100 %, indícalo claramente y propone la alternativa más segura y realista.

No asumas que "sin base de datos" significa que mágicamente no existe ningún dato en memoria. Explica qué estado temporal es imprescindible para que un sistema de mensajería funcione y cómo minimizarlo.

El resultado debe estar pensado para poder convertirse posteriormente en una **especificación técnica real para un equipo de desarrollo**.


---------------

# Requisito fundamental: tecnología Open Source

Toda la aplicación debe construirse utilizando **software de código abierto**, con prioridad por proyectos maduros, auditables, mantenidos activamente y con licencias compatibles con el proyecto.

El objetivo es que el sistema pueda ser **auditado de forma independiente**, tanto desde el punto de vista de seguridad como de privacidad.

## 1. Principio Open Source

No utilizar componentes propietarios o cerrados cuando exista una alternativa Open Source técnicamente equivalente y suficientemente madura.

Priorizar proyectos con:

* Código fuente público.
* Repositorios públicos.
* Comunidad activa.
* Historial de mantenimiento.
* Documentación técnica.
* Revisiones de seguridad.
* Auditorías independientes cuando existan.
* Licencias claramente identificables.
* Dependencias transparentes.

Antes de seleccionar una dependencia, analizar:

* Licencia.
* Mantenimiento.
* Número y gravedad de vulnerabilidades conocidas.
* Dependencias transitivas.
* Historial de releases.
* Actividad del proyecto.
* Posibilidad de auditar el código.
* Riesgo de abandono del proyecto.

---

# 2. Cliente móvil

Priorizar una implementación Open Source.

Evaluar:

### Opción preferente

**Flutter + Dart**, si permite cumplir los requisitos criptográficos y de seguridad sin introducir dependencias propietarias innecesarias.

Alternativamente evaluar:

* React Native.
* Kotlin Multiplatform.
* Android nativo con Kotlin.
* iOS nativo con Swift.

La decisión debe basarse principalmente en:

1. Seguridad.
2. Integración con almacenamiento seguro del sistema operativo.
3. Implementación criptográfica.
4. Capacidad de auditoría.
5. Mantenimiento a largo plazo.

No seleccionar una tecnología únicamente por velocidad de desarrollo.

---

# 3. Criptografía Open Source

No implementar algoritmos criptográficos propios.

Utilizar exclusivamente implementaciones Open Source de protocolos y primitivas criptográficas ampliamente revisadas.

Evaluar especialmente:

* Signal Protocol y sus implementaciones Open Source.
* Double Ratchet.
* X3DH o mecanismos modernos equivalentes.
* X25519.
* Ed25519.
* HKDF.
* ChaCha20-Poly1305.
* AES-256-GCM cuando resulte apropiado.

La aplicación debe utilizar librerías criptográficas maduras en lugar de implementar directamente algoritmos criptográficos de bajo nivel.

La criptografía debe quedar aislada en un módulo claramente identificable y auditable.

---

# 4. Backend Open Source

Priorizar:

### Rust

Como primera opción para el servidor relay debido a:

* Seguridad de memoria.
* Buen rendimiento.
* Bajo consumo.
* Ecosistema Open Source.
* Adecuado para servicios de red.
* Buen soporte para concurrencia.

Evaluar también:

### Go

Como alternativa si proporciona una implementación significativamente más sencilla de mantener.

No utilizar servicios backend propietarios como dependencia obligatoria de la arquitectura.

---

# 5. Comunicación

Utilizar estándares abiertos.

Preferentemente:

* TLS 1.3.
* HTTPS.
* WebSocket sobre TLS.
* Protocolos abiertos y documentados.

Evaluar WebRTC únicamente cuando aporte una ventaja real.

La comunicación entre cliente y servidor debe estar cifrada incluso aunque el contenido ya esté protegido mediante E2EE.

Por tanto:

**E2EE + TLS**

y no únicamente TLS.

---

# 6. Relay efímero

El servidor debe ser un **Open Source Ephemeral Relay**.

Su código fuente debe poder publicarse íntegramente.

Funciones:

```text
Client A
   |
   | TLS 1.3
   |
   v
[ Open Source Relay ]
   |
   | TLS 1.3
   |
   v
Client B
```

El relay únicamente debe gestionar temporalmente:

* Identificadores efímeros.
* Sesiones.
* Mensajes cifrados.
* Confirmaciones de entrega.
* Invitaciones temporales.

Los mensajes nunca deben existir en texto plano en el servidor.

---

# 7. Sin base de datos persistente

No utilizar una base de datos tradicional.

Evitar:

* PostgreSQL.
* MySQL.
* MongoDB.
* Firebase.
* Supabase.
* DynamoDB.
* Firestore.

Para el MVP, utilizar únicamente memoria RAM para el estado temporal cuando sea viable.

Por ejemplo:

```text
RAM
 ├── ephemeral sessions
 ├── pending invitations
 ├── encrypted message buffers
 └── delivery acknowledgements
```

Todos los elementos deberán disponer de:

```text
created_at
expires_at
TTL
```

Cuando se alcance el TTL:

```text
DATA → DELETE
```

No debe existir recuperación posterior.

---

# 8. Infraestructura Open Source

Siempre que sea viable, utilizar infraestructura basada en tecnologías Open Source.

Evaluar:

* Linux.
* Docker.
* Podman.
* Kubernetes únicamente si la escala lo justifica.
* Nginx.
* Caddy.
* Traefik.
* OpenTelemetry.
* Prometheus.
* Grafana.

No introducir Kubernetes simplemente por motivos de moda tecnológica.

Para un MVP, priorizar una arquitectura pequeña y auditable.

---

# 9. Push Notifications

Este punto requiere especial atención.

Los sistemas móviles oficiales de notificaciones push pueden depender de Apple o Google.

Por tanto, analizar dos escenarios:

### Opción A — Push convencional

APNs para iOS y FCM para Android.

Determinar exactamente qué metadatos son visibles para estos proveedores.

Nunca enviar:

* Contenido del mensaje.
* Texto del mensaje.
* Número de teléfono del remitente.
* Nombre del contacto.
* Información de la conversación.

La notificación debe contener únicamente un identificador efímero o una señal genérica.

### Opción B — Alternativa Open Source

Investigar alternativas Open Source para notificaciones y comunicación persistente.

Determinar las limitaciones reales de iOS y Android.

Si no es técnicamente viable sustituir completamente APNs/FCM, documentar esta excepción explícitamente.

**No afirmar que el sistema es 100 % independiente de Apple/Google si técnicamente no puede serlo.**

---

# 10. Identidad y números de teléfono

El número de teléfono nunca debe utilizarse directamente como identificador interno.

Crear:

```text
Phone Number
     ↓
HMAC / mecanismo criptográfico
     ↓
Ephemeral Lookup Identifier
     ↓
Random Internal User Identifier
```

Analizar cuidadosamente los riesgos de:

* Hashing simple.
* Rainbow tables.
* Enumeración.
* Correlación.
* Ataques de diccionario.

Preferir mecanismos criptográficos con secreto del servidor cuando resulte apropiado, evitando revelar el número original.

---

# 11. Sistema de invitaciones

Las invitaciones deberán utilizar tokens criptográficamente seguros.

Ejemplo conceptual:

```text
Random Entropy
      ↓
Secure Token
      ↓
Invitation
      ↓
One Time Use
      ↓
Accepted
      ↓
Invalidated
```

No utilizar:

```text
123456
ABC123
INVITE001
```

Los tokens deben ser:

* Aleatorios.
* Imposibles de predecir.
* De un solo uso.
* Con expiración.
* Revocables.
* Limitados por usuario.

---

# 12. Reproducibilidad

El proyecto debe intentar permitir **reproducible builds**.

Un usuario externo debería poder:

1. Obtener el código fuente.
2. Obtener las dependencias.
3. Compilar la aplicación.
4. Verificar que el binario corresponde al código publicado.

Documentar:

* Versiones.
* Hashes.
* Dependencias.
* Herramientas de compilación.
* Proceso de release.

---

# 13. Supply Chain Security

Implementar medidas para proteger la cadena de suministro.

Como mínimo:

* Lockfiles.
* Versionado de dependencias.
* SBOM.
* Dependabot/Renovate o equivalente Open Source.
* SCA.
* SAST.
* Detección de vulnerabilidades.
* Firma de releases.
* Verificación de artefactos.

Analizar dependencias transitivas.

Una aplicación no debe considerarse completamente Open Source simplemente porque su código principal sea público.

---

# 14. Licencia

Proponer una licencia Open Source adecuada para cada componente.

Analizar opciones como:

* Apache-2.0.
* MIT.
* AGPLv3.
* GPLv3.

Explicar las ventajas y desventajas de cada una.

Especialmente evaluar **AGPLv3** para el servidor si el objetivo es evitar que terceros modifiquen el backend y ofrezcan una versión como servicio sin publicar las modificaciones.

La elección final de licencia debe hacerse después de analizar:

* Modelo de negocio.
* Objetivos de comunidad.
* Protección frente a forks propietarios.
* Compatibilidad de dependencias.
* Distribución de cliente y servidor.

---

# 15. Transparencia

El proyecto debería publicar:

```text
/client
/server
/crypto
/protocol
/infrastructure
/docs
/security
/tests
```

También publicar:

* Arquitectura.
* Threat Model.
* Protocolo.
* Modelo de privacidad.
* Política de eliminación.
* Dependencias.
* Licencias.
* Procedimiento de reporte de vulnerabilidades.

---

# 16. Auditoría independiente

El proyecto debe estar preparado para auditorías externas.

Separar claramente:

```text
Application Layer
        ↓
Messaging Layer
        ↓
Cryptographic Layer
        ↓
Transport Layer
        ↓
Operating System
```

La implementación criptográfica debe ser lo más pequeña y aislada posible.

No esconder funcionalidades críticas dentro de frameworks difíciles de auditar.

---

# 17. Regla de decisión tecnológica

Cuando exista más de una alternativa, seleccionar utilizando este orden:

1. Seguridad.
2. Privacidad.
3. Auditabilidad.
4. Madurez.
5. Código abierto.
6. Reproducibilidad.
7. Mantenibilidad.
8. Rendimiento.
9. Coste.

No seleccionar una tecnología simplemente porque sea popular.

---

# 18. Resultado esperado

Genera una arquitectura completa de la aplicación indicando para cada componente:

| Componente      | Tecnología        | Open Source     | Datos que maneja       | Persistencia |
| --------------- | ----------------- | --------------- | ---------------------- | ------------ |
| Cliente         | Por determinar    | Sí              | Datos locales          | Efímera      |
| Relay           | Rust/Go           | Sí              | Mensajes cifrados      | RAM          |
| Criptografía    | Librería auditada | Sí              | Claves efímeras        | Local        |
| Invitaciones    | Servicio propio   | Sí              | Tokens temporales      | RAM          |
| Push            | Evaluar           | Preferentemente | Señales mínimas        | Externa      |
| Infraestructura | Linux/Docker/etc. | Sí              | Datos técnicos mínimos | Configurable |

Para cada tecnología propuesta, justificar la elección.

Si alguna dependencia obligatoria no puede ser Open Source, señalarla explícitamente como **excepción** y explicar por qué no puede sustituirse.

La arquitectura final debe perseguir el siguiente objetivo:

> **Una aplicación de mensajería privada, por invitación, Open Source, auditable, con cifrado extremo a extremo, sin historial, sin base de datos persistente de mensajes y con un servidor que actúe únicamente como relay temporal de datos cifrados.**
