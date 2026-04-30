import { useContext, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PatientSidebar from "../components/PatientSidebar";
import { ArrowLeftIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContext } from "../context/AppContext";
import "./IoT.css";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ─── Score helpers ────────────────────────────────────────────────────────────

/** Convert reaction time (ms) to a 0-100 score */
function reactionScore(ms) {
  return Math.max(0, Math.min(100, Math.round(100 - (ms - 150) / 5)));
}

/** Compute tremor amplitude from data array and convert to 0-100 score */
function tremorScore(data) {
  if (!data || data.length === 0) return 50;
  const rms = Math.sqrt(
    data.reduce((s, p) => s + p.x * p.x + p.y * p.y + p.z * p.z, 0) / data.length
  );
  // rms near 0 = no tremor = 100; rms ≥ 10 = severe tremor = 0
  return Math.max(0, Math.min(100, Math.round(100 - rms * 10)));
}

function tremorAmplitude(data) {
  if (!data || data.length === 0) return 0;
  const rms = Math.sqrt(
    data.reduce((s, p) => s + p.x * p.x + p.y * p.y + p.z * p.z, 0) / data.length
  );
  return rms.toFixed(2);
}

// ─── Reaction Time Card ───────────────────────────────────────────────────────

const ReactionCard = ({ onSaveResult, lastSaved }) => {
  const [mode, setMode] = useState("visual"); // visual | sound
  // visual state
  const [vPhase, setVPhase] = useState("idle"); // idle | countdown | ready | done
  const [vCount, setVCount] = useState(3);
  const [vResult, setVResult] = useState(null);
  const vStartTs = useRef(null);
  // sound state
  const [sStatus, setSStatus] = useState("idle"); // idle | waiting | played | done
  const [sResult, setSResult] = useState(null);
  const sStartTs = useRef(null);
  const sRunning = useRef(false);

  const isRunning = vPhase === "countdown" || vPhase === "ready" || sStatus === "waiting" || sStatus === "played";

  const startVisual = () => {
    setVPhase("countdown");
    setVResult(null);
    setVCount(3);
    let c = 3;
    const iv = setInterval(() => {
      c -= 1;
      setVCount(c);
      if (c <= 0) {
        clearInterval(iv);
        setVPhase("ready");
        vStartTs.current = Date.now();
      }
    }, 1000);
  };

  const tapVisual = () => {
    if (vPhase !== "ready") return;
    const rt = Date.now() - vStartTs.current;
    setVPhase("done");
    setVResult(rt);
  };

  const startSound = () => {
    setSStatus("waiting");
    setSResult(null);
    sRunning.current = true;
    const delay = Math.floor(Math.random() * 4000) + 1000;
    setTimeout(() => {
      if (!sRunning.current) return;
      try {
        const ctx = new AudioContext();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = 880;
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        g.gain.setValueAtTime(0.001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 0.02);
        setTimeout(() => {
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
          o.stop(ctx.currentTime + 0.2);
        }, 150);
      } catch (e) {}
      sStartTs.current = Date.now();
      setSStatus("played");
    }, delay);
  };

  const tapSound = () => {
    if (sStatus !== "played") return;
    const rt = Date.now() - sStartTs.current;
    sRunning.current = false;
    setSStatus("done");
    setSResult(rt);
  };

  const result = mode === "visual" ? vResult : sResult;
  const phase = mode === "visual" ? vPhase : sStatus;

  const renderInterface = () => {
    if (mode === "visual") {
      if (vPhase === "idle")
        return (
          <>
            <span className="iot-test-icon">👆</span>
            <span style={{ fontSize: "0.8125rem", color: "var(--iot-text-muted)" }}>
              Press Start — tap when screen turns green
            </span>
          </>
        );
      if (vPhase === "countdown")
        return <div className="iot-countdown-display">{vCount}</div>;
      if (vPhase === "ready")
        return (
          <button className="iot-tap-area iot-tap-ready" onClick={tapVisual}>
            TAP!
          </button>
        );
      if (vPhase === "done")
        return (
          <>
            <div className="iot-result-display">{vResult} ms</div>
            <div className="iot-result-label">
              Score: {reactionScore(vResult)}/100
            </div>
          </>
        );
    }

    if (mode === "sound") {
      if (sStatus === "idle")
        return (
          <>
            <span className="iot-test-icon">🔊</span>
            <span style={{ fontSize: "0.8125rem", color: "var(--iot-text-muted)" }}>
              Press Start — tap when you hear the beep
            </span>
          </>
        );
      if (sStatus === "waiting")
        return (
          <button className="iot-sound-btn iot-sound-waiting" disabled>
            Waiting for beep...
          </button>
        );
      if (sStatus === "played")
        return (
          <button className="iot-sound-btn iot-sound-active" onClick={tapSound}>
            Tap now!
          </button>
        );
      if (sStatus === "done")
        return (
          <>
            <div className="iot-result-display">{sResult} ms</div>
            <div className="iot-result-label">
              Score: {reactionScore(sResult)}/100
            </div>
          </>
        );
    }
  };

  const handleStart = () => {
    if (mode === "visual") startVisual();
    else startSound();
  };

  const handleReset = () => {
    setVPhase("idle"); setVResult(null);
    setSStatus("idle"); setSResult(null);
    sRunning.current = false;
  };

  return (
    <div className="iot-test-card">
      <div className="iot-test-header">
        <div className="iot-test-title">⚡ Reaction Time Test</div>
        <span className={`iot-status-badge ${isRunning ? "iot-status-running" : phase === "done" || phase === "done" ? "iot-status-done" : ""}`}>
          {isRunning ? "Running" : result != null ? "Done" : "Ready"}
        </span>
      </div>

      <div className={`iot-test-interface ${isRunning || result != null ? "iot-interface-active" : ""}`}>
        <div className="iot-mode-tabs">
          <button className={`iot-mode-tab ${mode === "visual" ? "iot-mode-active" : ""}`} onClick={() => { setMode("visual"); handleReset(); }} disabled={isRunning}>
            Visual
          </button>
          <button className={`iot-mode-tab ${mode === "sound" ? "iot-mode-active" : ""}`} onClick={() => { setMode("sound"); handleReset(); }} disabled={isRunning}>
            Sound
          </button>
        </div>
        {renderInterface()}
      </div>

      <div className="iot-test-content">
        <div className="iot-test-description">
          <div className="iot-test-description-label">Description</div>
          <div className="iot-test-description-text">
            Measures your cognitive response time to {mode === "visual" ? "visual" : "auditory"} stimuli.
            Useful for monitoring neurological health and cognitive function.
          </div>
        </div>

        {result != null && (
          <div className="iot-test-stats">
            <div className="iot-stat">
              <div className="iot-stat-label">Result</div>
              <div className="iot-stat-value">{result} ms</div>
            </div>
            <div className="iot-stat">
              <div className="iot-stat-label">Score</div>
              <div className="iot-stat-value">{reactionScore(result)}/100</div>
            </div>
          </div>
        )}

        {lastSaved && !result && (
          <div className="iot-test-stats">
            <div className="iot-stat">
              <div className="iot-stat-label">Last Result</div>
              <div className="iot-stat-value">{lastSaved.value}</div>
            </div>
            <div className="iot-stat">
              <div className="iot-stat-label">Score</div>
              <div className="iot-stat-value">{lastSaved.score}/100</div>
            </div>
          </div>
        )}

        <div className="iot-test-actions">
          {result != null ? (
            <>
              <button className="iot-btn iot-btn-primary" onClick={() => onSaveResult({ resultMs: result, mode, score: reactionScore(result) })}>
                Save Result
              </button>
              <button className="iot-btn iot-btn-secondary" onClick={handleReset}>
                Retry
              </button>
            </>
          ) : (
            <button className="iot-btn iot-btn-primary" onClick={handleStart} disabled={isRunning}>
              {isRunning ? "Running..." : "▶ Start Test"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Tremor Card ──────────────────────────────────────────────────────────────

const TremorCard = ({ onSaveResult, lastSaved }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const sphereRef = useRef(null);
  const graphRef = useRef(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [available, setAvailable] = useState(true);
  const lastReadingRef = useRef({ x: 0, y: 0, z: 0 });
  const orientationRef = useRef({ alpha: 0, beta: 0, gamma: 0 });
  const dataRef = useRef([]);
  const rafRef = useRef(null);
  const motionHandlerRef = useRef(null);
  const [timeLeft, setTimeLeft] = useState(5);

  useEffect(() => {
    const has = "DeviceMotionEvent" in window || "DeviceOrientationEvent" in window || "Gyroscope" in window;
    setAvailable(has);
  }, []);

  // Scatter plot canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor((rect.height || 120) * dpr);
      canvas.style.width = rect.width + "px";
      canvas.style.height = (rect.height || 120) + "px";
      canvas.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Draw scatter
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const draw = () => {
      const w = canvas.width; const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#f8fafc"; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#ef4444";
      dataRef.current.slice(-300).forEach((p) => {
        const cx = w / 2 + clamp(p.x, -10, 10) * 10;
        const cy = h / 2 - clamp(p.y, -10, 10) * 10;
        ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
      });
      rafRef.current = requestAnimationFrame(draw);
    };
    if (running) rafRef.current = requestAnimationFrame(draw);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [running]);


  // deviceorientation for sphere
  useEffect(() => {
    const handler = (ev) => {
      orientationRef.current = { alpha: ev.alpha || 0, beta: ev.beta || 0, gamma: ev.gamma || 0 };
    };
    window.addEventListener("deviceorientation", handler, { passive: true });
    return () => window.removeEventListener("deviceorientation", handler);
  }, []);

  // Sphere canvas
  useEffect(() => {
    const canvas = sphereRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const size = 100;
    canvas.width = size * dpr; canvas.height = size * dpr;
    canvas.style.width = size + "px"; canvas.style.height = size + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let raf;
    const draw = () => {
      const { alpha = 0, beta = 0, gamma = 0 } = orientationRef.current;
      const w = size; const h = size;
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2; const cy = h / 2; const r = Math.min(w, h) / 2 - 6;
      ctx.fillStyle = "#0f172a"; ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      const a = (alpha * Math.PI) / 180;
      const b = (beta * Math.PI) / 180;
      const g = (gamma * Math.PI) / 180;
      const sin = Math.sin, cos = Math.cos;
      const Rx = ([x, y, z]) => [x, y * cos(b) - z * sin(b), y * sin(b) + z * cos(b)];
      const Ry = ([x, y, z]) => [x * cos(g) + z * sin(g), y, -x * sin(g) + z * cos(g)];
      const Rz = ([x, y, z]) => [x * cos(a) - y * sin(a), x * sin(a) + y * cos(a), z];
      const apply = (v) => Rz(Ry(Rx(v)));
      const drawAxis = (vec, color) => {
        const x2 = cx + vec[0] * r * 0.85; const y2 = cy - vec[1] * r * 0.85;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x2, y2); ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.beginPath(); ctx.arc(x2, y2, 4, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
      };
      drawAxis(apply([1, 0, 0]), "#ef4444");
      drawAxis(apply([0, 1, 0]), "#10b981");
      drawAxis(apply([0, 0, 1]), "#3b82f6");
      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fillStyle = "rgba(2,6,23,0.6)"; ctx.fill();
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, []);

  // Realtime graph
  useEffect(() => {
    const canvas = graphRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const h = 70;
    const resize = () => {
      const w = Math.floor(canvas.clientWidth * dpr) || Math.floor(300 * dpr);
      canvas.width = w; canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    let raf;
    const draw = () => {
      resize();
      const w = canvas.width / dpr;
      ctx.fillStyle = "#0b1220"; ctx.fillRect(0, 0, w, h);
      const d = dataRef.current.slice(-200);
      if (d.length > 1) {
        const max = 12; const mid = h / 2; const step = w / (d.length - 1);
        ["x", "y", "z"].forEach((k, i) => {
          ctx.beginPath();
          ctx.strokeStyle = i === 0 ? "#ef4444" : i === 1 ? "#10b981" : "#3b82f6";
          ctx.lineWidth = 1.5;
          d.forEach((p, j) => {
            const x = j * step;
            const y = mid - (clamp(p[k], -max, max) / max) * (h * 0.4);
            if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          });
          ctx.stroke();
        });
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.font = "11px sans-serif";
        ctx.fillText("No sensor data — start the test", 8, h / 2 + 4);
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, []);

  const requestMotionPermission = async () => {
    try {
      if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") {
        return (await DeviceMotionEvent.requestPermission()) === "granted";
      }
    } catch (e) {}
    return true;
  };

  const start = async () => {
    const ok = await requestMotionPermission();
    if (!ok) { toast.error("Motion permission denied"); return; }
    dataRef.current = [];
    setResult(null);
    setRunning(true);
    setTimeLeft(5);

    const countdown = setInterval(() => setTimeLeft((t) => t - 1), 1000);

    const pushPoint = (x, y, z) => {
      const entry = { x: x || 0, y: y || 0, z: z || 0, t: Date.now() };
      dataRef.current.push(entry);
      if (dataRef.current.length > 3000) dataRef.current.splice(0, 1500);
      lastReadingRef.current = entry;
    };

    let gyro = null;
    try {
      if ("Gyroscope" in window) {
        gyro = new window.Gyroscope({ frequency: 60 });
        gyro.addEventListener("reading", () => pushPoint(gyro.x, gyro.y, gyro.z));
        gyro.start();
        motionHandlerRef.current = () => { try { gyro.stop(); } catch (e) {} };
      }
    } catch (e) { gyro = null; }

    if (!gyro) {
      const dmHandler = (ev) => {
        const r = ev.rotationRate;
        if (r && (r.alpha || r.beta || r.gamma)) { pushPoint(r.alpha, r.beta, r.gamma); return; }
        const a = ev.accelerationIncludingGravity || ev.acceleration || { x: 0, y: 0, z: 0 };
        pushPoint(a.x, a.y, a.z);
      };
      window.addEventListener("devicemotion", dmHandler, { passive: true });
      motionHandlerRef.current = () => window.removeEventListener("devicemotion", dmHandler);
    }

    setTimeout(() => {
      clearInterval(countdown);
      if (motionHandlerRef.current) motionHandlerRef.current();
      const collected = dataRef.current.slice();
      setRunning(false);
      setResult(collected);
    }, 5000);
  };

  const amp = result ? tremorAmplitude(result) : null;
  const score = result ? tremorScore(result) : null;

  return (
    <div className="iot-test-card">
      <div className="iot-test-header">
        <div className="iot-test-title">〰 Tremor Analysis Test</div>
        <span className={`iot-status-badge ${running ? "iot-status-running" : result ? "iot-status-done" : ""}`}>
          {running ? `Recording ${timeLeft}s` : result ? "Done" : "Ready"}
        </span>
      </div>

      <div className={`iot-test-interface iot-interface-active`} style={{ padding: "0.75rem" }}>
        {!available && (
          <div style={{ fontSize: "0.8125rem", color: "var(--iot-text-secondary)", textAlign: "center" }}>
            Motion sensor not available. Try on a mobile device with gyroscope.
          </div>
        )}
        <div className="iot-tremor-wrapper">
          <div className="iot-tremor-visuals">
            <canvas ref={sphereRef} className="iot-sphere-canvas" />
            <canvas ref={graphRef} className="iot-graph-canvas" style={{ width: "100%", height: 70 }} />
          </div>
          {running && (
            <div className="iot-recording-indicator">
              <div className="iot-rec-dot" />
              Recording... {timeLeft}s remaining
            </div>
          )}
          {result && !running && (
            <div className="iot-tremor-reading">
              Amplitude: {amp} · Score: {score}/100 · {result.length} points captured
            </div>
          )}
          {!running && !result && (
            <div className="iot-tremor-reading" style={{ color: "var(--iot-text-muted)" }}>
              Hold device steady · 5 second recording
            </div>
          )}
          <div ref={containerRef} style={{ height: 100 }}>
            <canvas ref={canvasRef} style={{ width: "100%", height: "100%", borderRadius: 6, border: "1px solid var(--iot-border)" }} />
          </div>
        </div>
      </div>

      <div className="iot-test-content">
        <div className="iot-test-description">
          <div className="iot-test-description-label">Description</div>
          <div className="iot-test-description-text">
            Analyzes hand tremors using your device's accelerometer and gyroscope to detect irregular movements.
            Important for Parkinson's and Essential Tremor screening.
          </div>
        </div>

        {result && (
          <div className="iot-test-stats">
            <div className="iot-stat">
              <div className="iot-stat-label">Amplitude</div>
              <div className="iot-stat-value">{amp} u</div>
            </div>
            <div className="iot-stat">
              <div className="iot-stat-label">Score</div>
              <div className="iot-stat-value">{score}/100</div>
            </div>
          </div>
        )}

        {!result && lastSaved && (
          <div className="iot-test-stats">
            <div className="iot-stat">
              <div className="iot-stat-label">Last Result</div>
              <div className="iot-stat-value">{lastSaved.value}</div>
            </div>
            <div className="iot-stat">
              <div className="iot-stat-label">Score</div>
              <div className="iot-stat-value">{lastSaved.score}/100</div>
            </div>
          </div>
        )}

        <div className="iot-test-actions">
          {result ? (
            <>
              <button className="iot-btn iot-btn-primary" onClick={() => onSaveResult({ data: result, amplitude: amp, score })}>
                Save Result
              </button>
              <button className="iot-btn iot-btn-secondary" onClick={() => setResult(null)}>
                Retry
              </button>
            </>
          ) : (
            <button className="iot-btn iot-btn-primary" onClick={start} disabled={running}>
              {running ? `Recording ${timeLeft}s...` : "▶ Start Test"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main IoT Page ────────────────────────────────────────────────────────────

const IoTPage = () => {
  const { backendUrl, token } = useContext(AppContext);
  const [recentResults, setRecentResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(true);
  const [lastReaction, setLastReaction] = useState(null);
  const [lastTremor, setLastTremor] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) { setLoadingResults(false); return; }
    axios
      .get(backendUrl + "/api/patient/iot/recent", { headers })
      .then(({ data }) => {
        if (data.success) {
          const results = Array.isArray(data.data) ? data.data : data.data?.readings || [];
          setRecentResults(results);
          // populate last saved stats
          const lastR = results.find((r) => r.sensorData?.test === "reaction_time");
          const lastT = results.find((r) => r.sensorData?.test === "tremor_analysis");
          if (lastR) setLastReaction({ value: `${lastR.sensorData.reactionTimeMs}ms`, score: lastR.resultScore });
          if (lastT) setLastTremor({ value: `${lastT.sensorData.amplitude}u`, score: lastT.resultScore });
        }
      })
      .catch(() => {})
      .finally(() => setLoadingResults(false));
  }, [token, backendUrl]);

  const saveReactionResult = async ({ resultMs, mode, score }) => {
    if (!token) { toast.error("Please log in to save results"); return; }
    try {
      await axios.post(
        backendUrl + "/api/patient/iot",
        {
          testType: "other",
          sensorData: { test: "reaction_time", mode, reactionTimeMs: resultMs },
          resultScore: score,
          notes: `Reaction Time (${mode}): ${resultMs}ms`,
        },
        { headers }
      );
      toast.success("Reaction time result saved!");
      setLastReaction({ value: `${resultMs}ms`, score });
      // Refresh recent results
      const { data } = await axios.get(backendUrl + "/api/patient/iot/recent", { headers });
      if (data.success) {
        const results = Array.isArray(data.data) ? data.data : data.data?.readings || [];
        setRecentResults(results);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save result");
    }
  };

  const saveTremorResult = async ({ data, amplitude, score }) => {
    if (!token) { toast.error("Please log in to save results"); return; }
    try {
      await axios.post(
        backendUrl + "/api/patient/iot",
        {
          testType: "other",
          sensorData: {
            test: "tremor_analysis",
            amplitude,
            pointCount: data.length,
            sampleData: data.slice(0, 20), // send first 20 points as sample
          },
          resultScore: score,
          notes: `Tremor Analysis: amplitude ${amplitude}u, ${data.length} data points`,
        },
        { headers }
      );
      toast.success("Tremor result saved!");
      setLastTremor({ value: `${amplitude}u`, score });
      const { data: rd } = await axios.get(backendUrl + "/api/patient/iot/recent", { headers });
      if (rd.success) {
        const results = Array.isArray(rd.data) ? rd.data : rd.data?.readings || [];
        setRecentResults(results);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save result");
    }
  };

  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : "";

  const testLabel = (item) => {
    const t = item.sensorData?.test;
    if (t === "reaction_time") return "Reaction Time Test";
    if (t === "tremor_analysis") return "Tremor Analysis Test";
    return item.testType || "Test";
  };

  const testSummary = (item) => {
    const t = item.sensorData?.test;
    if (t === "reaction_time") return `${item.sensorData.reactionTimeMs}ms average`;
    if (t === "tremor_analysis") return `${item.sensorData.amplitude}u amplitude`;
    return item.notes || "—";
  };

  const scoreLabel = (score) => {
    if (score == null) return "—";
    if (score >= 80) return "Normal";
    if (score >= 50) return "Moderate";
    return "Needs Review";
  };

  return (
    <div className="iot-page">
      <div className="iot-container">
        <PatientSidebar />

        <main className="iot-main-content">
          <Link to="/patient-portal" className="iot-back-link">
            <ArrowLeftIcon style={{ width: 16, height: 16 }} /> Back to Dashboard
          </Link>

          <h1 className="iot-page-title">IoT Device Tests</h1>
          <p className="iot-page-subtitle">
            Perform real-time health monitoring tests using your connected devices
          </p>

          <h2 className="iot-section-title">Available Tests</h2>
          <div className="iot-tests-grid">
            <ReactionCard onSaveResult={saveReactionResult} lastSaved={lastReaction} />
            <TremorCard onSaveResult={saveTremorResult} lastSaved={lastTremor} />
          </div>

          <h2 className="iot-section-title">How to Perform Tests</h2>
          <div className="iot-instructions-container">
            <div className="iot-instruction-box">
              <h3>Reaction Time Test Instructions</h3>
              <ol className="iot-instruction-list">
                <li>Select Visual or Sound mode above the test card</li>
                <li>Press Start and wait — for visual, tap the green screen; for sound, tap when you hear the beep</li>
                <li>Your score is calculated automatically (higher = faster)</li>
                <li>Press Save Result to store it in your health record</li>
              </ol>
            </div>
            <div className="iot-instruction-box">
              <h3>Tremor Analysis Test Instructions</h3>
              <ol className="iot-instruction-list">
                <li>Place your device flat on the palm of your hand</li>
                <li>Keep your arm extended and as steady as possible</li>
                <li>Press Start — the device records 5 seconds of motion data</li>
                <li>Press Save Result to store the analysis in your health record</li>
              </ol>
            </div>
          </div>

          <h2 className="iot-section-title">Recent Test Results</h2>
          {loadingResults ? (
            <div className="iot-empty-state">Loading results...</div>
          ) : recentResults.length === 0 ? (
            <div className="iot-empty-state">No test results yet. Run a test above to get started.</div>
          ) : (
            <div className="iot-results-list">
              {recentResults.map((item, i) => (
                <div key={item.id || i} className="iot-result-card">
                  <div className="iot-result-info">
                    <div className="iot-result-main">
                      <div className="iot-result-label">{testLabel(item)}</div>
                      <div className="iot-result-value">
                        {fmtDate(item.createdAt)} · {testSummary(item)}
                      </div>
                    </div>
                    <div className="iot-result-status">
                      <CheckCircleIcon style={{ width: 15, height: 15, display: "inline", verticalAlign: "middle" }} /> {scoreLabel(item.resultScore)}
                    </div>
                  </div>
                  <div className="iot-result-actions">
                    <button className="iot-btn iot-btn-secondary iot-btn-sm">
                      Score: {item.resultScore ?? "—"}/100
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default IoTPage;
