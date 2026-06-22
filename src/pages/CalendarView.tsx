import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns'
import { de } from 'date-fns/locale'
import { ExamEntry } from '../types'
import { gradeColor } from '../lib/algorithm'
import './CalendarView.css'

interface Props { store: any }

export function CalendarView({ store }: Props) {
  const { entries, subjects } = store.store
  const [current, setCurrent]   = useState(new Date())
  const [selected, setSelected] = useState<Date | null>(null)
  const today = new Date()

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(current), { weekStartsOn:1 })
    const end   = endOfWeek(endOfMonth(current),     { weekStartsOn:1 })
    const result = []; let d = start
    while (d <= end) { result.push(d); d = addDays(d, 1) }
    return result
  }, [current])

  const getEntries = (day: Date) => entries.filter((e: ExamEntry) => isSameDay(new Date(e.examDate), day))
  const getColor   = (name: string) => subjects.find((s: any) => s.name === name)?.color || 'var(--accent)'
  const selectedEntries = selected ? getEntries(selected) : []

  return (
    <div className="page calendar-page">
      <motion.div className="cal-header" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}>
        <h1 className="page-title">Kalender</h1>
        <div className="cal-nav">
          <motion.button className="btn btn-ghost" onClick={() => { setCurrent(subMonths(current,1)); setSelected(null) }} whileHover={{ scale:1.1 }} whileTap={{ scale:0.9 }}><ChevronLeft size={16} /></motion.button>
          <AnimatePresence mode="wait">
            <motion.span key={current.toISOString()} className="cal-month" initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:8 }} transition={{ duration:0.2 }}>
              {format(current, 'MMMM yyyy', { locale:de })}
            </motion.span>
          </AnimatePresence>
          <motion.button className="btn btn-ghost" onClick={() => { setCurrent(addMonths(current,1)); setSelected(null) }} whileHover={{ scale:1.1 }} whileTap={{ scale:0.9 }}><ChevronRight size={16} /></motion.button>
          <motion.button className="btn btn-secondary btn-sm" onClick={() => { setCurrent(today); setSelected(null) }} whileHover={{ scale:1.03 }}>Heute</motion.button>
        </div>
      </motion.div>

      <motion.div className="cal-layout" initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.06 }}>
        <div className="card cal-card">
          <div className="cal-weekdays">{['Mo','Di','Mi','Do','Fr','Sa','So'].map(d => <div key={d} className="weekday">{d}</div>)}</div>
          <AnimatePresence mode="wait">
            <motion.div key={current.toISOString()} className="cal-grid" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }} transition={{ duration:0.25 }}>
              {days.map((day, i) => {
                const dayEntries = getEntries(day)
                const isToday  = isSameDay(day, today)
                const isOtherM = !isSameMonth(day, current)
                const isSel    = selected ? isSameDay(day, selected) : false
                return (
                  <motion.div key={i} className={`cal-day${isToday?' today':''}${isOtherM?' other-month':''}${isSel?' selected':''}${dayEntries.length?' has-entries':''}`}
                    onClick={() => setSelected(isSel?null:day)} whileHover={{ scale:1.06 }} whileTap={{ scale:0.94 }}>
                    <span className="day-num">{format(day,'d')}</span>
                    <div className="day-markers">
                      {dayEntries.slice(0,3).map((e: ExamEntry) => <div key={e.id} className="day-marker" style={{ background:getColor(e.subject) }} />)}
                      {dayEntries.length > 3 && <span className="more-marker">+{dayEntries.length-3}</span>}
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="cal-side">
          <AnimatePresence mode="wait">
            {selected && (
              <motion.div key={selected.toISOString()} className="card cal-detail"
                initial={{ opacity:0, x:14, scale:0.97 }} animate={{ opacity:1, x:0, scale:1 }} exit={{ opacity:0, x:14 }} transition={{ duration:0.22 }}>
                <div className="detail-date">{format(selected,'EEEE, dd. MMMM', { locale:de })}</div>
                {selectedEntries.length===0 ? <div className="detail-empty">Keine Einträge.</div> : (
                  <div className="detail-entries">
                    {selectedEntries.map((e: ExamEntry, i: number) => (
                      <motion.div key={e.id} className="detail-entry" initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.05 }}>
                        <div className="detail-left">
                          <div className="detail-dot" style={{ background:getColor(e.subject) }} />
                          <div><div className="detail-subj">{e.subject}</div><div className="detail-meta">{e.type==='pruefung'?'Prüfung':'Projekt'} · {e.studyHours}h · {e.weight}%</div></div>
                        </div>
                        <div className="detail-note" style={{ color:gradeColor(e.note) }}>{e.note.toFixed(1)}</div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          <div className="card cal-legend">
            <div className="legend-title">Fächer</div>
            {subjects.map((s: any) => (
              <div key={s.id} className="legend-row">
                <div className="legend-dot" style={{ background:s.color }} />
                <span className="legend-name">{s.name}</span>
                <span className="legend-cnt">{entries.filter((e: ExamEntry) => e.subject===s.name).length}</span>
              </div>
            ))}
            <div className="cal-hint"><span className="x-mark">✕</span> = Prüfungen & Projekte</div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
