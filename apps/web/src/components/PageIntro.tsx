//~ The top of every tab: its name, and one or two lines saying what it is
// for — the app is shared, not everyone opening it knows it already.
import './pageIntro.css';

export const PageIntro = ({ title, children }: { title: string; children: string }) => (
  <header className="page-intro">
    <h2 className="page-intro__title">{title}</h2>
    <p className="page-intro__text">{children}</p>
  </header>
);
