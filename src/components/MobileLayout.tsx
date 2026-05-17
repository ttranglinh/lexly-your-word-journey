import { Link, useLocation } from "@tanstack/react-router";
import { Search, Library, GraduationCap } from "lucide-react";
import type { ReactNode } from "react";

const tabs = [
  { to: "/", label: "Search", icon: Search },
  { to: "/decks", label: "Decks", icon: Library },
  { to: "/study", label: "Study", icon: GraduationCap },
] as const;

export function MobileLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-5 pt-6 pb-3 border-b border-border/60">
        <div className="max-w-xl mx-auto flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-serif font-semibold">L</div>
          <h1 className="font-serif text-xl font-semibold tracking-tight">Lexly</h1>
        </div>
      </header>

      <main className="flex-1 px-5 py-6 pb-28">
        <div className="max-w-xl mx-auto w-full">{children}</div>
      </main>

      <nav className="fixed bottom-0 inset-x-0 border-t border-border bg-background/95 backdrop-blur">
        <div className="max-w-xl mx-auto grid grid-cols-3">
          {tabs.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
                <span className={active ? "font-medium" : ""}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
