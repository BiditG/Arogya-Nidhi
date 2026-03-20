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
        if (!res.ok) {
          setAll([]);
          setResults([]);
          setLoading(false);
          return;
        }
        const txt = await res.text();
        const parsed = parseCsv(txt);
        setAll(parsed);
        setResults(parsed);
      } catch (err) {
        console.error(err);
        setAll([]);
        setResults([]);
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
    const filtered = all.filter(m => (m.name||'').toLowerCase().includes(lower) || (m.composition||'').toLowerCase().includes(lower) || (m.uses||'').toLowerCase().includes(lower));
    setResults(filtered);
    setPage(1);
  };

  // Derived pagination values
  const total = results.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pagedResults = results.slice((page - 1) * pageSize, page * pageSize);

  const gotoPage = (p) => setPage(Math.min(Math.max(1, p), totalPages));

  const resolveImage = (img) => {
    // Use the image string from CSV as-is (trimmed).
    // This respects whatever URL/path the dataset contains (absolute URL, protocol-relative, or relative path).
    if (!img) return '';
    return String(img).trim();
  };

  const pct = (v) => {
    const n = Number(String(v).replace(/[^0-9.]/g, '')) || 0;
    return Math.max(0, Math.min(100, Math.round(n)));
  };

  const renderReviews = (m) => {
    const ex = pct(m.reviewExcellent);
    const av = pct(m.reviewAverage);
    const po = pct(m.reviewPoor);
    const total = Math.max(1, ex + av + po);
    return (
      <div className="mt-3">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <div>Reviews:</div>
          <div className="flex items-center gap-2">
            <div className="text-emerald-600">{ex}%</div>
            <div className="text-gray-500">{av}%</div>
            <div className="text-rose-600">{po}%</div>
          </div>
        </div>
        <div className="h-2 mt-1 w-full bg-gray-100 rounded overflow-hidden">
          <div style={{ width: `${Math.round((ex/total)*100)}%` }} className="h-full bg-emerald-400 inline-block" />
          <div style={{ width: `${Math.round((av/total)*100)}%` }} className="h-full bg-yellow-300 inline-block" />
          <div style={{ width: `${Math.round((po/total)*100)}%` }} className="h-full bg-rose-400 inline-block" />
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 bg-white rounded-2xl shadow-sm">
      <p className="text-sm text-gray-600 mb-3">Dataset columns shown below — each card lists: <strong>Medicine Name</strong>, <strong>Composition</strong> (active salts), <strong>Uses</strong>, <strong>Side effects</strong>, <strong>Image</strong>, <strong>Manufacturer</strong>, and review percentages.</p>

      <div className="flex gap-2 mb-4">
        <input value={query} onChange={(e) => handleSearch(e.target.value)} placeholder="Search medicine..." className="flex-1 border px-3 py-2 rounded" />
        <button onClick={() => handleSearch(query)} className="bg-primary text-white px-3 py-2 rounded">Search</button>
      </div>

      {loading ? (
        <div className="p-6 text-center text-gray-600">Loading medicines…</div>
      ) : (
        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">Showing {Math.min(total, (page-1)*pageSize+1)}–{Math.min(total, page*pageSize)} of {total} medicines</div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Per page</label>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="border rounded px-2 py-1 text-sm">
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
          </div>

          {total === 0 ? (
            <div className="text-sm text-gray-500">No medicines found.</div>
          ) : (
            pagedResults.map((m, idx) => (
              <div key={idx} className="p-3 border rounded flex flex-col md:flex-row gap-4 items-start">
                {m['image url'] ? (
                  <img
                    src={m['image url']}
                    alt={m.name}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/data/placeholder_medicine.png';
                    }}
                    className="w-full md:w-40 h-40 object-contain rounded border"
                  />
                ) : (
                  <div className="w-full md:w-40 h-40 bg-gray-50 rounded border flex items-center justify-center text-xs text-gray-400">No image</div>
                )}
                <div className="flex-1">
                  <div className="font-medium text-lg">{m.name}</div>
                  {m.composition ? <div className="text-sm text-gray-700 mt-1"><strong>Composition:</strong> {m.composition}</div> : null}
                  {m.uses ? <div className="text-sm text-gray-700 mt-2"><strong>Uses:</strong> {m.uses}</div> : null}
                  {m.sideEffects ? <div className="text-sm text-gray-700 mt-2"><strong>Side effects:</strong> {m.sideEffects}</div> : null}
                  {m.manufacturer ? <div className="text-xs text-gray-500 mt-2">Manufacturer: {m.manufacturer}</div> : null}
                  {(m.reviewExcellent || m.reviewAverage || m.reviewPoor) ? (
                    renderReviews(m)
                  ) : null}
                </div>
              </div>
            ))
          )}

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-2">
              <button onClick={() => gotoPage(page-1)} disabled={page===1} className="px-3 py-1 rounded border text-sm">Prev</button>
              <div className="text-sm text-gray-600">Page {page} / {totalPages}</div>
              <button onClick={() => gotoPage(page+1)} disabled={page===totalPages} className="px-3 py-1 rounded border text-sm">Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const IoTSection = () => {
  const [reactionTime, setReactionTime] = useState(null);
  const [tremorData, setTremorData] = useState([]);
  const [isGyroscopeAvailable, setIsGyroscopeAvailable] = useState(false);

  useEffect(() => {
    if ('DeviceMotionEvent' in window) {
      setIsGyroscopeAvailable(true);
    }
  }, []);

  const startReactionTest = () => {
    const startTime = Date.now();
    alert('Click OK as fast as you can!');
    const endTime = Date.now();
    setReactionTime(endTime - startTime);
  };

  const startTremorAnalysis = () => {
    if (!isGyroscopeAvailable) {
      alert('Gyroscope not available on this device.');
      return;
    }

    const tremorReadings = [];
    const handleMotion = (event) => {
      const { x, y, z } = event.accelerationIncludingGravity;
      tremorReadings.push({ x, y, z, timestamp: Date.now() });
    };

    window.addEventListener('devicemotion', handleMotion);

    setTimeout(() => {
      window.removeEventListener('devicemotion', handleMotion);
      setTremorData(tremorReadings);
      alert('Tremor analysis complete.');
    }, 5000); // Collect data for 5 seconds
  };

  return (
    <div className="p-4 bg-white rounded-2xl shadow-sm mt-6">
      <h2 className="text-lg font-medium mb-4">IoT Section</h2>

      <div className="mb-4">
        <h3 className="text-md font-medium">Reaction Time Test</h3>
        <button onClick={startReactionTest} className="bg-primary text-white px-3 py-2 rounded mt-2">Start Test</button>
        {reactionTime !== null && (
          <div className="mt-2 text-sm text-gray-700">Your reaction time: {reactionTime} ms</div>
        )}
      </div>

      <div>
        <h3 className="text-md font-medium">Tremor Analysis</h3>
        <button onClick={startTremorAnalysis} className="bg-primary text-white px-3 py-2 rounded mt-2">Start Analysis</button>
        {!isGyroscopeAvailable && (
          <div className="mt-2 text-sm text-gray-500">Gyroscope not available on this device.</div>
        )}
        {tremorData.length > 0 && (
          <div className="mt-2 text-sm text-gray-700">Tremor data collected. Check console for details.</div>
        )}
      </div>
    </div>
  );
};

export default MedicineInfo;
