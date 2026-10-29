import React from 'react';
import { Handle, Position } from '@xyflow/react';

export interface AutomatonNodeData {
  id: string;
  label: string;
  subLabel?: string;
  isStart: boolean;
  isAccept: boolean;
  isTrap: boolean;
  isActive: boolean;
  matchedRuleId?: string;
}

export const AutomatonNode: React.FC<{ data: AutomatonNodeData }> = ({ data }) => {
  const { label, subLabel, isStart, isAccept, isTrap, isActive } = data;

  let borderColor = '#475569'; // slate-600
  let bgColor = '#0f172a'; // slate-900
  let textColor = '#f1f5f9'; // slate-100

  if (isActive) {
    borderColor = '#f59e0b'; // amber-500
    bgColor = '#451a03'; // amber-950
    textColor = '#fef3c7';
  } else if (isTrap) {
    borderColor = '#475569';
    bgColor = '#1e1b4b'; // subtle dark slate/indigo
    textColor = '#94a3b8';
  } else if (isAccept && isStart) {
    borderColor = '#10b981'; // emerald-500
    bgColor = '#064e3b';
  } else if (isAccept) {
    borderColor = '#f43f5e'; // rose-500
    bgColor = '#4c0519';
  } else if (isStart) {
    borderColor = '#10b981'; // emerald-500
    bgColor = '#064e3b';
  }

  return (
    <div className="relative group">
      {/* Start State Indicator Arrow */}
      {isStart && (
        <div className="absolute -left-12 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none select-none">
          <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-tight">
            Start
          </span>
          <svg className="w-4 h-4 text-emerald-400 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}

      {/* Main Node Circle */}
      <div
        className={`w-16 h-16 rounded-full flex flex-col items-center justify-center border-2 transition-all duration-200 shadow-md ${
          isActive ? 'ring-4 ring-amber-500/50 scale-105 shadow-amber-500/20' : ''
        }`}
        style={{
          borderColor,
          backgroundColor: bgColor,
        }}
      >
        {/* Handles for edges in 4 directions */}
        <Handle type="target" position={Position.Top} id="top-t" className="!w-1.5 !h-1.5 !bg-transparent !border-0" />
        <Handle type="source" position={Position.Top} id="top-s" className="!w-1.5 !h-1.5 !bg-transparent !border-0" />
        <Handle type="target" position={Position.Left} id="left" className="!w-1.5 !h-1.5 !bg-transparent !border-0" />
        <Handle type="source" position={Position.Right} id="right" className="!w-1.5 !h-1.5 !bg-transparent !border-0" />
        <Handle type="target" position={Position.Bottom} id="bottom-t" className="!w-1.5 !h-1.5 !bg-transparent !border-0" />
        <Handle type="source" position={Position.Bottom} id="bottom-s" className="!w-1.5 !h-1.5 !bg-transparent !border-0" />

        {/* Double-Ring Accept State representation */}
        {isAccept && (
          <div
            className="absolute inset-1.5 rounded-full border pointer-events-none"
            style={{ borderColor: isActive ? '#f59e0b' : '#f43f5e' }}
          />
        )}

        {/* State Label */}
        <span className="font-mono text-sm font-bold pointer-events-none" style={{ color: textColor }}>
          {label}
        </span>
      </div>

      {/* Sublabel (Partition / Subsets) */}
      {subLabel && (
        <div className="absolute top-18 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/90 border border-slate-700/80 px-2 py-0.5 rounded text-[11px] font-mono text-slate-300 pointer-events-none shadow">
          {subLabel.length > 24 ? `${subLabel.slice(0, 22)}…` : subLabel}
        </div>
      )}
    </div>
  );
};
