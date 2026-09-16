import { useEffect, useMemo, useState } from 'react'
import './App.css'

type Change = {
  id: string
  title: string
  environment: string
  risk: 'High' | 'Medium' | 'Low'
  status: 'Approved' | 'In Review' | 'Blocked'
  time: string
}

const changes: Change[] = [
  { id: '#1052', title: 'Update payment service', environment: 'Production', risk: 'Low', status: 'Approved', time: 'Sep 14, 10:12' },
  { id: '#1051', title: 'Deploy v1.3.0 (web app)', environment: 'Staging', risk: 'Medium', status: 'In Review', time: 'Sep 14, 09:45' },
  { id: '#1050', title: 'Modify security group', environment: 'Production', risk: 'High', status: 'Blocked', time: 'Sep 14, 08:30' },
  { id: '#1049', title: 'Update nginx config', environment: 'Development', risk: 'Low', status: 'Approved', time: 'Sep 13, 18:20' },
  { id: '#1048', title: 'Database schema change', environment: 'Staging', risk: 'Medium', status: 'In Review', time: 'Sep 13, 14:05' },
]

const awsServices = ['EC2', 'S3', 'EKS', 'RDS', 'Lambda', 'IAM', 'VPC', 'CloudWatch', 'Route 53', 'CloudFormation', 'ECR', 'ECS', 'Systems Manager']
const navItems = [['▣', 'Dashboard'], ['↗', 'Change Requests'], ['✦', 'AI Analysis'], ['◇', 'CI/CD Pipeline'], ['aws', 'AWS Resources'], ['▸', 'Deployments'], ['⌁', 'Monitoring'], ['⌂', 'Infrastructure'], ['▤', 'Logs'], ['▧', 'Reports'], ['♧', 'Team']]
const apiBase = import.meta.env.VITE_API_BASE_URL || ''

