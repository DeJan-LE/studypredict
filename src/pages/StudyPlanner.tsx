import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, CalendarCheck, ChevronDown, Clock, BookOpen, Zap, Sparkles, AlertCircle } from 'lucide-react'
import { format, addDays } from 'date-fns'
import { de } from 'date-fns/locale'
import { buildStudyPlan, formatHours, gradeColor, downloadIcs } from '../lib/algorithm'
import { usePrediction } from '../lib/usePrediction'
import { StudyPlan } from '../types'
import './StudyPlanner.css'

interface Props { store: any }

export function StudyPlanner({ store }: Props) {
  const navigate = useNavigate()
  const { subjects, entries, settings } = store.store
  const { getPrediction, loading: aiLoading, error: aiError } = usePrediction()

  const [subject, setSubject]       = useState(subjects[0]?.name || '')
  const [examType, setExamType]     = useState<'pruefung' | 'projekt'>('pruefung')
  const [targetNote, setTargetNote] = useState(settings.defaultTargetNote?.toString() || '5.0')
  const [examDate, setExamDate]     = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'))
  const [weight, setWeight]         = useState('100')
  const [plan, setPlan]             = useState<StudyPlan | null>(null)
  const [aiResult, setAiResult]     = useState<{ hours: number; confidence: number; reasoning: string; tips: string[]; source: 'claude' | 'openai' | 'local' } | null>(null)
  const [toast, setToast]           = useState<string | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500) }

  const subjObj  = subjects.find((s: any) => s.name === subject)
  const color    = subjObj?.color || 'var(--accent)'
  const hasKey   = !!settings.apiKey?.trim()
  const keyStr   = (settings.apiKey || '').trim()
  const providerName = keyStr.startsWith('sk-ant-') ? 'Claude KI'
                     : keyStr.startsWith('sk-')     ? 'OpenAI GPT'
                     : 'KI'

  const prevAvg = useMemo(() => {
    const e = entries.filter((x: any) => x.subject === subject)
    if (!e.length) return null
    return (e.reduce((s: number, x: any) => s + x.note, 0) / e.length).toFixed(1)
  }, [entries, subject])

  async function handleGenerate() {
    const target = parseFloat(targetNote) || 5.0

    // KI-Vorhersage holen (mit Fallback auf lokalen Algo)
    const prediction = await getPrediction(
      subject, entries, target, examDate, settings.apiKey || ''
    )
    setAiResult(prediction)

    // Tagesplan mit den KI-Stunden aufbauen (intelligente Verteilung, nicht flach)
    const builtPlan = buildStudyPlan(subject, entries, target, examDate, prediction.hours)
    setPlan(builtPlan)
  }

  function handleExport() {
    if (!plan || !aiResult) return
    downloadIcs({ subject, examDate, studyHours: aiResult.hours, dailyPlan: plan.dailyPlan })
    showToast('✓ Lernplan als .ics exportiert – öffne in Outlook')
  }

  const daysLeft = plan ? plan.daysUntilExam : 0

  return (
    <div className="page planner">
      <motion.div className="page-header"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}>
        <h1 className="page-title">Lernplan erstellen</h1>
        <p className="page-subtitle">
          {hasKey
            ? `✦ ${providerName} analysiert deine Lernhistorie und berechnet die optimale Zeit`
            : 'Lokaler Algorithmus · API Key in Einstellungen für KI-Analyse'}
        </p>
      </motion.div>

      <div className="planner-layout">
        {/* Input panel */}
        <motion.div className="planner-form"
          initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.06, duration: 0.32 }}>
          <div className="card">
            <div className="planner-form-title">
              <Target size={15} style={{ color }} /> Prüfungsdetails
            </div>

            <div className="form-group">
              <label className="form-label">Fach</label>
              <div style={{ position: 'relative' }}>
                <select className="form-select" value={subject} onChange={e => setSubject(e.target.value)}>
                  {subjects.map((s: any) => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
                <ChevronDown size={13} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Art</label>
              <div className="type-toggle">
                <button className={`type-btn ${examType === 'pruefung' ? 'active' : ''}`} onClick={() => setExamType('pruefung')}>Prüfung</button>
                <button className={`type-btn ${examType === 'projekt'  ? 'active' : ''}`} onClick={() => setExamType('projekt')}>Projekt</button>
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Wunschnote</label>
                <input type="number" className="form-input" min="1" max="6" step="0.5"
                  value={targetNote} onChange={e => setTargetNote(e.target.value)}
                  style={{ color: gradeColor(parseFloat(targetNote) || 5) }} />
              </div>
              <div className="form-group">
                <label className="form-label">Gewichtung %</label>
                <input type="number" className="form-input" min="1" max="100" step="5"
                  value={weight} onChange={e => setWeight(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Prüfungsdatum</label>
              <input type="date" className="form-input" value={examDate}
                onChange={e => setExamDate(e.target.value)}
                min={format(addDays(new Date(), 1), 'yyyy-MM-dd')} />
            </div>

            {prevAvg && (
              <div className="prev-info">
                <BookOpen size={12} />
                Ø-Note in {subject}: <strong style={{ color: gradeColor(parseFloat(prevAvg)) }}>{prevAvg}</strong>
              </div>
            )}

            {/* AI indicator */}
            <div className={`ai-badge ${hasKey ? 'ai-on' : 'ai-off'}`}>
              {hasKey
                ? <><Sparkles size={12} /> {providerName} aktiv</>
                : <><AlertCircle size={12} /> Kein API Key – lokaler Algorithmus</>}
            </div>

            <motion.button
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={handleGenerate}
              disabled={!subject || !examDate || aiLoading}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              {aiLoading
                ? <><div className="spinner" style={{ width:14, height:14, borderWidth:2 }} /> Analysiere…</>
                : <><Zap size={14} /> Lernplan berechnen</>}
            </motion.button>

            {aiError && (
              <div className="ai-error">{aiError}</div>
            )}
          </div>
        </motion.div>

        {/* Result panel */}
        <div className="planner-result">
          <AnimatePresence mode="wait">
            {!plan || !aiResult ? (
              <motion.div key="placeholder" className="result-placeholder"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="empty-icon"><Target size={26} /></div>
                <p>Füll das Formular aus und klick auf<br /><strong>Lernplan berechnen</strong></p>
              </motion.div>
            ) : (
              <motion.div key="result" className="result-content"
                initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.28 }}>

                {/* Source badge */}
                <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:4 }}>
                  <span className={`source-badge ${aiResult.source !== 'local' ? 'source-claude' : 'source-local'}`}>
                    {aiResult.source === 'claude'
                      ? <><Sparkles size={11} /> Claude KI</>
                      : aiResult.source === 'openai'
                      ? <><Sparkles size={11} /> OpenAI GPT</>
                      : <><Target size={11} /> Lokaler Algorithmus</>}
                  </span>
                </div>

                {/* Summary */}
                <div className="card result-summary">
                  <div className="summary-top">
                    <div>
                      <div className="summary-subject" style={{ color }}>{subject}</div>
                      <div className="summary-meta">
                        {examType === 'pruefung' ? 'Prüfung' : 'Projekt'} · {format(new Date(examDate), 'dd. MMMM yyyy', { locale: de })}
                      </div>
                    </div>
                    <div className="summary-days">
                      <motion.span className="days-num" style={{ color }}
                        initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.15, type: 'spring', stiffness: 300 }}>
                        {daysLeft}
                      </motion.span>
                      <span className="days-lbl">Tage</span>
                    </div>
                  </div>

                  <div className="summary-stats">
                    {[
                      { val: formatHours(aiResult.hours),    key: 'Gesamt',    c: color },
                      { val: formatHours(plan.hoursPerDay),  key: 'Pro Tag',   c: 'var(--text-primary)' },
                      { val: parseFloat(targetNote).toFixed(1), key: 'Ziel',   c: gradeColor(parseFloat(targetNote)) },
                      { val: `${aiResult.confidence}%`,      key: 'Konfidenz', c: 'var(--text-secondary)' },
                    ].map((st, i) => (
                      <motion.div key={st.key} className="sum-stat"
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.06 }}>
                        <div className="sum-val" style={{ color: st.c }}>{st.val}</div>
                        <div className="sum-key">{st.key}</div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Claude reasoning */}
                <div className="card reasoning-card">
                  <div className="section-title">
                    <Sparkles size={13} style={{ color: 'var(--accent-bright)' }} /> Begründung
                  </div>
                  <p className="reasoning-text">{aiResult.reasoning}</p>

                  {aiResult.tips.length > 0 && (
                    <div className="tips-list">
                      {aiResult.tips.map((tip, i) => (
                        <motion.div key={i} className="tip-item"
                          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.15 + i * 0.07 }}>
                          <span className="tip-dot" />
                          {tip}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Daily plan – nur Lerntage anzeigen */}
                <div className="card daily-plan-card">
                  <div className="section-title"><Clock size={13} /> Lernplan – nur Lerntage</div>
                  {(() => {
                    const studyDays = plan.dailyPlan.filter(d => d.hours > 0)
                    const maxH = studyDays.length ? Math.max(...studyDays.map(d => d.hours)) : 1
                    const firstStudy = studyDays[0]
                    const pauseDays = plan.dailyPlan.length - studyDays.length
                    return (
                      <>
                        {pauseDays > 0 && (
                          <div className="plan-note">
                            Effektiv ab {firstStudy ? format(new Date(firstStudy.date), 'dd. MMM', { locale: de }) : ''} lernen –
                            die {pauseDays} Tage davor sind frei.
                          </div>
                        )}
                        <div className="daily-list">
                          {studyDays.slice(0, 10).map((day, i) => {
                            const pct = Math.round((day.hours / maxH) * 100)
                            const isToday = day.date === format(new Date(), 'yyyy-MM-dd')
                            return (
                              <motion.div key={day.date} className={`day-row ${isToday ? 'today' : ''}`}
                                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}>
                                <div className="day-label">
                                  {day.label}
                                  {isToday && <span className="today-badge">Heute</span>}
                                </div>
                                <div className="day-bar-wrap">
                                  <div className="day-bar-track">
                                    <motion.div className="day-bar-fill" style={{ background: color }}
                                      initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                                      transition={{ delay: 0.15 + i * 0.04, duration: 0.5, ease: [0.16,1,0.3,1] }} />
                                  </div>
                                </div>
                                <div className="day-hours" style={{ color }}>{formatHours(day.hours)}</div>
                              </motion.div>
                            )
                          })}
                          {studyDays.length > 10 && (
                            <div className="more-days">+ {studyDays.length - 10} weitere Lerntage</div>
                          )}
                        </div>
                      </>
                    )
                  })()}
                </div>

                {/* Export */}
                <div className="result-actions">
                  <motion.button className="btn btn-primary" style={{ flex: 1 }}
                    onClick={handleExport} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    <CalendarCheck size={14} /> In Kalender exportieren (.ics)
                  </motion.button>
                  <button className="btn btn-secondary" onClick={() => navigate('/calendar')}>
                    Kalender ansehen
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div className="toast toast-success"
            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
