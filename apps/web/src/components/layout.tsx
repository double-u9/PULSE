import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Activity, BarChart2, Settings, Terminal, Play, LineChart, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";

const navItems = [
  { href: "/", icon: Activity, label: "Dashboard" },
  { href: "/predictions", icon: LineChart, label: "Predictions" },
  { href: "/charts", icon: BarChart2, label: "Charts" },
  { href: "/run", icon: Play, label: "Pipeline" },
  { href: "/logs", icon: Terminal, label: "Logs" },
  { href: "/config", icon: Settings, label: "Config" },
];

function LiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const dateStr = now.toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" });
  const timeStr = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="px-5 py-4 border-b border-white/5 text-xs font-mono text-muted-foreground bg-black/20">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Clock className="w-3.5 h-3.5 text-primary/80" />
        <span className="text-primary/80 uppercase tracking-widest text-[10px] font-bold">Local Time</span>
      </div>
      <div className="text-foreground/70 tabular-nums">{dateStr}</div>
      <div className="text-foreground tabular-nums font-bold text-sm glow-text">{timeStr}</div>
    </div>
  );
}

// --- Custom Magnetic Cursor ---
function CustomCursor() {
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  
  const springConfig = { damping: 25, stiffness: 300, mass: 0.5 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX - 16); // Center the 32px cursor
      cursorY.set(e.clientY - 16);
    };
    window.addEventListener("mousemove", moveCursor);
    return () => window.removeEventListener("mousemove", moveCursor);
  }, [cursorX, cursorY]);

  return (
    <motion.div
      className="fixed top-0 left-0 w-8 h-8 rounded-full border border-primary/50 bg-primary/10 backdrop-blur-[2px] pointer-events-none z-[9999] mix-blend-screen shadow-[0_0_15px_rgba(0,229,255,0.4)]"
      style={{
        x: cursorXSpring,
        y: cursorYSpring,
      }}
    >
      <div className="absolute inset-1 rounded-full bg-primary/40 blur-sm" />
    </motion.div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background relative selection:bg-primary/30 selection:text-primary-foreground cursor-default">
      <CustomCursor />
      
      {/* Ambient Cinematic Background Glows - Breathing Animation */}
      <motion.div 
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-0 left-1/4 w-[800px] h-[500px] bg-primary/20 rounded-full blur-3xl -z-10 pointer-events-none" 
      />
      <motion.div 
        animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-0 right-1/4 w-[700px] h-[400px] bg-success/10 rounded-full blur-3xl -z-10 pointer-events-none" 
      />

      {/* Floating Sidebar Wrapper */}
      <div className="p-4 md:p-6 pr-0 flex h-full z-20">
        <aside className="w-64 flex-shrink-0 glass-panel rounded-3xl flex flex-col overflow-hidden relative shadow-[0_20px_50px_rgba(0,0,0,0.8)] border-r-white/10">
          {/* Subtle inner reflection */}
          <div className="absolute inset-0 rounded-3xl border border-white/5 pointer-events-none" />
          
          <div className="h-20 flex items-center px-6 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent relative overflow-hidden">
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-primary/30 blur-3xl rounded-full" />
            <Activity className="w-7 h-7 text-primary mr-3 relative z-10 drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]" />
            <span className="font-heading font-bold text-xl tracking-widest text-foreground relative z-10 glow-text">
              PULSE
            </span>
          </div>

          <LiveClock />

          <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <motion.div
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "flex items-center px-4 py-3 rounded-xl transition-colors duration-300 cursor-none group relative overflow-hidden",
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-nav-bg"
                        className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-xl"
                        initial={false}
                        transition={{ type: "spring", stiffness: 400, damping: 35 }}
                      />
                    )}
                    {!isActive && (
                      <div className="absolute inset-0 bg-white/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    )}
                    <item.icon
                      className={cn(
                        "w-5 h-5 mr-3 relative z-10 transition-transform duration-300",
                        isActive ? "scale-110 drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]" : "group-hover:scale-110 group-hover:text-primary/70"
                      )}
                    />
                    <span className={cn("font-medium relative z-10 tracking-wide", isActive && "text-shadow-sm glow-text")}>{item.label}</span>
                  </motion.div>
                </Link>
              );
            })}
          </nav>

          <div className="p-5 border-t border-white/5 text-xs text-muted-foreground font-mono bg-black/40 backdrop-blur-md relative overflow-hidden">
             <div className="absolute bottom-0 right-0 w-24 h-24 bg-success/10 blur-2xl rounded-full" />
            <div className="flex items-center justify-between relative z-10">
              <span className="tracking-widest uppercase">System</span>
              <span className="text-success inline-flex items-center font-bold tracking-wider">
                <span className="w-2 h-2 rounded-full bg-success mr-2 animate-pulse shadow-[0_0_8px_rgba(34,197,94,1)]" />
                ONLINE
              </span>
            </div>
          </div>
        </aside>
      </div>

      {/* Main Content */}
      <main className="flex-1 relative overflow-y-auto overflow-x-hidden scroll-smooth h-full">
        <div className="min-h-full p-4 md:p-8 lg:p-10 max-w-7xl mx-auto">
          {/* Framer Motion AnimatePresence wrapper for page transitions */}
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              initial={{ opacity: 0, scale: 0.98, filter: "blur(8px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 1.02, filter: "blur(8px)" }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
