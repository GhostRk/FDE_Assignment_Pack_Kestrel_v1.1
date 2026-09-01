import { AlertTriangle, LoaderCircle } from 'lucide-react';

export function AsyncState({ loading, error, children }) {
  if (loading) return <div className="async-state"><LoaderCircle className="spin" size={20} /> Loading operational data…</div>;
  if (error) return <div className="async-state error"><AlertTriangle size={20} /> {error}</div>;
  return children;
}
