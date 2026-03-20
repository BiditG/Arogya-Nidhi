import { useState, useEffect, useRef } from 'react';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const VisualTest = ({ onResult }) => {
  const [phase, setPhase] = useState('idle'); // idle | countdown | ready | done
  const [count, setCount] = useState(3);
  const startTs = useRef(null);

  const start = () => {
    setPhase('countdown');
    setCount(3);
    let c = 3;
    const iv = setInterval(() => {
      c -= 1;
      setCount(c);
      if (c <= 0) {
        clearInterval(iv);
        setPhase('ready');
        startTs.current = Date.now();
      }
    }, 1000);
  };

  const tap = () => {
    if (phase !== 'ready') return;
    const rt = Date.now() - startTs.current;
    setPhase('done');
    onResult(rt);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Visual Reaction</h3>
        <button className="bg-primary text-white px-3 py-1 rounded" onClick={start} disabled={phase === 'countdown' || phase === 'ready'}>Start</button>
      </div>
      <div className="flex flex-col items-center gap-4">
        {phase === 'countdown' && <div className="text-6xl font-bold">{count}</div>}
        {phase === 'idle' && <div className="text-sm text-gray-600">Press Start and wait for the screen to turn green.</div>}
        {phase === 'ready' && (
          <button onClick={tap} className="w-full md:w-64 h-28 rounded bg-emerald-400 text-white text-2xl">Tap!</button>
        )}
        {phase === 'done' && <div className="text-sm text-gray-700">Reaction: <strong>{/* result shown via parent */}</strong></div>}
      </div>
    </div>
  );
};

const SoundTest = ({ onResult }) => {
  const [status, setStatus] = useState('idle'); // idle | waiting | played | done
  const [running, setRunning] = useState(false);
  const startTs = useRef(null);

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 880;
      o.connect(g); g.connect(ctx.destination);
      o.start();
      g.gain.setValueAtTime(0.001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 0.02);
      setTimeout(() => { g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18); o.stop(ctx.currentTime + 0.2); }, 150);
    } catch (e) {
      const a = new Audio(); a.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA='; a.play().catch(()=>{});
    }
  };

  const start = () => {
    setStatus('waiting');
    setRunning(true);
    setTimeout(() => {
      playBeep();
      startTs.current = Date.now();
      setStatus('played');
    }, Math.floor(Math.random() * 15000) + 500);
  };

  const press = () => {
    if (status !== 'played') return;
    const rt = Date.now() - startTs.current;
    setStatus('done');
    setRunning(false);
    onResult(rt);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Sound Reaction</h3>
        <button className="bg-primary text-white px-3 py-1 rounded" onClick={start} disabled={running}>Start</button>
      </div>
      <div className="flex flex-col items-center gap-4">
        <div className="text-sm text-gray-600">Listen for the beep and press the button as soon as you hear it.</div>
        <button onClick={press} className={`w-full md:w-64 h-14 rounded ${status==='played' ? 'bg-emerald-400 text-white' : 'bg-gray-100 text-gray-700'}`}>
          {status === 'idle' && 'Press Start'}
          {status === 'waiting' && 'Waiting...' }
          {status === 'played' && 'Tap!'}
          {status === 'done' && 'Done'}
        </button>
      </div>
    </div>
  );
};

