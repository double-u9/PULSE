import { useState, useEffect, useRef } from "react";
import { getGetLogQueryKey, useListLogs, useGetLog } from "@pulse/api-client-react";
import { Card } from "@/components/ui";
import { TerminalSquare, FileText, Download, ScanLine } from "lucide-react";
import { motion } from "framer-motion";

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

export function Logs() {
  const { data: listData, isLoading: isLoadingList } = useListLogs();
  const logs = listData?.logs || [];
  
  const [selectedLog, setSelectedLog] = useState<string>("");

  // Auto-select the first log once the list loads
  useEffect(() => {
    if (logs.length > 0 && !selectedLog) {
      setSelectedLog(logs[0]);
    }
  }, [logs, selectedLog]);
  
  // Use enabled to prevent fetching empty string
  const { data: logData, isLoading } = useGetLog(selectedLog, { 
    query: { queryKey: getGetLogQueryKey(selectedLog), enabled: !!selectedLog } 
  });

  const logTailRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic for the lyrics experience
  useEffect(() => {
    if (logTailRef.current) {
      logTailRef.current.scrollTop = logTailRef.current.scrollHeight;
    }
  }, [logData?.content]);

  // The Lyrics Experience: syntax highlighter with depth blur
  const renderLogContent = (content: string) => {
    const lines = content.split('\n');
    // Remove trailing empty lines for accurate counting
    while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
      lines.pop();
    }
    
    return lines.map((line, i) => {
      const isLast = i === lines.length - 1;
      const distance = lines.length - 1 - i;
      
      let colorClass = "text-muted-foreground/80"; 
      let glowClass = "";
      
      if (line.includes("ERROR") || line.includes("CRITICAL") || line.includes("Exception")) {
        colorClass = "text-red-400 font-bold";
        glowClass = "drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]";
      }
      else if (line.includes("WARN")) {
        colorClass = "text-yellow-400";
        glowClass = "drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]";
      }
      else if (line.includes("INFO") || line.includes("Success")) {
        colorClass = "text-cyan-400";
        glowClass = "drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]";
      }
      else if (line.includes("DEBUG")) {
        colorClass = "text-green-400/80";
      }

      // Calculate blur and opacity based on distance from the active (last) line
      let dynamicStyles = {};
      if (isLast) {
        dynamicStyles = {
          opacity: 1,
          filter: "blur(0px)",
          transform: "scale(1.02) translateX(5px)",
          transformOrigin: "left center"
        };
      } else if (distance < 5) {
        dynamicStyles = {
          opacity: 1 - (distance * 0.15),
          filter: `blur(${distance * 0.5}px)`,
          transform: "scale(1) translateX(0px)"
        };
      } else {
        dynamicStyles = {
          opacity: 0.3,
          filter: "blur(2px)",
          transform: "scale(0.98) translateX(0px)"
        };
      }

      return (
          <motion.div 
          key={i} 
          initial={isLast ? { opacity: 0, x: -20, filter: "blur(10px)" } : false}
          animate={dynamicStyles}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`flex ${colorClass} ${isLast ? glowClass : ''} hover:!opacity-100 hover:!filter-none hover:!scale-100 hover:bg-white/[0.03] px-3 py-1.5 rounded transition-colors group relative`}
        >
          {isLast && (
            <motion.div 
              layoutId="active-lyric-indicator"
              className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-[70%] bg-primary rounded-full shadow-[0_0_10px_rgba(0,229,255,0.8)]" 
            />
          )}
          <span className="w-14 flex-shrink-0 text-right pr-5 text-muted-foreground/30 select-none border-r border-white/5 mr-5 font-mono text-[11px] flex flex-col justify-center group-hover:text-primary/50 transition-colors">
            {i + 1}
          </span>
          <span className={`whitespace-pre-wrap break-all flex-1 tracking-wider ${isLast ? 'font-bold' : ''}`}>
            {line}
          </span>
        </motion.div>
      );
    });
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

  if (isLoadingList && !logs.length) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center relative">
          <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
          <motion.div
            animate={{ rotate: 360, scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="mb-8 relative z-10"
          >
            <ScanLine className="w-20 h-20 text-primary glow-text" />
          </motion.div>
          <p className="text-primary font-mono tracking-[0.3em] uppercase text-xs animate-pulse relative z-10 font-bold">Accessing Archives...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col h-[calc(100vh-6rem)] relative pb-10"
    >
      <div className="absolute -left-40 top-20 w-[500px] h-[500px] bg-primary/5 blur-[150px] rounded-full pointer-events-none" />

      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-white/5 pb-8 mb-8 relative z-10 gap-6 pt-4">
        <div>
          <h1 className="text-5xl md:text-7xl font-heading font-bold flex items-center gap-5 text-foreground relative tracking-tight">
            <div className="p-4 rounded-3xl bg-primary/10 border border-primary/20 shadow-[0_0_40px_rgba(0,229,255,0.2)] backdrop-blur-xl">
              <TerminalSquare className="text-primary w-10 h-10 drop-shadow-[0_0_15px_rgba(0,229,255,0.8)]" />
            </div>
            <span className="text-gradient">System Logs</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-5 bg-black/60 p-3 rounded-2xl border border-white/10 backdrop-blur-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
          <div className="relative group/select">
            <select 
              className="appearance-none bg-black/40 text-primary font-mono text-sm px-6 py-4 pr-12 rounded-xl border border-white/10 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all cursor-none min-w-[250px] tracking-widest shadow-inner group-hover/select:bg-black/60"
              value={selectedLog}
              onChange={(e) => setSelectedLog(e.target.value)}
            >
              {logs.map(log => (
                <option key={log} value={log} className="bg-black text-foreground">{log}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-primary/50 group-hover/select:text-primary transition-colors">
               <FileText className="w-4 h-4" />
            </div>
          </div>

          {selectedLog && (
             <a 
               href={`/api/logs/${selectedLog}`} 
               download 
               target="_blank" 
               rel="noreferrer" 
               className="p-4 bg-primary/10 rounded-xl hover:bg-primary/20 text-primary border border-primary/20 transition-all duration-300 shadow-[0_0_15px_rgba(0,229,255,0.1)] hover:shadow-[0_0_25px_rgba(0,229,255,0.4)] group cursor-none"
             >
                <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
             </a>
          )}
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="flex-1 min-h-0 relative z-10">
        <Card className="h-full flex flex-col overflow-hidden border-white/10 glass-panel shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative" disableTilt={true}>
          <div className="absolute inset-0 bg-gradient-to-b from-[#050505] to-[#000] pointer-events-none z-0" />
          
          <div className="bg-black/80 backdrop-blur-2xl px-8 py-5 border-b border-white/10 flex items-center gap-4 relative z-10 shadow-md">
            <FileText className="w-5 h-5 text-primary drop-shadow-[0_0_10px_rgba(0,229,255,0.6)]" />
            <span className="font-mono text-[13px] text-primary/90 uppercase tracking-[0.2em] font-bold">
               <ScrambleText text={selectedLog || 'AWAITING LOG SELECTION'} />
            </span>
          </div>
          
          <div ref={logTailRef} className="flex-1 overflow-auto p-8 font-mono text-[13px] leading-relaxed relative z-10 custom-scrollbar selection:bg-primary/30 selection:text-primary-foreground scroll-smooth pb-32">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-primary animate-pulse font-mono tracking-[0.3em] uppercase">
                <ScanLine className="w-12 h-12 mb-2 drop-shadow-[0_0_15px_rgba(0,229,255,0.5)]" />
                Processing Stream Data...
              </div>
            ) : logData?.content ? (
              renderLogContent(logData.content)
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground/30 font-mono space-y-6">
                <FileText className="w-16 h-16 opacity-30 drop-shadow-md" />
                <p className="uppercase tracking-[0.3em] text-sm font-bold">EOF REACHED // NO DATA</p>
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
