import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Key, User, Palette, Trash2, Plus, Eye, EyeOff, CheckCircle, Save, ExternalLink, Sparkles } from 'lucide-react'
import { SUBJECT_COLORS } from '../types'
import './Settings.css'

function detectProvider(key) {
  const k = key.trim()
  if (k.startsWith('sk-ant-')) return { name: 'Anthropic Claude', color: '#7c6cf8', url: 'console.anthropic.com', link: 'https://console.anthropic.com' }
  if (k.startsWith('sk-'))     return { name: 'OpenAI GPT', color: '#10a37f', url: 'platform.openai.com', link: 'https://platform.openai.com/api-keys' }
  return null
}

export function Settings({ store }) {
  const { settings, subjects } = store.store
  const [apiKey, setApiKey]         = useState(settings.apiKey || '')
  const [userName, setUserName]     = useState(settings.userName || '')
  const [targetNote, setTargetNote] = useState(settings.defaultTargetNote?.toString() || '5.0')
  const [showKey, setShowKey]       = useState(false)
  const [saved, setSaved]           = useState(false)
  const [newName, setNewName]       = useState('')
  const [newColor, setNewColor]     = useState(SUBJECT_COLORS[0])

  const provider = apiKey.trim() ? detectProvider(apiKey) : null

  function handleSave() {
    store.updateSettings({ apiKey:apiKey.trim(), userName:userName.trim(), defaultTargetNote:parseFloat(targetNote)||5.0 })
    setSaved(true); setTimeout(() => setSaved(false), 2500)
  }
  function handleAdd() {
    if (!newName.trim()) return
    store.addSubject({ name:newName.trim(), color:newColor, targetNote:5.0 }); setNewName('')
  }

  return (
    <div className="page settings-page">
      <motion.div className="page-header" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}>
        <h1 className="page-title">Einstellungen</h1>
        <p className="page-subtitle">API-Schlüssel, Profil und Fächerverwaltung</p>
      </motion.div>

      <div className="settings-grid">
        <div className="settings-main">
          <motion.div className="card settings-section" initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ delay:0, duration:0.4, ease:[0.16,1,0.3,1] }}>
            <div className="sec-head">
              <div className="sec-icon" style={{ background:'rgba(124,108,248,0.15)', color:'var(--accent-bright)' }}><Key size={15} /></div>
              <div><div className="sec-title">API-Schlüssel</div><div className="sec-desc">OpenAI oder Anthropic – wird automatisch erkannt.</div></div>
            </div>
            <div style={{ position:'relative' }}>
              <input type={showKey?'text':'password'} className="form-input" placeholder="sk-... oder sk-ant-..." value={apiKey} onChange={e => setApiKey(e.target.value)} style={{ paddingRight:44 }} />
              <button className="btn btn-ghost" style={{ position:'absolute', right:4, top:'50%', transform:'translateY(-50%)', padding:6 }} onClick={() => setShowKey(v => !v)}>
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            <AnimatePresence mode="wait">
              {apiKey.trim() && provider && (
                <motion.div key={provider.name} className="provider-badge"
                  initial={{ opacity:0, y:-6, scale:0.96 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, scale:0.96 }}
                  style={{ borderColor:provider.color }}>
                  <Sparkles size={13} style={{ color:provider.color }} />
                  <span>Erkannt: <strong style={{ color:provider.color }}>{provider.name}</strong></span>
                  <CheckCircle size={13} style={{ color:'var(--green)', marginLeft:'auto' }} />
                </motion.div>
              )}
              {apiKey.trim() && !provider && (
                <motion.div key="unknown" className="provider-badge unknown"
                  initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
                  <span>Unbekanntes Key-Format. Erwartet: sk-ant-... oder sk-...</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="api-hint">
              <ExternalLink size={11} />
              <span>
                Schlüssel: <a href={provider?.link || 'https://console.anthropic.com'} target="_blank" rel="noreferrer" className="link-a">{provider?.url || 'console.anthropic.com'}</a>
                {!provider && <> oder <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="link-a">platform.openai.com</a></>}
              </span>
            </div>
          </motion.div>

          <motion.div className="card settings-section" initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.08, duration:0.4, ease:[0.16,1,0.3,1] }}>
            <div className="sec-head">
              <div className="sec-icon" style={{ background:'rgba(20,184,166,0.15)', color:'#14b8a6' }}><User size={15} /></div>
              <div><div className="sec-title">Profil</div><div className="sec-desc">Name und Zielnote</div></div>
            </div>
            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Dein Name</label>
                <input type="text" className="form-input" placeholder="z.B. Matteo" value={userName} onChange={e => setUserName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Zielnote</label>
                <input type="number" className="form-input" placeholder="5.0" min="1" max="6" step="0.5" value={targetNote} onChange={e => setTargetNote(e.target.value)} />
              </div>
            </div>
          </motion.div>

          <div style={{ display:'flex', justifyContent:'flex-end', gap:10, alignItems:'center' }}>
            <AnimatePresence>
              {saved && <motion.span style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--green)' }} initial={{ opacity:0, x:8 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0 }}><CheckCircle size={13} /> Gespeichert!</motion.span>}
            </AnimatePresence>
            <motion.button className="btn btn-primary" onClick={handleSave} whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}><Save size={13} /> Speichern</motion.button>
          </div>
        </div>

        <motion.div className="settings-side" initial={{ opacity:0, x:14 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.12, duration:0.4, ease:[0.16,1,0.3,1] }}>
          <div className="card settings-section">
            <div className="sec-head">
              <div className="sec-icon" style={{ background:'rgba(234,179,8,0.15)', color:'var(--yellow)' }}><Palette size={15} /></div>
              <div><div className="sec-title">Fächer</div><div className="sec-desc">Deine Schulfächer</div></div>
            </div>
            <div className="subj-list">
              {subjects.map((s, i) => (
                <motion.div key={s.id} className="subj-row" initial={{ opacity:0, x:8 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.04 }}>
                  <div className="subj-dot" style={{ background:s.color }} />
                  <span className="subj-name">{s.name}</span>
                  <motion.button className="btn btn-ghost btn-xs" onClick={() => store.deleteSubject(s.id)} whileHover={{ scale:1.15 }} whileTap={{ scale:0.9 }}><Trash2 size={12} /></motion.button>
                </motion.div>
              ))}
            </div>
            <div className="add-subj-box">
              <input className="form-input" placeholder="Neues Fach…" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key==='Enter'&&handleAdd()} />
              <div className="color-row">{SUBJECT_COLORS.map(c => <motion.button key={c} className={`color-dot ${newColor===c?'sel':''}`} style={{ background:c }} onClick={() => setNewColor(c)} whileHover={{ scale:1.25 }} whileTap={{ scale:0.9 }} />)}</div>
              <motion.button className="btn btn-secondary" style={{ width:'100%' }} onClick={handleAdd} disabled={!newName.trim()} whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}><Plus size={13} /> Hinzufügen</motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
