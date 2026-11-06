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

ArachneMind e uma plataforma full-stack para exploracao e extracao estruturada de dados da web. O sistema combina uma engine procedural de inspecao visual no Document Object Model (DOM) com resolucao de cinematica inversa (Inverse Kinematics - IK) e um grafo de conhecimento bidimensional interativo no padrao Obsidian para mapeamento conceitual e comparacao de precos em tempo real.

---

## Sumario

- [Visao Geral](#visao-geral)
- [Arquitetura do Sistema](#arquitetura-do-sistema)
- [Modos de Operacao](#modos-de-operacao)
  - [Price Finder](#1-modo-price-finder-radar-de-precos)
  - [Mapeamento Mental](#2-modo-mapeamento-mental)
- [Motor Procedural de Inspecao Visual (IK Solver)](#motor-procedural-de-inspecao-visual-ik-solver)
- [Sentinela de Preco e Alertas](#sentinela-de-preco-e-alertas)
- [Exportacao de Dados](#exportacao-de-dados)
- [Pilha Tecnologica](#pilha-tecnologica)
- [Instalacao e Execucao](#instalacao-e-execucao)
- [Auditoria de Seguranca](#auditoria-de-seguranca)
- [Licenca](#licenca)

---

## Visao Geral

Diferente dos crawlers convencionais que operam de maneira estatica ou headless sem feedback contextual, o ArachneMind executa navegadores Chromium visiveis atraves do Playwright, injetando uma camada de inspecao procedural que localiza, valida e extrai dados diretamente da geometria do DOM.

Os nos e arestas resultantes sao despachados via WebSockets (Socket.io) para o frontend em React, onde um motor de fisica baseada em forcas (Force-Directed Graph) organiza entidades, dominios, paginas, termos de parcelamento e precos em tempo real.

---

## Arquitetura do Sistema

```
+-----------------------------------------------------------------------+
|                         ARACHNEMIND PLATFORM                          |
+-----------------------------------+-----------------------------------+
|              BACKEND              |             FRONTEND              |
|       (Node.js / Express)         |      (React 18 / Tailwind)        |
+-----------------------------------+-----------------------------------+
| - Playwright Browser Controller   | - Interactive 2D Canvas (D3-force)|
| - Inverse Kinematics (IK) Engine  | - Real-time Socket.io Client      |
| - Price Normalizer & Aggregator   | - Comparative Quotation Drawer    |
| - Quotation CSV / MD Exporters    | - Web Audio API Alert Synthesizer |
| - REST API & WebSocket Server     | - Workspace & Session Management  |
+-----------------------------------+-----------------------------------+
                  |                                   ^
                  |           WebSocket / REST        |
                  +───────────────────────────────────+
```

---

## Modos de Operacao

O sistema opera sob dois modos estrategicos especializados:

### 1. Modo Price Finder (Radar de Precos)
Projetado para agregacao multi-marketplace, analise estatistica de dispersao de precos e monitoramento de e-commerce.
- **Fila Multi-Marketplace Automatica:** Ao iniciar uma busca por produto sem URL fixa, o motor consulta sequencialmente multiplos agregadores e varejistas (Buscape, Amazon Brasil, KaBuM! e Zoom), consolidando ofertas de dezenas de lojas brasileiras em uma unica arvore.
- **Motor de Extracao Hibrido de 4 Camadas:**
  1. **Hydration State (`__NEXT_DATA__`):** Extracao direta da arvore JSON de estado em portais baseados em Next.js (como KaBuM!), obtendo precos exatos com desconto no PIX, valores originais no cartao, avaliacoes e imagens em alta resolucao.
  2. **Schema.org JSON-LD (`application/ld+json`):** Leitura de metadados estruturados `Product`, `AggregateOffer` e `ItemList`.
  3. **Adaptadores DOM Especializados:** Seletores dedicados para Amazon Brasil (`s-result-item`), Buscape e Zoom (`[data-testid="product-card"]`), isolando corretamente o nome real da loja parceira, selos de cashback e avaliacoes.
  4. **Heuristica Geometrica Universal:** Fallback baseado nas dimensoes fisicas dos containers no viewport e expressoes regulares monetarias.
- **Filtragem Estatistica de Outliers e Desambiguacao:** O motor valida tokens numericos de modelo/especificacao (evitando anuncios patrocinados de produtos concorrentes), descarta acessorios avulsos (cabos, capas, peliculas, suportes) ou computadores completos quando a busca e por um componente individual, e aplica corte estatistico baseado na mediana de mercado para impedir distorcoes no ranking.
- **Radar de Melhor Oferta e Gaveta Comparativa:** Identifica automaticamente o menor valor numerico validado, destaca o no vencedor no grafo e apresenta estatisticas de menor preco, mediana e maior preco com miniaturas de produto, notas de avaliacao, cashback e botao de re-escaneamento sob demanda.

### 2. Modo Mapeamento Mental
Voltado para pesquisa exploratoria, revisao bibliografica e extracao profunda de artigos e documentacoes tecnicas.
- **Isolamento Semantico de Conteudo:** Filtra barras de navegacao, rodapes e menus laterais para focar no container principal do artigo (`article`, `main`, `.mw-parser-output`), extraindo metadados de autoria, data de publicacao, contagem de palavras e tempo estimado de leitura.
- **Extracao Nativa de Tabelas HTML (`data_table`):** Localiza tabelas de dados na pagina, converte suas colunas e linhas para formato estruturado chave-valor e gera previews em Markdown diretamente inspecionaveis no grafo.
- **Hierarquia Conceitual e Global Brain:** Classifica o conteudo em nos de Dominio Web, Paginas HTML, Tabelas Estruturadas, Secoes (`h1` a `h3`), Entidades e Fatos Analiticos pontuados por densidade numerica e aderencia ao objetivo.

---

## Motor Procedural de Inspecao Visual (IK Solver)

A camada visual injetada no navegador executa um solver analitico de cinematica inversa de dois segmentos osso/articulacao:

- **Calculo Trigonometrico:** Cada apendice resolve seus angulos articulares em tempo real por meio da Lei dos Cossenos, garantindo transicoes suaves a 60 quadros por segundo.
- **Tetrapod Gait:** Marcha coordenada baseada em estados de apoio e elevacao, ancorando os pontos de contato nas coordenadas reais retornadas por `getBoundingClientRect()`.
- **Raios Direcionais:** Feixes colimados indicam visualmente qual elemento e atributo esta sendo submetido ao processo de parsing.
- **Magnifier HUD:** Reticulo holografico que projeta no topo do viewport a tag do elemento, caminho CSS e o texto extraido.

---

## Sentinela de Preco e Alertas

- **Preco Alvo:** O operador define um valor limite para o produto monitorado.
- **Sintetizador de Audio Nativo:** Em conformidade com a Web Audio API, o sistema sintetiza um acorde harmonico em frequencias senoidais duplas no exato milissegundo em que uma oferta atinge ou fica abaixo da meta estipulada, sem depender de dependencias de audio externas.
- **Notificacao Visual:** Painel no topo da interface apresenta a loja correspondente, o valor alcancado e a acao imediata para abertura da pagina de compra.

---

## Exportacao de Dados

O sistema fornece rotas dedicadas para exportacao formal dos dados estruturados:

1. **Obsidian Vault (Markdown):** Gera documentos com frontmatter YAML, tabelas comparativas formatadas em GitHub-Flavored Markdown e referencias WikiLinks (`[[Node]]`) compativeis com a navegacao nativa do Obsidian.
2. **Planilhas CSV:** Arquivo tabular com colunas de ranking, status de melhor oferta, loja/vendedor, precos normalizados, parcelamento, frete, taxas de economia e URLs de compra.
3. **JSON Estruturado:** Dump integral do grafo (nos, arestas, atributos formais e carimbos de data/hora ISO 8601).

---

## Pilha Tecnologica

| Componente | Tecnologia | Finalidade |
| :--- | :--- | :--- |
| Interface de Usuario | React 18, Vite | Renderizacao da aplicacao e gerenciamento de estado |
| Visualizacao de Grafos | react-force-graph-2d, D3.js | Simulacao elastica orientada a forcas (Charge & Link) |
| Estilizacao | Tailwind CSS | Sistema visual dark mode de alta densidade de informacao |
| Servidor de Aplicacao | Node.js, Express | Roteamento REST e orquestracao de sessoes |
| Comunicacao em Tempo Real | Socket.io | Streaming bidirecional de eventos e telemetria |
| Automacao de Navegador | Playwright (Chromium) | Controle do browser e execucao de scripts de overlay |
| Sintese Sonora | Web Audio API | Emissao de alertas auditivos polifonicos |

---

## Instalacao e Execucao

### Requisitos
- Node.js versao 18 ou superior instalado.
- Gerenciador de pacotes npm.

### Passo 1: Obter o Codigo
```bash
git clone https://github.com/brunofaomoura-max/arachnemind.git
cd arachnemind
```

### Passo 2: Inicializar o Backend
```bash
cd backend
npm install
npx playwright install chromium
npm start
```
*O orquestrador estara ativo na porta 4000 (`http://localhost:4000`).*

### Passo 3: Inicializar o Frontend
Em um terminal separado, acesse a pasta do cliente:
```bash
cd frontend
npm install
npm run dev
```
*A interface estara disponivel no endereco `http://localhost:5173`.*

---

## Auditoria de Seguranca

O codigo-fonte deste projeto e suas dependencias foram submetidos a processo de inspecao e auditoria estatica de seguranca com o framework **NVIDIA SkillSpector**, assegurando a inexistencia de scripts de execucao arbitraria, vetores de exfiltracao de credenciais ou vulnerabilidades de cadeia de suprimentos.

---

## Licenca

Este projeto esta licenciado sob os termos da licenca MIT. Consulte o arquivo [LICENSE](LICENSE) para obter o texto integral.

---

Autor: **Bruno Fao Moura**
