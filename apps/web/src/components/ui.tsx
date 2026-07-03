import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { disableTilt?: boolean }>(
  ({ className, disableTilt, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("glass-panel rounded-2xl overflow-hidden", className)}
      {...props}
    />
  )
);
Card.displayName = "Card";

type ButtonSize = "default" | "sm" | "lg" | "icon";

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "default" | "outline" | "destructive" | "secondary" | "ghost";
    size?: ButtonSize;
    isLoading?: boolean;
  }
>(({ className, variant = "default", size = "default", isLoading, children, disabled, ...props }, ref) => {
  const variants = {
    default: "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(0,229,255,0.2)] hover:shadow-[0_0_30px_rgba(0,229,255,0.4)] hover:-translate-y-0.5 border border-primary/40",
    outline: "bg-black/20 backdrop-blur-md border border-white/10 text-foreground hover:bg-white/10 hover:border-white/20 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]",
    destructive: "bg-destructive/90 text-destructive-foreground shadow-[0_0_20px_rgba(255,50,80,0.3)] hover:shadow-[0_0_30px_rgba(255,50,80,0.5)] border border-destructive/50",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-white/5",
    ghost: "bg-transparent hover:bg-white/5 text-foreground border border-transparent",
  };
  const sizes: Record<ButtonSize, string> = {
    default: "px-5 py-2.5 text-sm",
    sm: "px-3 py-1.5 text-xs",
    lg: "px-8 py-3.5 text-base font-semibold tracking-wide",
    icon: "h-10 w-10 p-0",
  };

  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
});
Button.displayName = "Button";

export const Badge = ({ children, variant = 'default', className }: { children: React.ReactNode, variant?: 'default' | 'success' | 'destructive' | 'outline', className?: string }) => {
  const variants = {
    default: "bg-primary/10 text-primary border border-primary/30 shadow-[0_0_10px_rgba(0,229,255,0.15)]",
    success: "bg-success/10 text-success border border-success/30 shadow-[0_0_10px_rgba(34,197,94,0.15)]",
    destructive: "bg-destructive/10 text-destructive border border-destructive/30 shadow-[0_0_10px_rgba(239,68,68,0.15)]",
    outline: "border border-white/10 text-muted-foreground bg-black/20 backdrop-blur-md",
  };

  return (
    <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-[11px] uppercase tracking-widest font-bold", variants[variant], className)}>
      {children}
    </span>
  );
};

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-white/10 bg-black/40 backdrop-blur-md px-4 py-2 text-sm text-foreground shadow-inner transition-all duration-300 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:shadow-[0_0_15px_rgba(0,229,255,0.15)] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"
