import { useState } from 'react';

// Simple OpenFDA label viewer
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
      // search brand_name or generic_name for the provided query (limit 1)
      const q = encodeURIComponent(`openfda.brand_name:\"${query}\"+openfda.generic_name:\"${query}\"`);
      const url = `https://api.fda.gov/drug/label.json?search=${q}&limit=1&api_key=${apiKey}`;
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
      // fallback: stringify simple objects
      try { return JSON.stringify(v); } catch (e) { continue; }
    }
    return null;
  };

  const Section = ({ title, text }) => {
    if (!text) return (
      <div className="mt-4">
        <h4 className="text-sm font-semibold">{title}</h4>
        <div className="mt-2 text-sm text-gray-500">Not provided in label.</div>
      </div>
    );
    return (
      <div className="mt-4">
        <h4 className="text-sm font-semibold">{title}</h4>
        <div className="mt-2 text-sm text-gray-700 whitespace-pre-line">{text}</div>
      </div>
    );
  };

  const buildReportText = (labelObj) => {
    if (!labelObj) return '';
    const lines = [];
    const title = labelObj.openfda?.brand_name ? labelObj.openfda.brand_name.join(', ') : (labelObj.openfda?.generic_name ? labelObj.openfda.generic_name.join(', ') : 'Drug Label');
    lines.push(title);
    lines.push('Source: FDA drug label');
    lines.push('');
    const meta = [];
    if (labelObj.openfda) {
      if (labelObj.openfda.manufacturer_name) meta.push('Manufacturer: ' + labelObj.openfda.manufacturer_name.join(', '));
      if (labelObj.openfda.application_number) meta.push('Application: ' + labelObj.openfda.application_number.join(', '));
      if (labelObj.openfda.substance_name) meta.push('Substance: ' + labelObj.openfda.substance_name.join(', '));
      if (labelObj.openfda.route) meta.push('Route: ' + labelObj.openfda.route.join(', '));
    }
    if (meta.length) { lines.push(...meta); lines.push(''); }

    const sections = [
      ['Indications', ['indications_and_usage','indications_and_usage_and_dosage','indications']],
      ['Dosage & Administration', ['dosage_and_administration','dosage_and_usage','dosage_and_administration_and_dosage'] ],
      ['Contraindications', ['contraindications']],
      ['Warnings / Precautions', ['warnings_and_cautions','warnings','precautions']],
      ['Adverse Reactions', ['adverse_reactions','adverse_reactions_and_side_effects'] ],
      ['Drug Interactions', ['drug_interactions']],
      ['Use in Specific Populations', ['use_in_specific_populations','pregnancy','pediatric_use','geriatric_use']],
      ['Clinical Pharmacology / Mechanism', ['clinical_pharmacology','mechanism_of_action','pharmacology','pharmacokinetics','pharmacology_and_pharmacokinetics']],
      ['Clinical Studies (summary)', ['clinical_studies','clinical_trials']],
      ['Description', ['description']],
      ['Storage / Handling', ['storage_and_handling','how_supplied']]
    ];

    for (const [title, keys] of sections) {
      const txt = getFieldText(labelObj, keys);
      lines.push('---');
      lines.push(title + ':');
      lines.push(txt ? txt : 'Not provided.');
      lines.push('');
    }

    return lines.join('\n');
  };

  const reportText = buildReportText(label);

  return (
    <div>
      <div className="flex gap-2 items-center">
        <input value={query} onChange={(e)=>setQuery(e.target.value)} className="flex-1 p-2 border rounded" placeholder="Enter drug name (brand or generic)" />
        <button onClick={fetchLabel} className="px-4 py-2 bg-indigo-600 text-white rounded" disabled={loading}>{loading ? 'Loading...' : 'Fetch'}</button>
      </div>

      {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

      {label && (
        <div className="mt-4 bg-white rounded-lg p-4 shadow">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-lg font-semibold">{label.openfda?.brand_name ? label.openfda.brand_name.join(', ') : (label.openfda?.generic_name ? label.openfda.generic_name.join(', ') : 'Drug Label')}</div>
              <div className="text-xs text-gray-400">Source: FDA drug label</div>
            </div>
            <div className="text-xs text-gray-500">Last updated: {label.updated || label.effective_time || '—'}</div>
          </div>

          <div className="mt-4">
            <pre className="whitespace-pre-line text-sm text-gray-800" style={{whiteSpace: 'pre-wrap'}}>{reportText}</pre>
          </div>

          <div className="mt-4 flex gap-2">
            <button className="px-3 py-1 bg-gray-100 rounded" onClick={() => navigator.clipboard?.writeText(reportText)}>Copy report</button>
            <details className="text-sm text-gray-500">
              <summary className="cursor-pointer">Show raw label (debug)</summary>
              <pre className="whitespace-pre-wrap text-xs mt-2 bg-gray-50 p-3 rounded border overflow-auto" style={{maxHeight: 320}}>{JSON.stringify(label, null, 2)}</pre>
            </details>
          </div>
        </div>
      )}

      {!label && !error && <div className="mt-4 text-sm text-gray-500">Enter a drug name and click Fetch to retrieve FDA label sections.</div>}
    </div>
  );
}
