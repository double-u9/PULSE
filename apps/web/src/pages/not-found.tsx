import { Link } from "wouter";
import { Button } from "@/components/ui";
import { Terminal } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center">
      <div className="w-24 h-24 mb-8 text-destructive/20 relative flex items-center justify-center">
        <Terminal className="w-16 h-16 text-destructive absolute z-10" />
        <div className="absolute inset-0 bg-destructive/10 blur-xl rounded-full"></div>
      </div>
      <h1 className="text-4xl font-bold font-mono tracking-tighter mb-4 text-foreground">404_NOT_FOUND</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        The requested system endpoint does not exist in the current configuration.
      </p>
      <Link href="/">
        <Button size="lg" variant="outline" className="font-mono">
          RETURN_TO_DASHBOARD
        </Button>
      </Link>
    </div>
  );
}
