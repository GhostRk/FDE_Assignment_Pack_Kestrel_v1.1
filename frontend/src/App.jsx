import { Activity, Boxes, CircleDollarSign, Menu, Snowflake, Tag, X } from 'lucide-react';
import { useState } from 'react';
import { ServicePanel } from './features/service/ServicePanel';
import { ColdChainPanel } from './features/coldChain/ColdChainPanel';
import { MoneyPanel } from './features/money/MoneyPanel';
import { PricingPanel } from './features/pricing/PricingPanel';
import { AskPanel } from './features/ask/AskPanel';

const navigation = [
  ['service', 'Service', Activity], ['cold-chain', 'Cold chain', Snowflake], ['money', 'Money', CircleDollarSign], ['pricing', 'Price position', Tag], ['ask', 'Ask anything', Boxes],
];

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  return <div className="app-shell">
    <header className="topbar"><a href="#top" className="brand"><span>K</span><div>Kestrel <small>CONTROL TOWER</small></div></a><button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">{menuOpen ? <X /> : <Menu />}</button><nav className={menuOpen ? 'open' : ''}>{navigation.map(([target, label, Icon]) => <a key={target} href={`#${target}`} onClick={() => setMenuOpen(false)}><Icon size={16} /> {label}</a>)}</nav><p className="period">Q1 FY 2026–27</p></header>
    <main id="top"><section className="hero"><p className="eyebrow">Operations overview</p><h1>Know what broke.<br /><em>Then act on it.</em></h1><p>One operational view across service, cold chain, freight, returns, and pricing. The highest-risk issues surface first.</p><div className="hero-chips"><span>8 distribution centres</span><span>5 regions</span><span>Q1 default</span></div></section><ServicePanel /><ColdChainPanel /><MoneyPanel /><PricingPanel /><AskPanel /></main>
    <footer>Built for Kestrel Provisions · Source data is synthetic · Reporting period defaults to Q1 FY 2026–27</footer>
  </div>;
}