function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [changeItems, setChangeItems] = useState(changes)
  const [activeFilter] = useState('All')
  const [selectedChange, setSelectedChange] = useState<Change | null>(null)
  const [search, setSearch] = useState('')
  const [activeNav, setActiveNav] = useState('Dashboard')
  const [activeTab, setActiveTab] = useState('Summary')
  const [selectedService, setSelectedService] = useState('')
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [pipelineStage, setPipelineStage] = useState(5)
  const [notice, setNotice] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('changeguard_theme') as 'dark' | 'light') || 'dark')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [profileName, setProfileName] = useState('Mugesh Kumar')

  useEffect(() => {
    const refreshTimer = window.setInterval(() => setLastUpdated(new Date()), 10000)
    return () => window.clearInterval(refreshTimer)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('changeguard_token')
    if (!apiBase || !token) return
    fetch(`${apiBase}/changes`, { headers: { authorization: `Bearer ${token}` } }).then((response) => response.ok ? response.json() : null).then((data) => { if (Array.isArray(data) && data.length) setChangeItems(data) }).catch(() => undefined)
  }, [authenticated])

  const showNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2600)
  }

  const visibleChanges = useMemo(() => (activeFilter === 'All'
    ? changeItems
    : changeItems.filter((change) => change.risk === activeFilter)).filter((change) => change.title.toLowerCase().includes(search.toLowerCase())), [activeFilter, changeItems, search])

  if (!authenticated) {
    return <LoginScreen onSignIn={() => setAuthenticated(true)} />
  }

  return (
    <div className={`app-shell ${theme === 'light' ? 'light-theme' : ''}`}>
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">✓</span><span>ChangeGuard<small>AI-Powered DevOps</small></span><button className="menu-button">☰</button></div>
        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map(([icon, label]) => <button key={label} className={`nav-item ${activeNav === label ? 'active' : ''}`} onClick={() => { setActiveNav(label); showNotice(`${label} selected`) }}><span>{icon}</span>{label}</button>)}
        </nav>
        <div className="service-nav"><p>AWS SERVICES</p>{awsServices.slice(0, 8).map((service, index) => <button key={service} onClick={() => { setSearch(service); showNotice(`${service} resources filtered`) }}><span className={`service-icon service-${index}`}>{service.slice(0, 1)}</span>{service}</button>)}</div>
        <div className="sidebar-footer"><div className="built"><span>☁</span><small>Built by</small><strong>Mugesh Kumar</strong><em>Automating a Better Tomorrow</em></div></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><div className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search changes, deployments, AWS resources..." /></div><div className="top-actions"><button className="icon-button" onClick={() => showNotice('3 new notifications')}>♧<i>3</i></button><button className="icon-button" aria-label="Toggle theme" onClick={() => { const nextTheme = theme === 'dark' ? 'light' : 'dark'; setTheme(nextTheme); localStorage.setItem('changeguard_theme', nextTheme); showNotice(`${nextTheme} theme enabled`) }}>{theme === 'dark' ? '☼' : '☾'}</button><div className="profile-wrap"><button className="profile" onClick={() => setProfileOpen(!profileOpen)}><span>MK</span><strong>{profileName}<small>DevOps Engineer</small></strong>⌄</button>{profileOpen && <div className="profile-menu"><button onClick={() => { setSettingsOpen(true); setProfileOpen(false) }}>Profile settings</button><button onClick={() => { setTheme('light'); localStorage.setItem('changeguard_theme', 'light'); setProfileOpen(false); showNotice('Workspace preferences opened') }}>Preferences</button><button className="signout-button" onClick={() => { localStorage.removeItem('changeguard_token'); setProfileOpen(false); setAuthenticated(false) }}>Sign out</button></div>}</div></div></header>
        <section className="page-heading"><div><h1>Welcome back, Mugesh Kumar! <span>👋</span></h1><p className="subtitle">Use AI to analyze changes, prevent risks and deploy applications safely on AWS.</p></div><div className="heading-actions"><div className="system-status"><i /> All Systems Operational <small>Live · {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</small></div><button className="primary-button" onClick={() => setSelectedChange(changes[0])}>＋ New Change Request <span>⌄</span></button></div></section>

        <section className="metric-grid" aria-label="Dashboard metrics"><Metric icon="▤" tone="blue" label="Total Changes" value="48" detail="↑ 32%" note="vs last month" /><Metric icon="✓" tone="green" label="Successful Deployments" value="41" detail="85% success rate" /><Metric icon="◷" tone="orange" label="Pending Review" value="5" detail="AI analysis in progress" /><Metric icon="!" tone="red" label="Failed / Blocked" value="2" detail="4% failure rate" /></section>

        <section className="services-panel panel"><div className="section-heading"><h2>Connected AWS Services</h2><span className="connection"><i /> Connected to AWS account: 1234-5678-9012 <button onClick={() => showNotice('AWS account connection settings opened')}>Manage AWS</button></span></div><div className="service-strip">{awsServices.map((service, index) => <button className={selectedService === service ? 'selected' : ''} key={service} onClick={() => { setSelectedService(service); setSearch(service); showNotice(`${service} resources filtered`) }}><span className={`service-icon service-${index % 8}`}>{service.slice(0, 1)}</span>{service}</button>)}</div></section>
        {activeNav === 'AI Analysis' && <AiWorkbench onNotice={showNotice} />}
        {activeNav !== 'Dashboard' && activeNav !== 'AI Analysis' && <WorkspaceModule name={activeNav} onNotice={showNotice} />}

        <section className="dashboard-grid"><div className="changes-panel panel"><div className="panel-header"><h2>Recent Change Requests</h2><button className="text-button" onClick={() => { setSearch(''); setSelectedService(''); showNotice('Showing all change requests') }}>View All</button></div><div className="table-head"><span>ID</span><span>Title</span><span>Environment</span><span>AI Risk</span><span>Status</span><span>Created At</span><span>Actions</span></div><div className="change-list">{visibleChanges.map((change) => <button key={change.id} className={`change-row ${selectedChange?.id === change.id ? 'selected' : ''}`} onClick={() => setSelectedChange(change)}><span>{change.id}</span><strong>{change.title}</strong><span>{change.environment}</span><span className={`risk-pill ${change.risk.toLowerCase()}`}>{change.risk}</span><span className={`status-pill ${change.status.toLowerCase().replace(' ', '-')}`}>{change.status}</span><span>{change.time}</span><span className="row-action">•••</span></button>)}</div></div><aside className="analysis-panel panel"><div className="panel-header"><h2>AI Change Risk Analysis</h2><span className="ai-tag">✦ AI</span></div><div className="analysis-id">#1050 - Modify security group rules <span className="risk-pill high">High Risk</span></div><div className="tabs">{['Summary', 'AI Recommendation', 'Impacted Resources', 'Rollback Plan'].map((tab) => <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => { setActiveTab(tab); showNotice(`${tab} opened`) }}>{tab}</button>)}</div><p>{activeTab === 'Summary' ? 'This change modifies security group rules in production. It may expose services to unintended access.' : `${activeTab} for change #1050 is ready for review.`}</p><ul className="signals"><li>Potential security risk detected</li><li>Impacts 3 resources (EC2, RDS)</li><li>No rollback plan defined</li><li>Configuration follows best practices</li></ul><button className="blue-wide" onClick={() => setSelectedChange(changes[2])}>View Full Analysis</button><button className="outline-wide" onClick={() => showNotice('AI fix suggestion generated')}>✦ Suggest Fix with AI</button></aside></section>

        <section className="lower-grid"><div className="pipeline-panel panel"><div className="panel-header"><h2>CI/CD Pipeline <b>(Live)</b></h2><span className="branch">⌘ main → production</span><button className="text-button" onClick={() => { setPipelineStage((stage) => stage >= 6 ? 0 : stage + 1); showNotice('Pipeline status refreshed') }}>View Details</button></div><div className="pipeline">{['Code', 'Build', 'Test', 'Security Scan', 'Docker Build', 'Deploy to EKS', 'Verify'].map((step, index) => <div className={`pipeline-step ${index < pipelineStage ? 'done' : index === pipelineStage ? 'current' : ''}`} key={step}><i>{index < pipelineStage ? '✓' : index === pipelineStage ? '◉' : '○'}</i><span>{step}</span><small>{index < pipelineStage ? ['2m 12s', '1m 40s', '3m 05s', '1m 20s', '2m 16s', 'In Progress', ''][index] : index === pipelineStage ? 'In Progress' : 'Queued'}</small></div>)}</div></div><div className="infra-panel panel"><div className="panel-header"><h2>Infrastructure Overview (AWS)</h2><button className="text-button" onClick={() => setActiveNav('AWS Resources')}>View in AWS</button></div><div className="infra-flow"><span>♙<small>Users</small></span><b>→</b><span className="infra-node purple-node">◈<small>Route 53</small></span><b>→</b><span className="infra-node">◎<small>ALB</small></span><b>→</b><div><span className="infra-node orange-node">▣<small>EKS</small></span><span className="infra-node orange-node">▤<small>EC2</small></span></div><div><span className="infra-node green-node">▣<small>S3</small></span><span className="infra-node pink-node">◉<small>CloudWatch</small></span></div></div></div></section>
        <section className="monitoring-grid"><div className="monitor-panel panel"><div className="panel-header"><h2>System Monitoring <b>(CloudWatch)</b></h2><span>1H　6H　<strong>24H</strong>　7D</span></div><div className="monitor-stats">{[['CPU Usage', '23%', 'blue'], ['Memory Usage', '56%', 'purple'], ['Request Latency', '120 ms', 'green'], ['Error Rate', '0.8%', 'red']].map(([label, value, tone]) => <div key={label}><span>{label}</span><strong>{value}</strong><div className={`mini-chart ${tone}`} /></div>)}</div></div><div className="alerts-panel panel"><div className="panel-header"><h2>Recent Alerts</h2><button className="text-button" onClick={() => showNotice('All recent alerts loaded')}>View All</button></div>{['High CPU usage on web-server-1', 'Pod restart detected (auth-service)', 'New version deployed successfully', 'All checks passed for payment-service'].map((alert, index) => <p key={alert}><i className={`alert-dot alert-${index}`} />{alert}<small>{['5 minutes ago', '18 minutes ago', '1 hour ago', '2 hours ago'][index]}</small></p>)}</div><div className="quick-panel panel"><div className="panel-header"><h2>Quick Actions</h2></div>{['Create Change Request', 'Run Security Scan', 'Trigger Deployment', 'View Monitoring'].map((action, index) => <button key={action} onClick={() => index === 0 ? setSelectedChange(changes[0]) : showNotice(`${action} started`)}><i>{['＋', '▣', '▸', 'aws'][index]}</i>{action}<span>›</span></button>)}</div></section>
        <footer>© 2026 ChangeGuard. Built by Mugesh Kumar. All rights reserved. <span>Docs　 Support　 Feedback　 v1.0.0</span></footer>
      </main>

      {selectedChange && <div className="review-drawer"><button className="close-button" onClick={() => setSelectedChange(null)}>×</button><span className={`risk-pill ${selectedChange.risk.toLowerCase()}`}>{selectedChange.risk} Risk</span><h2>{selectedChange.title}</h2><p>{selectedChange.environment} · {selectedChange.status}</p><h3>AI Change Risk Analysis</h3><p>This change requires review before deployment. Inspect impacted resources and confirm the rollback plan.</p><button className="blue-wide" onClick={() => setSelectedChange(null)}>Close Analysis</button></div>}
      {notice && <div className="notice" role="status">{notice}</div>}
      {settingsOpen && <ProfileSettings name={profileName} onClose={() => setSettingsOpen(false)} onSave={(name) => { setProfileName(name); setSettingsOpen(false); showNotice('Profile settings saved') }} />}
    </div>
  )
}

