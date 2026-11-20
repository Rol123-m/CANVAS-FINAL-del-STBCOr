# Plataforma del Seminario · Asignaturas (v3)

Plataforma de asignaturas estilo Canvas para el **Seminario Teológico Bautista de Cuba Oriental**, construida sobre el diseño de la página del curso de Griego: **Google Sheets como base de datos + Google Apps Script como API + front-end estático configurable en `js/config.js`**.

**Novedades de esta versión (v3)**

- **Cada asignatura tiene sus propias hojas** en la base de datos (exámenes, preguntas, intentos, progreso, tareas, entregas, anuncios, chat, foros y aportes). Al crecer el número de cursos y evaluaciones, cada petición solo toca las hojas de su asignatura: la base no se sobrecarga.
- **Tareas con envío al profesor**: cada tarea ofrece accesos directos de **Correo** (abre el correo del estudiante dirigido al profesor con asunto listo) y **WhatsApp** (abre el chat del profesor con mensaje preparado). El estudiante marca «Ya la envié» y la plataforma recuerda qué tareas están enviadas y por qué medio.
- **Exámenes con 4 tipos de pregunta**: selección múltiple, verdadero/falso, **unir columnas A ↔ B** (la columna B se presenta desordenada y se corrige automática) y **redacción**, que **no se corrige automática: el profesor la revisa y puntúa manualmente** en Resultados → «Revisar». Nota final = automático + manual.
- **Foros de debate** por asignatura (además del foro de dudas en vivo): pregunta guía, instrucciones, mínimo de palabras exigido a los estudiantes, y el profesor decide si está abierto o cerrado.
- **Progreso y promedios**: matriz del grupo con módulos, quizzes, tareas, porcentaje de progreso y **promedio de quizzes por estudiante**; promedio del grupo en el Resumen y en el panel de dirección.
- **Montaje en un paso**: «Importar asignatura (JSON)» crea en segundos una asignatura completa (módulos, lecciones con sus rutas, quizzes, foros, tareas y anuncios) a partir de un archivo JSON. Se incluye **`griego-i.json`** con Griego I completo.
- **Recursos desde una carpeta**: el módulo puede **listar los archivos de una carpeta de Drive** (o de la carpeta local `contenido/`) y **guardar la ruta** de cada uno en la hoja. Pones el archivo en la carpeta, lo añades desde la plataforma, y la hoja guarda la ruta — igual que en la página de griego original.

---

## Contenido de la carpeta

| Archivo | Qué es |
| --- | --- |
| `index.html` | Página única de la aplicación (SPA) |
| `css/app.css` | Estilos (paleta y tipografía de la página de griego) |
| `js/config.js` | **Configuración**: URL de la API, claves de dirección, tema |
| `js/griego-i.js` | Fuente única de la asignatura **Griego I** completa (demo) |
| `js/demo-data.js` | Base de datos de estudiantes (72) y profesores para el modo demo |
| `js/api.js` | Capa de datos: Apps Script cuando está conectada; demo (localStorage) si no |
| `js/app.js` | Interfaz y lógica de la plataforma |
| `code.gs` | **Backend completo para Google Apps Script** (no se sube al repositorio) |
| `griego-i.json` | Asignatura Griego I lista para **Importar asignatura (JSON)** |
| `contenido/` | Los 43 archivos HTML de las 12 lecciones de Griego I (se abren dentro de la plataforma) |
| `assets/silabo-griego-I-2026-2027.pdf` | Sílabo oficial enlazado en los módulos |
| `estudiantes.csv` | Lista de los 72 estudiantes (Nombre, Grupo, Usuario, Contraseña, Estado) |
| `.gitignore` | Excluye `code.gs` del repositorio |

---

## 1 · Probar en modo demo (sin servidor)

Abre `index.html` en el navegador o sirve la carpeta con cualquier servidor estático. Con `api` vacío en `js/config.js` la plataforma funciona con datos locales (botón «Restablecer datos de prueba» en el login).

- Estudiante: `jose.aguilera` / `rk7bmsqr`
- Profesor (Griego I): `joel.gutierrez` / `griego2026`
- Dirección: `rector-kmczyts` (también `decano-sw7gfv3`, `secretaria-kmp9fke`)

En demo verás **Griego I ya montada**: 20 módulos (presentación, evaluación, sílabo, las 12 lecciones con sus archivos, vocabulario semanal y recursos), los **4 quizzes**, los **2 foros de debate**, **9 tareas** y 4 anuncios, con el 1.er año matriculado.

