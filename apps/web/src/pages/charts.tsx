import { useState, useEffect } from "react";
import { useListCharts } from "@pulse/api-client-react";
import { Card, Button, Badge } from "@/components/ui";
import { ImageIcon, X, Download, ScanLine } from "lucide-react";
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

export function Charts() {
  const { data, isLoading } = useListCharts();
  const [selectedChart, setSelectedChart] = useState<string | null>(null);

  if (isLoading) {
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
          <p className="text-primary font-mono tracking-[0.3em] uppercase text-xs animate-pulse relative z-10 font-bold">Scanning Visualizations...</p>
        </div>
      </div>
    );
  }

  const charts = data?.charts || [];

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
      className="space-y-12 pb-24 relative"
    >
      <div className="absolute top-0 right-20 w-[500px] h-[500px] bg-primary/10 blur-[140px] rounded-full pointer-events-none" />

      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-white/5 pb-8 relative z-10 pt-4 gap-6">
        <div>
          <h1 className="text-5xl md:text-7xl font-heading font-bold flex items-center gap-5 text-foreground relative tracking-tight">
            <div className="p-4 rounded-3xl bg-primary/10 border border-primary/20 shadow-[0_0_40px_rgba(0,229,255,0.2)] backdrop-blur-xl">
              <ImageIcon className="text-primary w-10 h-10 drop-shadow-[0_0_15px_rgba(0,229,255,0.8)]" />
            </div>
            <span className="text-gradient">Visualizations</span>
          </h1>
          <p className="text-muted-foreground mt-6 text-lg font-mono tracking-wide">Rendered output from machine learning pipelines.</p>
        </div>
        <Badge variant="outline" className="font-mono text-xs px-5 py-2.5 border-primary/30 text-primary shadow-[0_0_15px_rgba(0,229,255,0.1)] bg-primary/10 mb-2 tracking-[0.2em] uppercase rounded-xl">
          <ScrambleText text={`${charts.length} Plots Extracted`} />
        </Badge>
      </motion.div>

      {charts.length === 0 ? (
        <motion.div variants={itemVariants}>
          <Card className="glass-panel p-20 text-center border-dashed border-2 border-white/10 max-w-3xl mx-auto mt-20 relative overflow-hidden group" disableTilt={true}>
            <div className="absolute inset-0 bg-primary/5 blur-[80px] rounded-full pointer-events-none group-hover:bg-primary/10 transition-colors duration-700" />
            <ImageIcon className="w-24 h-24 text-muted-foreground/30 mx-auto mb-8 relative z-10 drop-shadow-lg" />
            <h3 className="text-4xl font-heading font-bold text-foreground mb-4 relative z-10 tracking-tight">No Charts Generated</h3>
            <p className="text-muted-foreground text-xl relative z-10 font-mono">Run the pipeline with plotting enabled to generate charts.</p>
          </Card>
        </motion.div>
      ) : (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 relative z-10"
        >
          {charts.map((chart, i) => (
            <motion.div
              key={chart}
              variants={itemVariants}
            >
              <Card 
                disableTilt={false}
                className="glass-panel-hover overflow-hidden cursor-none group transition-all duration-700 relative aspect-[4/3] flex flex-col border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
                onClick={() => setSelectedChart(chart)}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-20 flex items-center justify-center backdrop-blur-[4px]">
                  <Button variant="outline" className="bg-black/80 backdrop-blur-xl border-primary/50 text-primary hover:bg-primary hover:text-black pointer-events-none shadow-[0_0_30px_rgba(0,229,255,0.6)] px-8 py-6 rounded-2xl font-bold tracking-widest uppercase">
                    Enlarge View
                  </Button>
                </div>
                
                <div className="flex-1 bg-black/60 relative flex items-center justify-center p-6 overflow-hidden">
                  <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
                  <img 
                    src={`/api/charts/${chart}`} 
                    alt={chart}
                    className="w-full h-full object-contain filter group-hover:scale-110 group-hover:brightness-125 transition-all duration-700 ease-out"
                    loading="lazy"
                  />
                </div>
                
                <div className="p-5 bg-black/80 border-t border-white/10 backdrop-blur-xl relative z-10">
                  <p className="text-sm font-mono truncate text-muted-foreground group-hover:text-primary transition-colors duration-500 tracking-wider">
                    {chart}
                  </p>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedChart && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(20px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/95 cursor-none"
            onClick={() => setSelectedChart(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative max-w-[95vw] max-h-[95vh] w-full bg-[#050505] border border-white/10 rounded-[2rem] shadow-[0_30px_100px_rgba(0,0,0,1)] flex flex-col overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center p-5 sm:p-6 border-b border-white/5 bg-black/60 backdrop-blur-2xl relative z-10">
                <h3 className="font-mono text-xl text-primary glow-text tracking-widest">
                  <ScrambleText text={selectedChart} />
                </h3>
                <div className="flex gap-4">
                  <Button 
                    variant="outline" 
                    size="lg" 
                    onClick={() => window.open(`/api/charts/${selectedChart}`, '_blank')}
                    className="border-primary/30 text-primary hover:bg-primary/20 hover:text-primary hover:shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all cursor-none"
                  >
                    <Download className="w-5 h-5 mr-3" /> Download Source
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    onClick={() => setSelectedChart(null)}
                    className="border-white/10 text-muted-foreground hover:bg-white/10 hover:text-white cursor-none px-4"
                  >
                    <X className="w-6 h-6" />
                  </Button>
                </div>
              </div>
              
              {/* Modal Body */}
              <div className="flex-1 overflow-auto p-4 sm:p-10 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-black/80 to-black relative">
                <div className="absolute inset-0 bg-primary/10 blur-[150px] rounded-full pointer-events-none" />
                <img 
                  src={`/api/charts/${selectedChart}`} 
                  alt={selectedChart}
                  className="max-w-full max-h-full object-contain drop-shadow-[0_0_40px_rgba(0,229,255,0.15)] relative z-10 rounded-xl"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
