import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, ChevronDown, Plus, CalendarCheck } from 'lucide-react'
import { format } from 'date-fns'
import { predict, formatHours, gradeColor, downloadIcs } from '../lib/algorithm'
import { SUBJECT_COLORS } from '../types'
import './NewEntry.css'

interface Props { store: any }

export function NewEntry({ store }: Props) {
  const navigate = useNavigate()
  const { subjects, entries, settings } = store.store
  const [subject, setSubject]       = useState(subjects[0]?.name || '')
  const [type, setType]             = useState<'pruefung'|'projekt'>('pruefung')
  const [note, setNote]             = useState('')
  const [studyHours, setStudyHours] = useState('')
  const [weight, setWeight]         = useState('100')
  const [examDate, setExamDate]     = useState(format(new Date(), 'yyyy-MM-dd'))
  const [saved, setSaved]           = useState(false)
  const [showAddSubj, setShowAddSubj] = useState(false)
  const [newSubjName, setNewSubjName] = useState('')
  const [newSubjColor, setNewSubjColor] = useState(SUBJECT_COLORS[0])
  const [toast, setToast]           = useState<string | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3200) }
  const color = subjects.find((s: any) => s.name === subject)?.color || 'var(--accent)'

  const preview = useMemo(() => {
    if (!subject || !note || !studyHours) return null
    const tmp = [...entries, { id:'p', subject, type, note:parseFloat(note), studyHours:parseFloat(studyHours), examDate, weight:parseInt(weight)||100, createdAt:new Date().toISOString() }]
    return predict(subject, tmp, settings.defaultTargetNote || 5.0)
  }, [subject, note, studyHours, examDate, weight, entries])

  const isValid = subject.trim()!=='' && note!=='' && parseFloat(note)>=1 && parseFloat(note)<=6 && studyHours!=='' && parseFloat(studyHours)>0

  function handleSave() {
    if (!isValid) return
    store.addEntry({ subject, type, note:parseFloat(note), studyHours:parseFloat(studyHours), examDate, weight:parseInt(weight)||100 })
    setSaved(true); setTimeout(() => navigate('/'), 1100)
  }

  function handleAddSubject() {
    if (!newSubjName.trim()) return
    store.addSubject({ name:newSubjName.trim(), color:newSubjColor, targetNote:5.0 })
    setSubject(newSubjName.trim()); setShowAddSubj(false); setNewSubjName('')
  }

  if (saved) return (
    <div className="page" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <motion.div className="saved-anim" initial={{ scale:0.8, opacity:0 }} animate={{ scale:1, opacity:1 }} transition={{ type:'spring' }}>
        <CheckCircle size={52} style={{ color:'var(--green)', filter:'drop-shadow(0 0 16px rgba(34,197,94,0.5))' }} />
        <h2>Gespeichert!</h2><p>Weiterleitung…</p>
      </motion.div>
    </div>
  )

  return (
    <div className="page new-entry">
      <motion.div className="page-header" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}>
        <h1 className="page-title">Prüfung eintragen</h1>
        <p className="page-subtitle">Trag deine Resultate ein – die KI lernt mit dir</p>
      </motion.div>
      <div className="entry-layout">
        <motion.div className="card entry-form" initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.06 }}>
          <div className="form-group">
            <label className="form-label">Fach</label>
            <div style={{ position:'relative' }}>
              <select className="form-select" value={subject} onChange={e => { if(e.target.value==='__new__') setShowAddSubj(true); else setSubject(e.target.value) }}>
                {subjects.map((s: any) => <option key={s.id} value={s.name}>{s.name}</option>)}
                <option value="__new__">+ Neues Fach…</option>
              </select>
              <ChevronDown size={13} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }} />
            </div>
          </div>

          <AnimatePresence>{showAddSubj && (
            <motion.div className="add-subj-box" initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }} style={{ overflow:'hidden' }}>
              <input className="form-input" placeholder="Fachname" value={newSubjName} onChange={e => setNewSubjName(e.target.value)} onKeyDown={e => e.key==='Enter'&&handleAddSubject()} />
              <div className="color-row">{SUBJECT_COLORS.map(c => <motion.button key={c} className={`color-dot ${newSubjColor===c?'sel':''}`} style={{ background:c }} onClick={() => setNewSubjColor(c)} whileHover={{ scale:1.2 }} />)}</div>
              <button className="btn btn-secondary" onClick={handleAddSubject} disabled={!newSubjName.trim()}><Plus size={13} /> Hinzufügen</button>
            </motion.div>
          )}</AnimatePresence>

          <div className="form-group">
            <label className="form-label">Art</label>
            <div className="type-toggle">
              <button className={`type-btn ${type==='pruefung'?'active':''}`} onClick={() => setType('pruefung')}>Prüfung</button>
              <button className={`type-btn ${type==='projekt'?'active':''}`}  onClick={() => setType('projekt')}>Projekt</button>
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Note <span className="form-hint">1.0–6.0</span></label>
              <div style={{ position:'relative' }}>
                <input type="number" className="form-input" placeholder="5.0" min="1" max="6" step="0.1" value={note} onChange={e => setNote(e.target.value)} />
                {note && parseFloat(note)>=1 && parseFloat(note)<=6 && <div style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', width:8, height:8, borderRadius:'50%', background:gradeColor(parseFloat(note)) }} />}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Lernzeit <span className="form-hint">h</span></label>
              <input type="number" className="form-input" placeholder="3.0" min="0.5" max="24" step="0.5" value={studyHours} onChange={e => setStudyHours(e.target.value)} />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Datum</label>
              <input type="date" className="form-input" value={examDate} onChange={e => setExamDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Gewichtung %</label>
              <input type="number" className="form-input" placeholder="100" min="1" max="100" step="5" value={weight} onChange={e => setWeight(e.target.value)} />
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn-secondary" onClick={() => navigate('/')}>Abbrechen</button>
            <motion.button className="btn btn-primary" disabled={!isValid} onClick={handleSave} whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}>
              <CheckCircle size={14} /> Speichern
            </motion.button>
          </div>
        </motion.div>

        <motion.div className="entry-side" initial={{ opacity:0, x:12 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.12 }}>
          <div className={`card preview-card ${preview?'card-accent':''}`}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <span className="section-title" style={{ margin:0 }}>Vorhersage</span>
              {preview && <span className="badge badge-accent">Live</span>}
            </div>
            {!preview ? (
              <div style={{ color:'var(--text-muted)', fontSize:13, padding:'20px 0', textAlign:'center', lineHeight:1.7 }}>Füll das Formular aus –<br />Vorhersage erscheint hier live.</div>
            ) : (
              <motion.div className="preview-body" initial={{ opacity:0 }} animate={{ opacity:1 }}>
                <div className="preview-hours" style={{ color }}>{formatHours(preview.recommendedHours)}</div>
                <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:2 }}>empfohlen für nächste {subject}-Prüfung</div>
                <div className="preview-reason">{preview.reasoning}</div>
                <div className="prev-conf-row">
                  <span style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Konfidenz</span>
                  <div style={{ flex:1, height:4, background:'var(--bg-hover)', borderRadius:2, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:2, background:color, width:`${preview.confidence}%`, transition:'width 0.8s' }} />
                  </div>
                  <span style={{ fontSize:10, color:'var(--text-muted)' }}>{preview.confidence}%</span>
                </div>
                <button className="btn btn-secondary" style={{ width:'100%', marginTop:4 }}
                  onClick={() => { downloadIcs({ subject, examDate, studyHours:preview.recommendedHours }); showToast('✓ .ics heruntergeladen') }}>
                  <CalendarCheck size={14} /> Kalender Export
                </button>
              </motion.div>
            )}
          </div>

          <div className="card note-guide">
            <div className="section-title">Notenschlüssel CH</div>
            {[['5.5–6.0','Sehr gut','#22c55e'],['5.0–5.4','Gut','#84cc16'],['4.5–4.9','Befriedigend','#eab308'],['4.0–4.4','Ausreichend','#f97316'],['1.0–3.9','Ungenügend','#ef4444']].map(([r,l,c]) => (
              <div key={r} style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:8, height:8, borderRadius:2, background:c, flexShrink:0 }} />
                <span style={{ fontSize:11, fontFamily:'var(--font-display)', fontWeight:600, color:'var(--text-secondary)', minWidth:60 }}>{r}</span>
                <span style={{ fontSize:11, color:'var(--text-muted)' }}>{l}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
      <AnimatePresence>{toast && <motion.div className="toast toast-success" initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0 }}>{toast}</motion.div>}</AnimatePresence>
    </div>
  )
}
