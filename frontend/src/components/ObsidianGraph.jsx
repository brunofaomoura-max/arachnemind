import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Search,
  Sparkles,
  Filter
} from 'lucide-react';

export const NODE_STYLE_MAP = {
  root_topic: {
    color: '#f43f5e',
    glow: 'rgba(244, 63, 94, 0.55)',
    radius: 11,
    badge: 'Tópico Raiz'
  },
  product_root: {
    color: '#ec4899',
    glow: 'rgba(236, 72, 153, 0.65)',
    radius: 12,
    badge: 'Produto Raiz'
  },
  domain: {
    color: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.5)',
    radius: 9,
    badge: 'Domínio Web'
  },
  webpage: {
    color: '#00f3ff',
    glow: 'rgba(0, 243, 255, 0.5)',
    radius: 7.5,
    badge: 'Página HTML'
  },
  store_offer: {
    color: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.55)',
    radius: 8.5,
    badge: 'Oferta Loja'
  },
  price_cash: {
    color: '#10b981',
    glow: 'rgba(16, 185, 129, 0.65)',
    radius: 8,
    badge: 'Preço à Vista'
  },
  price_installment: {
    color: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.45)',
    radius: 6,
    badge: 'Parcelamento'
  },
  shipping_cost: {
    color: '#818cf8',
    glow: 'rgba(129, 140, 248, 0.45)',
    radius: 6,
    badge: 'Frete'
  },
  extracted_entity: {
    color: '#14b8a6',
    glow: 'rgba(20, 184, 166, 0.45)',
    radius: 6,
    badge: 'Entidade / Link'
  },
  data_point: {
    color: '#eab308',
    glow: 'rgba(234, 179, 8, 0.4)',
    radius: 5,
    badge: 'Dado Formal'
  }
};

