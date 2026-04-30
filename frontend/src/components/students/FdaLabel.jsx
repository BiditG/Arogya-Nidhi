import { useState } from 'react';

export default function FdaLabel({ apiKey }) {
  const [query, setQuery] = useState('aspirin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [label, setLabel] = useState(null);

  const fetchLabel = async () => {
    if (!query || !query.trim()) return;
    setLoading(true);
    setError(null);
    setLabel(null);
    try {
      const key = apiKey || import.meta.env.VITE_OPENFDA_KEY;
      if (!key) {
        setError('OpenFDA API key not configured. Set VITE_OPENFDA_KEY in .env.local');
        setLoading(false);
        return;
      }
      const q = encodeURIComponent(`openfda.brand_name:"${query}"+openfda.generic_name:"${query}"`);
      const url = `https://api.fda.gov/drug/label.json?search=${q}&limit=1&api_key=${encodeURIComponent(key)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = await res.json();
      if (!data.results || data.results.length === 0) {
        setError('No label found for that drug name. Try a different name or a brand/generic variant.');
      } else {
        setLabel(data.results[0]);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const getFieldText = (labelObj, keys) => {
    if (!labelObj) return null;
    for (const k of keys) {
      if (!labelObj[k]) continue;
      const v = labelObj[k];
      if (Array.isArray(v)) return v.join('\n\n');
      if (typeof v === 'string') return v;
      try { return JSON.stringify(v); } catch (e) { continue; }
    }
    return null;
  };

  const buildReportText = (labelObj) => {
    if (!labelObj) return '';
    const lines = [];
    const title = labelObj.openfda?.brand_name
      ? labelObj.openfda.brand_name.join(', ')
      : (labelObj.openfda?.generic_name ? labelObj.openfda.generic_name.join(', ') : 'Drug Label');
    lines.push(title, 'Source: FDA drug label', '');

    const meta = [];
    if (labelObj.openfda) {
      if (labelObj.openfda.manufacturer_name) meta.push('Manufacturer: ' + labelObj.openfda.manufacturer_name.join(', '));
      if (labelObj.openfda.application_number) meta.push('Application: ' + labelObj.openfda.application_number.join(', '));
      if (labelObj.openfda.substance_name)     meta.push('Substance: ' + labelObj.openfda.substance_name.join(', '));
      if (labelObj.openfda.route)              meta.push('Route: ' + labelObj.openfda.route.join(', '));
    }
    if (meta.length) { lines.push(...meta, ''); }

    const sections = [
      ['Indications',                   ['indications_and_usage', 'indications_and_usage_and_dosage', 'indications']],
      ['Dosage & Administration',       ['dosage_and_administration', 'dosage_and_usage']],
      ['Contraindications',             ['contraindications']],
      ['Warnings / Precautions',        ['warnings_and_cautions', 'warnings', 'precautions']],
      ['Adverse Reactions',             ['adverse_reactions', 'adverse_reactions_and_side_effects']],
      ['Drug Interactions',             ['drug_interactions']],
      ['Use in Specific Populations',   ['use_in_specific_populations', 'pregnancy', 'pediatric_use', 'geriatric_use']],
      ['Clinical Pharmacology',         ['clinical_pharmacology', 'mechanism_of_action', 'pharmacokinetics']],
      ['Clinical Studies',              ['clinical_studies', 'clinical_trials']],
      ['Description',                   ['description']],
      ['Storage / Handling',            ['storage_and_handling', 'how_supplied']],
    ];

    for (const [title, keys] of sections) {
      const txt = getFieldText(labelObj, keys);
      lines.push('---', title + ':', txt ? txt : 'Not provided.', '');
    }
    return lines.join('\n');
  };

  const reportText = buildReportText(label);

  return (
    <div className="sp-panel">
      <div className="sp-fda-search">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchLabel()}
          placeholder="Enter drug name (brand or generic)…"
          className="sp-input"
        />
        <button onClick={fetchLabel} className="sp-btn-primary" disabled={loading}>
          {loading ? 'Loading…' : 'Fetch'}
        </button>
      </div>

      {error && <div className="sp-error-text">{error}</div>}

      {!label && !error && (
        <div className="sp-empty-hint">Enter a drug name and click Fetch to retrieve FDA label sections.</div>
      )}

      {label && (
        <div className="sp-label-card">
          <div className="sp-label-header">
            <div>
              <div className="sp-label-title">
                {label.openfda?.brand_name
                  ? label.openfda.brand_name.join(', ')
                  : (label.openfda?.generic_name ? label.openfda.generic_name.join(', ') : 'Drug Label')}
              </div>
              <div className="sp-label-source">Source: FDA drug label</div>
            </div>
            <div className="sp-label-updated">
              Last updated: {label.updated || label.effective_time || '—'}
            </div>
          </div>

          <pre className="sp-label-body">{reportText}</pre>

          <div className="sp-label-actions">
            <button className="sp-btn-secondary" onClick={() => navigator.clipboard?.writeText(reportText)}>
              Copy report
            </button>
            <details>
              <summary className="sp-raw-debug" style={{ cursor: 'pointer' }}>Show raw label (debug)</summary>
              <pre className="sp-raw-pre">{JSON.stringify(label, null, 2)}</pre>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}