function Metric({ icon, tone, label, value, detail, note }: { icon: string; tone: string; label: string; value: string; detail: string; note?: string }) {
  return <article className="metric-card"><div className={`metric-icon ${tone}`}>{icon}</div><div><span className="metric-label">{label}</span><strong>{value}</strong><small>{detail} {note && <em>{note}</em>}</small></div></article>
}

function WorkspaceModule({ name, onNotice }: { name: string; onNotice: (message: string) => void }) {
  const modules: Record<string, { subtitle: string; items: string[]; action: string }> = {
    'Change Requests': { subtitle: 'Review, approve, and track every production change.', items: ['5 changes waiting for review', '2 high-risk changes blocked', '41 approved changes this month'], action: 'Create Change Request' },
    'CI/CD Pipeline': { subtitle: 'Follow delivery health from commit to production.', items: ['Deploy to EKS is in progress', 'Security scan passed', 'Production pipeline healthy'], action: 'Run Pipeline' },
    'AWS Resources': { subtitle: 'Explore connected AWS resources and account health.', items: ['13 AWS services connected', '3 resources impacted by #1050', 'Account connection healthy'], action: 'Refresh Resources' },
    Deployments: { subtitle: 'Manage releases and deployment history across environments.', items: ['142 deployments in the last 24 hours', '98.6% deployment success rate', '1 deployment currently running'], action: 'Trigger Deployment' },
    Monitoring: { subtitle: 'Track service health, latency, errors, and incidents.', items: ['CPU usage is within limits', 'Error rate is 0.8%', '1 alert requires attention'], action: 'Open CloudWatch' },
    Infrastructure: { subtitle: 'Review infrastructure topology and configuration drift.', items: ['EKS cluster is operational', 'No critical drift detected', 'Last infrastructure scan: 2 min ago'], action: 'Run Infrastructure Scan' },
    Logs: { subtitle: 'Search audit, deployment, and application activity.', items: ['2,841 events indexed today', 'Latest event: security group update', 'Audit retention: 90 days'], action: 'Search Logs' },
    Reports: { subtitle: 'Generate delivery, risk, and compliance reports.', items: ['Weekly risk report is ready', 'Compliance coverage: 94%', 'Last export: Sep 14, 2026'], action: 'Generate Report' },
    Team: { subtitle: 'Manage reviewers, owners, and approval responsibilities.', items: ['8 active team members', '3 pending reviewer assignments', 'Mugesh Kumar is workspace owner'], action: 'Invite Member' },
  }
  const module = modules[name] ?? { subtitle: 'Manage this ChangeGuard workspace area.', items: ['Workspace data is available', 'No active incidents detected', 'All systems operational'], action: 'Refresh Data' }
  return <section className="workspace-module panel"><div className="workspace-module-head"><div><span className="module-kicker">WORKSPACE MODULE</span><h2>{name}</h2><p>{module.subtitle}</p></div><button className="primary-button" onClick={() => onNotice(`${module.action} started`)}>＋ {module.action}</button></div><div className="module-items">{module.items.map((item, index) => <button key={item} onClick={() => onNotice(item)}><i className={`module-status status-${index}`} />{item}<span>›</span></button>)}</div>{name === 'Monitoring' && <LiveMonitoring onNotice={onNotice} />}</section>
}

