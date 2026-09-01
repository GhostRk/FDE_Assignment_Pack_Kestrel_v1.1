import { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { api } from '../../api/client';

const SUGGESTIONS = [
  'Why did fill rate drop in West last week?',
  'Which carrier has the highest freight cost per case?',
  'What is our price gap in Mumbai?',
  'Show cold chain risk for Q1.',
];

export function AskPanel() {
  const [question, setQuestion] = useState(SUGGESTIONS[0]);
  const [answer, setAnswer] = useState('');
  const [interactionId, setInteractionId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    if (!question.trim()) return;
    setLoading(true); setError('');
    try {
      const result = await api.ask(question, interactionId);
      setAnswer(result.answer); setInteractionId(result.interaction_id || interactionId);
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  };

  return <section id="ask" className="panel ask-panel">
    <SectionHeader eyebrow="05 · Ask anything" title="Ask in plain English" description="Gemini chooses from approved reporting tools. It does not access the database or run SQL." />
    <div className="ask-layout">
      <div><form onSubmit={submit} className="ask-form"><label htmlFor="question">What would you like to know?</label><textarea id="question" value={question} onChange={(event) => setQuestion(event.target.value)} rows="3" placeholder="Ask about service, cold chain, freight, returns, or pricing…" /><button className="primary-button" disabled={loading}><Send size={16} /> {loading ? 'Analysing…' : 'Ask Kestrel'}</button></form><div className="suggestions">{SUGGESTIONS.map((suggestion) => <button key={suggestion} onClick={() => setQuestion(suggestion)}>{suggestion}</button>)}</div></div>
      <article className="answer-card"><Sparkles size={19} /><div><p className="eyebrow">Grounded answer</p>{answer ? <p>{answer}</p> : <p className="muted">Your answer will cite metrics returned by an approved backend reporting tool.</p>}{error && <p className="answer-error">{error}</p>}</div></article>
    </div>
  </section>;
}
