import React, { useState } from 'react';
import {
  Globe,
  Plus,
  Trash2,
  Play,
  Square,
  FolderGit2,
  Sparkles,
  Search,
  Activity,
  Layers,
  Coins,
  BrainCircuit,
  BellRing,
  Award,
  TrendingDown
} from 'lucide-react';

export default function SidebarWorkspaces({
  trees,
  activeTreeId,
  onSelectTree,
  onStartCrawl,
  onStopCrawl,
  onDeleteTree,
  spiderTelemetry,
  totalNodesCount
}) {
  const [crawlMode, setCrawlMode] = useState('price_finder'); // 'price_finder' ou 'mind_map'
  const [objective, setObjective] = useState('');
  const [startUrl, setStartUrl] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [maxDepth, setMaxDepth] = useState(2);
  const [maxPages, setMaxPages] = useState(4);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!objective.trim() && !startUrl.trim()) return;
    setIsSubmitting(true);
    try {
      await onStartCrawl({
        objective: objective.trim(),
        startUrl: startUrl.trim(),
        crawlMode,
        targetPrice: targetPrice.trim() ? Number(targetPrice.replace(',', '.')) : null,
        maxDepth: Number(maxDepth),
        maxPages: Number(maxPages)
      });
      setObjective('');
      setStartUrl('');
      setTargetPrice('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <aside className="w-80 h-full bg-[#0c1220] border-r border-slate-800/80 flex flex-col select-none shrink-0 z-20">
      {/* Cabeçalho da Marca */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 via-emerald-500/20 to-purple-600/20 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_15px_rgba(0,243,255,0.2)]">
            <span className="text-lg">🕷️</span>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider text-slate-100 flex items-center gap-1.5">
              ARACHNEMIND
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                v2.0
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Autonomous Spider & Price Finder</p>
          </div>
        </div>
      </div>

      {/* Seletor de Modo de Coleta: Price Finder vs Mapeamento Mental */}
      <div className="p-3 bg-[#0a0f1d] border-b border-slate-800/80">
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
          <span>Modo de Operação</span>
          <span className="text-[9px] text-cyan-400 font-mono">SELEÇÃO RÁPIDA</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-[#070b14] border border-slate-800">
          <button
            type="button"
            onClick={() => setCrawlMode('price_finder')}
            className={`py-1.5 px-2 rounded-md text-[11px] font-medium flex items-center justify-center gap-1.5 transition ${
              crawlMode === 'price_finder'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            Price Finder
          </button>
          <button
            type="button"
            onClick={() => setCrawlMode('mind_map')}
            className={`py-1.5 px-2 rounded-md text-[11px] font-medium flex items-center justify-center gap-1.5 transition ${
              crawlMode === 'mind_map'
                ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(168,85,247,0.35)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            Mapeamento Mental
          </button>
        </div>
      </div>

      {/* Formulário de Nova Sessão de Crawling */}
      <form onSubmit={handleSubmit} className="p-3.5 border-b border-slate-800/80 bg-[#0f172a]/60 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            {crawlMode === 'price_finder' ? 'Radar de Ofertas & Preços' : 'Nova Missão da Aranha'}
          </span>
          {crawlMode === 'price_finder' && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              E-COMMERCE RADAR
            </span>
          )}
        </div>

        <div>
          <label className="block text-[11px] text-slate-400 mb-1">
            {crawlMode === 'price_finder'
              ? 'Produto / Modelo a Pesquisar'
              : 'Objetivo de Busca (Linguagem Natural)'}
          </label>
          <textarea
            rows={2}
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder={
              crawlMode === 'price_finder'
                ? 'Ex: Monitor Gamer 144Hz 27 polegadas, RTX 4070 Super, iPhone 15 Pro...'
                : 'Ex: Mapear arquiteturas de IA, redes neurais e modelos de linguagem...'
            }
            className="w-full rounded-md bg-[#090d16] border border-slate-700/80 px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition resize-none"
          />
        </div>

        {crawlMode === 'price_finder' && (
          <div>
            <label className="block text-[11px] text-emerald-400 mb-1 flex items-center gap-1">
              <BellRing className="w-3 h-3" />
              Preço Alvo Sentinela (R$) <span className="text-slate-500 font-normal">(Opcional)</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="Ex: 2499.00 (dispara alarme sonoro de queda)"
              className="w-full rounded-md bg-[#090d16] border border-emerald-500/40 px-2.5 py-1.5 text-xs text-emerald-300 placeholder-slate-600 focus:outline-none focus:border-emerald-400 font-mono transition"
            />
          </div>
        )}

        <div>
          <label className="block text-[11px] text-slate-400 mb-1">
            URL Inicial (Opcional — padrão{' '}
            {crawlMode === 'price_finder' ? 'Mercado Livre' : 'Wikipédia'})
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
            <input
              type="text"
              value={startUrl}
              onChange={(e) => setStartUrl(e.target.value)}
              placeholder={
                crawlMode === 'price_finder'
                  ? 'https://lista.mercadolivre.com.br/...'
                  : 'https://pt.wikipedia.org/wiki/...'
              }
              className="w-full rounded-md bg-[#090d16] border border-slate-700/80 pl-8 pr-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <div>
            <label className="block text-[10px] font-mono text-slate-400 mb-0.5">
              Profundidade Máx.
            </label>
            <input
              type="number"
              min={1}
              max={5}
              value={maxDepth}
              onChange={(e) => setMaxDepth(e.target.value)}
              className="w-full rounded bg-[#090d16] border border-slate-700/80 px-2 py-1 text-xs text-slate-200 font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-slate-400 mb-0.5">
              Máx. Páginas
            </label>
            <input
              type="number"
              min={1}
              max={15}
              value={maxPages}
              onChange={(e) => setMaxPages(e.target.value)}
              className="w-full rounded bg-[#090d16] border border-slate-700/80 px-2 py-1 text-xs text-slate-200 font-mono"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || (!objective.trim() && !startUrl.trim())}
          className={`w-full py-2 px-3 rounded-md text-xs font-semibold text-slate-950 flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-40 ${
            crawlMode === 'price_finder'
              ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
              : 'bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 shadow-[0_0_20px_rgba(0,243,255,0.25)]'
          }`}
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          {isSubmitting
            ? 'Iniciando Chromium...'
            : crawlMode === 'price_finder'
            ? 'Ativar Radar Price Finder'
            : 'Lançar Aranha Autônoma'}
        </button>
      </form>

      {/* Botão Modo Global Brain */}
      <div className="px-3 pt-3 pb-1.5">
        <button
          onClick={() => onSelectTree('GLOBAL_BRAIN')}
          className={`w-full p-2.5 rounded-lg border text-left transition flex items-center justify-between ${
            activeTreeId === 'GLOBAL_BRAIN'
              ? 'bg-purple-950/40 border-purple-400/60 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
              : 'bg-[#121a2d]/60 border-slate-800 hover:border-slate-700 text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Globe className="w-4 h-4 text-purple-400 shrink-0" />
            <div>
              <div className="text-xs font-semibold">Global Brain (Multi-Tree)</div>
              <div className="text-[10px] text-slate-400">
                Conecta sinapses entre todas as árvores
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
            {totalNodesCount} nós
          </span>
        </button>
      </div>

      {/* Lista de Árvores de Pesquisa (Workspaces) */}
      <div className="px-3 py-2 flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-400">
        <span className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          Árvores & Radares ({trees.length})
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-2 pb-3">
        {trees.length === 0 ? (
          <div className="text-center py-8 px-3 rounded-lg border border-dashed border-slate-800 text-slate-500 text-xs">
            Nenhuma árvore criada ainda. Defina um produto ou objetivo acima e lance a aranha!
          </div>
        ) : (
          trees.map((tree) => {
            const isSelected = activeTreeId === tree.id;
            const isCrawling = tree.status === 'crawling';
            const isPriceTree = tree.crawlMode === 'price_finder';

            return (
              <div
                key={tree.id}
                onClick={() => onSelectTree(tree.id)}
                className={`group relative rounded-lg p-2.5 border transition cursor-pointer ${
                  isSelected
                    ? isPriceTree
                      ? 'bg-emerald-950/30 border-emerald-400/60 shadow-[0_0_14px_rgba(16,185,129,0.18)]'
                      : 'bg-cyan-950/30 border-cyan-400/60 shadow-[0_0_14px_rgba(0,243,255,0.12)]'
                    : 'bg-[#111829]/70 border-slate-800/90 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FolderGit2
                      className={`w-4 h-4 shrink-0 ${
                        isCrawling
                          ? 'text-emerald-400 animate-pulse'
                          : isSelected
                          ? isPriceTree
                            ? 'text-emerald-400'
                            : 'text-cyan-400'
                          : 'text-slate-400'
                      }`}
                    />
                    <span className="text-xs font-semibold text-slate-100 truncate">
                      {tree.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isCrawling && (
                      <button
                        type="button"
                        title="Parar Aranha"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStopCrawl(tree.id);
                        }}
                        className="p-1 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40"
                      >
                        <Square className="w-3 h-3 fill-current" />
                      </button>
                    )}
                    <button
                      type="button"
                      title="Apagar Árvore Inteira"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTree(tree.id);
                      }}
                      className="opacity-70 group-hover:opacity-100 p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Tag de Modo & Melhor Preço */}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                      isPriceTree
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                    }`}
                  >
                    {isPriceTree ? '💰 Price Finder' : '🧠 Mapeamento'}
                  </span>

                  {tree.bestPrice && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-0.5 font-bold">
                      <Award className="w-2.5 h-2.5" />
                      R$ {Number(tree.bestPrice.price).toFixed(2)}
                    </span>
                  )}

                  {tree.targetPrice && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-0.5">
                      <TrendingDown className="w-2.5 h-2.5" />
                      Meta: R$ {Number(tree.targetPrice).toFixed(2)}
                    </span>
                  )}
                </div>

                <p className="text-[10px] text-slate-400 line-clamp-1 mt-1 font-mono">
                  {tree.startUrl}
                </p>

                <div className="mt-2 flex items-center justify-between text-[10px] font-mono">
                  <span
                    className={`px-1.5 py-0.5 rounded flex items-center gap-1 ${
                      isCrawling
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isCrawling ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                      }`}
                    />
                    {isCrawling ? 'ARANHA ATIVA' : 'IDLE'}
                  </span>

                  <span className="text-slate-400">{tree.nodeCount || 0} nós</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Console de Telemetria ao Vivo da Aranha */}
      <div className="p-3 border-t border-slate-800/80 bg-[#070a12] font-mono">
        <div className="flex items-center justify-between text-[10px] text-cyan-400 mb-1">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            LIVE SPIDER TELEMETRY
          </span>
          <span className="text-slate-500">{spiderTelemetry?.status || 'READY'}</span>
        </div>
        <div className="text-[11px] text-slate-300 truncate">
          {spiderTelemetry?.message || 'Aguardando acionamento da aranha...'}
        </div>
      </div>
    </aside>
  );
}