function LiveMonitoring({ onNotice }: { onNotice: (message: string) => void }) {
  const [metrics, setMetrics] = useState({ cpu: 23, memory: 56, latency: 120, errorRate: 0.8 })
  const [updatedAt, setUpdatedAt] = useState(new Date())

  useEffect(() => {
    let mounted = true
    const refresh = async () => {
      try {
        const token = localStorage.getItem('changeguard_token')
        const response = apiBase && token ? await fetch(`${apiBase}/monitoring/metrics`, { headers: { authorization: `Bearer ${token}` } }) : null
        const data = response?.ok ? await response.json() : { metrics: { cpu: 18 + Math.floor(Math.random() * 14), memory: 48 + Math.floor(Math.random() * 16), latency: 95 + Math.floor(Math.random() * 45), errorRate: Number((0.4 + Math.random() * 0.7).toFixed(1)) } }
        if (mounted) { setMetrics(data.metrics); setUpdatedAt(new Date()) }
      } catch { onNotice('Monitoring API unavailable; showing local metrics') }
    }
    refresh()
    const timer = window.setInterval(refresh, 10000)
    return () => { mounted = false; window.clearInterval(timer) }
  }, [onNotice])

  return <div className="live-monitoring"><div className="live-monitoring-head"><span>LIVE METRICS</span><strong><i /> Healthy</strong><small>Updated {updatedAt.toLocaleTimeString()}</small></div><div className="live-metric-grid">{[['CPU Usage', `${metrics.cpu}%`, 'blue'], ['Memory Usage', `${metrics.memory}%`, 'purple'], ['Request Latency', `${metrics.latency} ms`, 'green'], ['Error Rate', `${metrics.errorRate}%`, 'red']].map(([label, value, tone]) => <div key={label}><span>{label}</span><strong>{value}</strong><div className={`live-meter ${tone}`}><i style={{ width: `${Math.min(Number.parseFloat(value), 100)}%` }} /></div></div>)}</div></div>
}

