# ArachneMind
## Visual Autonomous Web Crawler & Obsidian-Style Interactive Knowledge Graph

[![GitHub](https://img.shields.io/badge/GitHub-Open%20Source-181717?logo=github&logoColor=white)](https://github.com/brunofaomoura-max/arachnemind)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Playwright](https://img.shields.io/badge/Playwright-Chromium-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

ArachneMind is a high-performance full-stack platform designed for autonomous web exploration, geometric Document Object Model (DOM) inspection, and structured data extraction. The system combines an in-browser procedural visual crawling engine powered by analytical two-bone Inverse Kinematics (IK) with an interactive 2D force-directed knowledge graph modeled after the Obsidian standard for conceptual mind mapping and multi-marketplace price intelligence in real time.

---

## Visual Demonstration

![ArachneMind Autonomous Spider Crawling Demo](docs/assets/spider-crawler-demo.gif)
*Figure 1: Autonomous procedural spider (8 appendages with 2-joint analytical IK) navigating and inspecting DOM elements and product offers in real time.*

---

## Table of Contents

- [Overview](#overview)
- [Visual Interface Tour](#visual-interface-tour)
  - [Main Workspace & Knowledge Graph](#1-main-workspace--knowledge-graph)
  - [Procedural Inspection with Inverse Kinematics (IK)](#2-procedural-inspection-with-inverse-kinematics-ik)
  - [Comparative Quotation Drawer & Price Sentinel](#3-comparative-quotation-drawer--price-sentinel)
  - [Mind Mapping & Structured HTML Table Extraction](#4-mind-mapping--structured-html-table-extraction)
- [Software Architecture](#software-architecture)
- [4-Layer Hybrid Extraction Engine](#4-layer-hybrid-extraction-engine)
- [Statistical Outlier & Accessory Filtering](#statistical-outlier--accessory-filtering)
- [Price Sentinel & Polyphonic Audio Alert](#price-sentinel--polyphonic-audio-alert)
- [REST API Specification](#rest-api-specification)
- [Export Formats](#export-formats)
- [Technology Stack](#technology-stack)
- [Installation and Execution](#installation-and-execution)
- [Security Audit](#security-audit)
- [License](#license)

---

## Overview

Unlike conventional static crawlers relying on raw HTTP requests or headless drivers lacking visual context, ArachneMind orchestrates visible Chromium browsers via Playwright and injects a procedural HTML5 Canvas overlay across the viewport. The spider identifies target elements through Euclidean distance calculations, projects collimated laser targeting beams onto text or price nodes, and extracts normalized metadata.

Concurrently, structured nodes and edges are dispatched via WebSockets (Socket.io) to the React client, where an elastic force-directed simulation engine (D3.js force layout) computes positions, link distances, and electrostatic repulsion at a steady 60 frames per second.

---

## Visual Interface Tour

### 1. Main Workspace & Knowledge Graph

The unified workspace integrates the active session sidebar, the force-directed 2D canvas, and the analytical inspection drawer.

![ArachneMind Obsidian Knowledge Graph Workspace](docs/assets/arachnemind-workspace-overview.png)
*Figure 2: Complete operational workspace of ArachneMind displaying product nodes, store offers, cash prices with a pulsing emerald Best Deal badge, and synaptic connections.*

### 2. Procedural Inspection with Inverse Kinematics (IK)

The in-browser graphical overlay resolves limb physics using real-time analytical kinematics:

![ArachneMind Procedural Spider Overlay & DOM Laser HUD](docs/assets/spider-inspection-overlay.png)
*Figure 3: Procedural spider engine resolving coordinated tetrapod gait and firing collimated targeting beams with a holographic telemetry HUD.*

- **Trigonometric Resolution:** Each leg calculates femur and tibia joint angles through the Law of Cosines, dynamically adapting limb extension to viewport coordinates.
- **Tetrapod Gait:** Alternating support and elevation phases simulate biological arachnid locomotion across real DOM element bounding boxes.
- **Magnifier HUD:** Collimated viewport reticle displaying formal CSS selectors, semantic tags, and validated numeric prices.

### 3. Comparative Quotation Drawer & Price Sentinel

Engineered for price dispersion analysis and immediate identification of the lowest price across major retailers (Buscape, Amazon, KaBuM!, and Zoom).

![ArachneMind Price Finder Quotation Drawer](docs/assets/price-finder-quotation-drawer.png)
*Figure 4: Analytical drawer displaying the Best Price Found hero card, percentage savings vs. highest price, Price Sentinel target monitor, and ranked merchant listings.*

- **Best Deal Hero Card:** Highlights the lowest validated price with automated computation of savings against market average and peak prices.
- **Sentinel Monitoring:** Sets a target threshold and triggers an instant polyphonic chime through the Web Audio API upon price drop detection.
- **Ranked Merchant Table:** Ascending price order featuring seller attribution, product thumbnails, installment terms, shipping status, and direct purchase links.

### 4. Mind Mapping & Structured HTML Table Extraction

In conceptual mode, ArachneMind parses articles, technical documentation, and knowledge bases (e.g., Wikipedia) into semantic graphs.

![ArachneMind Mind Map & Structured Data Table Extraction](docs/assets/mind-map-knowledge-graph.png)
*Figure 5: Conceptual knowledge graph in Mind Map mode featuring Web Domain nodes, HTML Webpage nodes, Structured Data Tables (`data_table`), and Analytical Facts scored by metric density.*

- **Content Isolation:** Discards navigation bars, footers, login modals, and cookie banners to focus extraction strictly on primary body containers (`article`, `main`, `.mw-parser-output`).
- **Structured Table Parsing:** Automatically parses HTML `<table>` elements into formal nodes with column/row key-value attributes and markdown previews.
- **Cross-Tree Synapses (Global Brain):** Semantic term hashing connects distinct search sessions sharing common domains or concepts.

---

## Software Architecture

```
+-----------------------------------------------------------------------------------------+
|                                  ARACHNEMIND ECOSYSTEM                                  |
+--------------------------------------------+--------------------------------------------+
|                  BACKEND                   |                  FRONTEND                  |
|             (Node.js / Express)            |          (React 18 / Vite / Tailwind)      |
+--------------------------------------------+--------------------------------------------+
|                                            |                                            |
|  [Playwright Visible Chromium Engine]      |  [Force-Directed 2D Graph Engine]          |
|    |-> HTML5 Canvas IK Spider Overlay      |    |-> D3.js Force Simulation Engine       |
|    |-> 4-Layer Hybrid Scraping Engine      |    |-> Canvas 2D Node Renderer with Pulses |
|    |-> Multi-Store Queue Orchestrator      |    \-> Synaptic Cross-Tree Links           |
|                                            |                                            |
|  [Core Processing & Business Logic]        |  [Analytics & User Controls]               |
|    |-> Statistical Median Outlier Filter   |    |-> Comparative Quotation Drawer        |
|    |-> Model Token Strict Matcher          |    |-> Web Audio API Harmonic Alert Synthesizer|
|    |-> HTML Table to Markdown Converter    |    |-> Workspace Manager (Price vs Mind Map)|
|    |-> Real-time WebSocket Broadcaster     |    \-> Obsidian Vault / CSV Exporters      |
|                                            |                                            |
+--------------------------------------------+--------------------------------------------+
                      |                                            ^
                      |         Socket.io Events & REST API        |
                      +────────────────────────────────────────────+
```

---

## 4-Layer Hybrid Extraction Engine

Implemented in `backend/src/scraper-engine.js`, the hybrid engine processes web pages through four coordinated extraction strategies:

| Layer | Strategy | Target Scope | Extracted Attributes |
| :--- | :--- | :--- | :--- |
| **Layer 1** | Hydration State (`__NEXT_DATA__`) | Next.js platforms (e.g., KaBuM!) | Exact cash/PIX discount prices, card prices, SKU codes, review ratings, and high-res imagery. |
| **Layer 2** | Schema.org JSON-LD | Pages containing microdata | Formal `Product`, `Offer`, `AggregateOffer`, and `ItemList` semantic objects. |
| **Layer 3** | Dedicated DOM Adapters | Amazon Brasil, Buscape, and Zoom | Normalized product titles, partner merchant names, cashback percentages, installments, and shipping. |
| **Layer 4** | Universal Geometric Fallback | Generic e-commerce catalogs | Bounding box spatial heuristics with monetary regex validation. |

---

## Statistical Outlier & Accessory Filtering

To ensure that only legitimate offers of the target product appear in the quotation drawer, the engine applies strict heuristic validations:

1. **Alphanumeric Model Token Matching:** When searching for specific models (e.g., `RTX 4060` or `144Hz`), listings missing the exact spec tokens are eliminated, preventing sponsored competitor ads (e.g., `RTX 3050` or `RX 7600`) from contaminating the search.
2. **Accessory and Bundle Disambiguation:** Discards cables, adapters, phone cases, screen protectors, thermal paste, and empty boxes when searching for core hardware, while differentiating complete pre-built PCs from individual components.
3. **Statistical Median Bounds:**
   $$\text{Minimum Valid Price} = 0.28 \times \text{Median}$$
   $$\text{Maximum Valid Price} = 2.60 \times \text{Median}$$
   Prices falling below $28\%$ of the calculated median (typically cables or spare parts) or exceeding $260\%$ (typically complete computer bundles) are flagged as outliers and excluded from the top ranking.

---

## Price Sentinel & Polyphonic Audio Alert

The platform allows setting a target threshold for any active tree. The monitoring module continuously compares the current lowest price against this goal:

- **Web Audio API Synthesizer:** Without loading external audio files, the browser synthesizes a dual-sine harmonic chord ($523.25\text{ Hz}$ and $659.25\text{ Hz}$) at the exact millisecond a price drops to or below the target.
- **Visual Alert Notification:** An alert banner presents the retailer, price drop amount, and direct link for immediate acquisition.

---

## REST API Specification

The backend exposes RESTful endpoints for session control, node expansion, and data export:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/state` | Returns the entire graph state (trees, nodes, edges, and Global Brain synapses). |
| `POST` | `/api/trees/crawl` | Initializes a new autonomous crawling session (Price Finder or Mind Map). |
| `POST` | `/api/trees/:treeId/stop` | Terminates active Playwright browser execution for the specified tree. |
| `POST` | `/api/trees/:treeId/refresh` | Triggers a multi-marketplace re-crawl to refresh quotations on an existing tree. |
| `GET` | `/api/trees/:treeId/quotes` | Consolidates ranked merchant quotations, dispersion statistics, and savings metrics. |
| `POST` | `/api/trees/:treeId/sentinel` | Configures or removes the Price Sentinel target threshold. |
| `POST` | `/api/nodes/:nodeId/expand` | Directs the spider to initiate deeper crawling starting from an existing node. |
| `POST` | `/api/nodes/manual` | Creates a manual annotation or formal data point attached to an existing parent node. |
| `DELETE` | `/api/nodes/:nodeId` | Deletes a single node or performs a recursive cascade prune (`?cascade=true`). |
| `DELETE` | `/api/trees/:treeId` | Permanently deletes a search tree and all associated nodes and edges. |
| `GET` | `/api/trees/:treeId/quote-export` | Exports the comparative price table as tabular CSV (`?format=csv`) or Obsidian Markdown (`?format=markdown`). |
| `GET` | `/api/trees/:treeId/export` | Exports the full graph structure in structured JSON, relational CSV, or Obsidian Vault format. |

---

## Export Formats

1. **Obsidian Vault (`.md`):** Markdown files with YAML frontmatter, formatted comparison tables, and WikiLinks (`[[Node]]`) compatible with Obsidian's native graph visualization.
2. **Relational CSV (`.csv`):** Tabular format with columns for Rank, Best Price Status, Retailer, Product Title, Cash Price, Installment Terms, Shipping, Savings Ratio, and Direct URL.
3. **Structured JSON (`.json`):** Full relational dump containing `trees`, `nodes`, and `edges` with ISO 8601 timestamps and formal CSS selectors.

---

## Technology Stack

| Domain | Technology | Purpose |
| :--- | :--- | :--- |
| **User Interface** | React 18, Vite | Reactive component lifecycle and state management |
| **Graph Visualization** | react-force-graph-2d, D3.js | Real-time force simulation (Charge, Link, Gravity) |
| **Styling System** | Tailwind CSS | High-density information dark theme and cybernetic aesthetics |
| **Application Server** | Node.js, Express | REST routing and concurrent task orchestration |
| **Real-Time Transport** | Socket.io | Bidirectional event streaming and crawler telemetry |
| **Browser Automation** | Playwright (Chromium) | Browser lifecycle management and procedural canvas injection |
| **Audio Synthesis** | Web Audio API | Zero-dependency polyphonic harmonic notification alerts |

---

## Installation and Execution

### System Requirements
- **Node.js:** Version 18.0.0 or higher.
- **npm:** Version 9.0.0 or higher.
- **Operating System:** Windows, Linux, or macOS.

### Step 1: Clone the Repository
```bash
git clone https://github.com/brunofaomoura-max/arachnemind.git
cd arachnemind
```

### Step 2: Initialize Backend Server
Open a terminal and run:
```bash
cd backend
npm install
npx playwright install chromium
npm start
```
*The orchestrator runs on port 4000 (`http://localhost:4000`). Local database files are auto-generated on initial launch.*

### Step 3: Initialize Frontend Client
In a separate terminal, run:
```bash
cd frontend
npm install
npm run dev
```
*Access the web application at `http://localhost:5173`.*

---

## Security Audit

The source code and dependencies of this project have undergone static security auditing using the **NVIDIA SkillSpector** framework, verifying adherence to secure coding standards, the absence of arbitrary execution scripts, and protection against credential leakage.

---

## License

This project is open-source software licensed under the terms of the MIT License. Refer to the [LICENSE](LICENSE) file for complete terms and conditions.

---

Author: **Bruno Fao Moura**  
Official Repository: [https://github.com/brunofaomoura-max/arachnemind](https://github.com/brunofaomoura-max/arachnemind)