> En modo demo el lector de lecciones abre los archivos de `contenido/`; si abres el `index.html` por doble clic (file://) usa un servidor local (`python3 -m http.server`) para que los iframes carguen bien.

## 2 · Conectar Google Sheets + Apps Script

1. Crea una hoja de cálculo nueva en Google Drive.
2. **Extensiones → Apps Script**, borra lo que haya y pega **todo el contenido de `code.gs`**.
3. Ejecuta **`setup`** una vez y autoriza los permisos (crea la base, siembra los 72 estudiantes y prepara las hojas globales).
4. **Implementar → Nueva implementación → Aplicación web** · Ejecutar como *Yo* · Quién puede acceder *Cualquier persona*.
5. Copia la URL que termina en `/exec` y pégala en `js/config.js` → campo `api`.
6. Entra como dirección (clave `rector-kmczyts`) y pulsa **«Importar asignatura (JSON)»** → carga el archivo **`griego-i.json`** → Griego I se monta completa en un paso (módulos, lecciones con rutas, 4 quizzes con todas las preguntas, 2 foros, 9 tareas y anuncios).
7. Vuelve a **Implementar → Gestionar implementaciones → Editar → Nueva versión** cada vez que cambies `code.gs`.

### Estructura de la base de datos

**Hojas globales:** `Estudiantes` (72 sembrados por setup), `Profesores` (con Email y Whatsapp), `Asignaturas` (con correo/WhatsApp del profesor, carpeta de Drive y prefijo de hoja), `Matriculas`, `Config`.

**Hojas por asignatura** (prefijo único, p. ej. `A1a2b3c_Examenes`): `Pestanas`, `Examenes`, `Preguntas`, `Intentos`, `Progreso`, `Tareas`, `Entregas`, `Anuncios`, `Chat`, `Foros`, `FPosts`.

> ¿Venías de la versión 2? **`setup()` migra automáticamente** el contenido de las hojas globales antiguas (Pestanas, Examenes, Preguntas, Intentos, Progreso, Anuncios, Chat) a las hojas por asignatura. No se pierde nada.

### Claves de la dirección

| Cargo | Clave |
| --- | --- |
| Rectoría | `rector-kmczyts` |
| Decanato | `decano-sw7gfv3` |
| Secretaría | `secretaria-kmp9fke` |

Deben coincidir en `code.gs` (constante `CLAVES`) y en `js/config.js`. Las claves de demo solo valen en el navegador; en Google Sheets manda `code.gs`.

## 3 · Flujo de trabajo recomendado

1. **Dirección → Asignaturas → Nueva asignatura**: nombre, color, profesor (existente o nuevo — se generan sus credenciales automáticamente y se envían por correo si tiene email) y grupos a matricular.
2. **Dirección → Importar asignatura (JSON)**: para montar en un paso (Griego I con `griego-i.json`, o cualquier JSON con el mismo formato).
3. **Profesor**: entra con sus credenciales y monta su asignatura con total libertad:
   - **Módulos**: lectura, **lección HTML** (archivos de una carpeta, con lector integrado), vocabulario, recursos y enlaces; ordenar, ocultar y editar.
   - **Carpeta**: en Ajustes define la carpeta de archivos (ruta local `contenido` o **carpeta de Drive por ID/enlace**). Al crear un módulo, «Importar archivos desde carpeta» lista los archivos y **guarda la ruta** de cada uno en la hoja.
   - **Tareas**: título, instrucciones, formato y vence. En Ajustes define tu **correo y WhatsApp** para que los botones de envío funcionen. En cada tarea ves quién la marcó como enviada y por qué medio.
   - **Exámenes**: constructor con los 4 tipos. Las redacciones quedan «Pendiente de revisión» hasta que las puntúes en **Resultados → Revisar**.
   - **Foros de debate**: crea foros con pregunta guía y mínimo de palabras; ábrelos y ciérralos cuando quieras.
   - **Foro de dudas**: chat en vivo por asignatura que abres y cierras.
   - **Progreso**: matriz del grupo (módulos, quizzes con nota, tareas enviadas, % de progreso y **promedio**) con exportación CSV.
4. **Estudiante**: ve solo sus asignaturas matriculadas. Dentro de cada una: módulos y lecciones, tareas con envío directo por correo/WhatsApp, quizzes con corrección al instante (las redacciones avisan «pendiente de revisión del profesor»), foros de debate, anuncios, foro de dudas y su progreso con promedio.
5. **Dirección**: acceso y edición de todo; panel con totales por grupo, profesores y por asignatura (alumnos, progreso medio y **promedio medio**).

## 4 · Preguntas de examen: cómo se corrigen

| Tipo | Corrección | Detalle |
| --- | --- | --- |
| Selección múltiple (`sm`) | Automática | Vale los puntos completos si acierta |
| Verdadero / Falso (`vf`) | Automática | Ídem |
| Unir columnas (`emp`) | Automática | Los puntos se reparten entre los pares; la columna B se presenta barajada |
| **Redacción** (`red`) | **El profesor** | Queda «Pendiente de revisión»; el profesor asigna los puntos y la nota final se completa |

La **nota final de un intento = automático + manual**. El **promedio** de cada estudiante es la media de su mejor nota en los quizzes de la asignatura (los no realizados cuentan 0; así el promedio refleja el avance real).

## 5 · Seguridad y repositorio

- **`.gitignore` excluye `code.gs`** (y `*.gs`, `.clasp.json`): el backend con las claves de dirección **nunca se sube al repositorio**. Se gestiona directamente en Apps Script.
- Los estudiantes solo ven asignaturas donde están matriculados; cada escritura valida el rol (estudiante con su usuario y contraseña; profesor solo en su asignatura; dirección con su clave).
- Las contraseñas de profesores nuevos se muestran una sola vez al crearlas (botón «Nueva clave» para regenerarlas).

## 6 · Personalización rápida

- **Tema**: paleta en `js/config.js` (`tema`) — mismos colores que la página de griego.
- **Colores de banner** para asignaturas nuevas: `colores`.
- **Foro en vivo**: frecuencia de actualización en `foro.intervaloMs` (2000–10000 ms).
- **Nuevo contenido**: edita `js/griego-i.js` y vuelve a generar `griego-i.json` (`node scripts/gen_griego_json.js`) si lo usas para importar.
