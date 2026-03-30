import React, { useState } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function App() {
  const [companies, setCompanies] = useState([{ company: '', founder: '' }])
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [step, setStep] = useState({ current: 0, text: '', icon: '' })

  const STEPS = [
    { text: 'Initializing agent...', icon: '⚡' },
    { text: 'Searching company websites...', icon: '🔍' },
    { text: 'Scraping pricing pages...', icon: '📄' },
    { text: 'Mapping competitor landscape...', icon: '🗺️' },
    { text: 'Fetching Crunchbase data...', icon: '💰' },
    { text: 'Locating GitHub profiles...', icon: '👨‍💻' },
    { text: 'Calculating scores...', icon: '📊' },
    { text: 'Generating insights...', icon: '🧠' },
  ]

  const addCompany = () => {
    if (companies.length < 5) {
      setCompanies([...companies, { company: '', founder: '' }])
    }
  }

  const removeCompany = (index) => {
    if (companies.length > 1) {
      setCompanies(companies.filter((_, i) => i !== index))
    }
  }

  const updateCompany = (index, field, value) => {
    const updated = [...companies]
    updated[index][field] = value
    setCompanies(updated)
  }

  const analyze = async () => {
    const valid = companies.filter(c => c.company.trim())
    if (!valid.length) {
      setError('Enter at least one company name')
      return
    }

    setLoading(true)
    setError(null)
    setResults(null)

    for (let i = 0; i < STEPS.length; i++) {
      setStep({ current: i, text: STEPS[i].text, icon: STEPS[i].icon })
      await new Promise(r => setTimeout(r, 400 + Math.random() * 300))
    }

    try {
      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companies: valid })
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.detail || 'Analysis failed')
      }

      const data = await response.json()
      setResults(data.results)
    } catch (err) {
      setError(err.message || 'Failed to connect to backend')
    } finally {
      setLoading(false)
      setStep({ current: 0, text: '', icon: '' })
    }
  }

  const scoreColor = (score) => {
    if (score >= 8) return 'var(--score-excellent)'
    if (score >= 6) return 'var(--score-good)'
    return 'var(--score-fair)'
  }

  const scoreLabel = (score) => {
    if (score >= 9) return 'Exceptional'
    if (score >= 8) return 'Strong'
    if (score >= 7) return 'Good'
    if (score >= 6) return 'Fair'
    return 'Needs Work'
  }

  const getSignals = (result) => {
    const signals = []
    if (result.pricing?.has_free_tier) signals.push({ type: 'positive', text: 'PLG-Ready' })
    if (result.funding?.stage?.toLowerCase().includes('series b') || 
        result.funding?.stage?.toLowerCase().includes('series c')) {
      signals.push({ type: 'positive', text: 'Growth Stage' })
    }
    if (result.dev_score && result.dev_score >= 8) signals.push({ type: 'positive', text: 'Technical Founder' })
    if (result.competitive_score >= 8) signals.push({ type: 'positive', text: 'Strong Moat' })
    if (!result.pricing?.has_free_tier && result.competitive_score < 7) {
      signals.push({ type: 'warning', text: 'Pricing Risk' })
    }
    return signals.slice(0, 4)
  }

  const getVerdict = (score) => {
    if (score >= 8.5) return { text: 'STRONG BUY', class: 'verdict-buy' }
    if (score >= 7.5) return { text: 'BUY', class: 'verdict-buy' }
    if (score >= 6) return { text: 'HOLD', class: 'verdict-hold' }
    return { text: 'WATCH', class: 'verdict-watch' }
  }

  return (
    <div className="app">
      <div className="bg-effects">
        <div className="bg-grid"></div>
        <div className="bg-glow bg-glow-1"></div>
        <div className="bg-glow bg-glow-2"></div>
      </div>

      <nav className="nav">
        <div className="container nav-inner">
          <div className="nav-brand">
            <div className="nav-logo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="nav-name">Competitive VC</span>
            <span className="nav-badge">AGENT</span>
          </div>
          <div className="nav-status">
            <span className="status-dot"></span>
            <span>Bright Data MCP</span>
          </div>
        </div>
      </nav>

      <main className="main">
        <div className="container">
          <section className="hero">
            <div className="hero-chip">
              <span className="chip-icon">⚡</span>
              <span>Autonomous Due Diligence</span>
            </div>
            <h1 className="hero-title">
              Investment Intelligence<br/>
              <span className="hero-gradient">in Seconds</span>
            </h1>
            <p className="hero-desc">
              Real-time competitive analysis, funding signals, and founder credibility — 
              scraped and scored autonomously by AI agents.
            </p>
            <div className="hero-metrics">
              <div className="metric">
                <span className="metric-value">12+</span>
                <span className="metric-label">Data Sources</span>
              </div>
              <div className="metric-divider"></div>
              <div className="metric">
                <span className="metric-value">3</span>
                <span className="metric-label">Dimensions</span>
              </div>
              <div className="metric-divider"></div>
              <div className="metric">
                <span className="metric-value">&lt;30s</span>
                <span className="metric-label">Analysis</span>
              </div>
            </div>
          </section>

          <section className="input-section">
            <div className="card">
              <div className="card-header">
                <div className="card-header-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="M21 21l-4.35-4.35"/>
                  </svg>
                </div>
                <div>
                  <h2 className="card-title">Target Companies</h2>
                  <p className="card-subtitle">Add up to 5 companies for analysis</p>
                </div>
              </div>

              <div className="card-body">
                {error && (
                  <div className="error-banner">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 8v4m0 4h.01"/>
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                <div className="company-list">
                  {companies.map((c, i) => (
                    <div key={i} className="company-row">
                      <div className="row-num">{i + 1}</div>
                      <div className="field">
                        <label className="field-label">Company <span className="required">*</span></label>
                        <input
                          type="text"
                          className="field-input"
                          placeholder="Linear, Notion, Figma..."
                          value={c.company}
                          onChange={e => updateCompany(i, 'company', e.target.value)}
                        />
                      </div>
                      <div className="field">
                        <label className="field-label">Founder <span className="optional">(optional)</span></label>
                        <input
                          type="text"
                          className="field-input"
                          placeholder="Karri Saarinen"
                          value={c.founder}
                          onChange={e => updateCompany(i, 'founder', e.target.value)}
                        />
                      </div>
                      {companies.length > 1 && (
                        <button className="btn-remove" onClick={() => removeCompany(i)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {companies.length < 5 && (
                  <button className="btn-add" onClick={addCompany}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14m-7-7h14"/>
                    </svg>
                    <span>Add Company</span>
                  </button>
                )}
              </div>

              <div className="card-footer">
                <div className="pipeline">
                  <span className="pipe-step">SERP</span>
                  <span className="pipe-arrow">→</span>
                  <span className="pipe-step">Scrape</span>
                  <span className="pipe-arrow">→</span>
                  <span className="pipe-step">Extract</span>
                  <span className="pipe-arrow">→</span>
                  <span className="pipe-step">Score</span>
                </div>
                <button className="btn-primary" onClick={analyze} disabled={loading}>
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                      </svg>
                      <span>Run Analysis</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>

          {loading && (
            <section className="loading-section">
              <div className="loading-card">
                <div className="loading-bar">
                  <div className="loading-bar-fill" style={{ width: `${((step.current + 1) / STEPS.length) * 100}%` }}></div>
                </div>
                <div className="loading-content">
                  <span className="loading-icon">{step.icon}</span>
                  <div className="loading-info">
                    <span className="loading-step-num">Step {step.current + 1} of {STEPS.length}</span>
                    <span className="loading-step-text">{step.text}</span>
                  </div>
                </div>
                <div className="loading-dots">
                  {STEPS.map((_, i) => (
                    <span key={i} className={`dot ${i <= step.current ? 'active' : ''} ${i === step.current ? 'current' : ''}`}></span>
                  ))}
                </div>
              </div>
            </section>
          )}

          {results && (
            <section className="results-section">
              <div className="results-header">
                <div>
                  <h2 className="results-title">Analysis Complete</h2>
                  <p className="results-subtitle">{results.length} companies ranked by score</p>
                </div>
                <button className="btn-outline" onClick={() => setResults(null)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                  </svg>
                  <span>New Analysis</span>
                </button>
              </div>

              <div className="results-list">
                {results.map((r, i) => {
                  const signals = getSignals(r)
                  const verdict = getVerdict(r.overall_score)
                  
                  return (
                    <div key={i} className={`result-card ${i === 0 ? 'top-pick' : ''}`}>
                      {i === 0 && <div className="top-badge">👑 Top Pick</div>}
                      
                      <div className="result-top">
                        <div className="result-rank">
                          <span className={`rank rank-${i + 1}`}>#{i + 1}</span>
                        </div>
                        <div className="result-info">
                          <h3 className="company-name">{r.company}</h3>
                          <p className="company-founder">
                            {r.founder !== 'Not provided' ? `by ${r.founder}` : ''}
                          </p>
                          <a href={r.website} className="company-link" target="_blank" rel="noopener">
                            {r.website?.replace('https://', '')} ↗
                          </a>
                        </div>
                        <div className="result-overall">
                          <div className="overall-score" style={{ color: scoreColor(r.overall_score) }}>
                            {r.overall_score}
                          </div>
                          <div className="overall-label">{scoreLabel(r.overall_score)}</div>
                          <div className={`verdict ${verdict.class}`}>{verdict.text}</div>
                        </div>
                      </div>

                      <div className="scores-grid">
                        <ScoreBlock label="Competitive" value={r.competitive_score} icon="🎯" desc="Market positioning" />
                        <ScoreBlock label="Health" value={r.health_score} icon="💪" desc="Funding & growth" />
                        <ScoreBlock label="Dev Score" value={r.dev_score} icon="👨‍💻" desc="Technical credibility" />
                      </div>

                      {signals.length > 0 && (
                        <div className="signals">
                          <span className="signals-label">Signals:</span>
                          {signals.map((s, j) => (
                            <span key={j} className={`signal ${s.type}`}>
                              {s.type === 'positive' ? '✓' : '⚠'} {s.text}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="details-grid">
                        <div className="detail-card">
                          <div className="detail-title">💰 Pricing</div>
                          <div className="tiers">
                            {(r.pricing?.tiers || []).map((t, j) => (
                              <div key={j} className="tier">
                                <span className="tier-name">{t.name}</span>
                                <span className="tier-price">{t.price}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="detail-card">
                          <div className="detail-title">📈 Funding</div>
                          <div className="funding">
                            <div className="funding-main">
                              <span className="funding-stage">{r.funding?.stage}</span>
                              <span className="funding-amount">{r.funding?.total_raised}</span>
                            </div>
                            <div className="funding-meta">
                              Last: {r.funding?.last_round} • {r.funding?.investors?.slice(0, 2).join(', ')}
                            </div>
                          </div>
                        </div>

                        <div className="detail-card">
                          <div className="detail-title">{r.github ? '👨‍💻 GitHub' : '⚔️ Competitors'}</div>
                          {r.github ? (
                            <div className="github">
                              <div className="github-user">@{r.github.username}</div>
                              <div className="github-stats">
                                <span>⭐ {r.github.stars?.toLocaleString()}</span>
                                <span>📁 {r.github.repos}</span>
                                <span>🔥 {r.github.contributions?.toLocaleString()}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="competitors">
                              {(r.competitors || []).map((c, j) => (
                                <span key={j} className="comp-tag">{c}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="insight-box">
                        <div className="insight-header">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                          </svg>
                          <span>AI Investment Insight</span>
                        </div>
                        <p className="insight-text">{r.insight}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <span>Built for <strong>Unicorn Mafia × TechBible Hackathon</strong></span>
          <span>Powered by <strong>Bright Data MCP</strong></span>
        </div>
      </footer>
    </div>
  )
}

function ScoreBlock({ label, value, icon, desc }) {
  const color = (v) => {
    if (v >= 8) return 'var(--score-excellent)'
    if (v >= 6) return 'var(--score-good)'
    return 'var(--score-fair)'
  }

  if (value === null || value === undefined) {
    return (
      <div className="score-block empty">
        <span className="score-icon">{icon}</span>
        <span className="score-label">{label}</span>
        <span className="score-na">N/A</span>
        <span className="score-desc">{desc}</span>
      </div>
    )
  }

  return (
    <div className="score-block">
      <span className="score-icon">{icon}</span>
      <span className="score-label">{label}</span>
      <span className="score-value" style={{ color: color(value) }}>{value}</span>
      <div className="score-bar">
        <div className="score-bar-fill" style={{ width: `${value * 10}%`, background: color(value) }}></div>
      </div>
      <span className="score-desc">{desc}</span>
    </div>
  )
}

export default App
