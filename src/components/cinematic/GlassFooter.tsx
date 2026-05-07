import { Github, Twitter, Globe } from "lucide-react";

export const GlassFooter = () => (
  <footer className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
    <div className="glass rounded-full px-6 py-3 flex items-center gap-5 text-muted-foreground">
      <span className="mono text-xs tracking-widest">© PROMPT PIPELINE</span>
      <span className="h-3 w-px bg-white/15" />
      {[Github, Twitter, Globe].map((Icon, i) => (
        <button
          key={i}
          className="hover:text-amber transition-all hover:scale-110 hover:-translate-y-0.5"
          aria-label="Social link"
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  </footer>
);