function ProfileSettings({ name, onClose, onSave }: { name: string; onClose: () => void; onSave: (name: string) => void }) {
  const [draftName, setDraftName] = useState(name)
  return <div className="modal-backdrop" onClick={onClose}><section className="settings-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" aria-label="Close settings" onClick={onClose}>×</button><span className="module-kicker">ACCOUNT SETTINGS</span><h2>Profile settings</h2><p>Update the workspace identity used across ChangeGuard.</p><label htmlFor="profile-name">Display name</label><input id="profile-name" value={draftName} onChange={(event) => setDraftName(event.target.value)} /><label>Email address</label><input value="mugesh.kumar@example.com" disabled /><label>Role</label><input value="DevOps Engineer · Admin" disabled /><div className="settings-actions"><button className="secondary-action" onClick={onClose}>Cancel</button><button className="primary-button" onClick={() => onSave(draftName.trim() || name)}>Save changes</button></div></section></div>
}

function AiWorkbench({ onNotice }: { onNotice: (message: string) => void }) {
  const [mode, setMode] = useState<'AI Analysis' | 'MCP Tools' | 'RAG Search'>('AI Analysis')
  const [query, setQuery] = useState('Analyze the security group change for production risk')
  const [result, setResult] = useState('')
  const [sources, setSources] = useState<string[]>([])
  const tools = ['aws.describe_security_group', 'aws.list_deployments', 'cloudwatch.get_metrics', 'mcp.audit_change']

  const run = async () => {
    if (!query.trim()) return
    const token = localStorage.getItem('changeguard_token')
    if (apiBase && token) {
      try {
        const endpoint = mode === 'MCP Tools' ? `${apiBase}/mcp/call` : `${apiBase}/ai/analyze`
        const body = mode === 'MCP Tools' ? { tool: query.replace(/^Run /, ''), arguments: { environment: 'production' } } : { prompt: query }
        const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
        const data = await response.json()
        if (response.ok) { setResult(data.answer || data.data?.message || JSON.stringify(data.data || data)); setSources(data.sources || ['MCP tool registry', 'ChangeGuard API']); onNotice(`${mode} completed`); return }
      } catch { onNotice('Provider unavailable; using local analysis') }
    }
    if (mode === 'AI Analysis') {
      setResult('High risk detected. The change exposes inbound access in production. Require a rollback plan, validate the affected EC2 and RDS resources, and schedule deployment during a low-traffic window.')
      setSources(['Change #1050', 'Security Group Policy', 'Production Runbook'])
    } else if (mode === 'RAG Search') {
      setResult(`Retrieved guidance for: ${query}. Recommended controls include least-privilege rules, an approved rollback path, and a post-deployment CloudWatch check.`)
      setSources(['Security Policy v2.4', 'AWS Well-Architected Notes', 'Incident Playbook'])
    } else {
      setResult(`MCP tool request queued: ${query}. The connected tool can inspect AWS resources and return structured change context.`)
      setSources(['MCP session: local-dev', 'Tool registry', 'AWS connector'])
    }
    onNotice(`${mode} completed`)
  }

  return <section className="ai-workbench panel"><div className="ai-workbench-head"><div><span className="ai-kicker">✦ INTELLIGENCE LAYER</span><h2>AI + MCP + RAG Workbench</h2><p>Analyze changes, call connected tools, and ground recommendations in your engineering knowledge.</p></div><span className="connected-badge"><i /> Providers connected</span></div><div className="ai-modes">{['AI Analysis', 'MCP Tools', 'RAG Search'].map((item) => <button key={item} className={mode === item ? 'active' : ''} onClick={() => { setMode(item as typeof mode); setResult('') }}>{item === 'AI Analysis' ? '✦' : item === 'MCP Tools' ? '⌘' : '⌕'} {item}</button>)}</div><div className="ai-workbench-body"><div className="ai-input-area"><label htmlFor="ai-query">{mode === 'MCP Tools' ? 'Tool request' : mode === 'RAG Search' ? 'Search your knowledge base' : 'Ask ChangeGuard AI'}</label><textarea id="ai-query" value={query} onChange={(event) => setQuery(event.target.value)} /><button className="run-ai-button" onClick={run}>{mode === 'MCP Tools' ? 'Run MCP Tool' : mode === 'RAG Search' ? 'Retrieve & Answer' : 'Analyze with AI'} <span>→</span></button></div><div className="ai-result"><div className="result-label">{mode === 'MCP Tools' ? 'MCP RESPONSE' : mode === 'RAG Search' ? 'GROUNDED RESPONSE' : 'AI RECOMMENDATION'}</div>{result ? <><p>{result}</p><div className="source-list">{sources.map((source) => <span key={source}>◈ {source}</span>)}</div></> : <p className="empty-result">Run this workspace to see a grounded response and source references.</p>}</div></div>{mode === 'MCP Tools' && <div className="tool-registry"><span>AVAILABLE MCP TOOLS</span>{tools.map((tool) => <button key={tool} onClick={() => setQuery(`Run ${tool}`)}>{tool}<b>›</b></button>)}</div>}</section>
}

