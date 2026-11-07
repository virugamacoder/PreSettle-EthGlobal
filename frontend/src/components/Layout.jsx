import { Outlet, Link } from "react-router";
import { Header } from "./Header.jsx";
import { NetworkBanner } from "./NetworkBanner.jsx";

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <NetworkBanner />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-8">
        <Outlet />
      </main>
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-6 text-xs text-muted sm:px-8">
          <span>Escrow on Arc</span>
          <span>Order book on Arkiv</span>
          <span>Identity on ENS</span>
          {/* Settings hidden for now (theme is in the header):
          <Link to="/settings" className="ml-auto hover:text-ink">Settings</Link> */}
          <Link to="/admin" className="ml-auto hover:text-ink">Admin</Link>
        </div>
      </footer>
    </div>
  );
}
