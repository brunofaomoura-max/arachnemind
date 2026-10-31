<div align="center">

# 🕷️ ARACHNEMIND
### Visual Autonomous Web Crawler & Obsidian-Style Interactive Knowledge Graph

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Playwright](https://img.shields.io/badge/Playwright-Chromium-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

*Um ecossistema full-stack que une uma **aranha procedural 3D/2D com cinemática inversa (IK)** escalando elementos do DOM em tempo real e um **grafo de conhecimento interativo 2D estilo Obsidian** para exploração conceitual e caça automatizada de preços.*

---

[Demonstração](#-visão-geral) •
[Funcionalidades](#-funcionalidades-chave) •
[Arquitetura](#-arquitetura-do-sistema) •
[Instalação](#-como-executar) •
[Price Finder](#-modo-price-finder--cotação) •
[Exportação](#-exportação-obsidian--csv)

</div>

---

## 🌟 Visão Geral

O **ArachneMind** transforma a experiência estéril do web scraping tradicional em uma experiência visual viva e reativa. Em vez de operar às cegas em segundo plano, o sistema abre uma janela Chromium real onde uma **aranha de 8 patas com física analítica e cinemática inversa (IK)** caminha sobre os elementos do site, tece teias de seda entre conexões e dispara feixes de laser coloridos para extrair dados estruturados.

Todos os dados capturados são transmitidos via **WebSockets (Socket.io)** diretamente para um **Grafo de Conhecimento Obsidian**, renderizado com simulação de forças elásticas, halos pulsantes para as melhores ofertas e uma gaveta analítica completa.

```
┌─────────────────────────┐          WebSocket           ┌───────────────────────────┐
│   Chromium + Playwright │   ───────────────────────►   │   React + ForceGraph 2D   │
│   Aranha com Física IK  │                              │   Cérebro Digital Obsidian│
│   Scraping com Lasers   │   ◄───────────────────────   │   Radar de Menor Preço    │
└─────────────────────────┘          Comandos REST       └───────────────────────────┘
```

---

## ⚡ Funcionalidades Chave

### 1. 🕷️ Aranha Procedural com Cinemática Inversa (IK Solver)
- **Cinemática Analítica de 2 Ossos:** Cada uma das 8 patas calcula sua articulação em tempo real via trigonometria (Lei dos Cossenos), alcançando elementos com suavidade orgânica a 60 FPS.
- **Tetrapod Gait:** Marcha realista sincronizada com física de apoio no chão e levantamento de pernas.
- **Teias de Seda Dinâmicas:** Trilhas de seda translúcida que conectam fisicamente os nós navegados pela aranha.
- **Feixes de Laser Especializados:** Disparos visuais nos seletores DOM:
  - 🟢 **Verde Neon:** Extração de texto e entidades.
  - 🔵 **Ciano:** Reconhecimento e travessia de hyperlinks.
  - 🟡 **Ouro / Esmeralda:** Radar de ofertas e preços de e-commerce.
- **Magnifier HUD:** Retículo holográfico que exibe a tag HTML, seletor CSS formal e texto capturado.

---

### 2. 💰 Modo Price Finder (Caçador de Preços)
Modo focado em compras e inteligência de mercado para e-commerce (Mercado Livre, Buscapé, Magalu, Amazon, KaBuM!, etc.):
- **Extração Abrangente:** Preço à vista (PIX/Boleto), parcelamento sem juros, valor de frete e vendedor.
- **Radar de Melhor Oferta:** O menor preço de toda a árvore de busca é destacado visualmente no grafo com:
  - Halo pulsante esmeralda/dourado.
  - Badge flutuante holográfico `🏆 MELHOR PREÇO`.
  - Sinapses elétricas conectadas brilhando em neon esmeralda (`#10b981`).
- **Gaveta de Cotação Comparativa:**
  - Tabela ranqueada interativa (`#1 Menor Preço`, `#2`, `#3`...).
  - Cálculo automático de **% de Economia** em relação ao maior preço e à média de mercado.
  - Botão de compra direta e foco interativo no grafo com um clique.

---

### 3. 🎯 Sentinela de Preço & Alerta de Queda
- **Alvo Customizável:** Configure o preço que você deseja pagar pelo produto.
- **Alarme Sonoro Sintetizado (Web Audio API):** Quando a aranha localiza uma oferta dentro da sua meta, o navegador executa um *chime harmônico* em tempo real (sem arquivos de áudio externos).
- **Banner Flutuante:** Notificação instantânea na interface com valor encontrado e link direto da loja.

---

### 4. 🧠 Modo Mapeamento Mental
- **Exploração Conceitual:** Navega por enciclopédias (Wikipédia), artigos acadêmicos ou documentações técnicas.
- **Ramificação Automática:** Agrupa domínios, títulos `<h1>`-`<h3>`, parágrafos-chave e links externos de forma hierárquica.
- **Sinapses Transversais (Global Brain):** Identifica e conecta tópicos em comum entre árvores de pesquisa distintas.

---

### 5. 📑 Exportação Dedicada (Obsidian & Planilhas)
- **[[Obsidian Markdown]]:** Gera arquivos Markdown prontos para uso em cofres do Obsidian com metadados YAML, tabelas estilizadas e `[[WikiLinks]]`.
- **Planilhas CSV:** Tabela estruturada com ranking, lojas, preços, condições e links de compra para uso no Excel ou Google Sheets.

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React 18** (Interface moderna e reativa)
- **Vite** (Build ultrarrápido)
- **react-force-graph-2d** (Simulação física de grafos baseada em D3.js)
- **Tailwind CSS** (Design system dark mode com estética Obsidian e vidro fosco)
- **Lucide Icons** (Ícones vetoriais modernos)
- **Web Audio API** (Sintetizador polifônico para alertas sonoros)

### Backend
- **Node.js & Express** (Servidor HTTP REST)
- **Playwright** (Orquestrador de navegador Chromium visível)
- **Socket.io** (Transmissão de eventos e nós em tempo real)
- **DOM Raycasting & Injection** (Engine de cinemática inversa injetada via script no navegador)

---

## 🚀 Como Executar

### Pré-requisitos
- [Node.js](https://nodejs.org/) versão 18 ou superior instalado.
- Navegador Chromium (o Playwright fará o download automático caso necessário).

### 1. Clonar o Repositório
```bash
git clone https://github.com/brunofaomoura-max/arachnemind.git
cd arachnemind
```

### 2. Configurar o Backend
```bash
cd backend
npm install
npx playwright install chromium
npm start
```
*O servidor backend estará ativo em `http://localhost:4000`.*

### 3. Configurar o Frontend
Abra um novo terminal na pasta raiz e execute:
```bash
cd frontend
npm install
npm run dev
```
*O frontend estará disponível em `http://localhost:5173`.*

---

## 🖥️ Como Utilizar

1. Acesse **[http://localhost:5173](http://localhost:5173)** no seu navegador.
2. Na barra lateral esquerda:
   - Selecione o modo: **💰 Price Finder** ou **🧠 Mapeamento Mental**.
   - Digite o que deseja buscar (ex: `Monitor 144Hz IPS`, `RTX 4070 Super`, `Inteligência Artificial`).
   - *(Opcional)* Se estiver no Price Finder, defina o **Preço Alvo Sentinela (R$)**.
   - Clique em **Lançar Aranha Autônoma**.
3. Uma janela visível do Chromium será aberta na tela: observe a aranha procedural caminhando pelos elementos e disparando lasers.
4. Conforme os produtos são encontrados, o grafo 2D é preenchido em tempo real.
5. Abra o **Painel Analítico** à direita para:
   - Ver a **Gaveta de Cotação** com ranking de menor preço.
   - Ajustar o Sentinela de Preço.
   - Exportar a cotação para **CSV** ou **Obsidian Markdown**.

---

## 🔒 Auditoria de Segurança Integrada

Este repositório conta com conformidade e segurança preventiva auditada com o **NVIDIA SkillSpector**, garantindo código higienizado e scripts sem chamadas de comando não-autorizadas ou injeções de código.

---

## 📄 Licença

Este projeto é distribuído sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

<div align="center">
Desenvolvido com 🕷️ por <strong>Bruno Fao Moura</strong>
</div>
