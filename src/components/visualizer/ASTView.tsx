import React from 'react';
import { GitGraph } from 'lucide-react';
import { ASTNode } from '../../engine';

interface ASTViewProps {
  ast: ASTNode | null;
}

export const ASTView: React.FC<ASTViewProps> = ({ ast }) => {
  if (!ast) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-xs text-slate-500">
        No AST available.
      </div>
    );
  }

  const renderNode = (node: ASTNode) => (
    <div key={node.id} className="flex flex-col items-center">
      <div
        className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold shadow-sm transition hover:scale-105 ${
          node.type === 'LITERAL' || node.type === 'CHAR_CLASS' || node.type === 'ANY_CHAR'
            ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
            : node.type === 'UNION' || node.type === 'CONCAT'
            ? 'bg-indigo-950/80 border-indigo-500/50 text-indigo-300'
            : 'bg-amber-950/80 border-amber-500/50 text-amber-300'
        }`}
      >
        {node.label}
      </div>
      {node.children && node.children.length > 0 && (
        <div className="flex items-start gap-4 mt-4 relative">
          {node.children.map((child) => (
            <div key={child.id} className="flex flex-col items-center">
              <div className="w-[1.5px] h-4 bg-slate-700 -mt-4 mb-1" />
              {renderNode(child)}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
        <GitGraph className="w-4 h-4 text-emerald-400" />
        Parsed Abstract Syntax Tree (AST) Hierarchy
      </h3>
      <div className="p-6 bg-slate-950 rounded-lg border border-slate-800/80 overflow-x-auto flex justify-center min-h-[220px] items-center">
        {renderNode(ast)}
      </div>
    </div>
  );
};
