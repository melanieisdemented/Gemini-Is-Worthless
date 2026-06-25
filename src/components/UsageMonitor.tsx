import React, { useState } from 'react';
import { useAppStore } from '../store';
import { AlertTriangle, BarChart3, Clock, DollarSign, HelpCircle, RefreshCw, Settings, Sliders, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function UsageMonitor() {
  const {
    estimatedMonthlySpend,
    maxMonthlySpendCap,
    usageLogs,
    resetUsageLogs,
    setMaxMonthlySpendCap
  } = useAppStore();

  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tempCap, setTempCap] = useState(maxMonthlySpendCap.toString());

  const spendPercentage = Math.min((estimatedMonthlySpend / maxMonthlySpendCap) * 100, 100);
  const isCloseToCap = estimatedMonthlySpend >= maxMonthlySpendCap * 0.75;
  const isOverCap = estimatedMonthlySpend >= maxMonthlySpendCap;

  const handleSaveCap = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(tempCap);
    if (!isNaN(parsed) && parsed > 0) {
      setMaxMonthlySpendCap(parsed);
      setShowSettings(false);
    }
  };

  // Helper to format timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="relative">
      {/* Header Button Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all text-left group ${
          isOverCap 
            ? 'bg-red-500/10 border-red-500/30 text-red-200 hover:bg-red-500/20' 
            : isCloseToCap 
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-200 hover:bg-amber-500/20' 
              : 'bg-white/5 border-white/10 hover:border-white/20 text-white'
        }`}
      >
        <div className="p-1.5 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
          <BarChart3 className={`w-4 h-4 ${
            isOverCap ? 'text-red-400' : isCloseToCap ? 'text-amber-400' : 'text-[#ff4e00]'
          }`} />
        </div>
        <div className="space-y-0.5 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-white/90">Simulated Spend</span>
            {(isOverCap || isCloseToCap) && (
              <AlertTriangle className={`w-3.5 h-3.5 ${isOverCap ? 'text-red-400 animate-pulse' : 'text-amber-400'}`} />
            )}
          </div>
          <div className="font-mono text-white/60">
            ${estimatedMonthlySpend.toFixed(2)} <span className="opacity-40">/</span> ${maxMonthlySpendCap.toFixed(2)}
          </div>
        </div>
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Click-away backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => { setIsOpen(false); setShowSettings(false); }}
            />
            
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute right-0 mt-3 w-96 bg-[#120b08] border border-white/10 rounded-2xl shadow-2xl p-5 z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#ff4e00]" />
                  <h4 className="font-medium text-white/95">Spending & Usage Tracker</h4>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-1.5 hover:bg-white/5 rounded-lg text-white/60 hover:text-white transition-colors"
                    title="Configure Limits"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { setIsOpen(false); setShowSettings(false); }}
                    className="p-1.5 hover:bg-white/5 rounded-lg text-white/60 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Settings Mode */}
              {showSettings ? (
                <form onSubmit={handleSaveCap} className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-white/70 uppercase tracking-wider block">
                      Simulated Monthly Cap (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-white/40 text-sm">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.10"
                        value={tempCap}
                        onChange={(e) => setTempCap(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-7 pr-4 text-sm text-white focus:outline-none focus:border-white/20 font-mono"
                      />
                    </div>
                    <p className="text-[10px] text-white/40 leading-relaxed">
                      Adjust your simulated threshold. When usage reaches 75% or 100% of this limit, the interface will alert you.
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-white text-black font-medium text-xs rounded-xl hover:bg-white/90 transition-all"
                    >
                      Save Configuration
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSettings(false)}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-medium text-xs rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  {/* Spend Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-white/60 font-mono">
                      <span>Monthly Spend Progress</span>
                      <span>{spendPercentage.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-white/5 border border-white/5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOverCap 
                            ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' 
                            : isCloseToCap 
                              ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' 
                              : 'bg-[#ff4e00] shadow-[0_0_8px_rgba(255,78,0,0.5)]'
                        }`}
                        style={{ width: `${spendPercentage}%` }}
                      />
                    </div>
                    
                    {isOverCap ? (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[11px] text-red-300 leading-relaxed flex gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                        <span>
                          <strong>Cap Exceeded!</strong> You have spent simulated <strong>${estimatedMonthlySpend.toFixed(2)}</strong>, exceeding your monthly threshold. Please increase your spend cap in settings or proceed with caution.
                        </span>
                      </div>
                    ) : isCloseToCap ? (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300 leading-relaxed flex gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                        <span>
                          <strong>Warning:</strong> You have hit 75% of your simulated spend cap. Slow down or adjust your cap to keep track safely.
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {/* Estimates Reference Grid */}
                  <div className="bg-white/5 border border-white/5 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1">
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Reference API Costs</span>
                    </div>
                    <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-xs text-white/70">
                      <div className="flex justify-between items-center pb-1 border-b border-white/5">
                        <span className="truncate">Google Veo (Video)</span>
                        <span className="font-mono text-[#ff4e00] font-medium">$0.20</span>
                      </div>
                      <div className="flex justify-between items-center pb-1 border-b border-white/5">
                        <span className="truncate">HF Cloud Video</span>
                        <span className="font-mono text-[#ff4e00] font-medium">$0.05</span>
                      </div>
                      <div className="flex justify-between items-center pb-1 border-b border-white/5">
                        <span className="truncate">Alternate Angles</span>
                        <span className="font-mono text-[#ff4e00] font-medium">$0.03</span>
                      </div>
                      <div className="flex justify-between items-center pb-1 border-b border-white/5">
                        <span className="truncate">Image Gen</span>
                        <span className="font-mono text-[#ff4e00] font-medium">$0.03</span>
                      </div>
                      <div className="flex justify-between items-center col-span-2">
                        <span className="truncate">AI Chat / Analyze / Audio</span>
                        <span className="font-mono text-white/40">$0.002 - $0.01</span>
                      </div>
                    </div>
                  </div>

                  {/* Recent Logs */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-white/40 uppercase tracking-wider">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Recent Logs</span>
                      </div>
                      {usageLogs.length > 0 && (
                        <button
                          onClick={resetUsageLogs}
                          className="text-[10px] text-white/40 hover:text-[#ff4e00] transition-colors flex items-center gap-1 font-medium"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Reset All
                        </button>
                      )}
                    </div>

                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1 border border-white/5 bg-black/25 rounded-xl p-2 font-mono scrollbar-thin">
                      {usageLogs.length === 0 ? (
                        <div className="text-center py-6 text-xs text-white/30 italic">
                          No recent simulated API calls logged
                        </div>
                      ) : (
                        usageLogs.slice(0, 10).map((log) => (
                          <div 
                            key={log.id} 
                            className="flex items-center justify-between p-1.5 hover:bg-white/5 rounded-lg text-[10px] transition-colors"
                          >
                            <div className="flex flex-col min-w-0">
                              <span className="text-white/80 font-medium truncate uppercase">{log.type}</span>
                              <span className="text-white/40 text-[9px] truncate">{log.modelName}</span>
                            </div>
                            <div className="flex flex-col items-end shrink-0 ml-2">
                              <span className="text-[#ff4e00] font-bold">${log.cost.toFixed(3)}</span>
                              <span className="text-[8px] text-white/30">{formatTime(log.timestamp)}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
