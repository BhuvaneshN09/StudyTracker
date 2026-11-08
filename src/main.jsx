import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const DEFAULT_SUBJECTS = ['Advanced Functions', 'Calculus & Vectors', 'Physics', 'Chemistry', 'Earth & Space Science', 'Other']
const STORE = 'studytrack-data-v1'
const pad = n => String(n).padStart(2, '0')
const formatTime = ms => { const mins = Math.floor(ms / 60000); return `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}` }
const formatLong = ms => { const mins = Math.max(1, Math.round(ms / 60000)); return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m` }
const dayKey = d => new Date(d).toISOString().slice(0, 10)
const sameWeek = (date, now) => { const a = new Date(date), b = new Date(now); const start = new Date(b); start.setHours(0,0,0,0); start.setDate(b.getDate() - ((b.getDay() + 6) % 7)); return a >= start }
const inMonth = (date, now) => { const a = new Date(date), b = new Date(now); return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() }

function load() { try { return JSON.parse(localStorage.getItem(STORE)) || {} } catch { return {} } }
function App() {
  const saved = useMemo(load, [])
  const [sessions, setSessions] = useState(saved.sessions || [])
  const [subjects, setSubjects] = useState(saved.subjects || DEFAULT_SUBJECTS)
  const [subject, setSubject] = useState(saved.active?.subject || '')
  const [active, setActive] = useState(saved.active || null)
  const [now, setNow] = useState(Date.now())
  const [showAdd, setShowAdd] = useState(false)
  const [custom, setCustom] = useState('')

  useEffect(() => { localStorage.setItem(STORE, JSON.stringify({ sessions, subjects, active })) }, [sessions, subjects, active])
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id) }, [])
  const elapsed = active ? active.elapsed + (active.running ? now - active.startedAt : 0) : 0
  const toggle = () => { if (!active) { if (!subject) return; setActive({ subject, startedAt: Date.now(), elapsed: 0, running: true }) } else if (active.running) setActive({ ...active, elapsed: elapsed, running: false })
    else setActive({ ...active, startedAt: Date.now(), running: true }) }
  const reset = () => setActive(null)
  const saveSession = () => { if (!active || elapsed < 1000) return; const end = Date.now(); const start = new Date(end - elapsed); const item = { id: `${start.getTime()}-${active.subject}`, subject: active.subject, start: start.toISOString(), end: new Date(end).toISOString(), duration: elapsed }; if (!sessions.some(s => s.id === item.id)) setSessions(prev => [item, ...prev]); setActive(null) }
  const addSubject = e => { e.preventDefault(); const name = custom.trim(); if (name && !subjects.includes(name)) { setSubjects([...subjects, name]); setSubject(name) } setCustom(''); setShowAdd(false) }
  const total = list => list.reduce((sum, s) => sum + s.duration, 0)
  const today = sessions.filter(s => dayKey(s.start) === dayKey(now)), week = sessions.filter(s => sameWeek(s.start, now)), month = sessions.filter(s => inMonth(s.start, now))
  const bySubject = subjects.map(name => ({ name, value: total(sessions.filter(s => s.subject === name)) })).filter(x => x.value)
  const weekDays = Array.from({ length: 7 }, (_, i) => { const d = new Date(now); d.setHours(0,0,0,0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + i); return { key: dayKey(d), label: d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2), value: total(sessions.filter(s => dayKey(s.start) === dayKey(d))) } })
  const maxDay = Math.max(...weekDays.map(d => d.value), 3600000)
  return <main>
    <header><div className="brand">StudyTracker</div><span className="date">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span></header>
    <section className="hero card"><div className="eyebrow">{active ? (active.running ? 'IN SESSION' : 'PAUSED') : 'READY TO FOCUS'}</div><div className="timer">{formatTime(elapsed)}</div><div className="controls"><button className="primary" onClick={toggle}>{active?.running ? 'Pause' : 'Start'}</button>{active && <button className="secondary" onClick={saveSession}>Stop & Save</button>}<button className="reset" onClick={reset} disabled={!active}>Reset</button></div><div className="selector"><select value={subject} onChange={e => setSubject(e.target.value)} disabled={!!active}><option value="">Select a subject</option>{subjects.map(s => <option key={s}>{s}</option>)}</select><button className="add" onClick={() => setShowAdd(v => !v)}>＋ Add subject</button></div>{showAdd && <form className="add-form" onSubmit={addSubject}><input autoFocus placeholder="Subject name" value={custom} onChange={e => setCustom(e.target.value)} /><button className="primary">Add</button></form>}</section>
    <section className="stats-grid"><Stat label="Today" value={formatLong(total(today))} /><Stat label="This week" value={formatLong(total(week))} /><Stat label="This month" value={formatLong(total(month))} /><Stat label="All time" value={formatLong(total(sessions))} /></section>
    <section className="dashboard"><div className="card chart-card"><div className="section-head"><div><h2>Weekly activity</h2><p>Hours This Week</p></div><span className="small-total">{formatLong(total(week))}</span></div><div className="chart">{weekDays.map(d => <div className="bar-wrap" key={d.key}><div className="bar" style={{ height: `${Math.max(d.value ? 8 : 2, d.value / maxDay * 100)}%` }} title={formatLong(d.value)}></div><span>{d.label}</span></div>)}</div></div><div className="card subjects-card"><div className="section-head"><div><h2>By subject</h2><p>Your focus, at a glance</p></div></div>{bySubject.length ? bySubject.map(x => <div className="subject-row" key={x.name}><span>{x.name}</span><strong>{formatLong(x.value)}</strong></div>) : <Empty text="Your subject breakdown will appear here." />}</div></section>
    <section className="card history"><div className="section-head"><div><h2>Study history</h2><p>Completed sessions, newest first</p></div>{sessions.length > 0 && <span className="count">{sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}</span>}</div>{sessions.length ? sessions.map(s => <div className="session" key={s.id}><div className="session-dot"></div><div className="session-main"><strong>{s.subject}</strong><span>{new Date(s.start).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} · {new Date(s.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} – {new Date(s.end).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span></div><strong className="duration">{formatLong(s.duration)}</strong></div>) : <Empty text="No sessions yet. Select a subject and start your first focus session." />}</section>
    <footer>Times are stored in vercel database run it locally if privacy is a concern :)</footer>
  </main>
}
function Stat({ label, value }) { return <div className="stat card"><span>{label}</span><strong>{value}</strong></div> }
function Empty({ text }) { return <div className="empty">{text}</div> }
createRoot(document.getElementById('root')).render(<App />)
