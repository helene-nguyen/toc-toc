//~ The centered card every auth page lives in.
import type { ReactNode } from 'react';
import '../auth.css';

export const AuthCard = ({ title, children }: { title: string; children: ReactNode }) => (
  <main className="auth">
    <section className="auth__card">
      <header className="auth__header">
        <img className="auth__logo" src="/logo.png" alt="" width="88" height="88" />
        <p className="auth__brand">Toc-Toc</p>
        <p className="auth__tagline">Suivi des contractions et des mouvements du bébé</p>
      </header>
      <h1 className="auth__title">{title}</h1>
      {children}
    </section>
  </main>
);
