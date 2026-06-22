import { ExamEntry, StudyPlan } from '../types'
import { addDays, differenceInCalendarDays, format } from 'date-fns'
import { de } from 'date-fns/locale'

const DECAY = 0.65

export interface LocalPrediction {
  subject: string
  recommendedHours: number
  hoursPerDay: number
  confidence: number
  reasoning: string
  trend: 'up' | 'down' | 'stable'
  lastNote: number | null
  avgNote: number | null
  daysUntilExam: number
}

export function predict(
  subjectName: string,
  entries: ExamEntry[],
  targetNote: number = 5.0,
  examDate?: string
): LocalPrediction {
  const subjectEntries = entries
    .filter(e => e.subject === subjectName)
    .sort((a, b) => new Date(b.examDate).getTime() - new Date(a.examDate).getTime())

  const daysUntilExam = examDate
    ? Math.max(1, differenceInCalendarDays(new Date(examDate), new Date()))
    : 7

  if (subjectEntries.length === 0) {
    return {
      subject: subjectName, recommendedHours: 2.5,
      hoursPerDay: parseFloat((2.5 / daysUntilExam).toFixed(1)),
      confidence: 10,
      reasoning: 'Keine Daten vorhanden. Standardempfehlung: 2.5h',
      trend: 'stable', lastNote: null, avgNote: null, daysUntilExam,
    }
  }

  let totalWeight = 0, weightedHours = 0, weightedNote = 0
  subjectEntries.forEach((entry, i) => {
    const w = Math.pow(DECAY, i)
    totalWeight += w
    weightedHours += entry.studyHours * w
    weightedNote  += entry.note * w
  })

  const avgHours = weightedHours / totalWeight
  const avgNote  = weightedNote  / totalWeight
  const lastNote = subjectEntries[0].note
  const noteGap  = targetNote - avgNote
  const factor   = noteGap > 0 ? 1 + noteGap * 0.30 : 1 + noteGap * 0.15
  let recommended = Math.round(Math.max(0.5, Math.min(12, avgHours * factor)) * 2) / 2

  let trend: 'up' | 'down' | 'stable' = 'stable'
  if (subjectEntries.length >= 2) {
    const diff = subjectEntries[0].note - subjectEntries[1].note
    if (diff > 0.2) trend = 'up'
    else if (diff < -0.2) trend = 'down'
  }

  const confidence = Math.min(95, 30 + subjectEntries.length * 13)
  const noteGapStr = Math.abs(noteGap) > 0.1
    ? `Ziel ${targetNote.toFixed(1)}: ${noteGap > 0 ? 'mehr' : 'weniger'} Zeit empfohlen.`
    : 'Note auf Ziel – Zeit beibehalten.'
  const reasoning = `Ø ${avgNote.toFixed(1)} Note, Ø ${avgHours.toFixed(1)}h. ${noteGapStr}`

  return {
    subject: subjectName, recommendedHours: recommended,
    hoursPerDay: parseFloat((recommended / daysUntilExam).toFixed(1)),
    confidence, reasoning, trend, lastNote,
    avgNote: parseFloat(avgNote.toFixed(2)), daysUntilExam,
  }
}

export function buildStudyPlan(
  subjectName: string,
  entries: ExamEntry[],
  targetNote: number,
  examDate: string,
  overrideHours?: number
): StudyPlan {
  const pred  = predict(subjectName, entries, targetNote, examDate)
  const today = new Date()
  const days  = Math.max(1, differenceInCalendarDays(new Date(examDate), today))
  const totalHours = overrideHours ?? pred.recommendedHours

  const dailyPlan = distributeStudyTime(totalHours, days, today)
  const activeDays = dailyPlan.filter(d => d.hours > 0).length
  const hoursPerDay = activeDays > 0 ? parseFloat((totalHours / activeDays).toFixed(1)) : 0

  return { subject: subjectName, examDate, targetNote, totalHours, hoursPerDay, daysUntilExam: days, dailyPlan }
}

/**
 * Verteilt die Gesamt-Lernzeit sinnvoll:
 * - Lernblöcke von mindestens 1h (kürzeres Lernen ist ineffizient)
 * - Konzentration auf die Tage VOR der Prüfung statt gleichmässig über Wochen
 * - Mehr Intensität je näher die Prüfung rückt
 * - Pausentage wenn genug Zeit vorhanden ist
 */
