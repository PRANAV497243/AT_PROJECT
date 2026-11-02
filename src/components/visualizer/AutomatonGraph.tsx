import React, { useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { NFA, DFA } from '../../engine';
import { AutomatonNode } from './AutomatonNode';

const nodeTypes = {
  automatonNode: AutomatonNode,
};

interface AutomatonGraphProps {
  automaton: NFA | DFA;
  activeStates: string[];
  activeEdges: string[];
  showTrapState: boolean;
}

export const AutomatonGraph: React.FC<AutomatonGraphProps> = ({
  automaton,
  activeStates,
  activeEdges,
  showTrapState,
}) => {
  const activeStateSet = useMemo(() => new Set(activeStates), [activeStates]);
  const activeEdgeSet = useMemo(() => new Set(activeEdges), [activeEdges]);

  // Compute graph layout and elements
  const { initialNodes, initialEdges } = useMemo(() => {
    const visibleStates = showTrapState
      ? automaton.states
      : automaton.states.filter((s) => !s.isTrap);

    const visibleStateIds = new Set(visibleStates.map((s) => s.id));
    const visibleTransitions = automaton.transitions.filter(
      (t) => visibleStateIds.has(t.from) && visibleStateIds.has(t.to)
    );

    // Layered DAG layout calculation
    const layers: Record<string, number> = {};
    const visited = new Set<string>([automaton.startState]);
    const queue: Array<{ id: string; layer: number }> = [{ id: automaton.startState, layer: 0 }];
    layers[automaton.startState] = 0;

    while (queue.length > 0) {
      const { id, layer } = queue.shift()!;
      for (const t of visibleTransitions) {
        if (t.from === id && !visited.has(t.to)) {
          visited.add(t.to);
          layers[t.to] = layer + 1;
          queue.push({ id: t.to, layer: layer + 1 });
        }
      }
    }

    // Assign layer 0 to any disconnected states
    visibleStates.forEach((st) => {
      if (layers[st.id] === undefined) {
        layers[st.id] = 0;
      }
    });

    const layerBuckets: Record<number, string[]> = {};
    visibleStates.forEach((st) => {
      const l = layers[st.id];
      if (!layerBuckets[l]) layerBuckets[l] = [];
      layerBuckets[l].push(st.id);
    });

    const layerKeys = Object.keys(layerBuckets)
      .map(Number)
      .sort((a, b) => a - b);

    const horizontalGap = Math.max(220, Math.min(320, 1100 / Math.max(1, layerKeys.length)));
    const verticalGap = 160;
    const startX = 80;
    const centerY = 290;

    const positions: Record<string, { x: number; y: number }> = {};
    layerKeys.forEach((lKey, colIdx) => {
      const bucket = layerBuckets[lKey];
      const count = bucket.length;
      bucket.forEach((stId, rowIdx) => {
        const offsetY = (rowIdx - (count - 1) / 2) * verticalGap;
        positions[stId] = {
          x: startX + colIdx * horizontalGap,
          y: centerY + offsetY,
        };
      });
    });

    // Group parallel edges between identical (from, to) pairs
    const edgeMap = new Map<string, { from: string; to: string; symbols: string[] }>();
    for (const t of visibleTransitions) {
      const key = `${t.from}->${t.to}`;
      if (!edgeMap.has(key)) {
        edgeMap.set(key, { from: t.from, to: t.to, symbols: [] });
      }
      if (!edgeMap.get(key)!.symbols.includes(t.symbol)) {
        edgeMap.get(key)!.symbols.push(t.symbol);
      }
    }

    // Build React Flow Nodes
    const nodes: Node[] = visibleStates.map((st) => {
      const pos = positions[st.id] || { x: 100, y: 100 };
      const isActive = activeStateSet.has(st.id);
      return {
        id: st.id,
        type: 'automatonNode',
        position: pos,
        data: {
          id: st.id,
          label: st.label,
          subLabel: st.subLabel,
          isStart: st.isStart,
          isAccept: st.isAccept,
          isTrap: st.isTrap,
          isActive,
          matchedRuleId: st.matchedRuleId,
        },
      };
    });

    // Build React Flow Edges
    const edges: Edge[] = Array.from(edgeMap.values()).map((e) => {
      const edgeId = `${e.from}->${e.to}`;
      const isSelfLoop = e.from === e.to;
      const isEdgeActive = activeEdgeSet.has(edgeId);

      const label = e.symbols.join(', ');
      const hasReverse = edgeMap.has(`${e.to}->${e.from}`) && !isSelfLoop;

      return {
        id: edgeId,
        source: e.from,
        target: e.to,
        sourceHandle: isSelfLoop ? 'top-s' : hasReverse ? 'bottom-s' : 'right',
        targetHandle: isSelfLoop ? 'top-t' : hasReverse ? 'bottom-t' : 'left',
        label,
        type: isSelfLoop ? 'smoothstep' : 'default',
        animated: isEdgeActive,
        style: {
          stroke: isEdgeActive ? '#f59e0b' : '#64748b',
          strokeWidth: isEdgeActive ? 3 : 1.75,
        },
        labelStyle: {
          fill: isEdgeActive ? '#fef3c7' : '#cbd5e1',
          fontWeight: 700,
          fontFamily: 'monospace',
          fontSize: 12,
        },
        labelBgStyle: {
          fill: '#0f172a',
          fillOpacity: 0.95,
          stroke: isEdgeActive ? '#f59e0b' : '#334155',
          strokeWidth: 1.2,
          rx: 5,
          ry: 5,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isEdgeActive ? '#f59e0b' : '#64748b',
          width: 15,
          height: 15,
        },
      };
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [automaton, showTrapState, activeStateSet, activeEdgeSet]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync state when nodes/edges layout changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  return (
    <div id="patternguard-graph-canvas" className="w-full h-[600px] bg-slate-950 rounded-xl border border-slate-800 relative overflow-hidden shadow-inner">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.18, minZoom: 0.85, maxZoom: 1.5 }}
        minZoom={0.35}
        maxZoom={2.5}
      >
        <Background color="#334155" gap={20} size={1} />
        <Controls className="!bg-slate-900 !border !border-slate-800 !fill-slate-300" />
        <MiniMap
          nodeStrokeColor="#64748b"
          nodeColor={(n) => {
            if (n.data?.isActive) return '#f59e0b';
            if (n.data?.isAccept) return '#f43f5e';
            if (n.data?.isStart) return '#10b981';
            return '#1e293b';
          }}
          className="!bg-slate-900/90 !border !border-slate-800 rounded-lg !bottom-3 !right-3"
          maskColor="rgba(15, 23, 42, 0.7)"
        />
      </ReactFlow>
    </div>
  );
};
