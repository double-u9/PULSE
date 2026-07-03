import {
  getGetRunStatusQueryKey,
  useStartRun,
  useGetRunStatus,
} from "@pulse/api-client-react";
import { Card, Button } from "@/components/ui";
import { Terminal, Play, Square, Loader2, Cpu, CheckCircle2, AlertCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

const PIPELINE_STEPS = [
  "Data & Features",
  "Class Balance",
  "Walk-Forward",
  "Feature Select",
  "Scale & Sequences",
  "Train Models",
  "Ensemble",
  "SHAP + Evaluate",
  "Prediction",
  "Save Results"
];

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

function getLineColor(line: string): string {
  const upper = line.toUpperCase();
  if (upper.startsWith("ERROR:") || upper.includes("TRACEBACK") || upper.includes("EXCEPTION")) {
    return "text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] font-bold";
  }
  if (upper.startsWith("WARNING:") || upper.startsWith("WARN:")) {
    return "text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]";
  }
  if (upper.startsWith("INFO:") || upper.startsWith("[INFO]")) {
    return "text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.3)]";
  }
  if (line.trim() === "") {
    return "";
  }
  return "text-green-400/90 tracking-wide";
}

function ColorizedLog({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => (
        <span key={i} className={`block mb-1 ${getLineColor(line)}`}>
          {line || "\u00a0"}
        </span>
      ))}
    </>
  );
}

