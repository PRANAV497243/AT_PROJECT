import React, { useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Sliders, CheckCircle2, XCircle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const TapeController: React.FC = () => {
  const {
    simInput,
    setSimInput,
    simStepIdx,
    setSimStepIdx,
    isPlaying,
    setIsPlaying,
    animSpeedMs,
    setAnimSpeedMs,
    simResult,
  } = useAppStore();

  const totalSteps = simResult?.steps.length ?? 0;
  const currentStep = simResult?.steps[simStepIdx] || {
    charIndex: -1,
    description: 'Ready to simulate',
  };

  // Keyboard shortcut listener (Space = play/pause, Left/Right = step)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setIsPlaying(false);
        setSimStepIdx((idx) => Math.min(idx + 1, totalSteps - 1));
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setIsPlaying(false);
        setSimStepIdx((idx) => Math.max(0, idx - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalSteps, setIsPlaying, setSimStepIdx]);

  // Animation interval runner
  useEffect(() => {
    if (!isPlaying) return;
    if (simStepIdx >= totalSteps - 1) {
      setIsPlaying(false);
      return;
    }

    const timer = setTimeout(() => {
      setSimStepIdx((prev) => Math.min(prev + 1, totalSteps - 1));
    }, animSpeedMs);

    return () => clearTimeout(timer);
  }, [isPlaying, simStepIdx, totalSteps, animSpeedMs, setIsPlaying, setSimStepIdx]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
      {/* Header with Title and Accept/Reject status */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <Play className="w-4 h-4 text-amber-400" />
          Interactive Input Tape & Step Simulator
        </h3>
        {simResult && (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              simResult.isAccepted
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
            }`}
          >
            {simResult.isAccepted ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                ACCEPTED
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5" />
                REJECTED
              </>
            )}
          </span>
        )}
      </div>

      {/* Input String Box */}
      <div>
        <label className="text-[11px] font-medium text-slate-400 block mb-1">
          Test Input String (leave empty for empty string ε):
        </label>
        <input
          type="text"
          value={simInput}
          onChange={(e) => setSimInput(e.target.value)}
          placeholder="Enter test string..."
          className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none transition"
        />
      </div>

      {/* Visual Input Tape */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
          <span>Input Tape Head</span>
          <span className="font-mono">
            Step {simStepIdx} / {Math.max(0, totalSteps - 1)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <button
            onClick={() => {
              setIsPlaying(false);
              setSimStepIdx(0);
            }}
            className={`px-2.5 py-1.5 rounded font-mono text-xs border transition ${
              simStepIdx === 0
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            START
          </button>

          {simInput.length === 0 ? (
            <span className="text-xs font-mono text-slate-500 px-3">ε (Empty String)</span>
          ) : (
            simInput.split('').map((ch, idx) => {
              const isCurrent = currentStep.charIndex === idx;
              const isConsumed = currentStep.charIndex > idx;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setIsPlaying(false);
                    if (idx + 1 < totalSteps) {
                      setSimStepIdx(idx + 1);
                    }
                  }}
                  className={`min-w-[32px] h-8 rounded font-mono text-sm font-bold border flex items-center justify-center transition ${
                    isCurrent
                      ? 'bg-amber-500 text-slate-950 border-amber-300 scale-105 shadow-md shadow-amber-500/20'
                      : isConsumed
                      ? 'bg-emerald-950/50 border-emerald-700/50 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {ch === ' ' ? '␣' : ch}
                </button>
              );
            })
          )}
        </div>

        {/* Step description */}
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-xs font-mono text-amber-300/90 min-h-[22px]">
          {currentStep.description}
        </div>
      </div>

      {/* Control Buttons & Playback Speed */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setIsPlaying(false);
              setSimStepIdx(0);
            }}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
            title="Reset to Start"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setIsPlaying(false);
              setSimStepIdx((i) => Math.max(0, i - 1));
            }}
            disabled={simStepIdx === 0}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 transition"
            title="Step Back (Left Arrow)"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (simStepIdx >= totalSteps - 1) {
                setSimStepIdx(0);
                setIsPlaying(true);
              } else {
                setIsPlaying((p) => !p);
              }
            }}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition shadow-md shadow-amber-500/10"
            title="Play / Pause (Spacebar)"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                Play
              </>
            )}
          </button>
          <button
            onClick={() => {
              setIsPlaying(false);
              setSimStepIdx((i) => Math.min(totalSteps - 1, i + 1));
            }}
            disabled={simStepIdx >= totalSteps - 1}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 transition"
            title="Step Forward (Right Arrow)"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Speed Slider */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Sliders className="w-3.5 h-3.5" />
          <span className="text-[11px]">Speed:</span>
          <input
            type="range"
            min="200"
            max="1200"
            step="100"
            value={1400 - animSpeedMs}
            onChange={(e) => setAnimSpeedMs(1400 - Number(e.target.value))}
            className="w-24 accent-amber-400 cursor-pointer"
            title="Animation Speed"
          />
        </div>
      </div>
    </div>
  );
};
