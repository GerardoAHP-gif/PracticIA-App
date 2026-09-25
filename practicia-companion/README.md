# PracticIA Companion

PRACTICIA — PROMPT MAESTRO PARA MAQUETADO Y PROTOTIPO

Diseña y construye el prototipo completo de una aplicación web progresiva (PWA) llamada PracticIA.

1. Concepto

PracticIA es una Plataforma Inteligente de Acompañamiento para Prácticas Profesionales desarrollada para instituciones de educación superior.

El sistema acompaña a las estudiantes antes, durante y después de sus prácticas profesionales.

La plataforma debe integrar:

Inteligencia Artificial Generativa.

Geolocalización.

Navegación hacia la institución.

Registro de asistencia.

Evidencia fotográfica.

Calendario de prácticas.

Revisión de sesiones de aprendizaje.

Recomendaciones mediante IA.

Evaluación humana de docentes.

Anecdotarios.

Notificaciones.

Gestión administrativa.

El sistema debe tener tres roles:

Estudiante.

Docente.

Administrador.

2. Tipo de aplicación

Debe diseñarse como una PWA responsive y mobile-first.

Debe funcionar correctamente en:

teléfonos móviles;

tablets;

laptops;

computadoras de escritorio.

La experiencia principal debe estar optimizada para teléfonos porque las estudiantes utilizarán la plataforma principalmente durante sus desplazamientos y prácticas profesionales.

La interfaz debe sentirse como una aplicación móvil moderna, no como una página web tradicional.

Incluir:

manifest;

iconografía PWA;

diseño instalable;

navegación responsive;

experiencia standalone;

estados de carga;

estados vacíos;

mensajes de error;

confirmaciones;

modales;

notificaciones.

3. Identidad visual

Nombre:

PracticIA

Subtítulo:

Acompañamiento inteligente para tus prácticas profesionales.

Crear una identidad visual moderna, educativa y tecnológica.

Evitar una apariencia excesivamente corporativa o infantil.

La interfaz debe transmitir:

confianza;

educación;

inteligencia;

acompañamiento;

seguridad;

modernidad.

Usar una paleta visual profesional basada principalmente en azul/azul oscuro, blanco y colores secundarios suaves.

No saturar la interfaz con colores.

Utilizar tarjetas, iconos, badges de estado y componentes claros.

4. Pantalla de inicio de sesión

Crear pantalla de login con:

Logo PracticIA.

Nombre de la aplicación.

Campo correo/usuario.

Campo contraseña.

Mostrar/ocultar contraseña.

Botón "Iniciar sesión".

"¿Olvidaste tu contraseña?"

Mensaje de error.

Estado de carga.

Crear también recuperación de contraseña.

5. Arquitectura de navegación

La navegación debe cambiar según el rol.

Estudiante

Menú:

Inicio

Mi práctica

Calendario

Asistente IA

Sesiones

Asistencia

Evidencias

Anecdotario

Notificaciones

Perfil

Docente

Menú:

Inicio

Mis estudiantes

Seguimiento

Mapa

Sesiones

Asistencias

Evidencias

Anecdotarios

Notificaciones

Perfil

Administrador

Menú:

Dashboard

Usuarios

Estudiantes

Docentes

Instituciones

Prácticas

Asistencias

Reportes

Configuración

Perfil

6. Dashboard de estudiante

Diseñar una pantalla mobile-first.

Mostrar:

"Buenos días, [Nombre]"

Tarjeta principal:

"Próxima práctica"

Institución.

Fecha.

Hora.

Sesión.

Estado.

Botones principales:

"Preparar sesión"

"Ir a mi práctica"

"Registrar asistencia"

Agregar sección:

"Tu progreso"

Mostrar:

Sesión: completada/pendiente.

Evaluación: pendiente/completada.

Asistencia: pendiente/completada.

Anecdotario: pendiente/completado.

Agregar sección:

"Recordatorios"

Agregar sección:

"Acciones rápidas".

7. Calendario

Crear calendario mensual y vista de próximas prácticas.

Cada práctica debe mostrar:

fecha;

institución;

hora;

sesión;

estado.

Usar estados:

Pendiente.

En preparación.

Aprobada.

En camino.

Llegada registrada.

Finalizada.

8. Módulo de sesión de aprendizaje

Crear pantalla:

