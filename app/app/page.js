'use client';

import { useState } from 'react';

// ── Constants ──────────────────────────────────────────────────────────────

const TOOLS = [
  { id: 'breakdown', label: 'Breakdown Assistant', icon: '🔧' },
  { id: 'lights',    label: 'Warning Lights',      icon: '⚠️' },
  { id: 'appeal',    label: 'Parking Fine',        icon: '📋' },
  { id: 'price',     label: 'Fair Price',          icon: '💰' },
];

// ── Helper ─────────────────────────────────────────────────────────────────

async function callClaude(messages, system) {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, system }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.content;
}

function parseMd(raw) {
  const lines = raw.split('\n');
  const out = [];
  let listBuf = [];

  function flushList() {
    if (listBuf.length) {
      out.push(`<ul>${listBuf.join('')}</ul>`);
      listBuf = [];
    }
  }

  function inline(t) {
    return t
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,     '<em>$1</em>')
      .replace(/`(.+?)`/g,       '<code>$1</code>');
  }

  for (const line of lines) {
    const t = line.trim();
    if (!t) { flushList(); continue; }
    if      (t.startsWith('### ')) { flushList(); out.push(`<h3>${inline(t.slice(4))}</h3>`); }
    else if (t.startsWith('## '))  { flushList(); out.push(`<h2>${inline(t.slice(3))}</h2>`); }
    else if (t.startsWith('# '))   { flushList(); out.push(`<h2>${inline(t.slice(2))}</h2>`); }
    else if (t.startsWith('- ') || t.startsWith('* ')) {
      listBuf.push(`<li>${inline(t.slice(2))}</li>`);
    } else if (/^\d+\.\s/.test(t)) {
      listBuf.push(`<li>${inline(t.replace(/^\d+\.\s/, ''))}</li>`);
    } else {
      flushList();
      out.push(`<p>${inline(t)}</p>`);
    }
  }
  flushList();
  return out.join('');
}

// ── Shared Components ──────────────────────────────────────────────────────

