import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, PlusCircle, Target, CalendarDays, Settings, Zap, Moon, Sun } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'
import './Layout.css'

const NAV = [
  { to:'/',         icon:LayoutDashboard, label:'Übersicht'      },
  { to:'/new',      icon:PlusCircle,      label:'Eintragen'      },
  { to:'/planner',  icon:Target,          label:'Lernplan'       },
  { to:'/calendar', icon:CalendarDays,    label:'Kalender'       },
  { to:'/settings', icon:Settings,        label:'Einstellungen'  },
]

const pageV = {
  initial: { opacity:0, y:16, filter:'blur(4px)' },
  animate: { opacity:1, y:0,  filter:'blur(0px)', transition:{ duration:0.4, ease:[0.16,1,0.3,1] } },
  exit:    { opacity:0, y:-10, filter:'blur(4px)', transition:{ duration:0.22, ease:[0.4,0,1,1] } },
}

export function Layout({ store, children }) {
  const location = useLocation()
  const { theme, toggle } = useTheme()
  const userName = store.store.settings.userName

  return (
    <div className="layout">
      <div className="bg-glow" />

      <motion.header className="titlebar"
        initial={{ y:-44, opacity:0 }} animate={{ y:0, opacity:1 }}
        transition={{ duration:0.5, ease:[0.16,1,0.3,1] }}>
        <div className="titlebar-logo">
          <motion.div className="logo-icon"
            whileHover={{ scale:1.1, rotate:8 }}
            transition={{ type:'spring', stiffness:400, damping:12 }}>
            <Zap size={13} strokeWidth={2.5} />
          </motion.div>
          <span className="logo-text">StudyPredict</span>
        </div>
        <motion.button className="theme-toggle" onClick={toggle}
          title={theme==='dark'?'Hellmodus':'Dunkelmodus'} whileTap={{ scale:0.9 }}>
          <div className="theme-toggle-knob">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={theme}
                initial={{ opacity:0, rotate:-45, scale:0.5 }} animate={{ opacity:1, rotate:0, scale:1 }}
                exit={{ opacity:0, rotate:45, scale:0.5 }} transition={{ duration:0.25 }}
                style={{ display:'flex', alignItems:'center' }}>
                {theme==='dark' ? <Moon size={11} strokeWidth={2.2} /> : <Sun size={11} strokeWidth={2.2} />}
              </motion.span>
            </AnimatePresence>
          </div>
        </motion.button>
      </motion.header>

      <div className="app-body">
        <motion.nav className="sidebar"
          initial={{ x:-200, opacity:0 }} animate={{ x:0, opacity:1 }}
          transition={{ duration:0.45, ease:[0.16,1,0.3,1], delay:0.05 }}>
          <div className="nav-avatar">
            <motion.div className="avatar-circle"
              whileHover={{ scale:1.08 }}
              transition={{ type:'spring', stiffness:400, damping:12 }}>
              {userName ? userName.charAt(0).toUpperCase() : 'S'}
            </motion.div>
            {userName && <span className="avatar-name">{userName}</span>}
          </div>
          <ul className="nav-list">
            {NAV.map(({ to, icon:Icon, label }, i) => (
              <motion.li key={to}
                initial={{ x:-24, opacity:0 }} animate={{ x:0, opacity:1 }}
                transition={{ delay:0.1+i*0.06, duration:0.35, ease:[0.16,1,0.3,1] }}>
                <NavLink to={to} end={to==='/'} className={({ isActive }) => `nav-item${isActive?' active':''}`}>
                  {({ isActive }) => (
                    <>
                      <span className="nav-icon"><Icon size={17} strokeWidth={1.9} /></span>
                      <span className="nav-label">{label}</span>
                      {isActive && (
                        <motion.span className="nav-pill" layoutId="nav-pill"
                          transition={{ type:'spring', stiffness:400, damping:30 }} />
                      )}
                    </>
                  )}
                </NavLink>
              </motion.li>
            ))}
          </ul>
          <div className="nav-footer">
            <motion.div className="entry-count" key={store.store.entries.length}
              initial={{ scale:0.85, opacity:0.5 }} animate={{ scale:1, opacity:1 }}
              transition={{ type:'spring', stiffness:300, damping:18 }}>
              <span className="count-num">{store.store.entries.length}</span>
              <span className="count-lbl">Einträge</span>
            </motion.div>
          </div>
        </motion.nav>

        <main className="main-content">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={location.pathname} variants={pageV} initial="initial" animate="animate" exit="exit" style={{ height:'100%' }}>
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