function distributeStudyTime(totalHours: number, days: number, startDate: Date) {
  const MIN_BLOCK = 1.0          // Minimum sinnvolle Lerneinheit (Stunden)
  const MAX_PER_DAY = 4.0        // Maximum pro Tag (mehr ist nicht effektiv)

  // Ziel: substanzielle Lernblöcke (~1.5h Schnitt) statt vieler Mini-Einheiten
  const idealStudyDays = Math.max(1, Math.round(totalHours / 1.5))
  // Cap auf maximal 10 Lerntage, nie mehr als verfügbare Tage
  const studyDays = Math.min(idealStudyDays, 10, days)

  // Lerntage liegen am ENDE (kurz vor der Prüfung)
  const firstStudyDayIndex = Math.max(0, days - studyDays)

  // Gewichtung: deutlich mehr Zeit je näher die Prüfung rückt (0.7 → 1.4)
  const weights: number[] = []
  for (let i = 0; i < studyDays; i++) {
    weights.push(0.7 + (i / Math.max(1, studyDays - 1)) * 0.7)
  }
  const weightSum = weights.reduce((a, b) => a + b, 0)

  // Stunden pro Lerntag, gerundet auf 0.5h, begrenzt
  const raw = weights.map(w => (totalHours * w) / weightSum)
  const rounded = raw.map(h =>
    Math.max(MIN_BLOCK, Math.min(MAX_PER_DAY, Math.round(h * 2) / 2))
  )

  // Plan über alle Tage aufbauen (0 = Pausentag)
  const plan = Array.from({ length: days }, (_, i) => {
    const date  = addDays(startDate, i)
    const label = format(date, 'EEE dd.MM', { locale: de })
    let hours = 0
    if (i >= firstStudyDayIndex) {
      hours = rounded[i - firstStudyDayIndex] || 0
    }
    return { date: format(date, 'yyyy-MM-dd'), hours, label }
  })

  return plan
}

export function calcSubjectAvg(subjectName: string, entries: ExamEntry[]): number | null {
  const e = entries.filter(x => x.subject === subjectName)
  if (!e.length) return null
  const total  = e.reduce((s, x) => s + x.note * (x.weight / 100), 0)
  const totalW = e.reduce((s, x) => s + x.weight / 100, 0)
  return totalW > 0 ? parseFloat((total / totalW).toFixed(2)) : null
}

export function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)} Min.`
  const whole = Math.floor(h)
  const mins  = Math.round((h - whole) * 60)
  return mins === 0 ? `${whole}h` : `${whole}h ${mins}min`
}

export function gradeColor(note: number): string {
  if (note >= 5.5) return '#22c55e'
  if (note >= 5.0) return '#84cc16'
  if (note >= 4.5) return '#eab308'
  if (note >= 4.0) return '#f97316'
  return '#ef4444'
}

export function gradeLabel(note: number): string {
  if (note >= 5.5) return 'Sehr gut'
  if (note >= 5.0) return 'Gut'
  if (note >= 4.5) return 'Befriedigend'
  if (note >= 4.0) return 'Ausreichend'
  return 'Ungenügend'
}

export function downloadIcs({ subject, examDate, studyHours, note, dailyPlan }: {
  subject: string; examDate: string; studyHours: number; note?: number
  dailyPlan?: { date: string; hours: number; label: string }[]
}) {
  const examDt = new Date(examDate)
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

  const events: string[] = []

  if (dailyPlan && dailyPlan.length) {
    // Ein Lernblock-Event pro Lerntag (nur Tage mit Stunden > 0)
    dailyPlan.filter(d => d.hours > 0).forEach((day, i) => {
      const start = new Date(day.date)
      start.setHours(18, 0, 0, 0)   // Lernblöcke standardmässig ab 18 Uhr
      const end = new Date(start)
      end.setMinutes(end.getMinutes() + Math.round(day.hours * 60))
      events.push(
        'BEGIN:VEVENT',
        `UID:sp-study-${Date.now()}-${i}@app`,
        `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
        `SUMMARY:📚 Lernen – ${subject} (${day.hours}h)`,
        `DESCRIPTION:StudyPredict Lernplan für ${subject}.`,
        'BEGIN:VALARM','ACTION:DISPLAY','TRIGGER:-PT30M','DESCRIPTION:Lernzeit in 30 Min!','END:VALARM',
        'END:VEVENT',
      )
    })
  } else {
    // Fallback: ein einzelner Lernblock am Vortag
    const studyStart = new Date(examDt)
    studyStart.setDate(studyStart.getDate() - 1)
    studyStart.setHours(18, 0, 0, 0)
    const studyEnd = new Date(studyStart)
    studyEnd.setHours(studyStart.getHours() + Math.ceil(studyHours))
    events.push(
      'BEGIN:VEVENT', `UID:sp-study-${Date.now()}@app`,
      `DTSTART:${fmt(studyStart)}`, `DTEND:${fmt(studyEnd)}`,
      `SUMMARY:📚 Lernen – ${subject}`,
      `DESCRIPTION:StudyPredict: ${studyHours}h für ${subject}.${note ? ' Letzte Note: '+note : ''}`,
      'BEGIN:VALARM','ACTION:DISPLAY','TRIGGER:-PT30M','DESCRIPTION:Lernzeit in 30 Min!','END:VALARM',
      'END:VEVENT',
    )
  }

  // Prüfungs-Event
  events.push(
    'BEGIN:VEVENT', `UID:sp-exam-${Date.now()}@app`,
    `DTSTART:${fmt(examDt)}`, `DTEND:${fmt(new Date(examDt.getTime()+90*60000))}`,
    `SUMMARY:🎯 Prüfung – ${subject}`,
    'BEGIN:VALARM','ACTION:DISPLAY','TRIGGER:-PT60M','DESCRIPTION:Prüfung in 1 Stunde!','END:VALARM',
    'END:VEVENT',
  )

  const ics = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//StudyPredict//DE','CALSCALE:GREGORIAN', ...events, 'END:VCALENDAR'].join('\r\n')
  const blob = new Blob([ics], { type: 'text/calendar' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `StudyPredict_${subject}_${examDate}.ics`
  a.click()
  URL.revokeObjectURL(url)
}
