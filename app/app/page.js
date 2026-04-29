'use client';

import { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';
import { supabase } from './lib/supabase';

marked.use({ breaks: true });

// ── Constants ──────────────────────────────────────────────────────────────

const TOOLS = [
  { id: 'breakdown', label: 'Breakdown Assistant', icon: '🔧' },
  { id: 'lights',    label: 'Warning Lights',      icon: '⚠️' },
  { id: 'appeal',    label: 'Parking Fine',        icon: '📋' },
  { id: 'price',     label: 'Fair Price',          icon: '💰' },
];

const LIGHTS = [
  { id: 'engine',  name: 'Check Engine',   bg: '#ff9500', fg: '#000', glyph: '⚙',  desc: 'Engine fault'      },
  { id: 'battery', name: 'Battery',        bg: '#ff4444', fg: '#fff', glyph: '⚡', desc: 'Charging system'   },
  { id: 'oil',     name: 'Oil Pressure',   bg: '#ff4444', fg: '#fff', glyph: '🛢',  desc: 'Stop now'          },
  { id: 'temp',    name: 'Engine Hot',     bg: '#ff4444', fg: '#fff', glyph: '🌡',  desc: 'Coolant temp'      },
  { id: 'tpms',    name: 'Tyre Pressure',  bg: '#ffd60a', fg: '#000', glyph: '○',  desc: 'TPMS low'          },
  { id: 'abs',     name: 'ABS',            bg: '#ffd60a', fg: '#000', glyph: 'ABS', desc: 'Anti-lock brakes' },
  { id: 'airbag',  name: 'Airbag / SRS',   bg: '#ff4444', fg: '#fff', glyph: '🪆', desc: 'Restraint fault'   },
  { id: 'brake',   name: 'Brake Warning',  bg: '#ff4444', fg: '#fff', glyph: '!',  desc: 'Brake system'      },
  { id: 'eps',     name: 'Power Steering', bg: '#ffd60a', fg: '#000', glyph: '↻',  desc: 'EPS fault'         },
  { id: 'tcs',     name: 'Traction',       bg: '#ffd60a', fg: '#000', glyph: '≋',  desc: 'TCS slip'          },
  { id: 'esp',     name: 'Stability ESP',  bg: '#ffd60a', fg: '#000', glyph: '⚐',  desc: 'ESP fault'         },
  { id: 'fuel',    name: 'Low Fuel',       bg: '#ffd60a', fg: '#000', glyph: '⛽', desc: 'Refuel soon'       },
  { id: 'dpf',     name: 'DPF Filter',     bg: '#ff9500', fg: '#000', glyph: '≈',  desc: 'Diesel filter'     },
  { id: 'service', name: 'Service Due',    bg: '#ff9500', fg: '#000', glyph: '🔧', desc: 'Maintenance due'   },
  { id: 'coolant', name: 'Coolant Low',    bg: '#ff4444', fg: '#fff', glyph: '💧', desc: 'Level critical'    },
  { id: 'glow',    name: 'Glow Plug',      bg: '#ff9500', fg: '#000', glyph: '✦',  desc: 'Diesel preheat'    },
];

// ── Helpers ────────────────────────────────────────────────────────────────

async function callClaude(messages, system, opts = {}) {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, system, ...opts }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.content;
}

