import { useState, useEffect } from "react";
import { useGetSummary } from "@pulse/api-client-react";
import { Card, Badge, Button } from "@/components/ui";
import {
  ArrowUpRight, ArrowDownRight, Activity, Clock, Target,
  Hash, AlertCircle, BarChart2, Trophy, TrendingUp, TrendingDown,
} from "lucide-react";
import { formatNumber, formatPercentage } from "@/lib/utils";
import { motion } from "framer-motion";
import { Link } from "wouter";

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

// ── Ticker Ranking Panel ───────────────────────────────────────
function TickerRankingPanel({
  ranking,
  forecastLabel,
}: {
  ranking: Record<string, { rank: number; probability: number; direction: string; strength: string }>;
  forecastLabel?: string;
}) {
  const sorted = Object.entries(ranking).sort((a, b) => a[1].rank - b[1].rank);
  const top = sorted[0];
  const worst = sorted[sorted.length - 1];

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6 relative"
    >
      <h2 className="text-2xl font-heading font-bold border-b border-white/5 pb-4 flex items-center gap-4">
        <div className="p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.2)]">
          <Trophy className="w-6 h-6 text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]" />
        </div>
        <span className="text-gradient">Multi-Ticker Intelligence</span>
        {forecastLabel && (
          <span className="text-[11px] font-bold text-muted-foreground font-mono ml-auto tracking-[0.2em] uppercase bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
            {forecastLabel === "TOMORROW" ? "1 Day Forecast" : forecastLabel === "NEXT WEEK" ? "5 Day Forecast" : "21 Day Forecast"}
          </span>
        )}
      </h2>

      {/* Top pick / avoid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-8 border-t-[3px] border-t-green-500/60 bg-gradient-to-b from-green-500/5 to-transparent relative overflow-hidden group">
          <div className="absolute -right-20 -top-20 w-48 h-48 bg-green-500/10 blur-[50px] rounded-full pointer-events-none group-hover:bg-green-500/20 transition-colors duration-700" />
          <p className="text-[10px] text-green-400/80 mb-3 font-mono uppercase tracking-[0.3em]">Primary Target</p>
          <div className="flex items-end gap-5 relative z-10">
            <p className="text-5xl font-bold font-heading text-green-400 glow-text drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]">
               <ScrambleText text={top?.[0] ?? "—"} />
            </p>
            <p className="text-sm text-foreground mb-1.5 font-mono bg-green-500/10 px-4 py-1.5 rounded-full border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
              {top ? `${(top[1].probability * 100).toFixed(1)}% / ${top[1].strength}` : ""}
            </p>
          </div>
        </Card>
        
        <Card className="p-8 border-t-[3px] border-t-red-500/60 bg-gradient-to-b from-red-500/5 to-transparent relative overflow-hidden group">
          <div className="absolute -right-20 -top-20 w-48 h-48 bg-red-500/10 blur-[50px] rounded-full pointer-events-none group-hover:bg-red-500/20 transition-colors duration-700" />
          <p className="text-[10px] text-red-400/80 mb-3 font-mono uppercase tracking-[0.3em]">Highest Risk</p>
          <div className="flex items-end gap-5 relative z-10">
            <p className="text-5xl font-bold font-heading text-red-400 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">
               <ScrambleText text={worst?.[0] ?? "—"} />
            </p>
            <p className="text-sm text-foreground mb-1.5 font-mono bg-red-500/10 px-4 py-1.5 rounded-full border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
              {worst ? `${(worst[1].probability * 100).toFixed(1)}% / ${worst[1].strength}` : ""}
            </p>
          </div>
        </Card>
      </div>

      {/* Full ranking bar chart */}
      <Card className="overflow-hidden border-white/5 shadow-2xl relative">
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 to-transparent pointer-events-none z-0" />
        <div className="p-6 border-b border-white/5 bg-black/40 backdrop-blur-xl relative z-10">
          <p className="text-[11px] text-primary font-mono uppercase tracking-[0.2em] font-bold flex items-center gap-2">
             <Activity className="w-3.5 h-3.5" /> Ensemble Stack Matrix
          </p>
        </div>
        <div className="divide-y divide-white/5 bg-black/20 relative z-10">
          {sorted.map(([ticker, info], i) => {
            const isUp = info.direction === "UP";
            const pct = info.probability * 100;
            const barWidth = Math.abs(pct - 50) * 2;
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `0${i + 1}`;

            return (
              <motion.div 
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: i * 0.05, type: "spring", stiffness: 100 }}
                key={ticker} 
                className="px-6 py-5 flex items-center gap-6 hover:bg-white/[0.04] transition-colors duration-300 group"
              >
                <span className="w-8 text-center text-[10px] font-mono text-muted-foreground group-hover:text-primary transition-colors tracking-widest">
                  {medal}
                </span>

                <span className="w-16 font-bold font-heading text-xl text-foreground tracking-widest drop-shadow-md">{ticker}</span>

                <div className="flex-1 h-3.5 bg-black/60 rounded-full overflow-hidden border border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] relative">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${barWidth}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, delay: 0.2 + (i * 0.05), type: "spring", stiffness: 50 }}
                    className={`h-full rounded-full relative ${isUp ? "bg-gradient-to-r from-green-600 to-green-400" : "bg-gradient-to-r from-red-600 to-red-400"}`}
                  >
                    <div className="absolute top-0 right-0 bottom-0 w-12 bg-white/30 blur-[8px]" />
                  </motion.div>
                </div>

                <div className="flex items-center gap-4 w-36 justify-end">
                  <span className="font-mono text-sm font-bold tracking-wider">{pct.toFixed(1)}%</span>
                  <Badge variant={isUp ? "success" : "destructive"} className="shadow-none px-3">
                    {isUp ? <TrendingUp className="w-3.5 h-3.5 mr-1.5" /> : <TrendingDown className="w-3.5 h-3.5 mr-1.5" />}
                    {info.direction}
                  </Badge>
                </div>
              </motion.div>
            );
          })}
        </div>
      </Card>
    </motion.div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────