export default function ObsidianGraph({
  nodes,
  edges,
  selectedNode,
  onSelectNode,
  activeTreeTitle
}) {
  const fgRef = useRef();
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 900, height: 700 });
  const [hoverNode, setHoverNode] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Observa redimensionamento do container central
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Ajusta forças elásticas estilo Obsidian
  useEffect(() => {
    if (!fgRef.current) return;
    fgRef.current.d3Force('charge')?.strength(-210);
    fgRef.current.d3Force('link')?.distance((link) => (link.isCrossTree ? 140 : 72));
  }, [nodes.length, edges.length]);

  // Filtra e clona objetos para o ForceGraph2D
  const graphData = useMemo(() => {
    const filteredNodes = nodes.filter((n) => {
      if (typeFilter !== 'ALL' && n.type !== typeFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        n.label?.toLowerCase().includes(q) ||
        n.formalData?.summary?.toLowerCase().includes(q) ||
        n.formalData?.sourceUrl?.toLowerCase().includes(q)
      );
    });

    const validIds = new Set(filteredNodes.map((n) => n.id));
    const filteredLinks = edges
      .filter((e) => {
        const sId = typeof e.source === 'object' ? e.source.id : e.source;
        const tId = typeof e.target === 'object' ? e.target.id : e.target;
        return validIds.has(sId) && validIds.has(tId);
      })
      .map((e) => ({
        ...e,
        source: typeof e.source === 'object' ? e.source.id : e.source,
        target: typeof e.target === 'object' ? e.target.id : e.target
      }));

    return {
      nodes: filteredNodes.map((n) => ({ ...n })),
      links: filteredLinks
    };
  }, [nodes, edges, searchQuery, typeFilter]);

  // Mapa de vizinhos para iluminar conexões no hover (estilo Obsidian)
  const { neighborNodeIds, neighborLinkIds } = useMemo(() => {
    const nIds = new Set();
    const lIds = new Set();
    const active = hoverNode || selectedNode;
    if (!active) return { neighborNodeIds: nIds, neighborLinkIds: lIds };

    nIds.add(active.id);
    for (const l of graphData.links) {
      const sId = typeof l.source === 'object' ? l.source.id : l.source;
      const tId = typeof l.target === 'object' ? l.target.id : l.target;
      if (sId === active.id || tId === active.id) {
        nIds.add(sId);
        nIds.add(tId);
        lIds.add(l.id);
      }
    }
    return { neighborNodeIds: nIds, neighborLinkIds: lIds };
  }, [hoverNode, selectedNode, graphData.links]);

  const handleNodeClick = useCallback(
    (node) => {
      onSelectNode(node);
      if (fgRef.current && typeof node.x === 'number' && typeof node.y === 'number') {
        fgRef.current.centerAt(node.x, node.y, 650);
        fgRef.current.zoom(2.1, 650);
      }
    },
    [onSelectNode]
  );

  // Renderizador customizado de Nós no Canvas 2D
  const paintNode = useCallback(
    (node, ctx, globalScale) => {
      const style = NODE_STYLE_MAP[node.type] || NODE_STYLE_MAP.data_point;
      const isFocused =
        !hoverNode && !selectedNode
          ? true
          : neighborNodeIds.has(node.id);
      const isSelected = selectedNode?.id === node.id;
      const isHovered = hoverNode?.id === node.id;

      const r = style.radius * (isSelected || isHovered ? 1.3 : 1);

      ctx.save();
      ctx.globalAlpha = isFocused ? 1 : 0.18;

      // Halo luminoso externo
      if (isSelected || isHovered || node.type === 'root_topic' || node.type === 'product_root') {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r * 1.9, 0, Math.PI * 2);
        ctx.fillStyle = style.glow;
        ctx.fill();
      }

      // Destaque Especial: RADAR DE MELHOR OFERTA (🏆 MELHOR PREÇO)
      if (node.isBestPrice) {
        // Halo de pulsação suave esmeralda/dourada
        const pulse = (Math.sin(Date.now() / 240) + 1) / 2;
        const outerR = r * (1.8 + pulse * 0.7);

        ctx.beginPath();
        ctx.arc(node.x, node.y, outerR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(16, 185, 129, ${0.2 + pulse * 0.25})`;
        ctx.fill();

        // Anel dourado fluorescente
        ctx.beginPath();
        ctx.arc(node.x, node.y, r * 1.45, 0, Math.PI * 2);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2.2 / globalScale;
        ctx.stroke();

        // Badge Flutuante "🏆 MELHOR PREÇO"
        const badgeFont = Math.max(9 / globalScale, 3);
        ctx.font = `bold ${badgeFont}px Inter, sans-serif`;
        const badgeText = '🏆 MELHOR PREÇO';
        const textWidth = ctx.measureText(badgeText).width;
        const bPadH = 5 / globalScale;
        const bHeight = 13 / globalScale;
        const badgeY = node.y - r - bHeight - (4 / globalScale);

        // Fundo pill do selo
        ctx.fillStyle = '#064e3b';
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1 / globalScale;
        ctx.beginPath();
        ctx.roundRect(
          node.x - textWidth / 2 - bPadH,
          badgeY,
          textWidth + bPadH * 2,
          bHeight,
          3 / globalScale
        );
        ctx.fill();
        ctx.stroke();

        // Texto do selo
        ctx.fillStyle = '#fef08a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, node.x, badgeY + bHeight / 2);
      }

      // Círculo principal do nó
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fillStyle = node.isBestPrice ? '#10b981' : style.color;
      ctx.shadowColor = node.isBestPrice ? '#10b981' : style.color;
      ctx.shadowBlur = isSelected || isHovered || node.isBestPrice ? 18 : 6;
      ctx.fill();

      // Anel branco de seleção
      if (isSelected) {
        ctx.lineWidth = 2 / globalScale;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      }

      // Rótulo de texto estilo Obsidian (visível conforme zoom ou destaque)
      const showLabel =
        globalScale >= 1.15 ||
        isSelected ||
        isHovered ||
        node.isBestPrice ||
        node.type === 'root_topic' ||
        node.type === 'product_root' ||
        node.type === 'domain';

      if (showLabel) {
        const fontSize = Math.max(10 / globalScale, 3.2);
        ctx.font = `${isSelected || isHovered ? '600' : '400'} ${fontSize}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.shadowBlur = 0;

        const text =
          node.label.length > 36 ? node.label.slice(0, 36) + '…' : node.label;
        ctx.fillStyle = isSelected
          ? '#ffffff'
          : isFocused
          ? '#cbd5e1'
          : 'rgba(148, 163, 184, 0.35)';
        ctx.fillText(text, node.x, node.y + r + 3 / globalScale);
      }

      ctx.restore();
    },
    [hoverNode, selectedNode, neighborNodeIds]
  );

  return (
    <main
      ref={containerRef}
      className="flex-1 h-full relative obsidian-grid-bg overflow-hidden select-none"
    >
      {/* Barra Flutuante Superior: Título do Workspace, Busca e Filtros */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        <div className="pointer-events-auto bg-[#0c1220]/90 backdrop-blur-md border border-slate-800/90 rounded-lg px-3.5 py-2 flex items-center gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-slate-100">
              {activeTreeTitle}
            </span>
          </div>
          <span className="text-slate-700">|</span>
          <span className="text-[11px] font-mono text-slate-400">
            {graphData.nodes.length} nós · {graphData.links.length} conexões
          </span>
        </div>

        <div className="pointer-events-auto flex items-center gap-2 bg-[#0c1220]/90 backdrop-blur-md border border-slate-800/90 rounded-lg p-1.5 shadow-lg">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar nós no cérebro..."
              className="w-48 bg-[#090d16] border border-slate-800 rounded px-7 py-1 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex items-center gap-1 pl-1 border-l border-slate-800">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-1" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-[#090d16] border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              <option value="ALL">Todos os Tipos</option>
              <option value="product_root">🎯 Produto Raiz</option>
              <option value="store_offer">🏪 Ofertas de Lojas</option>
              <option value="price_cash">💰 Preços à Vista</option>
              <option value="price_installment">💳 Parcelamento</option>
              <option value="shipping_cost">🚚 Frete</option>
              <option value="root_topic">🧠 Tópicos Raiz</option>
              <option value="webpage">🌐 Páginas Web</option>
              <option value="extracted_entity">📎 Entidades</option>
              <option value="data_point">📊 Dados Formais</option>
            </select>
          </div>
        </div>
      </div>

      {/* Renderização do Force-Directed Graph 2D */}
      {graphData.nodes.length === 0 ? (
        <div className="w-full h-full flex flex-col items-center justify-center text-center p-8">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(0,243,255,0.15)]">
            <span className="text-3xl">🕸️</span>
          </div>
          <h2 className="text-base font-semibold text-slate-200 mb-1">
            O Cérebro Digital está aguardando dados
          </h2>
          <p className="text-xs text-slate-400 max-w-md">
            Defina qualquer objetivo de pesquisa na barra lateral esquerda e clique em{' '}
            <strong className="text-cyan-300">Lançar Aranha Autônoma</strong> para abrir o
            navegador com física procedural e construir o grafo em tempo real.
          </p>
        </div>
      ) : (
        <ForceGraph2D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeId="id"
          nodeCanvasObject={paintNode}
          nodePointerAreaPaint={(node, color, ctx) => {
            const style = NODE_STYLE_MAP[node.type] || NODE_STYLE_MAP.data_point;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(node.x, node.y, style.radius + 5, 0, 2 * Math.PI);
            ctx.fill();
          }}
          onNodeHover={(node) => setHoverNode(node || null)}
          onNodeClick={handleNodeClick}
          onNodeDragEnd={(node) => {
            node.fx = node.x;
            node.fy = node.y;
          }}
          onBackgroundClick={() => onSelectNode(null)}
          linkColor={(link) => {
            const sBest = typeof link.source === 'object' ? link.source.isBestPrice : false;
            const tBest = typeof link.target === 'object' ? link.target.isBestPrice : false;
            if (sBest || tBest) return '#10b981';
            if (link.isCrossTree) return 'rgba(168, 85, 247, 0.65)';
            if (!hoverNode && !selectedNode) return 'rgba(100, 116, 139, 0.32)';
            return neighborLinkIds.has(link.id)
              ? '#00f3ff'
              : 'rgba(51, 65, 85, 0.12)';
          }}
          linkWidth={(link) => {
            const sBest = typeof link.source === 'object' ? link.source.isBestPrice : false;
            const tBest = typeof link.target === 'object' ? link.target.isBestPrice : false;
            if (sBest || tBest) return 3;
            return neighborLinkIds.has(link.id) ? 2.2 : 1;
          }}
          linkLineDash={(link) => (link.isCrossTree ? [4, 4] : null)}
          linkDirectionalArrowLength={4.5}
          linkDirectionalArrowRelPos={1}
          linkDirectionalParticles={(link) => {
            const sBest = typeof link.source === 'object' ? link.source.isBestPrice : false;
            const tBest = typeof link.target === 'object' ? link.target.isBestPrice : false;
            if (sBest || tBest) return 3;
            return neighborLinkIds.has(link.id) || link.isCrossTree ? 2 : 0;
          }}
          linkDirectionalParticleWidth={2.4}
          linkDirectionalParticleSpeed={0.007}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.28}
          cooldownTicks={140}
        />
      )}

      {/* Legenda Inferior Esquerda */}
      <div className="absolute bottom-4 left-4 z-10 bg-[#0c1220]/90 backdrop-blur-md border border-slate-800/90 rounded-lg px-3 py-2 flex flex-wrap items-center gap-3 text-[11px]">
        {Object.entries(NODE_STYLE_MAP).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5 text-slate-300">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: cfg.color, boxShadow: `0 0 8px ${cfg.color}` }}
            />
            <span>{cfg.badge}</span>
          </div>
        ))}
      </div>

      {/* Controles de Câmera Inferior Direito */}
      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 bg-[#0c1220]/90 backdrop-blur-md border border-slate-800/90 rounded-lg p-1.5">
        <button
          type="button"
          title="Aproximar Zoom"
          onClick={() => fgRef.current?.zoom(fgRef.current.zoom() * 1.35, 300)}
          className="p-1.5 rounded hover:bg-slate-800 text-slate-300 transition"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          title="Afastar Zoom"
          onClick={() => fgRef.current?.zoom(fgRef.current.zoom() / 1.35, 300)}
          className="p-1.5 rounded hover:bg-slate-800 text-slate-300 transition"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          title="Centralizar Grafo"
          onClick={() => fgRef.current?.zoomToFit(450, 60)}
          className="p-1.5 rounded hover:bg-slate-800 text-slate-300 transition"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </main>
  );
}
