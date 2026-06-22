import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { PlusCircle, TrendingUp, TrendingDown, Minus, CalendarCheck, Trash2, Target } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { calcSubjectAvg, gradeColor, gradeLabel, formatHours, downloadIcs, predict } from '../lib/algorithm'
import { ExamEntry } from '../types'
import './Dashboard.css'

interface Props { store: any }

export function Dashboard({ store }: Props) {
  const navigate = useNavigate()
  const { entries, subjects, settings } = store.store
  const [activeSubject, setActiveSubject] = useState<string>(subjects[0]?.name || '')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Self-healing: wenn activeSubject leer oder ungültig ist (z.B. Daten kamen
  // erst nach dem ersten Render), automatisch auf das erste Fach setzen.
  useEffect(() => {
    if (subjects.length > 0 && !subjects.some((s: any) => s.name === activeSubject)) {
      setActiveSubject(subjects[0].name)
    }
  }, [subjects, activeSubject])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500) }

  const subjectEntries = useMemo(() =>
    entries.filter((e: ExamEntry) => e.subject === activeSubject)
      .sort((a: ExamEntry, b: ExamEntry) => new Date(b.examDate).getTime() - new Date(a.examDate).getTime()),
    [entries, activeSubject])

  const chartData = useMemo(() =>
    [...subjectEntries].reverse().map((e: ExamEntry) => ({
      date: format(new Date(e.examDate), 'dd.MM', { locale: de }),
      note: e.note, stunden: e.studyHours,
    })), [subjectEntries])

  const avg = calcSubjectAvg(activeSubject, entries)
  const pred = useMemo(() => predict(activeSubject, entries, settings.defaultTargetNote || 5.0), [activeSubject, entries, settings.defaultTargetNote])
  const color = subjects.find((s: any) => s.name === activeSubject)?.color || 'var(--accent)'

  function handleDelete(id: string) {
    if (confirmDelete === id) { store.deleteEntry(id); setConfirmDelete(null) }
    else { setConfirmDelete(id); setTimeout(() => setConfirmDelete(null), 2800) }
  }

  function handleExport() {
    downloadIcs({ subject: activeSubject, examDate: new Date(Date.now()+7*86400000).toISOString().split('T')[0], studyHours: pred.recommendedHours })
    showToast('✓ .ics heruntergeladen')
  }

  return (
    <div className="page dash">
      <motion.div className="dash-top" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.3 }}>
        <div className="dash-top-label">Deine Noten jetzt:</div>
        <div className="subject-tabs">
          {subjects.map((s: any, i: number) => {
            const a = calcSubjectAvg(s.name, entries)
            const isActive = s.name === activeSubject
            return (
              <motion.button key={s.id} className={`subject-tab ${isActive?'active':''}`}
                style={isActive?{ borderColor:s.color } as any:{}}
                onClick={() => setActiveSubject(s.name)}
                initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
                transition={{ delay:i*0.06 }} whileHover={{ y:-3 }} whileTap={{ scale:0.96 }}>
                <span className="tab-name">{s.name}</span>
                {a !== null && <span className="tab-avg" style={{ color:isActive?s.color:gradeColor(a) }}>{a.toFixed(1)}</span>}
              </motion.button>
            )
          })}
          <motion.button className="subject-tab add-tab" onClick={() => navigate('/settings')} whileHover={{ scale:1.04 }}>+ Fach</motion.button>
        </div>
      </motion.div>

      <div className="dash-grid">
        <div className="dash-left">
          <motion.div className="card entry-table-card" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.08 }}>
            <div className="entry-table-header">
              <span className="section-title" style={{ color, margin:0 }}>
                <span className="dot" style={{ background:color }} />{activeSubject}
              </span>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/new')}><PlusCircle size={13} /> Eintragen</button>
            </div>
            {subjectEntries.length === 0 ? (
              <div className="table-empty">Noch keine Einträge. <button className="link-btn" onClick={() => navigate('/new')}>Jetzt eintragen →</button></div>
            ) : (
              <div className="entry-table">
                <div className="table-head"><span>#</span><span>Art</span><span>Datum</span><span>Zeit</span><span>Note</span><span>Gew.</span><span></span></div>
                {subjectEntries.map((entry: ExamEntry, i: number) => (
                  <motion.div key={entry.id} className={`table-row ${confirmDelete===entry.id?'deleting':''}`}
                    initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0 }}
                    transition={{ delay:i*0.04 }} layout>
                    <span className="row-num">{subjectEntries.length-i}</span>
                    <span><span className={`type-badge ${entry.type}`}>{entry.type==='pruefung'?'Prüfung':'Projekt'}</span></span>
                    <span className="row-date">{format(new Date(entry.examDate),'dd.MM.yy',{ locale:de })}</span>
                    <span className="row-hours">{entry.studyHours}h</span>
                    <span className="row-note" style={{ color:gradeColor(entry.note) }}>{entry.note.toFixed(1)}</span>
                    <span className="row-weight">{entry.weight}%</span>
                    <span><button className={`btn ${confirmDelete===entry.id?'btn-danger':'btn-ghost'} btn-xs`} onClick={() => handleDelete(entry.id)}><Trash2 size={12} />{confirmDelete===entry.id?' Sicher?':''}</button></span>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {chartData.length > 1 && (
            <motion.div className="card chart-card" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.16 }}>
              <div className="section-title"><TrendingUp size={13} /> Notenentwicklung {activeSubject}</div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={chartData} margin={{ top:6, right:8, left:-26, bottom:0 }}>
                  <defs>
                    <linearGradient id={`g${activeSubject}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={color} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
                  <XAxis dataKey="date" tick={{ fill:'#4a5168', fontSize:10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[1,6]} tick={{ fill:'#4a5168', fontSize:10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background:'var(--bg-elevated)', border:'1px solid var(--border-strong)', borderRadius:8, color:'var(--text-primary)', fontSize:12 }} />
                  <Area type="monotone" dataKey="note" stroke={color} strokeWidth={2} fill={`url(#g${activeSubject})`} dot={{ fill:color, r:3, strokeWidth:0 }} activeDot={{ r:5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </div>

        <div className="dash-right">
          <motion.div className="card avg-card" style={{ '--c':color } as any} initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.1 }}>
            <div className="avg-label">{activeSubject} – Ø Note</div>
            <div className="avg-value" style={{ color:avg?gradeColor(avg):'var(--text-muted)' }}>{avg!==null?avg.toFixed(1):'—'}</div>
            {avg && <div className="avg-grade">{gradeLabel(avg)}</div>}
          </motion.div>

          <motion.div className="card rec-card" initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.18 }}>
            <div className="section-title"><Target size={13} /> Für nächste Prüfung</div>
            <div className="rec-rows">
              <div className="rec-row"><span className="rec-key">Wunschnote</span><span className="rec-val" style={{ color:'var(--accent-bright)' }}>{settings.defaultTargetNote?.toFixed(1)||'5.0'}</span></div>
              <div className="rec-row">
                <span className="rec-key">Empf. Lernzeit</span>
                <span className="rec-val" style={{ color, fontFamily:'var(--font-display)', fontSize:20, fontWeight:800 }}>{formatHours(pred.recommendedHours)}</span>
              </div>
              <div className="rec-row">
                <span className="rec-key">Konfidenz</span>
                <span className="rec-conf">
                  <span className="conf-track"><span className="conf-bar" style={{ width:`${pred.confidence}%`, background:color }} /></span>
                  <span style={{ color:'var(--text-muted)', fontSize:11 }}>{pred.confidence}%</span>
                </span>
              </div>
            </div>
            <div className="rec-reason">{pred.reasoning}</div>
            <div className="rec-actions">
              <button className="btn btn-primary" style={{ flex:1 }} onClick={() => navigate('/planner')}><Target size={13} /> Lernplan</button>
              <button className="btn btn-secondary" onClick={handleExport}><CalendarCheck size={13} /></button>
            </div>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div className="toast toast-success" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0 }}>{toast}</motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