"Mi sesión de aprendizaje"

Permitir:

cargar archivo;

visualizar archivo;

ver versión;

ver estado;

enviar a IA;

recibir recomendaciones;

volver a cargar una nueva versión;

enviar a docente.

Crear estados:

"Pendiente de revisión IA"

"IA analizando"

"Recomendaciones disponibles"

"Enviada a docente"

"Aprobada"

"Requiere modificaciones"

9. Asistente IA

Crear una interfaz conversacional moderna.

Título:

"Asistente PracticIA"

Descripción:

"Te ayudo a preparar y mejorar tu práctica profesional."

Mostrar ejemplos de preguntas:

"¿Cómo puedo mejorar mi sesión?"

"¿Mi actividad está relacionada con el objetivo?"

"Ayúdame a mejorar esta actividad."

"¿Qué podría considerar para mi evaluación?"

Agregar área de conversación.

Agregar indicador:

"IA generando respuesta..."

La IA debe presentarse como asistente y no como evaluador oficial.

Agregar aviso:

"Las recomendaciones de IA son orientativas. La evaluación final corresponde a tu docente."

10. Revisión IA de sesión

Crear pantalla de resultados.

Secciones:

"Fortalezas"

"Recomendaciones"

"Aspectos por revisar"

"Sugerencias"

"Resumen"

Mostrar cada recomendación como tarjeta.

Botón:

"Volver a editar sesión"

Botón:

"Enviar a docente"

11. Navegación hacia la práctica

Crear pantalla de navegación.

Mostrar:

mapa;

ubicación actual;

ubicación de destino;

distancia;

tiempo estimado;

botón "Iniciar ruta";

botón "Cancelar".

Destino:

"I.E. Bernabé Cobo"

Mostrar una tarjeta inferior:

"Tu destino"

"Cuando llegues, podrás registrar tu asistencia."

No diseñar un GPS de seguimiento permanente.

La pantalla debe representar una navegación hacia el destino.

12. Registro de asistencia

Crear flujo:

"Registrar asistencia"

Paso 1:

Confirmar ubicación.

Mostrar:

"Estamos verificando tu ubicación..."

Después:

"Ubicación válida"

Paso 2:

Tomar fotografía.

Mostrar botón:

"Tomar evidencia"

Paso 3:

Confirmación.

Mostrar:

fecha;

hora;

institución;

ubicación;

fotografía.

Botón:

"Confirmar asistencia"

Después mostrar:

"¡Asistencia registrada!"

Y:

"Tu docente ha sido notificada."

13. Pantalla de asistencia

Mostrar historial:

fecha;

institución;

hora;

estado;

evidencia.

Estados:

Confirmada.

Pendiente.

Observada.

14. Evidencias

Crear galería/listado de evidencias.

Cada evidencia debe mostrar:

tipo;

fecha;

práctica;

estado.

No crear almacenamiento ilimitado.

15. Anecdotario

Crear pantalla:

"Mi anecdotario"

Permitir:

subir PDF;

visualizar nombre;

fecha;

estado;

enviar a docente.

Estados:

"Pendiente"

"Enviado"

"Revisado"

"Requiere modificación"

16. Dashboard docente

Diseñar dashboard profesional.

Mostrar:

"Buenos días, profesora [Nombre]"

Indicadores:

Estudiantes asignadas.

Prácticas de hoy.

Estudiantes que llegaron.

Sesiones pendientes de revisión.

Anecdotarios pendientes.

Crear sección:

"Prácticas de hoy"

Tabla/lista:

Estudiante | Institución | Hora | Estado

Estados visuales:

🟢 Llegó

🟡 En camino

⚪ Pendiente

🔴 Incidencia

17. Seguimiento de estudiantes

Crear lista de estudiantes.

Cada tarjeta debe mostrar:

nombre;

institución;

próxima práctica;

estado;

sesión;

asistencia.

Al seleccionar una estudiante, abrir detalle.

18. Detalle de estudiante

Mostrar:

Información

Nombre.

Programa.

Institución.

Docente.

Estado.

Práctica

fecha;

hora;

institución.

Sesión

documento;

estado;

recomendaciones IA;

observaciones docentes.

Asistencia

hora;

ubicación;

fotografía.

Anecdotario

documento;

estado.

19. Evaluación docente

Crear pantalla para que la docente revise la sesión.