function LoginScreen({ onSignIn }: { onSignIn: () => void }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('mugesh.kumar@example.com')
  const [password, setPassword] = useState('password123')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if ((isSignUp && !name) || !email || password.length < 8) {
      setMessage(isSignUp ? 'Enter your name and use a password with at least 8 characters' : 'Enter your email address and password')
      return
    }
    setLoading(true)
    try {
      if (apiBase) {
        const response = await fetch(`${apiBase}/auth/${isSignUp ? 'register' : 'login'}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, email, password }) })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Authentication failed')
        localStorage.setItem('changeguard_token', data.token)
      }
      onSignIn()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to connect to ChangeGuard API')
    } finally {
      setLoading(false)
    }
  }

  return <main className="login-page"><header className="login-topbar"><button className="theme-toggle" aria-label="Toggle theme">☼</button><button className="theme-toggle" aria-label="Toggle dark mode">☽</button><span>{isSignUp ? 'Already have an account?' : "Don't have an account?"}</span><button className="signup-link" onClick={() => { setIsSignUp(!isSignUp); setMessage('') }}>{isSignUp ? 'Sign In' : 'Create Account'}</button></header><section className="login-card"><div className="login-brand"><span className="login-mark">✓</span><div><strong>ChangeGuard</strong><small>AI-Powered DevOps</small></div></div><h1>{isSignUp ? 'Create Account' : 'Welcome Back!'}</h1><p className="login-subtitle">{isSignUp ? 'Start managing safer deployments with AI.' : 'Sign in to manage, analyze and deploy with confidence.'}</p><form onSubmit={submit}>{isSignUp && <><label htmlFor="name">Full Name</label><div className="login-input"><span>♙</span><input id="name" type="text" placeholder="Mugesh Kumar" value={name} onChange={(event) => setName(event.target.value)} /></div></>}<label htmlFor="email">Email Address</label><div className="login-input"><span>✉</span><input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div><label htmlFor="password">Password</label><div className="login-input"><span>♙</span><input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" aria-label="Show password" onClick={() => setShowPassword(!showPassword)}>{showPassword ? '⊙' : '◉'}</button></div><div className="login-options"><label><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /> <span>Remember me</span></label>{!isSignUp && <button type="button" onClick={() => setMessage('Password reset link requested')}>Forgot password?</button>}</div>{message && <p className="login-message">{message}</p>}<button className="signin-button" type="submit" disabled={loading}>{loading ? 'Connecting...' : isSignUp ? 'Create Account' : 'Sign In'}</button></form><div className="continue-divider"><span />or continue with<span /></div><div className="social-buttons"><button onClick={() => onSignIn()}><svg className="github-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.25c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.75.08-.74.08-.74 1.2.08 1.84 1.23 1.84 1.23 1.07 1.83 2.8 1.3 3.48.99.11-.77.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.94 0-1.31.47-2.38 1.23-3.22-.12-.3-.53-1.52.12-3.18 0 0 1-.32 3.3 1.23a11.4 11.4 0 0 1 6 0c2.29-1.55 3.29-1.23 3.29-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.63-5.48 5.93.43.37.81 1.1.81 2.22v3.29c0 .32.22.69.83.57A12 12 0 0 0 12 .5Z" /></svg><span>GitHub</span></button><button onClick={() => onSignIn()}><svg className="google-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.35 12.27c0-.72-.06-1.25-.2-1.81H12v3.43h5.36a4.58 4.58 0 0 1-1.99 3.01v2.51h3.23c1.89-1.74 2.75-4.3 2.75-7.14Z" /><path fill="#34A853" d="M12 21.6c2.7 0 4.97-.89 6.63-2.42l-3.23-2.51c-.9.6-2.05.96-3.4.96-2.61 0-4.82-1.76-5.61-4.13H3.05v2.59A10 10 0 0 0 12 21.6Z" /><path fill="#FBBC05" d="M6.39 13.5a6.01 6.01 0 0 1 0-3.8V7.11H3.05a10 10 0 0 0 0 8.98l3.34-2.59Z" /><path fill="#EA4335" d="M12 5.57c1.47 0 2.79.51 3.83 1.5l2.87-2.87C16.96 2.6 14.7 1.6 12 1.6a10 10 0 0 0-8.95 5.51l3.34 2.59C7.18 7.33 9.39 5.57 12 5.57Z" /></svg><span>Google</span></button><button onClick={() => onSignIn()}><span className="aws-logo"><b>aws</b><i /></span><span>AWS</span></button></div><blockquote>“Small changes, big impact.<br /><em>Make every deployment safer with AI.</em>”<strong>– ChangeGuard</strong></blockquote></section><footer className="login-footer">© 2026 ChangeGuard. Built by Mugesh Kumar. All rights reserved.<span>Privacy　 Terms　 Support</span></footer></main>
}

export default App
