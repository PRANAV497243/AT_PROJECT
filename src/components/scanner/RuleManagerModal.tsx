import React, { useState } from 'react';
import {
  Shield,
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  X,
  Sliders,
} from 'lucide-react';
import { Rule, Severity, parseRegexToAST, buildThompsonNFA, buildSubsetDFA } from '../../engine';
import { useAppStore } from '../../store/useAppStore';

interface RuleManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RuleManagerModal: React.FC<RuleManagerModalProps> = ({ isOpen, onClose }) => {
  const { rules, addRule, updateRule, deleteRule, toggleRule, resetRules } = useAppStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [regex, setRegex] = useState('');
  const [severity, setSeverity] = useState<Severity>('HIGH');
  const [category, setCategory] = useState<Rule['category']>('THREAT');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState(50);

  // Live validation state
  const validationError = React.useMemo(() => {
    if (!regex.trim()) return null;
    try {
      const ast = parseRegexToAST(regex);
      const nfa = buildThompsonNFA(ast);
      buildSubsetDFA(nfa);
      return null;
    } catch (err: any) {
      return err?.message || 'Invalid regular expression';
    }
  }, [regex]);

  if (!isOpen) return null;

  const handleStartEdit = (rule: Rule) => {
    setEditingRuleId(rule.id);
    setName(rule.name);
    setRegex(rule.regex);
    setSeverity(rule.severity);
    setCategory(rule.category);
    setDescription(rule.description);
    setPriority(rule.priority);
    setShowAddForm(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (validationError || !name.trim() || !regex.trim()) return;

    if (editingRuleId) {
      updateRule(editingRuleId, {
        name,
        regex,
        severity,
        category,
        description,
        priority,
      });
      setEditingRuleId(null);
    } else {
      addRule({
        name,
        regex,
        severity,
        category,
        description,
        enabled: true,
        priority,
      });
    }

    // Reset form
    setName('');
    setRegex('');
    setDescription('');
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Rule Catalog & Multi-Pattern DFA Configuration
              </h2>
              <p className="text-xs text-slate-400">
                Add, toggle, or tune threat signatures. All enabled rules compile into a single O(n) DFA.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (window.confirm('Reset all rules to factory defaults?')) {
                  resetRules();
                }
              }}
              className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800 rounded-lg flex items-center gap-1.5 transition"
              title="Reset rules to default"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Defaults
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Add / Edit Form Toggle */}
          {!showAddForm ? (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">
                Active Rules: {rules.filter((r) => r.enabled).length} / {rules.length} enabled
              </span>
              <button
                onClick={() => {
                  setEditingRuleId(null);
                  setName('');
                  setRegex('');
                  setDescription('');
                  setShowAddForm(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 transition shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Custom Rule
              </button>
            </div>
          ) : (
            <form onSubmit={handleSave} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  {editingRuleId ? 'Edit Rule Signature' : 'Define New Regex Threat Signature'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] text-slate-400 block mb-1">Rule Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. JWT Token Leak"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Severity</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as Severity)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                    <option value="INFO">Info</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-slate-400">Regular Expression Pattern</label>
                  {!validationError && regex.trim() && (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                      <CheckCircle2 className="w-3 h-3" /> Syntax OK
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={regex}
                  onChange={(e) => setRegex(e.target.value)}
                  placeholder="e.g. (admin|root)@\\w+\\.com"
                  className={`w-full bg-slate-900 border font-mono text-xs px-3 py-2 rounded-lg focus:outline-none ${
                    validationError
                      ? 'border-rose-500 text-rose-200'
                      : 'border-slate-700 text-emerald-300 focus:border-indigo-500'
                  }`}
                />
                {validationError && (
                  <div className="mt-1.5 text-[11px] text-rose-400 flex items-center gap-1.5 bg-rose-950/30 p-2 rounded border border-rose-500/20">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{validationError}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Rule['category'])}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="THREAT">Cyber Threat</option>
                    <option value="SENSITIVE_DATA">Sensitive Data / PII</option>
                    <option value="AUTH">Authentication</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    Priority Score ({priority}): Higher priority wins longest match ties
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly describe what this rule flags..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!!validationError || !name.trim() || !regex.trim()}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition shadow-sm"
                >
                  {editingRuleId ? 'Update Rule' : 'Save Rule'}
                </button>
              </div>
            </form>
          )}

          {/* Rules Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 w-12">Active</th>
                  <th className="py-2.5 px-3">Rule Name</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Regex Pattern</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {rules.map((rule) => {
                  const isBuiltIn = !rule.id.startsWith('rule_custom_');
                  return (
                    <tr
                      key={rule.id}
                      className={`hover:bg-slate-900/60 transition ${
                        !rule.enabled ? 'opacity-40' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={() => toggleRule(rule.id)}
                          className="rounded accent-indigo-500 cursor-pointer w-4 h-4"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-200">{rule.name}</div>
                        <div className="text-[10px] text-slate-500 font-sans truncate max-w-xs">
                          {rule.description}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            rule.severity === 'CRITICAL'
                              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                              : rule.severity === 'HIGH'
                              ? 'bg-orange-500/15 text-orange-300 border border-orange-500/30'
                              : rule.severity === 'MEDIUM'
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : rule.severity === 'LOW'
                              ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                              : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                          }`}
                        >
                          {rule.severity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-emerald-400 font-mono text-[11px] truncate max-w-sm">
                        {rule.regex}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleStartEdit(rule)}
                            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                            title="Edit Rule"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {!isBuiltIn && (
                            <button
                              onClick={() => deleteRule(rule.id)}
                              className="p-1.5 rounded hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition"
                              title="Delete Rule"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
