export interface ExamEntry {
  id: string
  subject: string
  type: 'pruefung' | 'projekt'
  note: number
  studyHours: number
  examDate: string
  weight: number
  createdAt: string
}
export interface Subject {
  id: string; name: string; color: string; targetNote: number
}
export interface AppSettings {
  apiKey: string; defaultTargetNote: number; userName: string; microsoftConnected: boolean
}
export interface AppStore {
  entries: ExamEntry[]; subjects: Subject[]; settings: AppSettings
}
export interface StudyPlan {
  subject: string; examDate: string; targetNote: number
  totalHours: number; hoursPerDay: number; daysUntilExam: number
  dailyPlan: { date: string; hours: number; label: string }[]
}
declare global {
  interface Window { electron?: any }
}
export const SUBJECT_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#f97316','#14b8a6','#22c55e','#eab308','#3b82f6','#ef4444','#a855f7'
]
export const DEFAULT_SUBJECTS: Subject[] = [
  { id:'1', name:'Ma',   color:'#6366f1', targetNote:5.0 },
  { id:'2', name:'En',   color:'#14b8a6', targetNote:5.0 },
  { id:'3', name:'IT',   color:'#22c55e', targetNote:5.0 },
  { id:'4', name:'ABU',  color:'#f97316', targetNote:5.0 },
  { id:'5', name:'M158', color:'#8b5cf6', targetNote:5.0 },
]
