import React, { useEffect, useState, useMemo } from 'react';
import SidebarWorkspaces from './components/SidebarWorkspaces';
import ObsidianGraph from './components/ObsidianGraph';
import InspectorDrawer from './components/InspectorDrawer';
import { socket, BACKEND_URL } from './services/socket';
import { BellRing, ExternalLink, X, Award, CheckCircle2 } from 'lucide-react';

function playPriceDropChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.15); // G5
    osc1.frequency.exponentialRampToValueAtTime(1046.5, now + 0.35); // C6

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(659.25, now); // E5
    osc2.frequency.exponentialRampToValueAtTime(987.77, now + 0.18); // B5
    osc2.frequency.exponentialRampToValueAtTime(1318.51, now + 0.38); // E6

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.75);
    osc2.stop(now + 0.75);
  } catch (err) {
    console.warn('Audio chime warning:', err);
  }
}

export default function App() {
  const [trees, setTrees] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [activeTreeId, setActiveTreeId] = useState('GLOBAL_BRAIN');
  const [selectedNode, setSelectedNode] = useState(null);
  const [priceAlert, setPriceAlert] = useState(null);
  const [spiderTelemetry, setSpiderTelemetry] = useState({
    status: 'READY',
    message: 'Sistema conectado. Pronto para iniciar exploração.'
  });

  // Busca estado completo do backend
  const fetchFullState = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/state`);
      const data = await res.json();
      setTrees(data.trees || []);
      setNodes(data.nodes || []);
      setEdges(data.edges || []);
      if (data.trees?.length > 0 && activeTreeId === 'GLOBAL_BRAIN') {
        setActiveTreeId(data.trees[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar estado inicial:', err);
    }
  };

  useEffect(() => {
    fetchFullState();

    socket.on('INITIAL_STATE', (payload) => {
      setTrees(payload.trees || []);
      setNodes(payload.nodes || []);
      setEdges(payload.edges || []);
    });

    socket.on('NODE_ADDED', (newNode) => {
      setNodes((prev) => {
        if (prev.some((n) => n.id === newNode.id)) return prev;
        return [...prev, newNode];
      });
    });

    socket.on('NODE_UPDATED', (updatedNode) => {
      setNodes((prev) =>
        prev.map((n) => (n.id === updatedNode.id ? updatedNode : n))
      );
      setSelectedNode((prev) => (prev?.id === updatedNode.id ? updatedNode : prev));
    });

    socket.on('EDGE_ADDED', (newEdge) => {
      setEdges((prev) => {
        if (prev.some((e) => e.id === newEdge.id)) return prev;
        return [...prev, newEdge];
      });
    });

    socket.on('TREE_UPDATED', (updatedTree) => {
      setTrees((prev) => {
        const exists = prev.some((t) => t.id === updatedTree.id);
        if (!exists) return [updatedTree, ...prev];
        return prev.map((t) => (t.id === updatedTree.id ? updatedTree : t));
      });
    });

    socket.on('NODES_DELETED', ({ deletedIds }) => {
      const delSet = new Set(deletedIds || []);
      setNodes((prev) => prev.filter((n) => !delSet.has(n.id)));
      setEdges((prev) =>
        prev.filter((e) => {
          const sId = typeof e.source === 'object' ? e.source.id : e.source;
          const tId = typeof e.target === 'object' ? e.target.id : e.target;
          return !delSet.has(sId) && !delSet.has(tId);
        })
      );
      setSelectedNode((prev) => (prev && delSet.has(prev.id) ? null : prev));
    });

    socket.on('TREE_DELETED', ({ treeId }) => {
      setTrees((prev) => prev.filter((t) => t.id !== treeId));
      setNodes((prev) => prev.filter((n) => n.treeId !== treeId));
      setEdges((prev) => prev.filter((e) => e.treeId !== treeId));
      setSelectedNode((prev) => (prev?.treeId === treeId ? null : prev));
      setActiveTreeId((prev) => (prev === treeId ? 'GLOBAL_BRAIN' : prev));
    });

    socket.on('SPIDER_ACTION', (telemetry) => {
      setSpiderTelemetry(telemetry);
      if (telemetry.status === 'COMPLETED') {
        fetchFullState();
      }
    });

    // Alerta do Sentinela de Preço com Chime Harmônico
    socket.on('PRICE_DROP_ALERT', (alertPayload) => {
      setPriceAlert(alertPayload);
      playPriceDropChime();
    });

    return () => {
      socket.off('INITIAL_STATE');
      socket.off('NODE_ADDED');
      socket.off('NODE_UPDATED');
      socket.off('EDGE_ADDED');
      socket.off('TREE_UPDATED');
      socket.off('NODES_DELETED');
      socket.off('TREE_DELETED');
      socket.off('SPIDER_ACTION');
      socket.off('PRICE_DROP_ALERT');
    };
  }, []);

  // Filtra os nós e arestas de acordo com a árvore ativa ou "GLOBAL_BRAIN"
  const { visibleNodes, visibleEdges, activeTreeTitle } = useMemo(() => {
    if (activeTreeId === 'GLOBAL_BRAIN') {
      return {
        visibleNodes: nodes,
        visibleEdges: edges,
        activeTreeTitle: 'Global Brain (Todas as Árvores & Sinapses)'
      };
    }
    const activeTree = trees.find((t) => t.id === activeTreeId);
    return {
      visibleNodes: nodes.filter((n) => n.treeId === activeTreeId),
      visibleEdges: edges.filter((e) => e.treeId === activeTreeId),
      activeTreeTitle: activeTree ? activeTree.title : 'Workspace'
    };
  }, [activeTreeId, trees, nodes, edges]);

  const activeTreeObj = useMemo(() => {
    return trees.find((t) => t.id === activeTreeId) || null;
  }, [trees, activeTreeId]);

  // Handlers de API
  const handleStartCrawl = async (payload) => {
    const res = await fetch(`${BACKEND_URL}/api/trees/crawl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.tree) {
      setActiveTreeId(data.tree.id);
    }
  };

  const handleStopCrawl = async (treeId) => {
    await fetch(`${BACKEND_URL}/api/trees/${treeId}/stop`, { method: 'POST' });
  };

  const handleDeleteTree = async (treeId) => {
    await fetch(`${BACKEND_URL}/api/trees/${treeId}`, { method: 'DELETE' });
  };

  const handleDeleteNode = async (nodeId, cascade = true) => {
    await fetch(`${BACKEND_URL}/api/nodes/${nodeId}?cascade=${cascade}`, {
      method: 'DELETE'
    });
  };

  const handleExpandNodeWithSpider = async (nodeId, customObjective) => {
    await fetch(`${BACKEND_URL}/api/nodes/${nodeId}/expand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customObjective })
    });
  };

  const handleAddManualNode = async (payload) => {
    const res = await fetch(`${BACKEND_URL}/api/nodes/manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const created = await res.json();
    if (created?.id) {
      setSelectedNode(created);
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-[#090d16] text-slate-100 relative">
      {/* BANNER FLUTUANTE DE ALERTA DO SENTINELA DE PREÇO */}
      {priceAlert && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 max-w-xl w-[90%] bg-gradient-to-r from-emerald-950/95 via-teal-950/95 to-slate-950/95 border-2 border-emerald-400 text-slate-100 rounded-xl px-4 py-3 shadow-[0_0_35px_rgba(16,185,129,0.5)] flex items-center justify-between gap-3 animate-bounce">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-400 flex items-center justify-center shrink-0">
              <BellRing className="w-5 h-5 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <div className="text-[11px] font-mono text-emerald-300 font-extrabold uppercase tracking-wide flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                SENTINELA DE PREÇO DISPARADO!
              </div>
              <div className="text-xs font-bold text-slate-100">
                {priceAlert.storeName}:{' '}
                <span className="text-emerald-300 font-mono text-sm">
                  R$ {Number(priceAlert.price).toFixed(2)}
                </span>{' '}
                (Meta: R$ {Number(priceAlert.targetPrice).toFixed(2)})
              </div>
              <div className="text-[10px] text-slate-400 truncate max-w-md">
                {priceAlert.productTitle}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {priceAlert.url && (
              <a
                href={priceAlert.url}
                target="_blank"
                rel="noreferrer"
                className="py-1 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold font-mono flex items-center gap-1 transition shadow-[0_0_12px_rgba(16,185,129,0.4)]"
              >
                Comprar
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <button
              onClick={() => setPriceAlert(null)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              title="Dispensar alerta"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ÁREA PRINCIPAL DA APLICAÇÃO */}
      <div className="w-full flex-1 flex overflow-hidden">
        <SidebarWorkspaces
          trees={trees}
          activeTreeId={activeTreeId}
          onSelectTree={(id) => {
            setActiveTreeId(id);
            setSelectedNode(null);
            if (id === 'GLOBAL_BRAIN') fetchFullState();
          }}
          onStartCrawl={handleStartCrawl}
          onStopCrawl={handleStopCrawl}
          onDeleteTree={handleDeleteTree}
          spiderTelemetry={spiderTelemetry}
          totalNodesCount={nodes.length}
        />

        <ObsidianGraph
          nodes={visibleNodes}
          edges={visibleEdges}
          selectedNode={selectedNode}
          onSelectNode={setSelectedNode}
          activeTreeTitle={activeTreeTitle}
        />

        <InspectorDrawer
          selectedNode={selectedNode}
          activeTreeId={activeTreeId}
          activeTree={activeTreeObj}
          onClose={() => setSelectedNode(null)}
          onDeleteNode={handleDeleteNode}
          onExpandNodeWithSpider={handleExpandNodeWithSpider}
          onAddManualNode={handleAddManualNode}
          onSelectNode={setSelectedNode}
        />
      </div>
    </div>
  );
}
