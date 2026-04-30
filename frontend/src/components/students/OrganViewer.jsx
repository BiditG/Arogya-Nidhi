import { useEffect, useState, useRef } from "react";
import modelsList from "../../utils/modelsList";

const OrganViewer = () => {
  const [modelUrl, setModelUrl] = useState(modelsList[0]?.url || "");
  const [selected, setSelected] = useState(modelsList[0]?.id || "");
  const [available, setAvailable] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [exposure, setExposure] = useState(1);
  const viewerRef = useRef(null);

  useEffect(() => {
    if (!window.customElements?.get("model-viewer")) {
      const s = document.createElement("script");
      s.type = 'module';
      s.src = "https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js";
      document.head.appendChild(s);
    }
  }, []);

  useEffect(() => {
    const m = modelsList.find((x) => x.id === selected);
    const url = m ? m.url : "";
    setModelUrl(url);
    if (url) {
      fetch(url, { method: 'HEAD' }).then((res) => setAvailable(res.ok)).catch(() => setAvailable(false));
    } else {
      setAvailable(false);
    }
  }, [selected]);

  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;
    if (autoRotate) el.setAttribute('auto-rotate', ''); else el.removeAttribute('auto-rotate');
    el.setAttribute('exposure', String(exposure));
  }, [autoRotate, exposure]);

  const downloadModel = () => {
    if (!modelUrl) return;
    const a = document.createElement('a');
    a.href = modelUrl;
    a.download = modelUrl.split('/').pop();
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="sp-panel">
      <p style={{ fontSize: '0.8125rem', color: 'var(--pp-text-secondary)', marginBottom: '1rem' }}>
        Select a 3D organ to preview. Models are served from the project's public/models folder.
      </p>

      <div className="sp-viewer-controls">
        <select value={selected} onChange={(e) => setSelected(e.target.value)} className="sp-select">
          {modelsList.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>

        <label className="sp-viewer-control">
          <input type="checkbox" checked={autoRotate} onChange={(e) => setAutoRotate(e.target.checked)} />
          <span>Auto-rotate</span>
        </label>

        <label className="sp-viewer-control">
          <span>Exposure</span>
          <input
            type="range"
            min="0.2"
            max="2"
            step="0.1"
            value={exposure}
            onChange={(e) => setExposure(Number(e.target.value))}
            style={{ width: '6rem' }}
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--pp-text-muted)' }}>{exposure.toFixed(1)}</span>
        </label>

        <button onClick={downloadModel} className="sp-btn-secondary">Download</button>
      </div>

      <div className="sp-viewer-canvas">
        {modelUrl && available ? (
          // eslint-disable-next-line react/no-unknown-property
          <model-viewer
            ref={viewerRef}
            src={modelUrl}
            alt="3D model"
            camera-controls
            style={{ width: '100%', height: '100%' }}
            shadow-intensity="1"
            exposure={exposure}
          />
        ) : (
          <span className="sp-viewer-empty">No model available or file not found.</span>
        )}
      </div>
    </div>
  );
};

export default OrganViewer;
