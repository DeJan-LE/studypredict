import { useState, useEffect, useCallback } from 'react'
import { AppStore, ExamEntry, Subject, AppSettings, DEFAULT_SUBJECTS } from '../types'

const DEFAULT_STORE: AppStore = {
  entries: [], subjects: DEFAULT_SUBJECTS,
  settings: { apiKey:'', defaultTargetNote:5.0, userName:'', microsoftConnected:false },
}

const isFlask = typeof window !== 'undefined' && !window.electron &&
  (window.location.port === '5000' || window.location.port === '')

async function loadStore(): Promise<AppStore> {
  if (isFlask) {
    try { const r = await fetch('/api/data'); if (r.ok) return merge(await r.json()) } catch {}
  }
  const raw = localStorage.getItem('studypredict')
  return raw ? merge(JSON.parse(raw)) : { ...DEFAULT_STORE }
}

async function saveStore(store: AppStore) {
  if (isFlask) {
    try { await fetch('/api/data', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(store) }); return } catch {}
  }
  localStorage.setItem('studypredict', JSON.stringify(store))
}

function merge(data: any): AppStore {
  return { ...DEFAULT_STORE, ...data, settings:{ ...DEFAULT_STORE.settings, ...(data?.settings||{}) }, entries:data?.entries||[], subjects:data?.subjects?.length?data.subjects:DEFAULT_SUBJECTS }
}

export function useStore() {
  const [store, setStore] = useState<AppStore>(DEFAULT_STORE)
  const [loading, setLoading] = useState(true)
  useEffect(() => { loadStore().then(s => { setStore(s); setLoading(false) }) }, [])
  const updateStore = useCallback((updater: (prev: AppStore) => AppStore) => {
    setStore(prev => { const next = updater(prev); saveStore(next); return next })
  }, [])
  const addEntry = useCallback((entry: Omit<ExamEntry,'id'|'createdAt'>) => {
    const e: ExamEntry = { ...entry, id:`e-${Date.now()}-${Math.random().toString(36).slice(2)}`, createdAt:new Date().toISOString() }
    updateStore(prev => ({ ...prev, entries:[e,...prev.entries] })); return e
  }, [updateStore])
  const deleteEntry    = useCallback((id: string)              => updateStore(prev => ({ ...prev, entries:prev.entries.filter(e=>e.id!==id) })), [updateStore])
  const updateSettings = useCallback((s: Partial<AppSettings>) => updateStore(prev => ({ ...prev, settings:{...prev.settings,...s} })), [updateStore])
  const addSubject     = useCallback((s: Omit<Subject,'id'>)   => updateStore(prev => ({ ...prev, subjects:[...prev.subjects,{...s,id:`subj-${Date.now()}`}] })), [updateStore])
  const deleteSubject  = useCallback((id: string)              => updateStore(prev => ({ ...prev, subjects:prev.subjects.filter(s=>s.id!==id) })), [updateStore])
  return { store, loading, addEntry, deleteEntry, updateSettings, addSubject, deleteSubject }
}
