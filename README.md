# Filtra · Landing de validación (MVP E6)

Landing de una sola pantalla para medir si los estudiantes de UTEC **quieren** el producto antes de construirlo.

> "Para estudiantes de UTEC que pierden tiempo verificando si un archivo les sirve, filtramos y organizamos exámenes pasados y resúmenes según su profesor y sílabo actual."
> — Equipo Todo al Rojo

**Métrica de éxito:** el % de visitantes que pulsan **"Quiero esto"** y dejan su correo `@utec.edu.pe`.

## Qué contiene

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La página: hero, demo "caos → orden", beneficios, calculadora y formulario |
| `styles.css` | Diseño (colores, animaciones, versión móvil) |
| `app.js` | Animaciones, formulario y envío de datos a la base de datos |
| `config.js` | **Aquí pegas tus claves de Supabase** |
| `supabase/schema.sql` | Crea las tablas `leads` y `events` y la vista `analytics.metrics` |
| `assets/utec-logo.png` | Logo UTEC (reemplázalo por uno en alta resolución con el mismo nombre) |

Sin claves en `config.js`, la página funciona en **modo demo** y guarda los datos solo en tu navegador.

## Despliegue gratis en 3 pasos (≈15 min)

### 1. Base de datos: Supabase
1. Crea una cuenta en <https://supabase.com> → **New project** (plan Free).
2. Ve a **SQL Editor → New query**, pega todo el contenido de `supabase/schema.sql` y presiona **Run**.
3. Ve a **Project Settings → API Keys** y copia:
   - **Project URL** → `https://xxxx.supabase.co`
   - **Publishable key** (`sb_publishable_…`) o la **anon key** (`eyJ…`)
4. Pégalos en `config.js`, haz commit y push.

> La clave pública **sí puede** estar en el código: las reglas RLS solo permiten *insertar*. Nadie puede leer los correos desde la web. **Nunca** pongas la `service_role` / `secret` key.

### 2. Hosting: GitHub Pages
1. En GitHub, abre el repo → **Settings → Pages**.
2. En **Source**, elige **Deploy from a branch**, rama `main`, carpeta `/ (root)` → **Save**.
3. En 1–2 minutos tu página estará en `https://deyvydt.github.io/emprendimiento/`.

(Alternativas igual de gratuitas: Netlify o Vercel → "Import from GitHub", sin configuración extra.)

### 3. Compártela y mide por canal
Agrega `?ref=` al link para saber de dónde llega cada persona:

```
https://deyvydt.github.io/emprendimiento/?ref=whatsapp
https://deyvydt.github.io/emprendimiento/?ref=instagram
https://deyvydt.github.io/emprendimiento/?ref=qr-campus
```

## Ver resultados

En Supabase:
- **Table Editor → `leads`**: lista de correos interesados (puedes exportar a CSV).
- **SQL Editor**:

```sql
select * from analytics.metrics;                                              -- visitantes, clics, correos y % de conversión
select ref, count(*) from leads group by ref;                        -- qué canal convierte mejor
select course, count(*) from leads group by course order by 2 desc;  -- cursos más pedidos
```

## Qué se registra

| Evento | Cuándo |
|---|---|
| `visit` | Alguien abre la página |
| `cta_click` | Pulsa "Quiero esto" (`source` dice qué botón) |
| `demo_toggle` | Usa la demo "Ordenar con Filtra" |
| `calc_use` | Mueve la calculadora de horas |
| `share` | Pulsa "Compártelo con tu grupo" |
| `leads` (tabla) | Deja su correo @utec.edu.pe |

No se usan contadores ni testimonios falsos: así la métrica refleja interés real.