export function Dashboard() {
  const { data, isLoading, error } = useGetSummary();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 30, filter: "blur(10px)" },
    show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, ease: "easeOut" } }
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center relative">
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full pointer-events-none" />
          <motion.div
            animate={{ rotate: 360, scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="mb-8 relative z-10"
          >
            <Activity className="w-20 h-20 text-primary glow-text" />
          </motion.div>
          <p className="text-primary font-mono tracking-[0.3em] uppercase text-xs animate-pulse relative z-10 font-bold">Initializing Telemetry...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-12 text-center border-destructive/30 bg-destructive/5 max-w-xl mx-auto mt-20 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-destructive to-transparent" />
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-destructive/10 blur-3xl rounded-full" />
        <AlertCircle className="w-20 h-20 text-destructive mx-auto mb-8 drop-shadow-[0_0_20px_rgba(239,68,68,0.6)] relative z-10" />
        <h2 className="text-3xl font-heading font-bold text-foreground mb-4 relative z-10">System Offline</h2>
        <p className="text-muted-foreground font-mono text-sm tracking-widest uppercase relative z-10">Failed to connect to the telemetry API backbone.</p>
      </Card>
    );
  }

  if (data.status === "no_results") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center justify-center h-[70vh] text-center"
      >
        <div className="w-40 h-40 rounded-[2.5rem] bg-black/40 backdrop-blur-2xl flex items-center justify-center mb-10 border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)] relative group">
          <div className="absolute inset-0 bg-primary/20 rounded-[2.5rem] blur-2xl group-hover:bg-primary/30 transition-colors duration-500" />
          <Target className="w-16 h-16 text-primary drop-shadow-[0_0_20px_rgba(0,229,255,0.8)] relative z-10" />
        </div>
        <h1 className="text-5xl font-heading font-bold text-foreground mb-6 glow-text tracking-tight">Awaiting Directives</h1>
        <p className="text-muted-foreground max-w-lg mb-12 text-lg font-mono leading-relaxed">
          The machine learning pipeline has not generated any telemetry yet.
        </p>
        <Link href="/run">
          <Button size="lg" className="px-12 py-5 text-lg font-bold tracking-[0.2em] uppercase rounded-2xl shadow-[0_0_30px_rgba(0,229,255,0.3)]">
            Initialize Pipeline
          </Button>
        </Link>
      </motion.div>
    );
  }

  const tickerRanking = data.ticker_ranking ?? {};
  const hasRanking = Object.keys(tickerRanking).length > 1;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-12 pb-24"
    >
      {/* Header */}
      <motion.div 
        variants={itemVariants} 
        className="flex flex-col md:flex-row md:items-end justify-between gap-8 relative pt-4"
      >
        <div className="absolute -left-32 -top-20 w-96 h-96 bg-primary/10 blur-3xl rounded-full pointer-events-none" />
        
        <div className="relative z-10">
          <h1 className="text-5xl md:text-7xl font-heading font-bold text-foreground flex items-center gap-5 tracking-tight">
            <span className="bg-black/60 text-primary px-6 py-3 rounded-3xl border border-primary/20 shadow-[0_0_40px_rgba(0,229,255,0.2)] glow-text backdrop-blur-xl">
              <ScrambleText text={data.ticker || "UNKNOWN"} />
            </span>
            <span className="text-gradient">Intelligence</span>
          </h1>
          <div className="text-muted-foreground mt-6 flex items-center gap-4 font-mono text-[13px]">
            <span className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-inner tracking-widest">
              <Clock className="w-4 h-4 text-primary" /> 
              {data.run_time ? (() => {
                  const d = new Date(data.run_time.replace(" ", "T") + ":00Z");
                  return isNaN(d.getTime()) ? data.run_time : d.toLocaleString(undefined, {
                      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
                  });
              })() : "—"}
            </span>
            {hasRanking && (
              <Badge variant="outline" className="border-yellow-500/30 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.1)] bg-yellow-500/5 px-4 py-2">
                Multi-Asset Tracked
              </Badge>
            )}
          </div>
        </div>
        
        {data.best_model && (
          <div className="text-left md:text-right relative z-10">
            <p className="text-[10px] text-muted-foreground mb-3 font-mono uppercase tracking-[0.3em]">Champion Architecture</p>
            <Badge className="text-xl px-8 py-3 bg-gradient-to-r from-primary/20 to-primary/5 border-primary/40 shadow-[0_0_30px_rgba(0,229,255,0.15)] text-primary font-heading tracking-wider rounded-2xl backdrop-blur-xl">
              <ScrambleText text={data.best_model} />
            </Badge>
          </div>
        )}
      </motion.div>

      {/* KPI Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Features Computed", value: data.n_features, icon: Hash, color: "text-blue-400", bg: "bg-blue-400/20", glow: "rgba(96,165,250,0.5)" },
          { label: "Champion Accuracy", value: formatPercentage(data.models?.[data.best_model || ""]?.accuracy), icon: Target, color: "text-green-400", bg: "bg-green-400/20", glow: "rgba(74,222,128,0.5)" },
          { label: "Champion AUC", value: formatNumber(data.models?.[data.best_model || ""]?.auc), icon: Activity, color: "text-purple-400", bg: "bg-purple-400/20", glow: "rgba(192,132,252,0.5)" },
          { label: "Architectures Trained", value: Object.keys(data.models || {}).length, icon: BarChart2, color: "text-orange-400", bg: "bg-orange-400/20", glow: "rgba(251,146,60,0.5)" },
        ].map((kpi, i) => (
          <Card key={i} className="p-8 glass-panel-hover group relative overflow-hidden" disableTilt={false}>
            <div className={`absolute -top-10 -right-10 w-40 h-40 ${kpi.bg} blur-[60px] rounded-full transition-all duration-700 opacity-40 group-hover:opacity-100 group-hover:scale-150 pointer-events-none`} />
            <div className="relative z-10 flex flex-col h-full justify-between gap-6">
              <div className="flex items-start justify-between">
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/80">{kpi.label}</p>
                <div className={`p-2.5 rounded-xl bg-black/60 border border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] ${kpi.color} group-hover:scale-110 transition-transform duration-500`} style={{ textShadow: `0 0 10px ${kpi.glow}` }}>
                  <kpi.icon className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-5xl font-heading font-bold text-foreground drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] tracking-tight">
                {kpi.value || "-"}
              </h3>
            </div>
          </Card>
        ))}
      </motion.div>

      {hasRanking && (
        <TickerRankingPanel ranking={tickerRanking} forecastLabel={data.forecast_label} />
      )}

      {/* Forecasts + Model Table */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        
        {/* Forecast Card */}
        <div className="xl:col-span-1 space-y-6">
          <h2 className="text-2xl font-heading font-bold border-b border-white/5 pb-4">
            {data.forecast_label ? `${data.forecast_label === "TOMORROW" ? "1-Day" : data.forecast_label === "NEXT WEEK" ? "5-Day" : "21-Day"} Projection` : "1-Day Projection"}
          </h2>
          <div className="space-y-4">
            {Object.entries(data.tomorrow || {}).map(([modelName, pred]) => {
              const isUp = pred.direction === "UP";
              return (
                <Card
                  key={modelName}
                  disableTilt={false}
                  className="p-6 glass-panel-hover flex items-center justify-between relative overflow-hidden group"
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isUp ? "bg-green-500 shadow-[0_0_20px_rgba(34,197,94,1)]" : "bg-red-500 shadow-[0_0_20px_rgba(239,68,68,1)]"} transition-all duration-500 group-hover:w-2`} />
                  <div className={`absolute right-0 top-0 w-32 h-32 ${isUp ? "bg-green-500/5" : "bg-red-500/5"} blur-[40px] rounded-full pointer-events-none`} />
                  
                  <div className="pl-4 relative z-10">
                    <h4 className="font-heading font-bold text-xl text-foreground tracking-wide"><ScrambleText text={modelName} /></h4>
                    <div className="flex items-center gap-4 mt-3">
                      <Badge variant={isUp ? "success" : "destructive"} className="px-3">
                        {pred.strength}
                      </Badge>
                      <span className="text-[10px] font-bold font-mono text-muted-foreground bg-black/60 px-2.5 py-1.5 rounded-md border border-white/10 tracking-widest shadow-inner">
                        {formatPercentage(pred.confidence)} CONF
                      </span>
                    </div>
                  </div>
                  <div className={`relative z-10 p-4 rounded-2xl border border-white/10 shadow-[0_10px_20px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)] backdrop-blur-xl ${isUp ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"} group-hover:scale-110 transition-transform duration-500`}>
                    {isUp ? <ArrowUpRight className="w-8 h-8 drop-shadow-[0_0_12px_currentColor]" /> : <ArrowDownRight className="w-8 h-8 drop-shadow-[0_0_12px_currentColor]" />}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Benchmarks Table */}
        <div className="xl:col-span-2">
          <Card className="glass-panel overflow-hidden flex flex-col h-full border-white/5 shadow-2xl relative" disableTilt={true}>
            <div className="absolute inset-0 bg-gradient-to-br from-black/80 to-black/40 pointer-events-none z-0" />
            <div className="p-8 border-b border-white/5 bg-black/40 backdrop-blur-2xl flex justify-between items-center relative z-10">
              <h2 className="text-2xl font-heading font-bold glow-text tracking-wide">Architecture Benchmarks</h2>
              <Target className="w-6 h-6 text-primary/40 drop-shadow-[0_0_8px_rgba(0,229,255,0.3)]" />
            </div>
            <div className="overflow-x-auto relative z-10 pb-4">
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] text-muted-foreground/80 uppercase tracking-[0.2em] bg-black/60 font-mono border-b border-white/10">
                  <tr>
                    <th className="px-8 py-5">Identity</th>
                    <th className="px-6 py-5">Accuracy</th>
                    <th className="px-6 py-5">AUC</th>
                    <th className="px-6 py-5">Win Rate</th>
                    <th className="px-6 py-5">Sharpe</th>
                    <th className="px-8 py-5">Trades</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-black/20">
                  {Object.entries(data.models || {}).map(([name, metrics]) => (
                    <tr key={name} className="hover:bg-white/[0.03] transition-colors duration-300 group">
                      <td className="px-8 py-5 font-heading font-semibold text-foreground flex items-center gap-4 text-base">
                        {name === data.best_model ? (
                          <div className="p-1.5 rounded-lg bg-primary/20 border border-primary/30 shadow-[0_0_15px_rgba(0,229,255,0.3)] group-hover:scale-110 transition-transform">
                            <Target className="w-4 h-4 text-primary" />
                          </div>
                        ) : (
                          <div className="w-8" /> // placeholder for alignment
                        )}
                        <span className={name === data.best_model ? "text-primary glow-text tracking-wide" : "tracking-wide"}>{name}</span>
                      </td>
                      <td className="px-6 py-5 font-mono text-muted-foreground group-hover:text-foreground transition-colors text-[13px]">{formatPercentage(metrics.accuracy)}</td>
                      <td className="px-6 py-5 font-mono text-muted-foreground group-hover:text-foreground transition-colors text-[13px]">{formatNumber(metrics.auc)}</td>
                      <td className="px-6 py-5 font-mono text-muted-foreground group-hover:text-foreground transition-colors text-[13px]">{formatPercentage(metrics.win_rate_pct)}</td>
                      <td className="px-6 py-5 font-mono text-muted-foreground group-hover:text-foreground transition-colors text-[13px]">{formatNumber(metrics.sharpe, 2)}</td>
                      <td className="px-8 py-5 font-mono text-muted-foreground group-hover:text-foreground transition-colors text-[13px]">{metrics.n_trades || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </motion.div>
    </motion.div>
  );
}
