import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Dashboard as DashboardIcon, OTCLogo, PreMarket } from "../assets/icons/index.jsx";
import { useTheme } from "../hooks/useTheme.js";
import { Logo } from "./Logo.jsx";

const NAV = [
  { to: "/", label: "Premarket", end: true, Icon: PreMarket, match: (p) => p === "/" || p.startsWith("/premarket") },
  { to: "/otc", label: "OTC", Icon: OTCLogo, match: (p) => p.startsWith("/otc") },
  // Broker is paused for now: the /broker and /deal/:key pages still work, they're just not in the menu.
  // { to: "/broker", label: "Broker", Icon: BrokerIcon, match: (p) => p.startsWith("/broker") },
  { to: "/dashboard", label: "Dashboard", Icon: DashboardIcon, match: (p) => p.startsWith("/dashboard") },
];

function NavItem({ to, label, end, Icon, match, onClick }) {
  const { pathname } = useLocation();
  const active = match(pathname);
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full px-3 py-2 text-[15px] font-medium transition-colors ${
        active ? "text-ink" : "text-muted hover:text-ink"
      }`}
    >
      <span className="block h-5 w-5">
        <Icon isActive={active} />
      </span>
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
      className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-muted hover:text-ink"
    >
      {theme === "dark" ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
      )}
    </button>
  );
}

/** Wallet button in the original style: gradient "Connect" pill, then the account pill. */
export function WalletButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;
        const pill = "h-10 rounded-full px-5 text-[15px] font-semibold transition-transform active:scale-[0.98]";
        if (!connected) {
          return (
            <button type="button" onClick={openConnectModal} className={`${pill} bg-brand-gradient text-accent-ink`} aria-hidden={!ready}>
              Connect
            </button>
          );
        }
        if (chain.unsupported) {
          return (
            <button type="button" onClick={openChainModal} className={`${pill} bg-sell text-white`}>
              Wrong network
            </button>
          );
        }
        return (
          <button type="button" onClick={openAccountModal} className={`${pill} flex items-center gap-2 border border-line bg-surface text-ink`}>
            <span className="h-2.5 w-2.5 rounded-full bg-brand-gradient" aria-hidden />
            {account.displayName}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-6 px-4 sm:px-8">
        <Link to="/" aria-label="Pre Settle home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <WalletButton />
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full bg-accent-soft text-ink md:hidden"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
        </div>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-line bg-surface px-4 py-3 md:hidden" aria-label="Mobile">
          {NAV.map((item) => (
            <NavItem key={item.to} {...item} onClick={() => setOpen(false)} />
          ))}
        </nav>
      )}
    </header>
  );
}