function PipelineStepper({ currentStep, isRunning }: { currentStep: number; isRunning: boolean }) {
  // Determine actual display step: 0 means idle.
  // If completed, currentStep might be 10 or we just force it to 10 if not running but completed.
  const activeIndex = currentStep > 0 ? currentStep - 1 : -1;

  return (
    <div className="w-full glass-panel border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col mb-8 mt-4 shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
      <div className="flex justify-between items-center mb-6 px-2">
        <h3 className="text-sm font-mono font-bold tracking-[0.2em] uppercase text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          Pipeline Progress
        </h3>
        {isRunning && (
          <div className="flex items-center gap-2 text-primary font-mono text-xs tracking-widest uppercase">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(0,229,255,0.8)]" />
            Live
          </div>
        )}
      </div>

      <div className="relative flex items-start justify-between w-full px-4">
        {/* Progress Line Background */}
        <div className="absolute left-[3%] right-[3%] top-5 h-0.5 bg-white/5 z-0" />
        
        {/* Active Progress Line */}
        <motion.div 
          className="absolute left-[3%] top-5 h-0.5 bg-success shadow-[0_0_8px_rgba(34,197,94,0.6)] z-0"
          initial={{ width: "0%" }}
          animate={{ width: `${Math.max(0, (activeIndex / (PIPELINE_STEPS.length - 1)) * 100 - 3)}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" as any }}
        />

        {PIPELINE_STEPS.map((stepName, idx) => {
          const isCompleted = idx < activeIndex || (idx === PIPELINE_STEPS.length - 1 && currentStep >= 10 && !isRunning);
          const isActive = idx === activeIndex && isRunning;
          const isPending = !isCompleted && !isActive;

          return (
            <div key={stepName} className="relative z-10 flex flex-col items-center gap-3 w-20">
              <motion.div 
                layout
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-2
                  ${isCompleted ? "bg-success border-success text-black shadow-[0_0_15px_rgba(34,197,94,0.5)]" 
                    : isActive ? "bg-primary border-primary text-black shadow-[0_0_20px_rgba(0,229,255,0.6)]" 
                    : "bg-[#0A0A0A] border-white/10 text-muted-foreground"}`}
              >
                <AnimatePresence mode="wait">
                  {isCompleted && (
                    <motion.div key="completed" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <CheckCircle2 className="w-5 h-5" />
                    </motion.div>
                  )}
                  {isActive && (
                    <motion.div key="active" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </motion.div>
                  )}
                  {isPending && (
                    <motion.span key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm font-bold font-mono">
                      {idx + 1}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>

              <span className={`text-[10px] font-mono font-bold tracking-wider uppercase text-center max-w-[80px] leading-tight transition-colors duration-500
                ${isCompleted ? "text-success" : isActive ? "text-primary drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]" : "text-muted-foreground/50"}`}
              >
                {stepName.split(" ").map((word, i) => (
                  <span key={i} className="block">{word}</span>
                ))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RunPipeline() {
  const startMutation = useStartRun();
  const queryClient = useQueryClient();

  const { data: statusData } = useGetRunStatus({
    query: { queryKey: getGetRunStatusQueryKey(), refetchInterval: 2000 },
  });

  const isRunning = statusData?.status === "running";
  const logTailRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (logTailRef.current) {
      logTailRef.current.scrollTop = logTailRef.current.scrollHeight;
    }
  }, [statusData?.log_tail]);

  const handleStart = () => {
    startMutation.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/run/status"] });
      },
    });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "running":
        return "text-primary border-primary shadow-[0_0_20px_rgba(0,229,255,0.4)] bg-primary/10";
      case "completed":
        return "text-success border-success shadow-[0_0_20px_rgba(34,197,94,0.4)] bg-success/10";
      case "failed":
        return "text-destructive border-destructive shadow-[0_0_20px_rgba(239,68,68,0.4)] bg-destructive/10";
      default:
        return "text-muted-foreground border-white/10 bg-black/40";
    }
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
      className="space-y-10 max-w-7xl mx-auto pb-24 relative"
    >
      <div className="absolute -right-32 -top-20 w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />

      <motion.div variants={itemVariants} className="flex flex-col xl:flex-row justify-between items-start xl:items-end border-b border-white/5 pb-8 gap-8 relative z-10 pt-4">
        <div>
          <h1 className="text-5xl md:text-7xl font-heading font-bold flex items-center gap-5 text-foreground relative tracking-tight">
            <div className="p-4 rounded-3xl bg-primary/10 border border-primary/20 shadow-[0_0_40px_rgba(0,229,255,0.2)] backdrop-blur-xl">
              <Cpu className="text-primary w-10 h-10 drop-shadow-[0_0_15px_rgba(0,229,255,0.8)]" />
            </div>
            <span className="text-gradient">Execution Engine</span>
          </h1>
          <p className="text-muted-foreground mt-6 text-lg font-mono tracking-wide">
            Trigger full ML pipeline retraining and inference.
          </p>
        </div>

        <motion.div layout className="flex items-center gap-8 glass-panel px-8 py-6 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-white/10 relative overflow-hidden group">
          {isRunning && (
            <motion.div 
              layoutId="running-bg"
              className="absolute inset-0 bg-primary/10 animate-pulse pointer-events-none" 
            />
          )}

          <motion.div layout className="flex flex-col items-end relative z-10">
            <span className="text-[11px] uppercase font-mono font-bold text-muted-foreground tracking-[0.2em] mb-2">
              <ScrambleText text="Engine Status" />
            </span>
            <motion.div
              layout
              className={`flex items-center gap-4 px-6 py-3 rounded-xl border font-mono text-sm tracking-[0.2em] uppercase transition-all duration-500 ${getStatusColor(statusData?.status)} backdrop-blur-md`}
            >
              {statusData?.status === "running" && (
                <div className="flex items-center gap-1.5 h-5 mr-2">
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ height: ["20%", "100%", "30%", "80%", "20%"] }}
                      transition={{ duration: 0.8 + Math.random(), repeat: Infinity, ease: "easeInOut" }}
                      className="w-1.5 bg-primary rounded-full shadow-[0_0_8px_rgba(0,229,255,0.8)]"
                    />
                  ))}
                </div>
              )}
              {statusData?.status === "completed" && (
                <CheckCircle2 className="w-5 h-5 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
              )}
              {statusData?.status === "failed" && (
                <AlertCircle className="w-5 h-5 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              )}
              <span className="font-bold">{statusData?.status || "Idle"}</span>
            </motion.div>
          </motion.div>

          <motion.div layout className="h-16 w-px bg-white/10 rounded-full relative z-10"></motion.div>

          <motion.div layout className="relative z-10">
            <Button
              size="lg"
              disabled={isRunning || startMutation.isPending}
              onClick={handleStart}
              className={`w-56 h-16 text-xl font-bold tracking-[0.2em] uppercase transition-all duration-500 rounded-2xl ${isRunning ? "bg-black/40 border-white/5 text-primary/50 opacity-80 cursor-not-allowed" : "bg-primary text-black hover:bg-white hover:text-primary animate-pulse hover:animate-none shadow-[0_0_30px_rgba(0,229,255,0.4)] hover:shadow-[0_0_50px_rgba(0,229,255,0.8)] border-transparent group"}`}
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-6 h-6 mr-3 animate-spin" /> Processing
                </>
              ) : (
                <>
                  <Play className="w-6 h-6 mr-3 fill-current group-hover:scale-125 transition-transform duration-300" /> Execute
                </>
              )}
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* PIPELINE STEPPER ADDED HERE */}
      <motion.div variants={itemVariants} className="relative z-10 w-full">
        <PipelineStepper 
          currentStep={statusData?.current_step || 0} 
          isRunning={isRunning} 
        />
      </motion.div>

      <motion.div variants={itemVariants} className="relative z-10">
        <Card className="glass-panel border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden h-[70vh] relative" disableTilt={true}>
          <div className="absolute inset-0 bg-gradient-to-b from-[#050505] to-[#000] pointer-events-none" />
          
          <div className="flex items-center justify-between px-8 py-5 border-b border-white/10 bg-black/80 backdrop-blur-2xl relative z-10 shadow-md">
            <div className="flex items-center gap-4">
              <Terminal className="w-6 h-6 text-primary drop-shadow-[0_0_12px_rgba(0,229,255,0.6)]" />
              <span className="font-mono text-sm text-primary/90 uppercase tracking-[0.3em] font-bold">
                 <ScrambleText text="SYS.STDOUT STREAM" />
              </span>
            </div>
            <div className="flex gap-3">
              <div className="w-4 h-4 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
              <div className="w-4 h-4 rounded-full bg-yellow-500 shadow-[0_0_10px_rgba(250,204,21,0.8)]"></div>
              <div className="w-4 h-4 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]"></div>
            </div>
          </div>

          <pre
            ref={logTailRef}
            className="flex-1 p-8 overflow-y-auto font-mono text-[14px] leading-loose whitespace-pre-wrap break-words relative z-10 custom-scrollbar selection:bg-primary/30 selection:text-primary-foreground"
          >
            {statusData?.log_tail ? (
              <ColorizedLog text={statusData.log_tail} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground/30 font-mono space-y-6">
                <Terminal className="w-16 h-16 opacity-30 drop-shadow-md" />
                <p className="uppercase tracking-[0.3em] text-sm font-bold">System idle. Awaiting execution directives.</p>
              </div>
            )}
          </pre>
        </Card>
      </motion.div>
    </motion.div>
  );
}