Mostrar:

documento;

recomendaciones IA;

observaciones.

Permitir:

aprobar;

solicitar modificaciones;

agregar observación;

calificar.

La IA NO debe aparecer como evaluador final.

La docente siempre tiene el control de la evaluación.

20. Mapa docente

Crear pantalla con mapa.

Mostrar estudiantes con seguimiento activo.

Estados:

verde: llegada confirmada;

amarillo: en desplazamiento;

gris: pendiente;

rojo: incidencia.

Mostrar lista debajo del mapa.

21. Notificaciones

Crear centro de notificaciones.

Ejemplos:

"María registró su asistencia."

"Una estudiante envió una sesión."

"Una sesión requiere revisión."

"Mañana tienes una práctica."

"Tu docente revisó tu sesión."

22. Dashboard administrador

Mostrar:

total estudiantes;

total docentes;

instituciones;

prácticas programadas;

asistencias;

incidencias.

Agregar gráficos sencillos.

No sobrecargar el dashboard.

23. Gestión de usuarios

Crear CRUD visual para:

estudiantes;

docentes;

administradores.

Campos:

nombres;

apellidos;

correo;

rol;

estado.

Acciones:

crear;

editar;

activar/desactivar.

24. Gestión de instituciones

Crear CRUD para:

nombre;

dirección;

distrito;

provincia;

departamento;

latitud;

longitud;

estado.

Incluir selector de ubicación en mapa.

Permitir que el administrador confirme las coordenadas.

25. Gestión de prácticas

Crear pantalla para:

crear práctica;

seleccionar estudiante;

seleccionar docente;

seleccionar institución;

fecha;

hora;

sesión;

estado.

26. Diseño responsive

Mobile:

navegación inferior o menú compacto;

botones grandes;

tarjetas;

acciones rápidas;

cámara y ubicación accesibles.

Desktop:

sidebar;

dashboard;

tablas;

paneles.

La misma aplicación debe adaptarse a ambas experiencias.

27. Estados UX

Crear estados para:

loading;

success;

error;

empty state;

confirmation;

permission denied;

location unavailable;

file too large;

AI unavailable;

network unavailable.

Ejemplo:

"Necesitamos permiso para acceder a tu ubicación para validar tu llegada."

28. Arquitectura visual

Utilizar componentes reutilizables:

Button

Card

Badge

Modal

Dialog

Input

Select

Tabs

Alert

Toast

Navbar

Sidebar

Bottom navigation

Map container

File uploader

AI chat

Timeline

Calendar

Statistics cards

29. Datos simulados

Crear datos mock para demostrar el funcionamiento.

Crear al menos:

1 administrador.

2 docentes.

6 estudiantes.

3 instituciones.

varias prácticas.

asistencias.

sesiones.

recomendaciones IA.

anecdotarios.

Utilizar nombres ficticios para los datos de demostración.

30. Prioridad

La prioridad del prototipo es demostrar claramente este flujo:

ESTUDIANTE:

Login → Dashboard → Calendario → Sesión → IA → Docente → Ruta → Asistencia → Evidencia → Anecdotario.

DOCENTE:

Login → Dashboard → Estudiantes → Seguimiento → Sesión → Evaluación → Mapa → Evidencias.

ADMIN:

Login → Dashboard → Usuarios → Instituciones → Prácticas → Configuración.

31. Restricciones

No crear:

pagos;

ecommerce;

red social;

chat entre estudiantes;

seguimiento GPS permanente;

reconocimiento facial;

sistema completo de notas;

videollamadas;

funcionalidades no relacionadas con prácticas profesionales.

El sistema debe mantenerse enfocado.

32. Resultado esperado

El resultado debe parecer un producto tecnológico real llamado PracticIA, no una plantilla genérica de dashboard.

Debe existir coherencia visual entre todas las pantallas.

La experiencia debe transmitir:

"Una plataforma que acompaña a la estudiante durante toda su práctica profesional."

Priorizar UX/UI, claridad y navegación sencilla.

La aplicación debe quedar preparada arquitectónicamente para conectar posteriormente:

Supabase;

FastAPI;

APIs de mapas;

servicio de IA;

n8n;

almacenamiento de documentos.

No inventar funcionalidades adicionales fuera del alcance descrito.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b2409078-32be-40be-b47f-739f951bf1c0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
