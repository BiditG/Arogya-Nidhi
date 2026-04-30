import { useState, useEffect } from 'react';
import assets from '../../utils/studentAssets';

const parseCsv = (text) => {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  const rows = lines.slice(1).map((line) => {
    const parts = line.split(',');
    const obj = {};
    for (let i = 0; i < Math.min(header.length, parts.length); i++) {
      obj[header[i]] = (parts[i] || '').trim();
    }
    if (parts.length > header.length) {
      const extra = parts.slice(header.length).join(',').trim();
      const lastKey = header[header.length - 1];
      obj[lastKey] = (obj[lastKey] ? obj[lastKey] + ',' + extra : extra);
    }
    return {
      name: obj['medicine name'] || obj['name'] || '',
      composition: obj['composition'] || '',
      uses: obj['uses'] || '',
      sideEffects: obj['side_effects'] || obj['sideeffects'] || obj['side effects'] || '',
      manufacturer: obj['manufacturer'] || '',
      reviewExcellent: obj['excellent review %'] || '',
      reviewAverage: obj['average review %'] || '',
      reviewPoor: obj['poor review %'] || '',
      image: obj['image'] || '',
    };
  }).filter(r => r.name);
  return rows;
};

const pct = (v) => {
  const n = Number(String(v).replace(/[^0-9.]/g, '')) || 0;
  return Math.max(0, Math.min(100, Math.round(n)));
};

const ReviewBar = ({ m }) => {
  const ex = pct(m.reviewExcellent);
  const av = pct(m.reviewAverage);
  const po = pct(m.reviewPoor);
  const total = Math.max(1, ex + av + po);
  return (
    <div style={{ marginTop: '0.75rem' }}>
      <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--pp-text-muted)', marginBottom: '0.25rem' }}>
        <span>Reviews:</span>
        <span style={{ color: '#16a34a' }}>{ex}% excellent</span>
        <span style={{ color: 'var(--pp-text-secondary)' }}>{av}% average</span>
        <span style={{ color: '#dc2626' }}>{po}% poor</span>
      </div>
      <div className="sp-review-bar">
        <div className="sp-review-bar-ex" style={{ width: `${Math.round((ex / total) * 100)}%` }} />
        <div className="sp-review-bar-av" style={{ width: `${Math.round((av / total) * 100)}%` }} />
        <div className="sp-review-bar-po" style={{ width: `${Math.round((po / total) * 100)}%` }} />
      </div>
    </div>
  );
};

const MedicineInfo = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(assets.medicineCsv);
        if (!res.ok) { setAll([]); setResults([]); setLoading(false); return; }
        const txt = await res.text();
        const parsed = parseCsv(txt);
        setAll(parsed);
        setResults(parsed);
      } catch (err) {
        console.error(err);
        setAll([]); setResults([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSearch = (q) => {
    setQuery(q);
    if (!q) return setResults(all);
    const lower = q.toLowerCase();
    setResults(all.filter(m =>
      (m.name || '').toLowerCase().includes(lower) ||
      (m.composition || '').toLowerCase().includes(lower) ||
      (m.uses || '').toLowerCase().includes(lower)
    ));
    setPage(1);
  };

  const total = results.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pagedResults = results.slice((page - 1) * pageSize, page * pageSize);
  const gotoPage = (p) => setPage(Math.min(Math.max(1, p), totalPages));

  return (
    <div className="sp-panel">
      <p style={{ fontSize: '0.8125rem', color: 'var(--pp-text-secondary)', marginBottom: '1rem' }}>
        Each card lists: <strong>Medicine Name</strong>, <strong>Composition</strong>, <strong>Uses</strong>, <strong>Side effects</strong>, <strong>Manufacturer</strong>, and review percentages.
      </p>

      <div className="sp-search-row">
        <input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search medicine name, composition or uses…"
          className="sp-input"
        />
        <button onClick={() => handleSearch(query)} className="sp-btn-primary">Search</button>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--pp-text-secondary)' }}>
          Loading medicines…
        </div>
      ) : (
        <>
          <div className="sp-medicine-meta">
            <span>
              Showing {Math.min(total, (page - 1) * pageSize + 1)}–{Math.min(total, page * pageSize)} of {total} medicines
            </span>
            <div className="sp-row">
              <span style={{ fontSize: '0.75rem', color: 'var(--pp-text-muted)' }}>Per page</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="sp-select"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
          </div>

          {total === 0 ? (
            <div style={{ fontSize: '0.875rem', color: 'var(--pp-text-muted)', padding: '1rem 0' }}>No medicines found.</div>
          ) : (
            pagedResults.map((m, idx) => (
              <div key={idx} className="sp-medicine-card" style={{ flexDirection: 'row' }}>
                {m['image url'] ? (
                  <img
                    src={m['image url']}
                    alt={m.name}
                    loading="lazy"
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/data/placeholder_medicine.png'; }}
                    className="sp-medicine-img"
                    style={{ width: '10rem', flexShrink: 0 }}
                  />
                ) : (
                  <div className="sp-medicine-img-placeholder" style={{ width: '10rem', flexShrink: 0 }}>No image</div>
                )}
                <div style={{ flex: 1 }}>
                  <div className="sp-medicine-name">{m.name}</div>
                  {m.composition  && <div className="sp-medicine-field"><strong>Composition:</strong> {m.composition}</div>}
                  {m.uses         && <div className="sp-medicine-field"><strong>Uses:</strong> {m.uses}</div>}
                  {m.sideEffects  && <div className="sp-medicine-field"><strong>Side effects:</strong> {m.sideEffects}</div>}
                  {m.manufacturer && <div className="sp-medicine-mfr">Manufacturer: {m.manufacturer}</div>}
                  {(m.reviewExcellent || m.reviewAverage || m.reviewPoor) && <ReviewBar m={m} />}
                </div>
              </div>
            ))
          )}

          {totalPages > 1 && (
            <div className="sp-pagination-row" style={{ justifyContent: 'center' }}>
              <div className="sp-pagination">
                <button onClick={() => gotoPage(page - 1)} disabled={page === 1} className="sp-page-btn">Prev</button>
                <span className="sp-page-info">Page {page} / {totalPages}</span>
                <button onClick={() => gotoPage(page + 1)} disabled={page === totalPages} className="sp-page-btn">Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MedicineInfo;
