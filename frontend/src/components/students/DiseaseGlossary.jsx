import { useEffect, useMemo, useState } from "react";
import PageChanger from "../PageChanger";

const DiseaseGlossary = () => {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let mounted = true;
    fetch("/data/disease-glossary.json")
      .then((r) => r.json())
      .then((data) => { if (mounted) setItems(data || []); })
      .catch(() => { if (mounted) setItems([]); });
    return () => (mounted = false);
  }, []);

  const subsequenceMatch = (text = "", q = "") => {
    if (!q) return [];
    const lower = text.toLowerCase();
    const qlower = q.toLowerCase();
    const positions = [];
    let idx = 0;
    for (let i = 0; i < qlower.length; i++) {
      const ch = qlower[i];
      idx = lower.indexOf(ch, idx);
      if (idx === -1) return null;
      positions.push(idx);
      idx += 1;
    }
    return positions;
  };

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return items.map((it) => ({ item: it, pos: null }));
    const matches = items
      .map((it) => {
        const eng = it.english || "";
        const nep = it.nepali || "";
        const engPos = subsequenceMatch(eng, q);
        const nepPos = subsequenceMatch(nep, q);
        let pos = null;
        if (engPos) pos = { field: "english", indices: engPos };
        if (nepPos && (!pos || nepPos.length < pos.indices.length)) pos = { field: "nepali", indices: nepPos };
        const engInc = eng.toLowerCase().includes(q.toLowerCase());
        const nepInc = nep.toLowerCase().includes(q.toLowerCase());
        if (!pos && !engInc && !nepInc) return null;
        const span = pos ? pos.indices[pos.indices.length - 1] - pos.indices[0] : 9999;
        const score = (engInc || nepInc ? 0 : 1) + span / 1000;
        return { item: it, pos, score };
      })
      .filter(Boolean)
      .sort((a, b) => a.score - b.score);
    return matches;
  }, [items, query]);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => { setPage(0); }, [query, items]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageItems = filtered.slice(page * pageSize, page * pageSize + pageSize);

  const renderHighlighted = (text, positions) => {
    if (!positions || positions.length === 0) return text;
    const parts = [];
    let last = 0;
    positions.forEach((p) => {
      if (p > last) parts.push({ t: text.slice(last, p), m: false });
      parts.push({ t: text[p], m: true });
      last = p + 1;
    });
    if (last < text.length) parts.push({ t: text.slice(last), m: false });
    return parts.map((part, i) =>
      part.m
        ? <mark key={i} style={{ background: '#fef08a', borderRadius: '2px', padding: '0 1px' }}>{part.t}</mark>
        : <span key={i}>{part.t}</span>
    );
  };

  return (
    <div className="sp-panel">
      <div style={{ marginBottom: '1rem' }}>
        <label className="sp-label">Search diseases</label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type English or Nepali name…"
          className="sp-input"
        />
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--pp-text-muted)', padding: '2rem 0', fontSize: '0.875rem' }}>
          No matches found.
        </div>
      ) : (
        <div className="sp-glossary-grid">
          {pageItems.map(({ item, pos }, idx) => {
            const engPositions = pos && pos.field === "english" ? pos.indices : null;
            const nepPositions = pos && pos.field === "nepali"  ? pos.indices : null;
            return (
              <div key={idx} className="sp-glossary-card">
                <div className="sp-glossary-lang">English</div>
                <div className="sp-glossary-word">{renderHighlighted(item.english, engPositions)}</div>
                <div className="sp-glossary-divider" />
                <div className="sp-glossary-lang">Nepali</div>
                <div className="sp-glossary-word nepali">{renderHighlighted(item.nepali, nepPositions)}</div>
              </div>
            );
          })}
        </div>
      )}

      <div className="sp-pagination-row">
        <span className="sp-page-info">
          Showing {Math.min(total, page * pageSize + 1)}–{Math.min(total, page * pageSize + pageItems.length)} of {total}
        </span>

        <div className="sp-row" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
            className="sp-select"
          >
            {[10, 20, 50, 100].map((s) => <option key={s} value={s}>{s} / page</option>)}
          </select>

          <PageChanger
            currentPage={page + 1}
            totalPages={totalPages}
            onPageChange={(nextPage) => setPage(nextPage - 1)}
            className="mt-0"
          />
        </div>
      </div>
    </div>
  );
};

export default DiseaseGlossary;
