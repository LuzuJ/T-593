# 🗳️ Plataforma de Análisis Cívico y Viabilidad Competencial COOTAD (Ecuador)

> **Proyecto desarrollado para el Hackatón Social**  
> Herramienta cívica, interactiva y de datos abiertos para consultar los planes de trabajo inscritos ante el **Consejo Nacional Electoral (CNE)** del Ecuador (Proceso Electoral `140` — Seccionales 2027–2031), evaluar de forma determinista su alineación competencial bajo el **COOTAD** y comparar propuestas entre listas.

---

## 📌 Tabla de Contenidos

1. [Objetivo del Proyecto](#-objetivo-del-proyecto)
2. [Características Principales](#-características-principales)
3. [Fuente de Datos Oficiales (CNE — Proceso 140)](#-fuente-de-datos-oficiales-cne--proceso-140)
4. [Diferenciación de Dignidades Electorales](#-diferenciación-de-dignidades-electorales)
5. [Motor de Evaluación Competencial (COOTAD)](#-motor-de-evaluación-competencial-cootad)
6. [Arquitectura y Pipeline de Datos](#-arquitectura-y-pipeline-de-datos)
7. [Stack Tecnológico](#-stack-tecnológico)
8. [Estructura del Proyecto](#-estructura-del-proyecto)
9. [Instalación y Ejecución Local](#-instalación-y-ejecución-local)
10. [Despliegue y Proxy de PDFs (`/cne-plan`)](#-despliegue-y-proxy-de-pdfs-cne-plan)
11. [Descargo de Responsabilidad y Aviso Legal](#-descargo-de-responsabilidad-y-aviso-legal)
12. [Licencia](#-licencia)

---

## 🎯 Objetivo del Proyecto

Facilitar la lectura técnica y el acceso ciudadano a los **7,694 registros de listas** (7,690 con plan de trabajo en PDF) inscritos ante el CNE para las elecciones seccionales de Ecuador, permitiendo:
* Navegar por provincia y cantón para ubicar a los candidatos de cada dignidad.
* Extraer citas verificables con **número de página** y contrastarlas contra las competencias legales exclusivas o concurrentes del cargo según la **Constitución** y el **COOTAD**.
* Abrir cualquier PDF oficial en el visor integrado (modo continuo o paginado en canvas móvil) y saltar directo a la página de cada cita.
* Comparar tema por tema dos listas de una misma circunscripción, suspendiendo la comparación si alguno de los archivos carece de texto extraíble.

---

## ✨ Características Principales

* 🗺️ **Explorador Territorial Interactivo:** Mapas vectoriales de Ecuador a nivel Nacional y Provincial con búsqueda global por lugar o candidato (`GlobalSearchBar`).
* ⚖️ **Auditoría Determinista por Reglas (`reglas_cootad.json`):** Clasificación transparente y reproducible de frases de propuestas sin alucinaciones de LLM ni puntajes opacos.
* 🔍 **Trazabilidad por Página y Visor PDF (`pdfjs-dist`):** Cada frase citada enlaza a su página en `VisorPlan.tsx`, con renderizado en canvas bajo demanda para móviles.
* 📊 **Comparador Tema por Tema (`ComparadorPlanes.tsx`):** Contraste lado a lado con muestreo equilibrado (*round-robin* hasta 24 frases) entre listas del mismo cargo.
* ⚡ **Cero Latencia en Catálogos:** Datos precalculados y particionados por provincia (`public/data/cne/provincias/` y `public/data/cne/auditorias_provincias/`), con fallback dinámico en cliente si falta una auditoría estática.
* ⚖️ **Descargo de Responsabilidad Legal:** Aviso inicial (`DisclaimerModal.tsx`) sobre el carácter informativo y no vinculante de las muestras automáticas.

---

## 📡 Fuente de Datos Oficiales (CNE — Proceso 140)

Todos los catálogos de candidaturas, organizaciones políticas y planes de trabajo en PDF provienen directamente de los servicios públicos oficiales de **Voto Informado** y **SARE** del **Consejo Nacional Electoral (CNE)** para el **Proceso Electoral `140`**:

### Endpoints Utilizados
* **Origen Web:** `https://votoinformado.cne.gob.ec`
* **Autenticación Voto Informado (`AUTH_VI`):** `https://votoinformado.cne.gob.ec/voto-informado/api/auth-vi`
* **Autenticación SARE (`AUTH_SARE`):** `https://votoinformado.cne.gob.ec/voto-informado/api/auth`
* **Catálogos Voto Informado (`VI_BASE`):** `https://backend-apps.cne.gob.ec/vi/api/Catalogos`
* **Consultas SARE (`SARE_BASE`):** `https://backend-apps.cne.gob.ec/sare-consulta/api`
* **Descarga de Planes de Trabajo (`PLAN_URL`):** `https://backend-apps.cne.gob.ec/vi/api/Catalogos/PlanTrabajo/{proceso}/{formulario}/{plan}`

### Catálogo de Dignidades y Subtipos (`PROCESO = 140`)

| Código (`cod_dignidad`) | Dignidad | Subtipo Oficial CNE | Ámbito Territorial | Total Listas |
| :---: | :--- | :--- | :--- | :---: |
| `2` | **Prefecto** | Prefecto y viceprefecto | `provincia` | 147 |
| `4` | **Alcalde** | Alcalde | `provincia`, `canton` | 1,353 |
| `5` | **Concejal** | Concejales urbanos | `provincia`, `canton` | 1,094 |
| `3` | **Concejal** | Concejales rurales | `provincia`, `canton` | 936 |
| `12` | **Concejal** | Concejales urbanos por circunscripción | `provincia`, `canton`, `circunscripcion` | 334 |
| `6` | **Vocal Junta Parroquial** | Vocales de junta parroquial rural | `provincia`, `canton`, `parroquia` | 3,830 |

---

## 👥 Diferenciación de Dignidades Electorales

| Dignidad | Ámbito Territorial | Base Normativa Aplicada |
| :--- | :--- | :--- |
| 🏛️ **Prefecta / Prefecto** | Provincial | COOTAD Art. 42 / Constitución Art. 263 (vialidad rural, riego, cuencas, fomento agropecuario, ambiente). |
| 🏛️ **Alcaldesa / Alcalde** | Cantonal | COOTAD Art. 55 (agua potable, alcantarillado, residuos, tránsito urbano, uso de suelo, catastro, mercados). |
| 🏛️ **Concejala / Concejal** | Cantonal (Urbano / Rural / Circunscripción) | COOTAD Arts. 57 y 60 (legislación y fiscalización; distingue ejecución directa que corresponde a la alcaldía). |
| 🏛️ **Vocal Junta Parroquial** | Parroquial Rural | COOTAD Art. 65 (infraestructura comunitaria, vialidad vecinal, organización parroquial). |

---

## ⚖️ Motor de Evaluación Competencial (COOTAD)

Las reglas léxicas y normativas viven en un único archivo fuente (**Single Source of Truth**): [`src/data/reglas_cootad.json`](src/data/reglas_cootad.json), consumido tanto por el generador offline en Python como por el motor fallback en TypeScript.

Cada frase extraída de las secciones de propuestas se clasifica en una de tres categorías:

* 🟢 **Competencia del cargo (`Sí`):** Menciona materias propias del nivel de gobierno según el COOTAD.
* 🟡 **Requiere coordinación o convenio (`Parcial`):** Materias concurrentes o interinstitucionales (salud, educación, seguridad ciudadana preventiva, convenios con ministerios/universidades).
* 🔴 **Corresponde a otro nivel (`No`):** Materias privativas del Estado central (Constitución Art. 261: Policía Nacional, FF.AA., IVA, política monetaria) o de otro nivel de GAD.

---

## 🤖 Arquitectura y Pipeline de Datos

El procesamiento es **determinista y precalculado offline** (sin inferencia LLM en tiempo de ejecución):

1. **Indexación CNE (`src/scripts/mapear_planes_cne.py`):** Recorre las APIs públicas del CNE y genera `public/data/cne/indice_planes_api.jsonl` e `indice_planes_api_meta.json`.
2. **Particionado Territorial (`src/scripts/particionar_cne_frontend.py`):** Divide el padrón e índice por provincia en `public/data/cne/provincias/{slug}.json` y `public/data/cne/auditorias_provincias/{slug}.json`.
3. **Auditoría Estática + OCR Offline (`src/scripts/generar_auditorias.py`):**
   * Descarga y extrae texto página por página con `PyMuPDF`.
   * Si una página está escaneada como imagen, ejecuta OCR local con `RapidOCR` (`rapidocr_onnxruntime`).
   * Aplica las reglas de `src/data/reglas_cootad.json` con muestreo equilibrado *round-robin* (hasta 24 citas, máximo 3 por tema).
4. **Fallback en Cliente (`src/utils/auditarPlan.ts`):** Si un plan no tiene auditoría precalculada en `/data/cne/auditorias_provincias/{slug}.json`, el navegador descarga el PDF vía `/cne-plan/...` y ejecuta exactamente las mismas reglas usando `pdfjs-dist`.

---

## 🛠️ Stack Tecnológico

### Frontend
* **React 18.3** + **TypeScript 5.2**
* **Vite 5.3** (dev server, proxy `/cne-plan` y bundler)
* **Tailwind CSS 3.4**
* **pdfjs-dist 4.10** (extracción de texto en fallback y renderizado en canvas)
* **Lucide React** (iconografía)
* **Vitest 2.1** (pruebas unitarias)

### Pipeline Offline (Python)
* **Python 3.10+**
* **PyMuPDF (`pymupdf`)**
* **RapidOCR (`rapidocr_onnxruntime`)** para PDFs escaneados

---

## 📁 Estructura del Proyecto

```text
HACKATON SOCIAL/
├── public/
│   ├── _redirects                      # Proxy /cne-plan para Cloudflare Pages / Netlify
│   └── data/
│       ├── provinces/                  # Capas vectoriales de provincias y cantones
│       └── cne/
│           ├── provincias/             # Catálogos FilaPlan[] particionados por provincia
│           └── auditorias_provincias/  # Auditorías precalculadas por provincia
├── src/
│   ├── components/
│   │   ├── ComparadorPlanes.tsx        # Comparación lado a lado tema por tema
│   │   ├── Dashboard.tsx               # Contenedor principal y navegación territorial
│   │   ├── DisclaimerModal.tsx         # Aviso legal inicial
│   │   ├── ExplorarPlanes.tsx          # Listado por dignidad, precarga y filtros
│   │   ├── GlobalSearchBar.tsx         # Búsqueda global de lugares y candidatos
│   │   ├── Header.tsx                  # Barra institucional y acceso a organizaciones
│   │   ├── MapExplorer.tsx             # Mapa SVG interactivo de Ecuador y provincias
│   │   ├── OrganizacionesModal.tsx     # Catálogo de organizaciones políticas
│   │   └── VisorPlan.tsx               # Visor PDF (iframe en desktop / canvas en móvil)
│   ├── data/
│   │   ├── reglas_cootad.json          # SSOT de reglas competenciales y temas
│   │   ├── geo_data.ts                 # Metadatos geográficos de provincias
│   │   └── conteos_proceso_140.json    # Totales oficiales por provincia
│   ├── scripts/
│   │   ├── mapear_planes_cne.py        # Indexación del catálogo oficial CNE
│   │   ├── particionar_cne_frontend.py # Generación de JSONs particionados por provincia
│   │   ├── generar_auditorias.py       # Auditoría offline + RapidOCR
│   │   └── generar_indice_nacional.py  # Índice de búsqueda global
│   ├── utils/
│   │   ├── auditarPlan.ts              # Motor de auditoría en cliente + fallback PDF
│   │   ├── catalogoPlanes.ts           # Carga, búsqueda y normalización territorial
│   │   └── cnePlanUrl.ts               # Resolución de URLs de proxy/local/CNE
│   ├── App.tsx
│   └── main.tsx
├── netlify.toml                        # Configuración de build y proxy /cne-plan para Netlify
├── vercel.json                         # Rewrites /cne-plan para Vercel
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 🚀 Instalación y Ejecución Local

### Prerrequisitos
* **Node.js** v18 o superior
* **npm** v9 o superior
* **Python** 3.10 o superior (solo si deseas regenerar índices o auditorías offline)

### 1. Instalar dependencias y levantar el frontend

```bash
npm install
npm run dev
```
Disponible en `http://localhost:5173`.

### 2. Pruebas y compilación

```bash
npm test
npm run build
```

### 3. (Opcional) Regenerar auditorías estáticas en Python

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install pymupdf rapidocr-onnxruntime
python src/scripts/generar_auditorias.py --solo-ejecutivo --workers 8
```

---

## 🌐 Despliegue y Proxy de PDFs (`/cne-plan`)

Para evitar bloqueos CORS al abrir o auditar PDFs desde el navegador:
* **Vercel:** configurado en [`vercel.json`](vercel.json).
* **Netlify / Cloudflare Pages:** configurado en [`netlify.toml`](netlify.toml) y [`public/_redirects`](public/_redirects).
* **Hostings puramente estáticos sin rewrites (ej. GitHub Pages / S3):** define `VITE_CNE_PLAN_PROXY_BASE` en `.env` apuntando a un proxy propio (ver [`.env.example`](.env.example)).

---

## ⚖️ Descargo de Responsabilidad y Aviso Legal

1. **Fuente de Datos:** Los documentos y listados provienen de registros públicos del **Consejo Nacional Electoral (CNE)** del Ecuador.
2. **Propósito Cívico e Informativo:** Iniciativa sin fines de lucro desarrollada en el marco del **Hackatón Social** para promover el voto informado.
3. **Naturaleza del Análisis:** La extracción y clasificación de frases responde a reglas léxicas automáticas aplicadas de forma uniforme. **No constituye un dictamen jurídico vinculante, una calificación ni una lectura completa del PDF.**

---

## 📄 Licencia

Este proyecto se distribuye bajo la licencia **Creative Commons Atribución-NoComercial-CompartirIgual 4.0 Internacional (CC BY-NC-SA 4.0)**.
