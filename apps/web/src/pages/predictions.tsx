import { useState, useEffect } from "react";
import {
  getQuickPredictQueryKey,
  useQuickPredict,
  useGetPredictionHistory,
} from "@pulse/api-client-react";
import { Card, Button, Input, Badge } from "@/components/ui";
import { LineChart, Search, History, ArrowUpRight, ArrowDownRight, Zap } from "lucide-react";
import { formatNumber, formatPercentage } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// --- Scramble Text Effect ---
function ScrambleText({ text, className }: { text: string; className?: string }) {
  const [displayText, setDisplayText] = useState("");
  const chars = "!<>-_\\\\/[]{}—=+*^?#_";
  
  useEffect(() => {
    let iteration = 0;
    let interval: any = null;
    
    clearInterval(interval);
    
    interval = setInterval(() => {
      setDisplayText((prev) => text
        .split("")
        .map((letter, index) => {
          if(index < iteration) return text[index];
          return chars[Math.floor(Math.random() * chars.length)];
        })
        .join("")
      );
      
      if(iteration >= text.length){ 
        clearInterval(interval);
      }
      iteration += 1 / 3; 
    }, 30);

    return () => clearInterval(interval);
  }, [text]);

  return <span className={className}>{displayText}</span>;
}

export function Predictions() {
  const [tickerInput, setTickerInput] = useState("AAPL");
  const [activeTicker, setActiveTicker] = useState("");

  const { data: predictData, isLoading: isPredicting, isError: predictError } = useQuickPredict(activeTicker, {
    query: { queryKey: getQuickPredictQueryKey(activeTicker), enabled: !!activeTicker, retry: false }
  });

  const { data: historyData } = useGetPredictionHistory();

  const handlePredict = (e: React.FormEvent) => {
    e.preventDefault();
    if(tickerInput) setActiveTicker(tickerInput.toUpperCase());
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 30, filter: "blur(10px)" },
    show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, ease: "easeOut" } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-12 pb-24"
    >
      <motion.div variants={itemVariants} className="relative pt-4">
        <div className="absolute -left-32 -top-20 w-96 h-96 bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
        <h1 className="text-5xl md:text-7xl font-heading font-bold flex items-center gap-5 text-foreground relative z-10 tracking-tight">
          <div className="p-4 rounded-3xl bg-primary/10 border border-primary/20 shadow-[0_0_40px_rgba(0,229,255,0.2)] backdrop-blur-xl">
            <LineChart className="text-primary w-10 h-10 drop-shadow-[0_0_15px_rgba(0,229,255,0.8)]" />
          </div>
          <span className="text-gradient">Inference Engine</span>
        </h1>
        <p className="text-muted-foreground mt-6 text-lg font-mono relative z-10 tracking-wide">Run real-time predictions and review historical accuracy.</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 relative z-10">
        {/* Quick Predict Tool */}
        <motion.div variants={itemVariants} className="lg:col-span-1 space-y-6">
          <Card className="glass-panel p-8 relative overflow-hidden group border-white/5" disableTilt={false}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 blur-[80px] rounded-full pointer-events-none -mr-20 -mt-20 group-hover:bg-yellow-500/20 transition-colors duration-700" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/10 blur-[50px] rounded-full pointer-events-none -ml-10 -mb-10 group-hover:bg-primary/20 transition-colors duration-700" />
            
            <h2 className="text-3xl font-heading font-bold flex items-center gap-3 mb-8 relative z-10">
              <Zap className="text-yellow-400 w-7 h-7 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]" /> 
              <span className="glow-text">Live Inference</span>
            </h2>
            
            <form onSubmit={handlePredict} className="flex flex-col gap-4 relative z-10">
              <div className="relative group/input">
                <Input 
                  value={tickerInput} 
                  onChange={(e) => setTickerInput(e.target.value)}
                  placeholder="ENTER TICKER (E.G. MSFT)"
                  className="font-mono uppercase text-xl h-16 px-6 bg-black/40 border-white/10 focus:border-primary/50 focus:ring-primary/30 rounded-2xl transition-all duration-300 shadow-inner group-hover/input:bg-black/60 tracking-widest placeholder:text-muted-foreground/50"
                />
                <div className="absolute inset-0 border border-primary/0 rounded-2xl group-hover/input:border-primary/20 pointer-events-none transition-colors duration-500" />
              </div>
              <Button type="submit" size="lg" className="h-16 text-lg font-bold tracking-[0.2em] uppercase rounded-2xl shadow-[0_0_20px_rgba(0,229,255,0.2)] hover:shadow-[0_0_30px_rgba(0,229,255,0.4)] transition-shadow duration-500" isLoading={isPredicting}>
                {!isPredicting && <><Search className="w-5 h-5 mr-3" /> Execute Inference</>}
                {isPredicting && "Processing..."}
              </Button>
            </form>

            <AnimatePresence mode="wait">
              {predictError && (
                <motion.div 
                  initial={{ opacity: 0, y: -10, filter: "blur(5px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -10, filter: "blur(5px)" }}
                  className="mt-8 p-5 bg-destructive/10 text-destructive border border-destructive/30 rounded-2xl text-sm font-mono shadow-[0_0_20px_rgba(239,68,68,0.2)] backdrop-blur-md relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-destructive shadow-[0_0_10px_rgba(239,68,68,1)]" />
                  Failed to generate prediction. Verify ticker symbol and network uplink.
                </motion.div>
              )}

              {predictData && (
                <motion.div 
                  key={predictData.ticker}
                  initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="mt-10 space-y-5"
                >
                  <div className="text-center pb-8 border-b border-white/5 relative">
                    <div className="absolute bottom-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent shadow-[0_0_10px_rgba(0,229,255,0.5)]" />
                    <h3 className="text-6xl font-bold font-heading tracking-tight text-primary glow-text drop-shadow-[0_0_20px_rgba(0,229,255,0.4)]">
                      <ScrambleText text={predictData.ticker} />
                    </h3>
                    <div className="flex justify-center gap-4 mt-5 flex-wrap">
                      {(predictData as any).meta?.forecast_date && (
                        <span className="text-[11px] text-muted-foreground font-mono bg-black/60 px-4 py-1.5 rounded-md border border-white/10 tracking-[0.2em] uppercase shadow-inner">
                          TGT: {(predictData as any).meta.forecast_date}
                        </span>
                      )}
                      {(predictData as any).meta?.best_model && (
                        <Badge variant="outline" className="text-[11px] tracking-[0.2em] px-4 border-primary/30 text-primary shadow-[0_0_15px_rgba(0,229,255,0.1)] bg-primary/5 rounded-md">
                          CHAMPION: <ScrambleText text={(predictData as any).meta.best_model} />
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-4 pt-4">
                    {Object.entries(predictData.predictions || {}).map(([model, p]: [string, any], i) => {
                      const isUp = p.direction === "UP";
                      const pct = Math.round(p.confidence * 100);
                      const isEnsemble = model === "Ensemble_Stack";
                      return (
                        <motion.div 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * i, type: "spring", stiffness: 100 }}
                          key={model} 
                          className={`flex items-center justify-between p-5 rounded-2xl border ${isEnsemble ? 'bg-primary/10 border-primary/40 shadow-[0_10px_30px_rgba(0,229,255,0.15)]' : 'bg-black/40 border-white/5 hover:bg-black/60'} transition-all duration-300 group`}
                        >
                          <div>
                            <p className={`font-semibold font-heading tracking-wide ${isEnsemble ? 'text-primary text-xl' : 'text-foreground text-lg'}`}>{model}</p>
                            <div className="flex gap-4 mt-3">
                              <Badge variant={isUp ? "success" : "destructive"} className="px-3 shadow-none">
                                {p.strength}
                              </Badge>
                              <span className="text-[10px] font-mono font-bold text-muted-foreground bg-black/60 px-3 py-1 rounded-md border border-white/10 tracking-widest shadow-inner group-hover:text-foreground/80 transition-colors">
                                {pct}% CONF
                              </span>
                            </div>
                          </div>
                          <div className={`p-4 rounded-xl border border-white/10 backdrop-blur-md ${isUp ? 'text-success bg-success/10 shadow-[0_0_15px_rgba(34,197,94,0.2)]' : 'text-destructive bg-destructive/10 shadow-[0_0_15px_rgba(239,68,68,0.2)]'} group-hover:scale-110 transition-transform duration-500`}>
                            {isUp ? <ArrowUpRight className="w-7 h-7 drop-shadow-[0_0_10px_currentColor]" /> : <ArrowDownRight className="w-7 h-7 drop-shadow-[0_0_10px_currentColor]" />}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>

        {/* History Table */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="glass-panel flex flex-col h-[85vh] overflow-hidden border-white/5 shadow-2xl relative" disableTilt={true}>
             <div className="absolute inset-0 bg-gradient-to-b from-black/80 to-black/40 pointer-events-none z-0" />
            <div className="p-8 border-b border-white/5 bg-black/40 backdrop-blur-2xl flex items-center justify-between relative z-10">
              <h2 className="text-2xl font-heading font-bold flex items-center gap-4 glow-text tracking-wide">
                <div className="p-2 bg-primary/20 rounded-lg border border-primary/30 shadow-[0_0_15px_rgba(0,229,255,0.3)]">
                  <History className="text-primary w-5 h-5" /> 
                </div>
                Telemetry Archive
              </h2>
              <Badge variant="outline" className="bg-black/60 border-white/10 text-muted-foreground px-4 py-1.5 shadow-inner text-xs font-mono tracking-widest">
                {historyData?.count || 0} RECORDS
              </Badge>
            </div>
            
            <div className="flex-1 overflow-auto bg-black/20 relative z-10 custom-scrollbar">
              <table className="w-full text-sm text-left relative">
                <thead className="sticky top-0 text-[10px] text-muted-foreground/80 uppercase tracking-[0.2em] bg-black/80 backdrop-blur-xl font-mono z-20 shadow-md border-b border-white/10">
                  <tr>
                    <th className="px-6 py-5">Timestamp</th>
                    <th className="px-6 py-5">Asset</th>
                    <th className="px-6 py-5">Architecture</th>
                    <th className="px-6 py-5">Forecast</th>
                    <th className="px-6 py-5">Conf</th>
                    <th className="px-6 py-5">Resolution</th>
                    <th className="px-6 py-5">Yield</th>
                    <th className="px-6 py-5 text-center">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {historyData?.rows?.map((row: any, i: number) => {
                    const isUp   = row.predicted === "UP";
                    const isDown = row.predicted === "DOWN";
                    const actUp  = row.actual === "UP";
                    const actDwn = row.actual === "DOWN";
                    const isPending = !row.actual || row.actual === "PENDING";
                    const conf = row.confidence ? `${Math.round(parseFloat(row.confidence) * 100)}%` : "-";
                    return (
                      <tr key={i} className="hover:bg-white/[0.03] font-mono transition-colors duration-300 group">
                        <td className="px-6 py-5 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors text-[11px] tracking-wider">{row.date || "-"}</td>
                        <td className="px-6 py-5 font-bold text-foreground text-base group-hover:text-primary transition-colors drop-shadow-sm">{row.ticker || "-"}</td>
                        <td className="px-6 py-5 text-[12px] text-muted-foreground group-hover:text-foreground/80 transition-colors">{row.model || "-"}</td>

                        {/* Predicted */}
                        <td className="px-6 py-5">
                          <span className={`flex items-center gap-1.5 font-semibold text-[13px] ${isUp ? "text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]" : isDown ? "text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]" : "text-muted-foreground"}`}>
                            {isUp ? "▲ UP" : isDown ? "▼ DOWN" : row.predicted || "-"}
                          </span>
                        </td>

                        {/* Confidence */}
                        <td className="px-6 py-5 text-[12px] text-muted-foreground font-bold tracking-wider">{conf}</td>

                        {/* Actual */}
                        <td className="px-6 py-5">
                          {isPending ? (
                            <span className="text-[10px] text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-md font-mono shadow-[0_0_15px_rgba(234,179,8,0.15)] tracking-widest uppercase">
                              PENDING
                            </span>
                          ) : (
                            <span className={`font-semibold text-[13px] ${actUp ? "text-green-400" : actDwn ? "text-red-400" : "text-muted-foreground"}`}>
                              {actUp ? "▲ UP" : "▼ DOWN"}
                            </span>
                          )}
                        </td>

                        {/* Return */}
                        <td className="px-6 py-5">
                          {row.return != null ? (
                            <span className={`text-[13px] font-bold ${row.return >= 0 ? "text-green-400 glow-text drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]"}`}>
                              {row.return >= 0 ? "+" : ""}{(row.return * 100).toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50">-</span>
                          )}
                        </td>

                        {/* Hit */}
                        <td className="px-6 py-5 text-center text-xl">
                          {row.hit === "✓" ? (
                            <span className="text-green-400 drop-shadow-[0_0_12px_rgba(34,197,94,0.8)]">✓</span>
                          ) : row.hit === "✗" ? (
                            <span className="text-red-400 drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]">✗</span>
                          ) : (
                            <span className="text-muted-foreground/30">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {(!historyData?.rows || historyData.rows.length === 0) && (
                    <tr>
                      <td colSpan={8} className="px-6 py-20 text-center text-muted-foreground font-mono italic text-lg tracking-wide">
                        <div className="flex flex-col items-center justify-center gap-4 opacity-50">
                          <History className="w-12 h-12" />
                          No historical predictions found in the archive.
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
