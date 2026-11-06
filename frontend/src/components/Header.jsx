import { useState } from "react";
import { Link, NavLink } from "react-router";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useTheme } from "../hooks/useTheme.js";

const NAV = [
  { to: "/", label: "Premarket", end: true },
  { to: "/otc", label: "OTC" },
  // Broker is paused for now: the /broker and /deal/:key pages still work, they're just not in the menu.
  // { to: "/broker", label: "Broker" },
  { to: "/dashboard", label: "Dashboard" },
];

function NavItem({ to, label, end, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          isActive ? "bg-surface-2 text-ink" : "text-muted hover:text-ink"
        }`
      }
    >
      {label}
    </NavLink>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      className="rounded-md border border-line p-2 text-muted hover:text-ink"
    >
      {theme === "dark" ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
      )}
    </button>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-page/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <img src="/favicon.svg" alt="" className="h-7 w-7" />
          <span>Pre Settle</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <ConnectButton chainStatus="icon" accountStatus={{ smallScreen: "avatar", largeScreen: "full" }} showBalance={false} />
          <button
            type="button"
            className="rounded-md border border-line p-2 text-muted md:hidden"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-line px-4 py-3 md:hidden" aria-label="Mobile">
          {NAV.map((item) => (
            <NavItem key={item.to} {...item} onClick={() => setOpen(false)} />
          ))}
        </nav>
      )}
    </header>
  );
}