const TremorTest = ({ onResult }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const sphereRef = useRef(null);
  const graphRef = useRef(null);
  const [running, setRunning] = useState(false);
  const [available, setAvailable] = useState(false);
  const [lastReading, setLastReading] = useState({ x: 0, y: 0, z: 0 });
  const lastReadingRef = useRef({ x: 0, y: 0, z: 0 });
  const [orientation, setOrientation] = useState({ alpha: 0, beta: 0, gamma: 0 });
  const orientationRef = useRef({ alpha: 0, beta: 0, gamma: 0 });
  const [log, setLog] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);
  const dataRef = useRef([]);
  const rafRef = useRef(null);
  const motionHandlerRef = useRef(null);

  // Detect support
  useEffect(() => {
    const hasMotion = ('Gyroscope' in window) || ('DeviceMotionEvent' in window) || ('DeviceOrientationEvent' in window) || ('ondevicemotion' in window) || ('ondeviceorientation' in window);
    setAvailable(!!hasMotion);
  }, []);

  // Resize canvas to container and scale for DPR
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor((rect.height || 240) * dpr);
      canvas.style.width = rect.width + 'px';
      canvas.style.height = (rect.height || 240) + 'px';
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    window.addEventListener('orientationchange', resize);
    return () => { ro.disconnect(); window.removeEventListener('orientationchange', resize); };
  }, []);

  // draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const draw = () => {
      const w = canvas.width; const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ef4444';
      const d = dataRef.current.slice(-300);
      for (let i = 0; i < d.length; i++) {
        const p = d[i];
        const cx = w / 2 + clamp(p.x, -10, 10) * 12;
        const cy = h / 2 - clamp(p.y, -10, 10) * 12;
        ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
      }
      rafRef.current = requestAnimationFrame(draw);
    };

    if (running) rafRef.current = requestAnimationFrame(draw);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [running]);

  // sync lastReadingRef -> lastReading state at animation frame rate (lightweight)
  useEffect(() => {
    let raf = null;
    const loop = () => {
      setLastReading({ ...lastReadingRef.current });
      raf = requestAnimationFrame(loop);
    };
    if (running) raf = requestAnimationFrame(loop);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [running]);

  // deviceorientation listener used for UI indicator (works on Chrome Android)
  useEffect(() => {
    const handler = (ev) => {
      const a = ev.alpha || 0;
      const b = ev.beta || 0;
      const g = ev.gamma || 0;
      orientationRef.current = { alpha: a, beta: b, gamma: g };
      setOrientation({ alpha: a, beta: b, gamma: g });
    };

    // add listener; keep passive where supported
    window.addEventListener('deviceorientation', handler, { passive: true });
    return () => window.removeEventListener('deviceorientation', handler);
  }, []);

  // draw a 3D-looking sphere with rotated axes based on deviceorientation (responsive)
  useEffect(() => {
    const canvas = sphereRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const sizeCss = Math.max(64, Math.min(240, canvas.clientWidth || 160));
      const size = Math.floor(sizeCss * dpr);
      canvas.width = size; canvas.height = size;
      canvas.style.width = sizeCss + 'px'; canvas.style.height = sizeCss + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    let raf;
    const draw = () => {
      const { alpha = 0, beta = 0, gamma = 0 } = orientationRef.current || {};
      const w = canvas.width / dpr; const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);
      // background / rim
      const cx = w / 2; const cy = h / 2; const r = Math.min(w, h) / 2 - 8;
      // soft background
      ctx.fillStyle = '#0f172a';
      ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, Math.PI * 2); ctx.fill();
      // sphere base
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      // rim
      ctx.strokeStyle = 'rgba(2,6,23,0.06)'; ctx.lineWidth = 2; ctx.stroke();

      // compute rotated axes
      const a = (alpha * Math.PI) / 180;
      const b = (beta * Math.PI) / 180;
      const g = (gamma * Math.PI) / 180;
      const sin = Math.sin, cos = Math.cos;
      const Rx = (v) => { const [x, y, z] = v; return [x, y * cos(b) - z * sin(b), y * sin(b) + z * cos(b)]; };
      const Ry = (v) => { const [x, y, z] = v; return [x * cos(g) + z * sin(g), y, -x * sin(g) + z * cos(g)]; };
      const Rz = (v) => { const [x, y, z] = v; return [x * cos(a) - y * sin(a), x * sin(a) + y * cos(a), z]; };
      const apply = (v) => Rz(Ry(Rx(v)));
      const axes = { x: apply([1, 0, 0]), y: apply([0, 1, 0]), z: apply([0, 0, 1]) };

      const drawAxis = (vec, color) => {
        const x2 = cx + vec[0] * r * 0.9;
        const y2 = cy - vec[1] * r * 0.9;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x2, y2); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke();
        ctx.beginPath(); ctx.arc(x2, y2, 6, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
      };

      drawAxis(axes.x, '#ef4444');
      drawAxis(axes.y, '#10b981');
      drawAxis(axes.z, '#3b82f6');

      // small center highlight
      ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fillStyle = 'rgba(2,6,23,0.6)'; ctx.fill();

      raf = requestAnimationFrame(draw);
    };
    draw();
    window.addEventListener('resize', resize);
    return () => { if (raf) cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  // realtime graph for x/y/z values using dataRef
  useEffect(() => {
    const canvas = graphRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const w = Math.floor(canvas.clientWidth * dpr) || Math.floor(300 * dpr);
      const h = Math.floor(80 * dpr);
      canvas.width = w; canvas.height = h;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      canvas.style.height = '80px';
    };
    resize();
    window.addEventListener('resize', resize);

    let raf;
    const draw = () => {
      resize();
      const w = canvas.width / dpr; const h = canvas.height / dpr;
      // background
      ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, w, h);
      const d = dataRef.current.slice(-200);
      if (d.length > 1) {
        const max = 12; const mid = h / 2;
        const step = w / (d.length - 1);
        ['x', 'y', 'z'].forEach((k, i) => {
          ctx.beginPath();
          ctx.strokeStyle = i === 0 ? '#ef4444' : i === 1 ? '#10b981' : '#3b82f6';
          ctx.lineWidth = 2;
          for (let j = 0; j < d.length; j++) {
            const v = clamp(d[j][k], -max, max);
            const x = j * step;
            const y = mid - (v / max) * (h * 0.4);
            if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        });
      } else {
        // no data
        ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.font = '12px sans-serif'; ctx.fillText('No sensor data yet', 10, h / 2 + 4);
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { if (raf) cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  // Request motion permission on iOS 13+ when needed
  const requestMotionPermission = async () => {
    try {
      if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        const resp = await DeviceMotionEvent.requestPermission();
        return resp === 'granted';
      }
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const resp = await DeviceOrientationEvent.requestPermission();
        return resp === 'granted';
      }
    } catch (e) {
      // ignore
    }
    return true; // assume allowed on non-iOS or already permitted
  };

  const start = async () => {
    const ok = await requestMotionPermission();
    if (!ok) return;
    dataRef.current = [];
    setRunning(true);

    // Prefer Generic Sensor API Gyroscope if available (better on some Android devices)
    let used = null;
    let gyro = null;

    const pushPoint = (x, y, z) => {
      const entry = { x: x || 0, y: y || 0, z: z || 0, t: Date.now() };
      dataRef.current.push(entry);
      if (dataRef.current.length > 3000) dataRef.current.splice(0, dataRef.current.length - 3000);
      // update quick-ref for render loop
      lastReadingRef.current = entry;
      // append to log (cap 40)
      setLog((prev) => {
        const text = `${new Date(entry.t).toLocaleTimeString()}: x=${entry.x.toFixed(2)}, y=${entry.y.toFixed(2)}, z=${entry.z.toFixed(2)}`;
        const next = [text, ...prev];
        return next.slice(0, 40);
      });
    };

    try {
      if ('Gyroscope' in window) {
        gyro = new window.Gyroscope({ frequency: 60 });
        gyro.addEventListener('reading', () => {
          // Gyroscope gives rotational rates; use them for tremor visualization
          pushPoint(gyro.x, gyro.y, gyro.z);
        });
        gyro.addEventListener('error', (err) => {
          setErrorMsg(String(err && err.error ? err.error : err));
        });
        gyro.start();
        used = 'gyroscope';
        motionHandlerRef.current = () => { if (gyro) try { gyro.stop(); } catch(e){} };
      }
    } catch (e) {
      // Generic Sensor API may throw if not allowed
      gyro = null;
      setErrorMsg(String(e));
    }

    // If Gyroscope not used, set up devicemotion fallback
    if (!used) {
      const dmHandler = (ev) => {
        // Prefer rotationRate when available (gyroscope-like)
        if (ev.rotationRate && (ev.rotationRate.alpha || ev.rotationRate.beta || ev.rotationRate.gamma)) {
          const r = ev.rotationRate;
          // rotationRate values are in deg/sec — scale them
          pushPoint(r.alpha || 0, r.beta || 0, r.gamma || 0);
          return;
        }
        const a = ev.accelerationIncludingGravity || ev.acceleration || { x: 0, y: 0, z: 0 };
        pushPoint(a.x || 0, a.y || 0, a.z || 0);
      };

      const orientHandler = (ev) => {
        if (ev.beta != null || ev.gamma != null) {
          const x = (ev.gamma || 0) / 90 * 9;
          const y = (ev.beta || 0) / 90 * 9;
          pushPoint(x, y, 0);
        }
      };

      window.addEventListener('devicemotion', dmHandler, { passive: true });
      window.addEventListener('deviceorientation', orientHandler);
      motionHandlerRef.current = () => {
        window.removeEventListener('devicemotion', dmHandler);
        window.removeEventListener('deviceorientation', orientHandler);
      };
    }

    // Stop and return collected data after 5 seconds
    setTimeout(() => {
      try { if (gyro) gyro.stop(); } catch (e) {}
      if (motionHandlerRef.current) motionHandlerRef.current();
      setRunning(false);
      onResult(dataRef.current.slice());
    }, 5000);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Tremor Analysis</h3>
        <button className="bg-primary text-white px-4 py-2 rounded w-full md:w-auto" onClick={start} disabled={running}>{running ? 'Recording...' : 'Start'}</button>
      </div>
      {!available && <div className="text-sm text-gray-500">Gyroscope / motion not available on this device. On iOS, enable Motion & Orientation permission in Safari settings.</div>}

      {/* 3D sphere indicator + realtime graph */}
      <div className="flex flex-col items-center gap-3 my-3">
        <div className="flex items-center gap-4 w-full">
          <canvas ref={sphereRef} className="w-24 md:w-40 rounded bg-white" style={{boxShadow:'0 12px 30px rgba(2,6,23,0.06)'}} />
          <div style={{flex:1}}>
            <canvas ref={graphRef} style={{width:'100%', height:80, borderRadius:8, background:'#0f172a'}} />
            <div className="text-xs text-gray-500 mt-2">Realtime tremor (last samples): <span className="text-red-500">X</span> <span className="text-green-500">Y</span> <span className="text-blue-500">Z</span></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-3 bg-gray-50 rounded border">
          <div className="text-xs text-gray-500">Last reading</div>
          <div className="text-sm font-medium">x: {lastReading.x.toFixed(2)} &nbsp; y: {lastReading.y.toFixed(2)} &nbsp; z: {lastReading.z.toFixed(2)}</div>
          {errorMsg && <div className="mt-2 text-xs text-red-500">Error: {errorMsg}</div>}
        </div>
        <div className="p-3 bg-gray-50 rounded border">
          <div className="text-xs text-gray-500">Sensor log (most recent)</div>
          <div className="mt-2 h-28 overflow-auto text-xs font-mono bg-white p-2 rounded border">
            {log.length === 0 ? <div className="text-gray-400">No events yet</div> : log.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </div>
      </div>

      <div ref={containerRef} className="mt-4" style={{height: 240}}>
        <canvas ref={canvasRef} className="w-full h-full border rounded bg-gray-50" />
      </div>
      <div className="mt-2 text-xs text-gray-500">Tip: hold the phone steady or place on a flat surface when recording.</div>
    </div>
  );
};

const IoTPage = () => {
  const [activeTest, setActiveTest] = useState('visual');
  const [visualResult, setVisualResult] = useState(null);
  const [soundResult, setSoundResult] = useState(null);
  const [tremorResult, setTremorResult] = useState([]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">IoT — Reaction & Tremor Tests</h1>
          <div className="hidden md:block text-sm text-gray-600">Keep device steady for tremor test. Use headphones for best sound test accuracy.</div>
        </div>

        {/* Mobile tips */}
        <div className="md:hidden mb-4">
          <div className="bg-white p-3 rounded shadow text-sm">
            <div className="font-medium mb-1">Mobile tips</div>
            <div>Use portrait orientation, allow Motion permissions, tap the <strong>Start</strong> button, and place device on a flat surface for tremor recording.</div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <aside className="w-full md:w-64">
            <div className="bg-white rounded-lg shadow p-4">
              <h4 className="font-semibold mb-3">Tests</h4>
              <nav className="flex flex-col gap-2">
                <button onClick={() => setActiveTest('visual')} className={`w-full text-left p-3 rounded ${activeTest==='visual' ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}>Visual Reaction</button>
                <button onClick={() => setActiveTest('sound')} className={`w-full text-left p-3 rounded ${activeTest==='sound' ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}>Sound Reaction</button>
                <button onClick={() => setActiveTest('tremor')} className={`w-full text-left p-3 rounded ${activeTest==='tremor' ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}>Tremor Analysis</button>
              </nav>
            </div>
            <div className="mt-4 bg-white rounded-lg shadow p-4">
              <h4 className="font-semibold mb-2">Results</h4>
              <div className="text-sm text-gray-700">Visual: {visualResult!==null ? `${visualResult} ms` : '—'}</div>
              <div className="text-sm text-gray-700">Sound: {soundResult!==null ? `${soundResult} ms` : '—'}</div>
              <div className="text-sm text-gray-700">Tremor points: {tremorResult.length}</div>
            </div>
          </aside>

          <main className="flex-1">
            {activeTest === 'visual' && <VisualTest onResult={(r)=>setVisualResult(r)} />}
            {activeTest === 'sound' && <SoundTest onResult={(r)=>setSoundResult(r)} />}
            {activeTest === 'tremor' && <TremorTest onResult={(d)=>setTremorResult(d)} />}
          </main>
        </div>
      </div>
    </div>
  );
};

export default IoTPage;