import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  Trash2,
  GitBranchPlus,
  PlusCircle,
  Download,
  Code2,
  Clock,
  X,
  FileText,
  FileSpreadsheet,
  FileJson,
  Award,
  BellRing,
  CheckCircle2,
  TrendingDown,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  Truck,
  CreditCard,
  Layers,
  Search
} from 'lucide-react';
import { NODE_STYLE_MAP } from './ObsidianGraph';
import { BACKEND_URL } from '../services/socket';

export default function InspectorDrawer({
  selectedNode,
  activeTreeId,
  activeTree,
  onClose,
  onDeleteNode,
  onExpandNodeWithSpider,
  onAddManualNode,
  onSelectNode
}) {
  const [activeTab, setActiveTab] = useState('quotes'); // 'quotes' | 'formal'
  const [comparisonData, setComparisonData] = useState(null);
  const [targetPriceInput, setTargetPriceInput] = useState('');
  const [isSavingSentinel, setIsSavingSentinel] = useState(false);
  const [sentinelFeedback, setSentinelFeedback] = useState(null);

  // Formulário de Nó Manual
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualLabel, setManualLabel] = useState('');
  const [manualSummary, setManualSummary] = useState('');
  const [manualType, setManualType] = useState('data_point');
  const [customExpandPrompt, setCustomExpandPrompt] = useState('');
  const [isExpanding, setIsExpanding] = useState(false);

  // Busca as cotações comparativas ranqueadas da árvore ativa
  const fetchQuotes = async (treeId) => {
    if (!treeId || treeId === 'GLOBAL_BRAIN') {
      setComparisonData(null);
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/api/trees/${treeId}/quotes`);
      if (res.ok) {
        const data = await res.json();
        setComparisonData(data);
        if (data.targetPrice) {
          setTargetPriceInput(String(data.targetPrice));
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar cotações da árvore:', err);
    }
  };

  useEffect(() => {
    fetchQuotes(activeTreeId);
  }, [activeTreeId]);

  // Se o usuário selecionar um nó no grafo e não estiver na aba formal, pode alternar automaticamente
  useEffect(() => {
    if (selectedNode && selectedNode.type !== 'store_offer' && selectedNode.type !== 'price_cash') {
      setActiveTab('formal');
    }
  }, [selectedNode]);

  // Salvar Sentinela de Preço
  const handleSaveSentinel = async (e) => {
    e.preventDefault();
    if (!activeTreeId || activeTreeId === 'GLOBAL_BRAIN') return;
    setIsSavingSentinel(true);
    setSentinelFeedback(null);
    try {
      const numeric = targetPriceInput.trim()
        ? Number(targetPriceInput.replace(',', '.'))
        : null;
      const res = await fetch(`${BACKEND_URL}/api/trees/${activeTreeId}/sentinel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPrice: numeric })
      });
      if (res.ok) {
        const data = await res.json();
        setComparisonData(data.comparison);
        setSentinelFeedback({
          type: 'success',
          msg: `Sentinela configurado para R$ ${numeric ? numeric.toFixed(2) : 'Sem meta'}`
        });
      }
    } catch (err) {
      setSentinelFeedback({ type: 'error', msg: 'Falha ao salvar sentinela.' });
    } finally {
      setIsSavingSentinel(false);
      setTimeout(() => setSentinelFeedback(null), 3500);
    }
  };

  // Exportação da Tabela de Cotação
  const triggerQuoteExport = (format) => {
    if (!activeTreeId || activeTreeId === 'GLOBAL_BRAIN') return;
    window.open(
      `${BACKEND_URL}/api/trees/${activeTreeId}/quote-export?format=${format}`,
      '_blank'
    );
  };

  // Exportação Completa da Árvore
  const triggerExport = (format) => {
    const targetTree = selectedNode?.treeId || activeTreeId || 'GLOBAL_BRAIN';
    window.open(
      `${BACKEND_URL}/api/trees/${targetTree}/export?format=${format}`,
      '_blank'
    );
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualLabel.trim() || !selectedNode) return;
    await onAddManualNode({
      treeId: selectedNode.treeId,
      parentId: selectedNode.id,
      type: manualType,
      label: manualLabel.trim(),
      summary: manualSummary.trim() || manualLabel.trim()
    });
    setManualLabel('');
    setManualSummary('');
    setShowManualForm(false);
  };

  const handleExpand = async () => {
    if (!selectedNode) return;
    setIsExpanding(true);
    try {
      await onExpandNodeWithSpider(selectedNode.id, customExpandPrompt.trim());
      setCustomExpandPrompt('');
    } finally {
      setIsExpanding(false);
    }
  };

  const bestQuote = comparisonData?.quotes?.find((q) => q.isBestPrice) || comparisonData?.quotes?.[0];
  const isTargetMet =
    comparisonData?.targetPrice &&
    comparisonData?.minPrice > 0 &&
    comparisonData?.minPrice <= comparisonData?.targetPrice;

  return (
    <aside className="w-[420px] h-full bg-[#0c1220] border-l border-slate-800/80 flex flex-col shrink-0 z-20 select-text shadow-2xl">
      {/* Cabeçalho do Inspector com Abas de Navegação */}
      <div className="p-3.5 border-b border-slate-800/80 bg-[#090d16] flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🕷️</span>
            <div>
              <h2 className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold">
                Painel Analítico
              </h2>
              <p className="text-[10px] text-slate-400">
                {activeTree?.title || 'Exploração Ativa'}
              </p>
            </div>
          </div>
          {selectedNode && (
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
              title="Fechar painel de nó"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Abas Alternadoras: Cotação & Comparador vs Dados Formais */}
        <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-[#070b14] border border-slate-800 font-mono text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('quotes')}
            className={`py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition ${
              activeTab === 'quotes'
                ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 text-emerald-300 font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
            Cotação & Ofertas
            {comparisonData?.totalQuotes > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                {comparisonData.totalQuotes}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('formal')}
            className={`py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition ${
              activeTab === 'formal'
                ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/40 text-cyan-300 font-bold shadow-[0_0_10px_rgba(0,243,255,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
            Dados Formais
            {selectedNode && (
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* Conteúdo Principal Alternado */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {activeTab === 'quotes' ? (
          <>
            {/* RADAR DE MELHOR OFERTA (HERO CARD) */}
            {bestQuote && comparisonData?.minPrice > 0 ? (
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-950/60 via-[#0a1f18] to-[#0c1220] border-2 border-emerald-400/60 p-4 shadow-[0_0_25px_rgba(16,185,129,0.25)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500 text-slate-950 font-extrabold text-[10px] tracking-wider uppercase shadow-[0_0_12px_rgba(16,185,129,0.6)]">
                    <Award className="w-3.5 h-3.5 fill-current" />
                    🏆 MELHOR PREÇO ENCONTRADO
                  </span>
                  {bestQuote.savingsVsMax > 0 && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      -{bestQuote.savingsVsMax}% vs maior
                    </span>
                  )}
                </div>

                <div>
                  <div className="text-[11px] text-emerald-400/80 font-mono uppercase tracking-wide">
                    {bestQuote.storeName}
                  </div>
                  <h3 className="text-sm font-bold text-slate-100 line-clamp-2 mt-0.5">
                    {bestQuote.productTitle}
                  </h3>
                </div>

                <div className="flex items-baseline gap-2 pt-1">
                  <span className="text-2xl font-black text-emerald-300 tracking-tight font-mono">
                    R$ {Number(bestQuote.numericPrice).toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">à vista / PIX</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300 pt-1 border-t border-emerald-500/20">
                  <div className="flex items-center gap-1.5 truncate">
                    <CreditCard className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">{bestQuote.installmentStr}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <Truck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">{bestQuote.shippingStr}</span>
                  </div>
                </div>

                {bestQuote.directUrl && (
                  <a
                    href={bestQuote.directUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_18px_rgba(16,185,129,0.4)] transition cursor-pointer"
                  >
                    Ir para a Loja & Comprar
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ) : (
              <div className="rounded-xl bg-[#11192c] border border-slate-800 p-6 text-center text-slate-400 space-y-2">
                <ShoppingBag className="w-10 h-10 mx-auto text-slate-600" />
                <p className="text-xs font-semibold text-slate-200">
                  Aguardando cotações da Aranha...
                </p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  Inicie a missão no modo <strong>Price Finder</strong> para que a aranha
                  visite as lojas, raspe os preços e monte a gaveta de cotação comparativa.
                </p>
              </div>
            )}

            {/* SENTINELA DE PREÇO & ALERTA DE QUEDA */}
            <div className="rounded-xl bg-[#11192c] border border-slate-800/90 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1.5">
                  <BellRing className="w-3.5 h-3.5 text-cyan-400" />
                  Sentinela de Preço (Alerta)
                </span>
                {isTargetMet ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 font-bold animate-pulse">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    META ATINGIDA!
                  </span>
                ) : comparisonData?.targetPrice ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3 text-cyan-400" />
                    Monitorando...
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-slate-500">Sem meta</span>
                )}
              </div>

              <form onSubmit={handleSaveSentinel} className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-2 text-xs font-mono text-slate-500">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={targetPriceInput}
                    onChange={(e) => setTargetPriceInput(e.target.value)}
                    placeholder="Definir Preço Alvo..."
                    className="w-full rounded-md bg-[#090d16] border border-slate-700/80 pl-8 pr-2.5 py-1.5 text-xs text-emerald-300 font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSavingSentinel || !targetPriceInput.trim()}
                  className="py-1.5 px-3 rounded-md bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 text-xs font-bold font-mono transition cursor-pointer"
                >
                  {isSavingSentinel ? 'Salvando...' : 'Definir Meta'}
                </button>
              </form>

              {sentinelFeedback && (
                <div
                  className={`text-[11px] font-mono p-2 rounded ${
                    sentinelFeedback.type === 'success'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {sentinelFeedback.msg}
                </div>
              )}

              {comparisonData?.targetPrice && comparisonData?.minPrice > 0 && !isTargetMet && (
                <p className="text-[11px] text-slate-400 font-mono">
                  Menor preço atual:{' '}
                  <strong className="text-slate-200">
                    R$ {comparisonData.minPrice.toFixed(2)}
                  </strong>
                  . Falta{' '}
                  <strong className="text-amber-300">
                    R$ {(comparisonData.minPrice - comparisonData.targetPrice).toFixed(2)}
                  </strong>{' '}
                  para atingir a meta.
                </p>
              )}
            </div>

            {/* TABELA DE COTAÇÃO COMPARATIVA RANQUEADA */}
            <div className="rounded-xl bg-[#11192c] border border-slate-800/90 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  Gaveta de Cotação Comparativa
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {comparisonData?.quotes?.length || 0} ofertas ranqueadas
                </span>
              </div>

              {comparisonData?.quotes?.length > 0 ? (
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {comparisonData.quotes.map((q) => (
                    <div
                      key={q.storeNodeId}
                      onClick={() => onSelectNode && onSelectNode({ id: q.storeNodeId, label: q.storeName, type: 'store_offer' })}
                      className={`p-2.5 rounded-lg border transition cursor-pointer flex flex-col gap-1.5 ${
                        q.isBestPrice
                          ? 'bg-emerald-950/40 border-emerald-400/60 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                          : 'bg-[#090d16] border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-extrabold ${
                              q.rank === 1
                                ? 'bg-amber-400 text-slate-950'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            #{q.rank}
                          </span>
                          <span className="text-xs font-bold text-slate-200">
                            {q.storeName}
                          </span>
                          {q.isBestPrice && (
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                              MELHOR PREÇO
                            </span>
                          )}
                        </div>

                        <div className="text-right">
                          <div className="text-xs font-bold font-mono text-emerald-300">
                            {q.rawCash}
                          </div>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-400 line-clamp-1">
                        {q.productTitle}
                      </p>

                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
                        <span className="truncate max-w-[150px]">{q.installmentStr}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-cyan-400 truncate max-w-[100px]">
                            {q.shippingStr}
                          </span>
                          {q.directUrl && (
                            <a
                              href={q.directUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-cyan-400 hover:text-cyan-300 p-0.5 rounded hover:bg-slate-800"
                              title="Acessar oferta"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500 text-xs">
                  Nenhuma cotação extraída até o momento.
                </div>
              )}
            </div>

            {/* EXPORTADOR DE COTAÇÃO DEDICADO */}
            <div className="rounded-xl bg-[#11192c] border border-slate-800/90 p-3.5 space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                Exportar Tabela de Cotação
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => triggerQuoteExport('csv')}
                  className="py-2 px-2.5 rounded-lg bg-[#131c31] hover:bg-slate-800 border border-slate-700/80 text-emerald-300 text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  Planilha CSV
                </button>
                <button
                  type="button"
                  onClick={() => triggerQuoteExport('markdown')}
                  className="py-2 px-2.5 rounded-lg bg-purple-950/40 hover:bg-purple-900/40 border border-purple-500/50 text-purple-200 text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-purple-300" />
                  [[Obsidian]] MD
                </button>
              </div>
            </div>
          </>
        ) : (
          /* ABA DADOS FORMAIS */
          <>
            {!selectedNode ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4 text-slate-500">
                <Code2 className="w-10 h-10 mb-3 text-slate-600" />
                <p className="text-xs font-medium text-slate-300 mb-1">
                  Nenhum nó selecionado no grafo
                </p>
                <p className="text-[11px] text-slate-500">
                  Clique em qualquer nó do Cérebro Digital para inspecionar seus metadados
                  formais, atributos chave-valor, ou disparar poda e aprofundamento.
                </p>
              </div>
            ) : (
              <>
                {/* Badge de Tipo + Título */}
                <div className="rounded-lg bg-[#11192c] border border-slate-800 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[10px] font-mono uppercase px-2 py-0.5 rounded font-semibold"
                      style={{
                        backgroundColor: `${
                          (NODE_STYLE_MAP[selectedNode.type] || NODE_STYLE_MAP.data_point)
                            .color
                        }22`,
                        color: (
                          NODE_STYLE_MAP[selectedNode.type] || NODE_STYLE_MAP.data_point
                        ).color,
                        border: `1px solid ${
                          (NODE_STYLE_MAP[selectedNode.type] || NODE_STYLE_MAP.data_point)
                            .color
                        }55`
                      }}
                    >
                      {(NODE_STYLE_MAP[selectedNode.type] || NODE_STYLE_MAP.data_point).badge}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      ID: {selectedNode.id.slice(0, 8)}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-100 break-words leading-snug">
                    {selectedNode.label}
                  </h3>

                  {selectedNode.formalData?.sourceUrl && (
                    <a
                      href={selectedNode.formalData.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] font-mono text-cyan-400 hover:text-cyan-300 underline break-all"
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      {selectedNode.formalData.sourceUrl}
                    </a>
                  )}
                </div>

                {/* Resumo Formal Extraído */}
                <div className="rounded-lg bg-[#11192c] border border-slate-800 p-3.5 space-y-1.5">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Resumo / Conteúdo Limpo
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
                    {selectedNode.formalData?.summary || 'Sem conteúdo textual adicional.'}
                  </p>
                </div>

                {/* Tabela de Atributos Chave-Valor */}
                <div className="rounded-lg bg-[#11192c] border border-slate-800 p-3.5 space-y-2">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Atributos Formais Extraídos (Chave-Valor)
                  </div>

                  <div className="overflow-hidden rounded border border-slate-800/90">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#090d16] text-[10px] font-mono text-slate-400 border-b border-slate-800">
                          <th className="py-1.5 px-2.5">Propriedade</th>
                          <th className="py-1.5 px-2.5">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70 font-mono text-[11px]">
                        {Object.entries(selectedNode.formalData?.attributes || {}).map(
                          ([key, val]) => (
                            <tr key={key} className="hover:bg-slate-800/30">
                              <td className="py-1.5 px-2.5 text-purple-300 font-medium">
                                {key}
                              </td>
                              <td className="py-1.5 px-2.5 text-slate-200 break-all">
                                {String(val)}
                              </td>
                            </tr>
                          )
                        )}
                        <tr>
                          <td className="py-1.5 px-2.5 text-slate-400">domSelector</td>
                          <td className="py-1.5 px-2.5 text-emerald-300 break-all">
                            {selectedNode.formalData?.domSelector || 'document'}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-1.5 px-2.5 text-slate-400">timestamp</td>
                          <td className="py-1.5 px-2.5 text-slate-300 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {selectedNode.formalData?.timestamp
                              ? new Date(selectedNode.formalData.timestamp).toLocaleString(
                                  'pt-BR'
                                )
                              : 'N/A'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Ação: Re-Acionar a Aranha a partir deste Nó */}
                <div className="rounded-lg bg-gradient-to-br from-cyan-950/40 to-purple-950/30 border border-cyan-500/40 p-3.5 space-y-2.5">
                  <div className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                    <span>🕷️</span> Aprofundar com a Aranha a partir daqui
                  </div>
                  <input
                    type="text"
                    value={customExpandPrompt}
                    onChange={(e) => setCustomExpandPrompt(e.target.value)}
                    placeholder="Sub-objetivo opcional (ex: extrair tabelas e preços)..."
                    className="w-full rounded bg-[#090d16] border border-slate-700/80 px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    disabled={isExpanding}
                    onClick={handleExpand}
                    className="w-full py-2 px-3 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(0,243,255,0.3)] transition cursor-pointer"
                  >
                    <GitBranchPlus className="w-4 h-4" />
                    {isExpanding
                      ? 'Abrindo Navegador...'
                      : '🕷️ Aprofundar com a Aranha a partir daqui'}
                  </button>
                </div>

                {/* Ação: Criar Nota Manual / Dado Formal Filho */}
                <div className="rounded-lg bg-[#11192c] border border-slate-800 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">
                      Anexar Nó Manual a este Ponto
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowManualForm(!showManualForm)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      {showManualForm ? 'Fechar' : 'Nova Nota'}
                    </button>
                  </div>

                  {showManualForm && (
                    <form onSubmit={handleManualSubmit} className="space-y-2 pt-1">
                      <select
                        value={manualType}
                        onChange={(e) => setManualType(e.target.value)}
                        className="w-full rounded bg-[#090d16] border border-slate-700 px-2 py-1.5 text-xs text-slate-200"
                      >
                        <option value="data_point">Dado Formal / Insight</option>
                        <option value="extracted_entity">Entidade Relacionada</option>
                        <option value="webpage">Referência de Página</option>
                      </select>
                      <input
                        type="text"
                        required
                        value={manualLabel}
                        onChange={(e) => setManualLabel(e.target.value)}
                        placeholder="Título curto do nó..."
                        className="w-full rounded bg-[#090d16] border border-slate-700 px-2.5 py-1.5 text-xs text-slate-100"
                      />
                      <textarea
                        rows={2}
                        value={manualSummary}
                        onChange={(e) => setManualSummary(e.target.value)}
                        placeholder="Anotação formal ou conclusão analítica..."
                        className="w-full rounded bg-[#090d16] border border-slate-700 px-2.5 py-1.5 text-xs text-slate-100 resize-none"
                      />
                      <button
                        type="submit"
                        className="w-full py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition"
                      >
                        Adicionar Nó ao Grafo
                      </button>
                    </form>
                  )}
                </div>

                {/* Ações de Poda (Remover Nó Único vs Cascade Delete) */}
                <div className="rounded-lg bg-rose-950/20 border border-rose-500/30 p-3.5 space-y-2">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-rose-300">
                    Zona de Poda do Grafo (Pruning & Cascade Delete)
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onDeleteNode(selectedNode.id, false)}
                      className="py-1.5 px-2 rounded bg-slate-800 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/50 text-slate-200 hover:text-rose-200 text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Apagar Só Este Nó
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteNode(selectedNode.id, true)}
                      className="py-1.5 px-2 rounded bg-rose-600/25 hover:bg-rose-600/40 border border-rose-500/50 text-rose-200 text-[11px] font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Cascade Delete (Ramo)
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Rodapé de Exportação Formal Completa da Árvore */}
      <div className="p-3 border-t border-slate-800/80 bg-[#090d16] space-y-1.5">
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          Exportar Grafo Completo
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => triggerExport('json')}
            className="py-1 px-2 rounded bg-[#131c31] hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-[11px] font-mono flex items-center justify-center gap-1 transition cursor-pointer"
          >
            <FileJson className="w-3.5 h-3.5 text-cyan-400" />
            JSON
          </button>
          <button
            type="button"
            onClick={() => triggerExport('csv')}
            className="py-1 px-2 rounded bg-[#131c31] hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-[11px] font-mono flex items-center justify-center gap-1 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            CSV
          </button>
          <button
            type="button"
            onClick={() => triggerExport('obsidian')}
            className="py-1 px-2 rounded bg-purple-600/25 hover:bg-purple-600/40 border border-purple-500/50 text-purple-200 text-[11px] font-mono font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-purple-300" />
            [[Obsidian]]
          </button>
        </div>
      </div>
    </aside>
  );
}