function isUrl(str) {
  try { const u = new URL(str.trim()); return u.protocol === 'http:' || u.protocol === 'https:'; }
  catch { return false; }
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve({ base64: e.target.result.split(',')[1], mediaType: file.type || 'image/jpeg' });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderMd(content) {
  const html = marked.parse(content);
  return typeof html === 'string' ? html : String(html);
}

// ── Shared Components ──────────────────────────────────────────────────────

function FeedbackBar({ tool, resultSummary }) {
  const [rating,  setRating]  = useState(null);
  const [comment, setComment] = useState('');
  const [done,    setDone]    = useState(false);

  async function send(finalRating, finalComment) {
    setDone(true);
    await supabase.from('fix_feedback').insert({
      tool,
      vote:           finalRating,
      note:           finalComment || null,
      result_summary: resultSummary ? resultSummary.slice(0, 200) : null,
    });
  }

  if (done) {
    return <div className="feedback-bar feedback-done">✓ Thanks for your feedback!</div>;
  }
  return (
    <div className="feedback-bar">
      <span>Was this helpful? Your feedback trains the Autodun AI</span>
      <button className={`fb-btn ${rating === 'up'   ? 'fb-up-active'   : ''}`}
        onClick={() => setRating(rating === 'up' ? null : 'up')}>👍</button>
      <button className={`fb-btn ${rating === 'down' ? 'fb-down-active' : ''}`}
        onClick={() => setRating(rating === 'down' ? null : 'down')}>👎</button>
      {rating && (
        <>
          <input className="fb-input" type="text" placeholder="Optional comment…" value={comment}
            onChange={e => setComment(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send(rating, comment)} />
          <button className="fb-send" onClick={() => send(rating, comment)}>Send</button>
        </>
      )}
    </div>
  );
}

function ResultCard({ content, loading, error, plain, actions, tool }) {
  if (loading) return <div className="result-loading"><div className="spinner" /><span>Analysing…</span></div>;
  if (error)   return <div className="error-box">⚠️ {error}</div>;
  if (!content) return null;
  const showDiagram = tool === 'breakdown' || tool === 'lights';
  return (
    <div className="result-card">
      <div className="result-body">
        {plain
          ? <pre className="letter-output">{content}</pre>
          : <div dangerouslySetInnerHTML={{ __html: renderMd(content) }} />}
      </div>
      {showDiagram && (
        <div style={{ padding: '0 24px 20px' }}>
          <CarDiagram result={content} />
        </div>
      )}
      {actions && <div className="result-actions">{actions}</div>}
      <FeedbackBar tool={tool} resultSummary={content} />
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button className={`btn-copy ${copied ? 'copied' : ''}`} onClick={copy}>
      {copied ? '✓ Copied' : '📋 Copy Letter'}
    </button>
  );
}

// ── Car Diagram ────────────────────────────────────────────────────────────

const AREAS = [
  {
    id: 'engine', label: 'Engine Bay', short: 'EN', cx: 85, cy: 118,
    desc: 'Under the bonnet at the front of the vehicle. Pull the bonnet release (usually on the driver\'s side footwell) to access.',
    keys: ['engine','timing belt','timing chain','head gasket','coolant','radiator','alternator','starter motor','thermostat','turbo','spark plug','throttle body','camshaft','valve','piston','cylinder','compression','overheating','serpentine belt','water pump','crankshaft'],
  },
  {
    id: 'battery', label: 'Battery', short: 'BA', cx: 62, cy: 133,
    desc: 'Usually in the engine bay on one side. Some cars (BMW, Porsche) have the battery in the boot or under the rear seat.',
    keys: ['battery','charging system','jump start','dead battery','flat battery','alternator charge','12v','voltage drop','parasitic drain'],
  },
  {
    id: 'dashboard', label: 'Dashboard', short: 'DI', cx: 212, cy: 82,
    desc: 'Behind the steering wheel inside the cabin. The ECU, fuse box, and electronic control modules connect through this area.',
    keys: ['warning light','dashboard','instrument cluster','airbag','srs','ecu','fuse','relay','electrical fault','central locking','check engine','obd','fault code','p0','p1','b0','c0','u0','abs sensor','traction control'],
  },
  {
    id: 'steering', label: 'Steering', short: 'ST', cx: 183, cy: 104,
    desc: 'The steering rack runs across the front subframe; the column runs through the cabin floor to the wheel.',
    keys: ['steering','power steering','rack','tie rod','track rod','eps','electric power steering','pull to one side','steering vibration','alignment','toe','camber','steering fluid'],
  },
  {
    id: 'fuel', label: 'Fuel System', short: 'FU', cx: 255, cy: 122,
    desc: 'The fuel tank sits under the rear floor. The fuel pump is typically inside the tank, accessible through the boot floor panel.',
    keys: ['fuel','fuel pump','fuel injector','fuel filter','fuel tank','fuel pressure','dpf','diesel particulate','fuel economy','misfuel','fuel smell','low fuel'],
  },
  {
    id: 'brakes', label: 'Wheels / Brakes', short: 'BR', cx: 103, cy: 163,
    desc: 'Brake discs and pads sit inside each wheel. Look through the wheel spokes — the disc should appear silver, not deeply grooved.',
    keys: ['brake','brake pad','brake disc','caliper','abs','tyre','tpms','tyre pressure','wheel bearing','squealing','grinding','brake fluid','handbrake','parking brake','pulling when braking'],
  },
  {
    id: 'exhaust', label: 'Exhaust', short: 'EX', cx: 390, cy: 138,
    desc: 'Runs from the exhaust manifold at the engine, under the car, to the tailpipe at the rear. The catalytic converter is roughly under the front seats.',
    keys: ['exhaust','catalytic converter','cat converter','dpf filter','silencer','manifold','exhaust smoke','blowing exhaust','rattling underneath','rattling exhaust','emissions','lambda sensor','oxygen sensor'],
  },
  {
    id: 'suspension', label: 'Suspension', short: 'SU', cx: 122, cy: 146,
    desc: 'At each wheel corner under the wheel arch. You\'ll see the shock absorber (damper) and coil spring when looking inside the arch.',
    keys: ['suspension','shock absorber','damper','strut','coil spring','wishbone','ball joint','cv joint','axle','knocking over bumps','bouncy ride','ride height','sway bar','anti-roll bar','pothole damage'],
  },
];

function detectArea(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  let best = null, bestScore = 0;
  for (const a of AREAS) {
    const score = a.keys.filter(k => lower.includes(k)).length;
    if (score > bestScore) { bestScore = score; best = a.id; }
  }
  return bestScore > 0 ? best : null;
}

function LabelCallout({ cx, cy, label }) {
  const w = Math.ceil(label.length * 6.5 + 14);
  const h = 18;
  const lx = Math.max(w / 2 + 3, Math.min(457 - w / 2, cx));
  const ly = Math.max(h / 2 + 3, cy - 34);
  return (
    <g pointerEvents="none">
      <line x1={cx} y1={cy - 13} x2={lx} y2={ly + h / 2 + 1}
        stroke="#00d48a" strokeWidth="1.5" strokeDasharray="3 2" />
      <rect x={lx - w / 2} y={ly - h / 2} width={w} height={h} rx="4"
        fill="#001f12" stroke="#00d48a" strokeWidth="1.2" />
      <text x={lx} y={ly + 4} textAnchor="middle" fontSize="10" fontWeight="700"
        fill="#00d48a" style={{ fontFamily: 'inherit' }}>
        {label}
      </text>
    </g>
  );
}

function CarDiagram({ result }) {
  const [active, setActive] = useState(() => detectArea(result));
  useEffect(() => { setActive(detectArea(result)); }, [result]);
  const activeArea = AREAS.find(a => a.id === active);

  return (
    <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
      <div className="section-label" style={{ marginBottom: 10 }}>📍 Where is this part?</div>
      <div style={{ background: '#0a1828', borderRadius: 10, padding: '14px 8px', marginBottom: 10, overflowX: 'auto' }}>
        <svg viewBox="0 0 460 195"
          style={{ display: 'block', width: '100%', maxWidth: 460, margin: '0 auto', minWidth: 280 }}>

          {/* Ground shadow */}
          <ellipse cx="228" cy="192" rx="190" ry="4" fill="rgba(0,0,0,0.35)" />

          {/* Car body */}
          <path d="M48,152 L48,128 L62,116 L100,108 L165,106 L196,72 L218,64 L298,64 L330,72 L362,106 L404,112 L426,128 L426,152 Z"
            fill="#0d1d30" stroke="#1e3452" strokeWidth="2" strokeLinejoin="round" />

          {/* Windscreen */}
          <path d="M165,106 L196,72 L222,64 L222,106 Z" fill="#0a1f36" stroke="#1e3452" strokeWidth="1" />

          {/* Rear window */}
          <path d="M295,64 L330,72 L336,106 L295,106 Z" fill="#0a1f36" stroke="#1e3452" strokeWidth="1" />

          {/* Door lines */}
          <line x1="222" y1="64" x2="222" y2="106" stroke="#1e3452" strokeWidth="1" />
          <line x1="295" y1="64" x2="295" y2="106" stroke="#1e3452" strokeWidth="1" />
          <line x1="222" y1="106" x2="295" y2="106" stroke="#1e3452" strokeWidth="1" />

          {/* Headlight */}
          <rect x="46" y="119" width="8" height="14" rx="2" fill="#1a3050" stroke="#2a4d70" strokeWidth="1" />

          {/* Taillight */}
          <rect x="425" y="120" width="5" height="16" rx="1" fill="#1a0010" stroke="#2a001a" strokeWidth="1" />

          {/* Front wheel */}
          <circle cx="103" cy="163" r="27" fill="#0a1828" stroke="#1e3452" strokeWidth="2" />
          <circle cx="103" cy="163" r="15" fill="#070f1a" stroke="#162842" strokeWidth="1.5" />
          <circle cx="103" cy="163" r="4"  fill="#0d1d30" />

          {/* Rear wheel */}
          <circle cx="354" cy="163" r="27" fill="#0a1828" stroke="#1e3452" strokeWidth="2" />
          <circle cx="354" cy="163" r="15" fill="#070f1a" stroke="#162842" strokeWidth="1.5" />
          <circle cx="354" cy="163" r="4"  fill="#0d1d30" />

          {/* Hotspots */}
          {AREAS.map(area => {
            const isActive = active === area.id;
            return (
              <g key={area.id} onClick={() => setActive(isActive ? null : area.id)}
                style={{ cursor: 'pointer' }}>
                {isActive && (
                  <circle cx={area.cx} cy={area.cy} r={18}
                    fill="rgba(0,212,138,0.12)" />
                )}
                <circle cx={area.cx} cy={area.cy} r={12}
                  fill={isActive ? 'rgba(0,212,138,0.2)' : '#111f33'}
                  stroke={isActive ? '#00d48a' : '#2a4d70'}
                  strokeWidth={isActive ? 2 : 1.5}
                  style={{ transition: 'all 0.15s' }}
                />
                <text x={area.cx} y={area.cy + 4} textAnchor="middle"
                  fontSize="8.5" fontWeight="600"
                  fill={isActive ? '#00d48a' : '#3d5a78'}
                  style={{ fontFamily: 'inherit', userSelect: 'none', pointerEvents: 'none' }}>
                  {area.short}
                </text>
              </g>
            );
          })}

          {/* Label callout for active hotspot */}
          {activeArea && (
            <LabelCallout cx={activeArea.cx} cy={activeArea.cy} label={activeArea.label} />
          )}
        </svg>
      </div>

      {activeArea ? (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(0,212,138,0.06)',
          border: '1px solid rgba(0,212,138,0.18)',
          borderRadius: 10,
          fontSize: 14,
          lineHeight: 1.65,
        }}>
          <div style={{ fontWeight: 600, color: 'var(--green)', marginBottom: 5 }}>
            {activeArea.label}
          </div>
          <div style={{ color: 'var(--muted2)' }}>
            This part is in the{' '}
            <strong style={{ color: 'var(--text)' }}>{activeArea.label.toLowerCase()}</strong>
            {' '}of your vehicle. {activeArea.desc}
          </div>
        </div>
      ) : (
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: '4px 0' }}>
          Tap a hotspot on the diagram to see its location
        </p>
      )}
    </div>
  );
}

