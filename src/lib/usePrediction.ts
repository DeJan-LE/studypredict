import { useState, useCallback } from 'react'
import { ExamEntry } from '../types'
import { predict as localPredict } from './algorithm'

export interface AIPrediction {
  hours: number
  confidence: number
  reasoning: string
  tips: string[]
  source: 'claude' | 'openai' | 'local'
}

export function usePrediction() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const getPrediction = useCallback(async (
    subject: string,
    entries: ExamEntry[],
    targetNote: number,
    examDate: string,
    apiKey: string,
  ): Promise<AIPrediction> => {

    const subjectEntries = entries.filter(e => e.subject === subject)
    const daysLeft = Math.max(1, Math.round((new Date(examDate).getTime() - Date.now()) / 86400000))

    if (!apiKey.trim()) {
      const local = localPredict(subject, entries, targetNote, examDate)
      return { hours: local.recommendedHours, confidence: local.confidence, reasoning: local.reasoning, tips: [], source: 'local' }
    }

    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject, targetNote, examDate, daysLeft,
          entries: subjectEntries.map(e => ({ note:e.note, studyHours:e.studyHours, weight:e.weight, type:e.type, examDate:e.examDate })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'no_api_key' || data.error === 'invalid_api_key')
          setError('API Key ungültig – lokale Berechnung wird verwendet.')
        else
          setError('KI nicht erreichbar – lokale Berechnung wird verwendet.')
        throw new Error(data.error)
      }
      return {
        hours: data.hours,
        confidence: data.confidence,
        reasoning: data.reasoning,
        tips: data.tips || [],
        source: data.provider === 'openai' ? 'openai' : 'claude',
      }
    } catch {
      const local = localPredict(subject, entries, targetNote, examDate)
      return { hours: local.recommendedHours, confidence: local.confidence, reasoning: local.reasoning, tips: [], source: 'local' }
    } finally {
      setLoading(false)
    }
  }, [])

  return { getPrediction, loading, error }
}
