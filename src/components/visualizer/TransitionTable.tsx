import React from 'react';
import { Table as TableIcon } from 'lucide-react';
import { DFA } from '../../engine';

interface TransitionTableProps {
  dfa: DFA;
  showTrapState: boolean;
}

export const TransitionTable: React.FC<TransitionTableProps> = ({ dfa, showTrapState }) => {
  const visibleStates = showTrapState ? dfa.states : dfa.states.filter((s) => !s.isTrap);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <TableIcon className="w-4 h-4 text-indigo-400" />
          Transition Function δ(q, σ) & Partition Equivalence Table
        </h3>
        <span className="text-xs font-mono text-slate-400">
          Alphabet Σ: {dfa.alphabet.length} symbols
        </span>
      </div>

      <div className="overflow-x-auto max-h-[380px] rounded-lg border border-slate-800">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead className="sticky top-0 bg-slate-950 z-10 border-b border-slate-800">
            <tr className="text-slate-400">
              <th className="py-2.5 px-3">State</th>
              <th className="py-2.5 px-3">Subsets / Merged Partition</th>
              {dfa.alphabet.map((sym) => (
                <th key={sym} className="py-2.5 px-3 text-amber-300">
                  {sym === ' ' ? '␣ (space)' : sym}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70 bg-slate-900/60">
            {visibleStates.map((st) => (
              <tr key={st.id} className="hover:bg-slate-800/40 transition">
                <td className="py-2.5 px-3 font-bold flex items-center gap-1.5 whitespace-nowrap">
                  {st.isStart && (
                    <span className="text-emerald-400" title="Start State">
                      →
                    </span>
                  )}
                  {st.isAccept && (
                    <span className="text-rose-400" title="Accept State">
                      *
                    </span>
                  )}
                  <span className="text-slate-100">{st.label}</span>
                </td>
                <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                  {st.subLabel || '—'}
                </td>
                {dfa.alphabet.map((sym) => {
                  const edge = dfa.transitions.find((t) => t.from === st.id && t.symbol === sym);
                  const target = edge ? edge.to : '—';
                  return (
                    <td
                      key={sym}
                      className={`py-2.5 px-3 whitespace-nowrap ${
                        target === 'q_dead' ? 'text-slate-600' : target !== '—' ? 'text-emerald-300 font-semibold' : 'text-slate-600'
                      }`}
                    >
                      {target === 'q_dead' ? '∅ (Trap)' : target}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
