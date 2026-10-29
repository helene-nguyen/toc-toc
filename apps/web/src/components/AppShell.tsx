//~ The frame around every page: the brand on top, the page, and the bottom
// bar within thumb reach — the app is used one-handed on a phone.
import { NavLink, Outlet } from 'react-router';
import './appShell.css';

export const AppShell = () => (
  <div className="shell">
    <header className="shell__top">
      <h1 className="shell__brand">Toc-Toc</h1>
    </header>
    <main className="shell__main">
      <Outlet />
    </main>
    <nav className="shell__nav" aria-label="Navigation">
      <NavLink to="/" end>
        Monitoring
      </NavLink>
      <NavLink to="/sessions">Mes sessions</NavLink>
    </nav>
  </div>
);