// ── Breakdown Assistant ────────────────────────────────────────────────────

const DRIVEABILITY = [
  { val: 'yes',    label: 'Yes, driving fine', cls: 'active-green'  },
  { val: 'unsure', label: 'Not sure',          cls: 'active-orange' },
  { val: 'no',     label: 'No, not driveable', cls: 'active-red'    },
];

const SYS_BREAKDOWN = `You are an expert vehicle mechanic with 20+ years experience. Give a practical, honest assessment.

Format your response with exactly these sections:
## 🔍 Likely Cause
## ⚠️ Severity
Rate CRITICAL / HIGH / MEDIUM / LOW and explain briefly.
## 🚗 Is it Safe to Drive?
## ✅ Immediate Actions
Bullet points.
## 🔧 What to Tell Your Mechanic
Technical terms to use.
## 💷 Estimated Cost Range (UK)
Rough parts + labour.

Be direct and safety-focused. Plain English.`;

function BreakdownAssistant() {
  const [make,    setMake]    = useState('');
  const [model,   setModel]   = useState('');
  const [year,    setYear]    = useState('');
  const [mileage, setMileage] = useState('');
  const [problem, setProblem] = useState('');
  const [drive,   setDrive]   = useState('');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState('');
  const [error,   setError]   = useState('');

  async function submit() {
    setLoading(true); setError(''); setResult('');
    try {
      const parts = [];
      const car = [make, model, year].filter(Boolean).join(' ');
      if (car)    parts.push(`Vehicle: ${car}${mileage ? ` (${mileage} miles)` : ''}`);
      if (drive)  parts.push(`Driveability: ${drive}`);
      parts.push(`Problem: ${problem}`);
      setResult(await callClaude([{ role: 'user', content: parts.join('\n') }], SYS_BREAKDOWN));
    } catch (e) { setError(e.message || 'Something went wrong. Please try again.'); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <div className="tool-header">
        <div className="tool-title">Breakdown Assistant</div>
        <div className="tool-desc">Describe your vehicle problem and get an expert AI diagnosis with action steps.</div>
      </div>
      <div className="card">
        <div className="field-row field-row-3">
          <div className="field"><label className="field-label">Make</label>
            <input className="input" placeholder="e.g. Ford"   value={make}  onChange={e => setMake(e.target.value)} /></div>
          <div className="field"><label className="field-label">Model</label>
            <input className="input" placeholder="e.g. Focus"  value={model} onChange={e => setModel(e.target.value)} /></div>
          <div className="field"><label className="field-label">Year</label>
            <input className="input" placeholder="e.g. 2019"   value={year}  onChange={e => setYear(e.target.value)} /></div>
        </div>
        <div className="field-row" style={{ marginBottom: 14 }}>
          <div className="field"><label className="field-label">Mileage (optional)</label>
            <input className="input" placeholder="e.g. 45000" value={mileage} onChange={e => setMileage(e.target.value)} /></div>
        </div>
        <div className="field" style={{ marginBottom: 14 }}>
          <label className="field-label">Is the car driveable?</label>
          <div className="toggle-group">
            {DRIVEABILITY.map(d => (
              <button key={d.val} className={`toggle-btn ${drive === d.val ? d.cls : ''}`}
                onClick={() => setDrive(drive === d.val ? '' : d.val)}>{d.label}</button>
            ))}
          </div>
        </div>
        <div className="field">
          <label className="field-label">Describe the Problem *</label>
          <textarea className="textarea" style={{ minHeight: 120 }} value={problem} onChange={e => setProblem(e.target.value)}
            placeholder="e.g. Loud knocking noise from the engine when accelerating, started two days ago…" />
        </div>
        <button className="btn btn-primary btn-full" onClick={submit} disabled={problem.trim().length < 10 || loading}>
          {loading ? 'Analysing…' : 'Get Diagnosis →'}
        </button>
      </div>
      <ResultCard content={result} loading={loading} error={error} tool="breakdown" />
    </div>
  );
}

// ── Warning Light Decoder ──────────────────────────────────────────────────

const SYS_LIGHTS = `You are an expert vehicle technician. Explain the warning light or OBD fault code clearly.

Format your response with exactly these sections:
## 💡 What This Means
## ⚠️ Severity
Rate CRITICAL / HIGH / MEDIUM / LOW. Explain if driver should stop immediately, drive with caution, or if it can wait.
## 🚗 Safe to Drive?
## 🔍 Likely Causes
Bullet points, most common first.
## ✅ Steps to Take
Bullet points.
## 💷 Estimated Repair Cost (UK)
Typical range including parts and labour.
## 🔧 Mechanic Tip
One key phrase or detail to mention when booking.

Be direct and safety-focused.`;

function WarningLightDecoder() {
  const [mode,     setMode]     = useState('grid');
  const [selected, setSelected] = useState(null);
  const [obdCode,  setObdCode]  = useState('');
  const [imgData,  setImgData]  = useState(null);
  const [preview,  setPreview]  = useState('');
  const [dragging, setDragging] = useState(false);
  const [make,     setMake]     = useState('');
  const [model,    setModel]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState('');
  const [error,    setError]    = useState('');
  const fileRef = useRef(null);

  function resetResult() { setResult(''); setError(''); }

  async function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const data = await toBase64(file);
    setImgData(data);
    setPreview(URL.createObjectURL(file));
    resetResult();
  }

  function onDrop(e) {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  function clearPhoto() { setImgData(null); setPreview(''); resetResult(); }

  const carHint = [make, model].filter(Boolean).join(' ');

  async function submit() {
    setLoading(true); setError(''); setResult('');
    try {
      let messages;
      if (mode === 'photo') {
        messages = [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: imgData.mediaType, data: imgData.base64 } },
          { type: 'text',  text: `Identify this vehicle warning light and explain it.${carHint ? ` Car: ${carHint}.` : ''}` },
        ]}];
      } else if (mode === 'grid') {
        const light = LIGHTS.find(l => l.id === selected);
        const q = `Warning light: "${light.name}" (${light.desc}).${carHint ? ` Car: ${carHint}.` : ''}`;
        messages = [{ role: 'user', content: q }];
      } else {
        const q = `OBD fault code: ${obdCode.trim().toUpperCase()}.${carHint ? ` Car: ${carHint}.` : ''}`;
        messages = [{ role: 'user', content: q }];
      }
      setResult(await callClaude(messages, SYS_LIGHTS));
    } catch (e) { setError(e.message || 'Something went wrong. Please try again.'); }
    finally { setLoading(false); }
  }

  const canSubmit = !loading && (
    (mode === 'photo' && imgData) ||
    (mode === 'grid'  && selected) ||
    (mode === 'obd'   && obdCode.trim().length >= 4)
  );

  return (
    <div>
      <div className="tool-header">
        <div className="tool-title">Warning Light Decoder</div>
        <div className="tool-desc">Upload a photo, tap the light from the grid, or enter an OBD code.</div>
      </div>
      <div className="card">
        <div className="mode-tabs">
          {[['photo','📷 Photo'],['grid','⊞ Grid'],['obd','🔌 OBD Code']].map(([id, label]) => (
            <button key={id} className={`mode-tab ${mode === id ? 'active' : ''}`}
              onClick={() => { setMode(id); resetResult(); }}>{label}</button>
          ))}
        </div>

        {mode === 'photo' && (
          preview
            ? <div className="upload-preview">
                <img src={preview} alt="Warning light" />
                <button className="upload-clear" onClick={clearPhoto}>✕ Remove</button>
              </div>
            : <div className={`upload-zone ${dragging ? 'dragging' : ''}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}>
                <div className="upload-zone-icon">📷</div>
                <div className="upload-zone-text">Drop a photo or tap to upload</div>
                <div className="upload-zone-hint">JPEG, PNG or WebP — dashboard photo works best</div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => handleFile(e.target.files[0])} />
              </div>
        )}

        {mode === 'grid' && (
          <div className="lights-grid">
            {LIGHTS.map(l => (
              <button key={l.id} className={`light-item ${selected === l.id ? 'selected' : ''}`}
                onClick={() => { setSelected(l.id); resetResult(); }}>
                <div className="light-icon-wrap" style={{ background: l.bg, color: l.fg }}>{l.glyph}</div>
                <div className="light-name">{l.name}</div>
              </button>
            ))}
          </div>
        )}

        {mode === 'obd' && (
          <div className="obd-input-wrap">
            <input className="obd-input" maxLength={8} placeholder="e.g. P0300"
              value={obdCode} onChange={e => { setObdCode(e.target.value); resetResult(); }} />
          </div>
        )}

        <div className="field-row field-row-2" style={{ marginTop: 14, marginBottom: 0 }}>
          <div className="field"><label className="field-label">Make (optional)</label>
            <input className="input" placeholder="e.g. Vauxhall" value={make} onChange={e => setMake(e.target.value)} /></div>
          <div className="field"><label className="field-label">Model (optional)</label>
            <input className="input" placeholder="e.g. Astra"    value={model} onChange={e => setModel(e.target.value)} /></div>
        </div>

        <button className="btn btn-primary btn-full" onClick={submit} disabled={!canSubmit}>
          {loading ? 'Decoding…' : 'Decode Warning →'}
        </button>
      </div>
      <ResultCard content={result} loading={loading} error={error} tool="lights" />
    </div>
  );
}

// ── Parking Fine Appeal ────────────────────────────────────────────────────

const SYS_APPEAL = `You are an expert UK parking fine appeal writer with deep knowledge of the Traffic Management Act 2004, Protection of Freedoms Act 2012, BPA Code of Practice, IPC Code of Practice, and POPLA/IAS appeal procedures.

Draft a formal appeal letter based on the details provided. Output ONLY the letter itself — no preamble, no explanation. Start directly with [Date] on the first line.

Structure:
[Date]
[PCN / Reference Number if provided]

Dear Sir or Madam,

Re: Notice to Owner / Parking Charge Notice — [Reference]

Opening paragraph formally stating appeal and grounds.

Body paragraphs making each argument clearly, referencing relevant legislation where applicable.

Closing requesting cancellation and stating next steps if refused.

Yours faithfully,
[Your Name]
[Address]
[Contact]`;

function ParkingFineAppeal() {
  const [reg,      setReg]      = useState('');
  const [date,     setDate]     = useState('');
  const [location, setLocation] = useState('');
  const [reason,   setReason]   = useState('');
  const [grounds,  setGrounds]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState('');
  const [error,    setError]    = useState('');

  const canSubmit = reason.trim().length > 5 && grounds.trim().length > 10 && !loading;

  async function submit() {
    setLoading(true); setError(''); setResult('');
    try {
      const parts = [];
      if (reg)      parts.push(`Vehicle registration: ${reg}`);
      if (date)     parts.push(`Date of alleged contravention: ${date}`);
      if (location) parts.push(`Location: ${location}`);
      parts.push(`Reason stated on notice: ${reason}`);
      parts.push(`My grounds for appeal: ${grounds}`);
      setResult(await callClaude([{ role: 'user', content: parts.join('\n') }], SYS_APPEAL));
    } catch (e) { setError(e.message || 'Something went wrong. Please try again.'); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <div className="tool-header">
        <div className="tool-title">Parking Fine Appeal</div>
        <div className="tool-desc">Generate a formal UK appeal letter ready to send — council PCN or private parking charge.</div>
      </div>
      <div className="card">
        <div className="field-row field-row-2">
          <div className="field"><label className="field-label">Vehicle Reg</label>
            <input className="input" placeholder="e.g. AB12 CDE" value={reg} onChange={e => setReg(e.target.value)} /></div>
          <div className="field"><label className="field-label">Date of Fine</label>
            <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
        </div>
        <div className="field-row" style={{ marginBottom: 14 }}>
          <div className="field"><label className="field-label">Location</label>
            <input className="input" placeholder="e.g. Tesco car park, High Street, Birmingham" value={location} onChange={e => setLocation(e.target.value)} /></div>
        </div>
        <div className="field" style={{ marginBottom: 14 }}>
          <label className="field-label">Reason stated on the notice *</label>
          <input className="input" placeholder="e.g. Parked beyond maximum stay, No valid permit displayed" value={reason} onChange={e => setReason(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label">Your grounds for appeal *</label>
          <textarea className="textarea" style={{ minHeight: 110 }} value={grounds} onChange={e => setGrounds(e.target.value)}
            placeholder="e.g. The signs at the entrance were obscured by overgrown foliage and did not clearly state the parking restrictions. I was unaware of any time limit. I have photos showing the obscured signage." />
        </div>
        <button className="btn btn-primary btn-full" onClick={submit} disabled={!canSubmit}>
          {loading ? 'Drafting Letter…' : 'Generate Appeal Letter →'}
        </button>
      </div>
      <ResultCard
        content={result} loading={loading} error={error} plain tool="appeal"
        actions={result ? <CopyButton text={result} /> : null}
      />
    </div>
  );
}

// ── Fair Price Checker ─────────────────────────────────────────────────────

const SYS_PRICE = `You are a UK used car market expert with deep knowledge of depreciation, common faults, fair pricing, and red flags in private and dealer listings.

Analyse the car listing pasted by the user and give your honest verdict.

Format your response with exactly these sections:
## 🏷️ Verdict: [GREAT DEAL / FAIR PRICE / OVERPRICED / UNDERPRICED — SUSPECT]
One sentence summary.

## ✅ Green Flags
Bullet list of positive signals from this listing.

## 🚩 Red Flags
Bullet list of warning signs, concerns or unanswered questions.

## 💷 Fair Market Value
What this car should realistically sell for and why (check typical prices for age, mileage, spec).

## 💡 Negotiation Tips
Specific tips for negotiating on this exact listing.

## ⚠️ Must-Check Before Buying
Key things to inspect, verify or ask about for this specific car.

Be direct, honest and practical. UK market only.`;

const SYS_PHOTO_PRICE = `You are a UK used car valuation expert. Analyse the car photo provided.

Format your response with exactly these sections:
## 🚗 Vehicle Identified
Make, model, approximate year, and trim level based on what you can see.

## 🔍 Condition Assessment
Rate as Excellent / Good / Fair / Poor with a brief explanation of visible condition factors.

## 💷 Estimated Market Value (UK)
Realistic price range in £ (e.g. £8,500 — £11,200). Explain what drives the range.

## 📊 Key Factors Affecting Price
Bullet list of what's pushing the value up or down based on the photo.

## 💡 Buying / Selling Tip
One specific, actionable tip for someone buying or selling this car.

Be honest, realistic, and UK-market focused.`;

function FairPriceChecker() {
  const [tab,         setTab]         = useState('text');
  // text tab
  const [listing,     setListing]     = useState('');
  const [make,        setMake]        = useState('');
  const [model,       setModel]       = useState('');
  const [year,        setYear]        = useState('');
  const [mileage,     setMileage]     = useState('');
  const [price,       setPrice]       = useState('');
  const [seller,      setSeller]      = useState('');
  const [extras,      setExtras]      = useState('');
  // photo tab
  const [imgData,     setImgData]     = useState(null);
  const [preview,     setPreview]     = useState('');
  const [dragging,    setDragging]    = useState(false);
  const [photoExtras, setPhotoExtras] = useState('');
  // shared
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState('');
  const [error,       setError]       = useState('');
  const fileRef = useRef(null);

  const urlMode = tab === 'text' && isUrl(listing.trim());

  function resetResult() { setResult(''); setError(''); }

  function switchTab(t) { setTab(t); resetResult(); }

  async function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    setImgData(await toBase64(file));
    setPreview(URL.createObjectURL(file));
    resetResult();
  }

  function onDrop(e) { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }
  function clearPhoto() { setImgData(null); setPreview(''); resetResult(); }

  const canSubmit = !loading && (
    tab === 'photo'
      ? !!imgData
      : urlMode ? !!(make || model) && !!price : listing.trim().length >= 20
  );

  async function submit() {
    setLoading(true); setError(''); setResult('');
    try {
      if (tab === 'photo') {
        const text = `Analyse this car photo and provide a UK market valuation.${photoExtras ? ` Additional details: ${photoExtras}` : ''}`;
        const messages = [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: imgData.mediaType, data: imgData.base64 } },
          { type: 'text', text },
        ]}];
        setResult(await callClaude(messages, SYS_PHOTO_PRICE));
      } else {
        let prompt;
        if (urlMode) {
          const lines = ['Car listing details:'];
          const car = [year, make, model].filter(Boolean).join(' ');
          if (car)     lines.push(`Car: ${car}`);
          if (mileage) lines.push(`Mileage: ${mileage} miles`);
          if (price)   lines.push(`Asking price: £${price}`);
          if (seller)  lines.push(`Seller type: ${seller}`);
          if (extras)  lines.push(`Additional details: ${extras}`);
          prompt = lines.join('\n');
        } else {
          prompt = `Car listing:\n\n${listing}`;
        }
        setResult(await callClaude([{ role: 'user', content: prompt }], SYS_PRICE));
      }
    } catch (e) { setError(e.message || 'Something went wrong. Please try again.'); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <div className="tool-header">
        <div className="tool-title">Fair Price Checker</div>
        <div className="tool-desc">Value a car from a listing or a photo.</div>
      </div>
      <div className="card">
        <div className="mode-tabs">
          <button className={`mode-tab ${tab === 'text'  ? 'active' : ''}`} onClick={() => switchTab('text')}>📋 Text Details</button>
          <button className={`mode-tab ${tab === 'photo' ? 'active' : ''}`} onClick={() => switchTab('photo')}>📷 Photo Valuation</button>
        </div>

        {tab === 'text' && (
          <>
            <div className="field">
              <label className="field-label">Listing Text or URL</label>
              <textarea
                className="textarea"
                style={{ minHeight: urlMode ? 52 : 180, transition: 'min-height 0.2s ease' }}
                value={listing}
                onChange={e => { setListing(e.target.value); resetResult(); }}
                placeholder={`Paste listing text OR an AutoTrader / eBay Motors URL\n\nExample:\n2019 Ford Focus ST-Line, 42,000 miles, FSH, MOT Jan 2026, £10,995. One owner.`}
              />
            </div>

            {!urlMode && (
              <button className="btn btn-primary btn-full" onClick={submit} disabled={!canSubmit}>
                {loading ? 'Checking…' : 'Check This Price →'}
              </button>
            )}

            {urlMode && (
              <div style={{ marginTop: 16, padding: '18px 20px', background: 'rgba(255,149,0,0.07)', border: '1px solid rgba(255,149,0,0.28)', borderRadius: 12 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 18 }}>
                  <span style={{ fontSize: 20, lineHeight: 1 }}>🔒</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>AutoTrader listings can&apos;t be read directly</div>
                    <div style={{ color: 'var(--muted2)', fontSize: 13 }}>Copy and paste these details from the listing:</div>
                  </div>
                </div>
                <div className="field-row field-row-3" style={{ marginBottom: 12 }}>
                  <div className="field"><label className="field-label">Make</label>
                    <input className="input" placeholder="e.g. BMW"  value={make}  onChange={e => setMake(e.target.value)} /></div>
                  <div className="field"><label className="field-label">Model</label>
                    <input className="input" placeholder="e.g. 320d" value={model} onChange={e => setModel(e.target.value)} /></div>
                  <div className="field"><label className="field-label">Year</label>
                    <input className="input" placeholder="e.g. 2020" value={year}  onChange={e => setYear(e.target.value)} /></div>
                </div>
                <div className="field-row field-row-2" style={{ marginBottom: 12 }}>
                  <div className="field"><label className="field-label">Mileage</label>
                    <input className="input" placeholder="e.g. 38000" value={mileage} onChange={e => setMileage(e.target.value)} /></div>
                  <div className="field"><label className="field-label">Asking Price (£) *</label>
                    <input className="input" placeholder="e.g. 14995" value={price}   onChange={e => setPrice(e.target.value)} /></div>
                </div>
                <div className="field" style={{ marginBottom: 12 }}>
                  <label className="field-label">Seller Type</label>
                  <div className="toggle-group">
                    {['Private', 'Dealer'].map(s => (
                      <button key={s} className={`toggle-btn ${seller === s ? 'active-green' : ''}`}
                        onClick={() => setSeller(seller === s ? '' : s)}>{s}</button>
                    ))}
                  </div>
                </div>
                <div className="field" style={{ marginBottom: 16 }}>
                  <label className="field-label">Any Extras (optional)</label>
                  <input className="input" placeholder="e.g. Full service history, 2 owners, MOT June 2026, no accidents"
                    value={extras} onChange={e => setExtras(e.target.value)} />
                </div>
                <button className="btn btn-primary btn-full" style={{ marginTop: 0 }} onClick={submit} disabled={!canSubmit}>
                  {loading ? 'Checking…' : 'Check This Price →'}
                </button>
              </div>
            )}
          </>
        )}

        {tab === 'photo' && (
          <>
            {preview
              ? <div className="upload-preview">
                  <img src={preview} alt="Car for valuation" />
                  <button className="upload-clear" onClick={clearPhoto}>✕ Remove</button>
                </div>
              : <div className={`upload-zone ${dragging ? 'dragging' : ''}`}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}>
                  <div className="upload-zone-icon">📷</div>
                  <div className="upload-zone-text">Drop a photo or tap to upload</div>
                  <div className="upload-zone-hint">Works best with a clear exterior shot showing the whole car</div>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => handleFile(e.target.files[0])} />
                </div>
            }
            <div className="field" style={{ marginBottom: 16 }}>
              <label className="field-label">Any extra details? (optional)</label>
              <input className="input" placeholder="e.g. 54,000 miles, Manchester, private sale, full history"
                value={photoExtras} onChange={e => setPhotoExtras(e.target.value)} />
            </div>
            <button className="btn btn-primary btn-full" onClick={submit} disabled={!canSubmit}>
              {loading ? 'Valuing…' : 'Estimate This Car\'s Value →'}
            </button>
          </>
        )}
      </div>
      <ResultCard content={result} loading={loading} error={error} tool="price" />
    </div>
  );
}

// ── Main Hub ───────────────────────────────────────────────────────────────

export default function HubPage() {
  const [active, setActive] = useState('breakdown');

  return (
    <div className="hub">
      <header className="hub-header">
        <div className="hub-logo">
          <span className="hub-logo-fix">fix</span>
          <span className="hub-logo-dot">.</span>
          <span className="hub-logo-brand">autodun.com</span>
        </div>
        <div className="hub-tagline">AI-powered vehicle fix assistant hub</div>
      </header>

      <nav className="hub-nav">
        {TOOLS.map(t => (
          <button key={t.id} className={`hub-nav-btn ${active === t.id ? 'active' : ''}`} onClick={() => setActive(t.id)}>
            <span className="hub-nav-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        {active === 'breakdown' && <BreakdownAssistant />}
        {active === 'lights'    && <WarningLightDecoder />}
        {active === 'appeal'    && <ParkingFineAppeal />}
        {active === 'price'     && <FairPriceChecker />}
      </main>

      <footer className="hub-footer">
        <p>fix.autodun.com — for informational purposes only. Always consult a qualified mechanic or legal professional.</p>
      </footer>
    </div>
  );
}
