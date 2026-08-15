# 🗳️ Plataforma de Análisis Cívico y Viabilidad Legal COOTAD de Planes de Trabajo Electorales (Ecuador)

> **Proyecto desarrollado para el Hackatón Social**  
> Herramienta cívica, interactiva y de datos abiertos para la fiscalización ciudadana, evaluación de viabilidad legal bajo el **COOTAD** y comparación algorítmica de planes de gobierno inscritos ante el **Consejo Nacional Electoral (CNE)** de la República del Ecuador.

---

## 📌 Tabla de Contenidos

1. [Objetivo del Proyecto](#-objetivo-del-proyecto)
2. [Características Principales](#-características-principales)
3. [Diferenciación de Dignidades Electorales](#-diferenciación-de-dignidades-electorales)
4. [Evaluación de Viabilidad Legal (COOTAD)](#-evaluación-de-viabilidad-legal-cootad)
5. [Arquitectura y Pipeline de Inteligencia Artificial](#-arquitectura-y-pipeline-de-inteligencia-artificial)
6. [Stack Tecnológico](#-stack-tecnológico)
7. [Estructura del Proyecto](#-estructura-del-proyecto)
8. [Instalación y Ejecución Local](#-instalación-y-ejecución-local)
9. [Descargo de Responsabilidad y Aviso Legal](#-descargo-de-responsabilidad-y-aviso-legal)
10. [Licencia](#-licencia)

---

## 🎯 Objetivo del Proyecto

Democratizar el acceso y la comprensión técnica de los **planes de trabajo de campaña presentados por candidatos a elecciones seccionales en Ecuador**, permitiendo a cualquier ciudadano:
* Auditar si las promesas de campaña están dentro de las **competencias legales exclusivas o concurrentes** del cargo según el Código Orgánico de Organización Territorial, Autonomía y Descentralización (**COOTAD**).
* Identificar propuestas inviables o fuera de competencia (ej. promesas sobre tributos nacionales o mando militar).
* Comparar el grado de similitud y diferencias programáticas entre candidatos de una misma circunscripción territorial.
* Descargar el documento PDF original registrado oficialmente ante el CNE.

---

## ✨ Características Principales

* 🗺️ **Explorador Territorial Interactivo:** Mapas vectoriales (SVG/GeoJSON) navegables de Ecuador a nivel Nacional, Provincial, Cantonal y Parroquial.
* ⚖️ **Evaluación Jurídica Automatizada:** Clasificación rigurosa de cada propuesta con fundamentación en los artículos competenciales del COOTAD.
* 🏷️ **Ejes Temáticos y Tags Normalizados:** Filtrado dinámico por tópicos de campaña (*Movilidad, Seguridad Ciudadana, Desarrollo Sostenible, Infraestructura, Salud, Educación, Gestión de Residuos*).
* 📥 **Descarga Directa de Planes en PDF:** Botón de descarga en cada tarjeta y ficha técnica para consultar el documento fuente oficial.
* 📊 **Matriz de Similitud y Candidato Ancla:** Comparador entre planes para detectar coincidencias textuales y divergencias de enfoque político.
* 🛡️ **Seguridad Zero-Trust en Ingesta:** Sanitización contra Prompt Injection y validación estricta de esquemas mediante Pydantic.
* ⚖️ **Descargo de Responsabilidad Legal:** Pantalla inicial de aceptación de términos de uso de información de acceso público.

---

## 👥 Diferenciación de Dignidades Electorales

La plataforma clasifica y diferencia visual y competencialmente a los candidatos según el cargo al que postulan:

| Dignidad | Ámbito Territorial | Rol Principal | Insignia Visual |
| :--- | :--- | :--- | :--- |
| 🏛️ **Alcaldesa / Alcalde** | Cantonal | Ejecutivo del GAD Municipal; rector del desarrollo urbano, servicios básicos y movilidad. | `Indigo / Morado` |
| 🏛️ **Prefecta / Prefecto** | Provincial | Ejecutivo del GAD Provincial; vialidad rural, cuencas hídricas y fomento productivo agropecuario. | `Esmeralda / Verde` |
| 🏛️ **Concejala / Concejal** | Cantonal (Urbano / Rural) | Legislación y fiscalización cantonal a través de ordenanzas municipales. | `Cielo / Azul` |
| 🏛️ **Vocal Junta Parroquial** | Parroquial Rural | Planificación parroquial, infraestructura comunitaria y coordinación interinstitucional. | `Ámbar / Naranja` |

---

## ⚖️ Evaluación de Viabilidad Legal (COOTAD)

Cada promesa extraída es evaluada bajo el marco competencial vigente:

```
                  ┌────────────────────────────────────────┐
                  │      Evaluación Legal de Promesas      │
                  └───────────────────┬────────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        ▼                             ▼                             ▼
🟢 Exclusiva Municipal       🟡 Parcialmente Viable        🔴 Fuera de Competencia
   (Viable: Sí)                 (Viable: Parcial)             (Viable: No)
• Agua potable y alcantarillado  • Seguridad ciudadana        • Mando policial / militar
• Manejo de residuos sólidos    (solo preventiva/cámaras)     • Impuestos nacionales (IVA)
• Tránsito y transporte cantonal • Apoyo a salud/educación    • Gestión de recursos estratégicos
• Uso y ocupación del suelo      (rectoría es del Estado)      • Hospitales de especialidades
• Vialidad urbana               • Fomento productivo          • Política monetaria
```

---

## 🤖 Arquitectura y Pipeline de Inteligencia Artificial

El procesamiento de documentos sigue un flujo robusto en Python:

1. **Extracción Selectiva (`PyMuPDF`):** Extrae texto ignorando portadas y buscando secciones relevantes de propuestas y ejes de acción para optimizar el contexto.
2. **Defensa Zero-Trust:** Sanitización de caracteres de control y encapsulación del documento dentro de etiquetas XML `<documento_oficial>`.
3. **Inferencia LLM (`OpenAI SDK` + `NVIDIA NIM`):** Invocación al modelo `meta/llama-3.1-8b-instruct` con `temperature=0.0` y `response_format={"type": "json_object"}`.
4. **Validación Pydantic:** Verificación del contrato de datos (`Analisis`, `Promesa`, `DocumentoProcesado`).
5. **Guardado Incremental:** Generación de `src/data/dashboard_data.json` y carga en el catálogo estructurado.

---

## 🛠️ Stack Tecnológico

### Frontend
* **React 19** + **TypeScript**
* **Vite 6** (Build tool y servidor de desarrollo ultrarrápido)
* **Tailwind CSS 3** (Diseño moderno, accesible y responsivo)
* **Lucide React** (Iconografía vectorial institucional)

### Backend / Ingesta de Datos
* **Python 3.10+ / 3.12**
* **PyMuPDF (`pymupdf`)** (Procesamiento de documentos PDF)
* **Pydantic v2** (Validación de esquemas y tipos de datos)
* **NVIDIA NIM API** (`meta/llama-3.1-8b-instruct`)
* **python-dotenv** (Gestión de variables de entorno seguras)

---

## 📁 Estructura del Proyecto

```
HACKATON SOCIAL/
├── public/
│   ├── data/                          # Capas vectoriales GeoJSON de provincias y cantones
│   └── planes/                        # Archivos PDF oficiales para descarga directa
├── src/
│   ├── components/
│   │   ├── CandidateDetailModal.tsx   # Ficha técnica detallada con desglose de promesas
│   │   ├── CandidatoCard.tsx          # Tarjeta con monograma, dignidad, viabilidad y PDF
│   │   ├── CompetenciaBadge.tsx       # Insignias visuales de viabilidad COOTAD
│   │   ├── Dashboard.tsx              # Componente principal integrador
│   │   ├── DisclaimerModal.tsx        # Descargo de responsabilidad y términos de uso
│   │   ├── FiltersSidebar.tsx         # Filtros por dignidad, provincia, cantón y búsqueda
│   │   ├── Header.tsx                 # Barra superior institucional y navegación
│   │   ├── MapExplorer.tsx            # Visualizador de mapas vectoriales del Ecuador
│   │   ├── PlansView.tsx              # Vista de planes, KPIs, tags y comparador
│   │   └── SimilarityDetailModal.tsx  # Modal de análisis comparativo de propuestas
│   ├── data/
│   │   ├── mock_candidatos.json       # Datos analizados y estructurados para el Dashboard
│   │   ├── dashboard_data.json        # Salida del pipeline de procesamiento LLM
│   │   └── PLANES DE TRABAJO/         # Directorio de PDFs originales del CNE
│   ├── hooks/
│   │   └── useElectoralData.ts        # Hook para filtros, desduplicación y estadísticas
│   ├── scripts/
│   │   └── procesador_planes.py       # Pipeline de extracción, LLM y validación Pydantic
│   ├── types/
│   │   └── electoral.ts               # Interfaces TypeScript del dominio electoral
│   ├── App.tsx                        # Punto de entrada de la aplicación
│   └── main.tsx                       # Renderizado raíz de React
├── .env.example                       # Plantilla de variables de entorno
├── package.json                       # Dependencias y scripts de Node
├── requirements.txt                   # Dependencias de Python
├── tailwind.config.js                 # Configuración de Tailwind CSS
├── tsconfig.json                      # Configuración de TypeScript
└── vite.config.ts                     # Configuración de Vite
```

---

## 🚀 Instalación y Ejecución Local

### Prerrequisitos
* **Node.js** v18 o superior
* **npm** v9 o superior
* **Python** 3.10 o superior (para ejecutar el pipeline de ingesta)

### 1. Clonar el repositorio e instalar dependencias de Frontend

```bash
# Clonar el proyecto
git clone <URL_DEL_REPOSITORIO>
cd "HACKATON SOCIAL"

# Instalar dependencias de Node
npm install
```

### 2. Iniciar el servidor de desarrollo

```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:5173`.

---

### 3. (Opcional) Ejecutar el Pipeline de Ingesta con IA

Si deseas reprocesar los PDFs con la API de NVIDIA NIM:

```bash
# 1. Configurar entorno virtual de Python
python -m venv .venv

# En Windows PowerShell:
.venv\Scripts\Activate.ps1

# En Linux / macOS:
source .venv/bin/activate

# 2. Instalar requerimientos
pip install -r requirements.txt

# 3. Configurar API Key en .env
# Crear archivo .env basado en .env.example:
# NVIDIA_API_KEY=nvapi-...

# 4. Ejecutar el procesador
python src/scripts/procesador_planes.py
```

---

## ⚖️ Descargo de Responsabilidad y Aviso Legal

1. **Fuente de Datos:** Los documentos y propuestas electorales provienen de registros públicos del **Consejo Nacional Electoral (CNE)** del Ecuador.
2. **Propósito Cívico e Informativo:** Esta plataforma es una iniciativa desarrollada sin fines de lucro en el marco del **Hackatón Social** para promover el voto informado y el análisis ciudadano de datos públicos.
3. **Naturaleza del Análisis:** Las evaluaciones competenciales y de viabilidad legal constituyen estimaciones analíticas basadas en modelos de inteligencia artificial y el marco normativo del COOTAD. No representan dictámenes vinculantes, auditorías jurídicas oficiales ni posturas políticas partidistas.
4. **Exención de Responsabilidad:** Los autores y organizadores no asumen responsabilidad civil, legal o política derivada de la interpretación, uso o decisiones adoptadas a partir de los datos visualizados en esta plataforma.
5. **Responsabilidad sobre Productos Derivados:** Cualquier reporte, gráfico, síntesis, interpretación o producto que el usuario elabore o publique a partir de los datos de esta plataforma es de **responsabilidad única y exclusiva del usuario**.

---

## 📄 Licencia

Este proyecto y sus contenidos analíticos abiertos se distribuyen bajo la licencia **Creative Commons Atribución-NoComercial-CompartirIgual 4.0 Internacional (CC BY-NC-SA 4.0)**.

```
Usted es libre de:
* Compartir: copiar y redistribuir el material en cualquier medio o formato.
* Adaptar: remezclar, transformar y construir a partir del material.

Bajo los siguientes términos:
* Atribución: Debe dar crédito de manera adecuada y proporcionar un enlace a la licencia.
* NoComercial: No puede hacer uso del material con fines comerciales.
* CompartirIgual: Si remezcla, transforma o crea a partir del material, debe distribuir su contribución bajo la misma licencia.
```