function FeedbackBar() {
  const [rating, setRating]   = useState(null);
  const [comment, setComment] = useState('');
  const [done, setDone]       = useState(false);

  if (done) {
    return (
      <div className="feedback-bar feedback-done">
        ✓ Thanks for your feedback!
      </div>
    );
  }

  return (
    <div className="feedback-bar">
      <span>Was this helpful?</span>
      <button
        className={`fb-btn ${rating === 'up' ? 'fb-up-active' : ''}`}
        onClick={() => setRating(rating === 'up' ? null : 'up')}
      >👍</button>
      <button
        className={`fb-btn ${rating === 'down' ? 'fb-down-active' : ''}`}
        onClick={() => setRating(rating === 'down' ? null : 'down')}
      >👎</button>
      {rating && (
        <>
          <input
            className="fb-input"
            type="text"
            placeholder="Optional comment…"
            value={comment}
            onChange={e => setComment(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && setDone(true)}
          />
          <button className="fb-send" onClick={() => setDone(true)}>Send</button>
        </>
      )}
    </div>
  );
}

function ResultCard({ content, loading, error, plain }) {
  if (loading) {
    return (
      <div className="result-loading">
        <div className="spinner" />
        <span>Analysing…</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="error-box">
        ⚠️ {error}
      </div>
    );
  }
  if (!content) return null;
  return (
    <div className="result-card">
      <div className="result-body">
        {plain
          ? <pre className="letter-output">{content}</pre>
          : <div dangerouslySetInnerHTML={{ __html: parseMd(content) }} />
        }
      </div>
      <FeedbackBar />
    </div>
  );
}

// ── Breakdown Assistant ────────────────────────────────────────────────────

const DRIVEABILITY = [
  { val: 'yes',    label: 'Yes, driving fine',  cls: 'active-green'  },
  { val: 'unsure', label: 'Not sure',           cls: 'active-orange' },
  { val: 'no',     label: 'No, not driveable',  cls: 'active-red'    },
];

const SYSTEM_BREAKDOWN = `You are an expert vehicle mechanic with 20+ years experience.
A driver is describing a problem. Give a practical, honest assessment.

Format your response with exactly these sections:
## 🔍 Likely Cause
## ⚠️ Severity
Rate as CRITICAL / HIGH / MEDIUM / LOW and explain briefly.
## 🚗 Is it Safe to Drive?
## ✅ Immediate Actions
Use bullet points.
## 🔧 What to Tell Your Mechanic
Technical terms and descriptions to use.
## 💷 Estimated Cost Range (UK)
Rough parts + labour range.

Be direct, safety-focused, and use plain English.`;

function BreakdownAssistant() {
  const [make,       setMake]       = useState('');
  const [model,      setModel]      = useState('');
  const [year,       setYear]       = useState('');
  const [mileage,    setMileage]    = useState('');
  const [problem,    setProblem]    = useState('');
  const [drive,      setDrive]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState('');
  const [error,      setError]      = useState('');

  const canSubmit = problem.trim().length > 10 && !loading;

  async function handleSubmit() {
    setLoading(true);
    setError('');
    setResult('');
    try {
      const carInfo = [make, model, year].filter(Boolean).join(' ');
      const parts = [];
      if (carInfo)   parts.push(`Vehicle: ${carInfo}${mileage ? ` (${mileage} miles)` : ''}`);
      if (drive)     parts.push(`Driveability: ${drive}`);
      parts.push(`Problem: ${problem}`);
      const text = parts.join('\n');
      const content = await callClaude([{ role: 'user', content: text }], SYSTEM_BREAKDOWN);
      setResult(content);
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="tool-header">
        <div className="tool-title">Breakdown Assistant</div>
        <div className="tool-desc">Describe your vehicle problem and get an expert AI diagnosis with action steps.</div>
      </div>

      <div className="card">
        <div className="field-row field-row-3">
          <div className="field">
            <label className="field-label">Make</label>
            <input className="input" placeholder="e.g. Ford" value={make} onChange={e => setMake(e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">Model</label>
            <input className="input" placeholder="e.g. Focus" value={model} onChange={e => setModel(e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">Year</label>
            <input className="input" placeholder="e.g. 2019" value={year} onChange={e => setYear(e.target.value)} />
          </div>
        </div>

        <div className="field-row" style={{ marginBottom: 14 }}>
          <div className="field">
            <label className="field-label">Mileage (optional)</label>
            <input className="input" placeholder="e.g. 45000" value={mileage} onChange={e => setMileage(e.target.value)} />
          </div>
        </div>

        <div className="field" style={{ marginBottom: 14 }}>
          <label className="field-label">Is the car driveable?</label>
          <div className="toggle-group">
            {DRIVEABILITY.map(d => (
              <button
                key={d.val}
                className={`toggle-btn ${drive === d.val ? d.cls : ''}`}
                onClick={() => setDrive(drive === d.val ? '' : d.val)}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field-label">Describe the Problem *</label>
          <textarea
            className="textarea"
            placeholder="e.g. Loud knocking noise from the engine when accelerating, started two days ago. Also noticed a slight vibration through the steering wheel at speeds above 50mph."
            style={{ minHeight: 120 }}
            value={problem}
            onChange={e => setProblem(e.target.value)}
          />
        </div>

        <button className="btn btn-primary btn-full" onClick={handleSubmit} disabled={!canSubmit}>
          {loading ? 'Analysing…' : 'Get Diagnosis →'}
        </button>
      </div>

      <ResultCard content={result} loading={loading} error={error} />
    </div>
  );
}

// ── Placeholder panels ─────────────────────────────────────────────────────

function ComingSoon({ label }) {
  return (
    <div>
      <div className="tool-header">
        <div className="tool-title">{label}</div>
      </div>
      <div className="card" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--muted2)' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🚧</div>
        Coming soon
      </div>
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
          <button
            key={t.id}
            className={`hub-nav-btn ${active === t.id ? 'active' : ''}`}
            onClick={() => setActive(t.id)}
          >
            <span className="hub-nav-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        {active === 'breakdown' && <BreakdownAssistant />}
        {active === 'lights'    && <ComingSoon label="Warning Light Decoder" />}
        {active === 'appeal'    && <ComingSoon label="Parking Fine Appeal" />}
        {active === 'price'     && <ComingSoon label="Fair Price Checker" />}
      </main>

      <footer className="hub-footer">
        <p>fix.autodun.com — for informational purposes only. Always consult a qualified mechanic.</p>
      </footer>
    </div>
  );
}
