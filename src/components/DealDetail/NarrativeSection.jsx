import { boldNarrative } from '../../lib/boldNarrative.js';

function paragraphsOf(text) {
  if (!text) return [];
  return String(text)
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function NarrativeSection({ deal }) {
  const bj = deal.briefJson || deal.brief_json || {};
  const narrative = bj.narrative || bj.summary || '';
  const headline = bj.headline;
  const paragraphs = paragraphsOf(narrative);
  if (!paragraphs.length && !headline) return null;
  const geoTokens = [deal.city, deal.county, deal.state, deal.msa, deal.submarket].filter(Boolean);

  return (
    <section id="dd-narrative" className="dd-narrative" aria-label="AI property brief">
      <header className="dd-narrative-head">
        <span className="dd-narrative-eyebrow">AI Property Brief</span>
        {headline && <h2 className="dd-narrative-headline">{headline}</h2>}
      </header>
      <div className="dd-narrative-body">
        {paragraphs.map((p, i) => (
          <p key={i} className="dd-narrative-paragraph">{boldNarrative(p, geoTokens)}</p>
        ))}
      </div>
    </section>
  );
}
