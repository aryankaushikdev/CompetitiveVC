import React, { useState } from 'react'
import './App.css'

// API Configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function App() {
  const [companies, setCompanies] = useState([{ company: '', founder: '' }])
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState('')

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
    setStatus('Connecting to Bright Data...')

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

      setStatus('Processing results...')
      const data = await response.json()
      setResults(data.results)
    } catch (err) {
      setError(err.message || 'Failed to connect to backend')
    } finally {
      setLoading(false)
      setStatus('')
    }
  }

  const scoreColor = (score) => {
    if (score >= 8) return 'var(--success)'
    if (score >= 6) return 'var(--warning)'
    return 'var(--danger)'
  }

  const rankClass = (index) => {
    if (index === 0) return 'rank rank-1'
    if (index === 1) return 'rank rank-2'
    if (index === 2) return 'rank rank-3'
    return 'rank rank-default'
  }

  return (
    <div className="app">
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-brand">
            <div className="nav-logo">VS</div>
            <div className="nav-title">VC Scout <span>Agent</span></div>
          </div>
          <div className="nav-badge">
            <div className="nav-badge-dot"></div>
            Bright Data MCP
          </div>
        </div>
      </nav>

      <main className="main">
        <section className="hero">
          <div className="hero-eyebrow">
            <span>⚡</span> Autonomous Due Diligence
          </div>
          <h1>Investment Intelligence</h1>
          <p>
            Real-time competitive analysis, funding signals, and founder technical credibility — scraped and scored autonomously.
          </p>
        </section>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Target Companies</div>
          </div>
          <div className="panel-body">
            {error && <div className="error-box">{error}</div>}
            
            <div className="company-list">
              {companies.map((c, i) => (
                <div key={i} className="company-row">
                  <div className="field">
                    <label className="field-label">Company *</label>
                    <input
                      className="field-input"
                      placeholder="Linear"
                      value={c.company}
                      onChange={e => updateCompany(i, 'company', e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">Founder (for Dev Score)</label>
                    <input
                      className="field-input"
                      placeholder="Karri Saarinen"
                      value={c.founder}
                      onChange={e => updateCompany(i, 'founder', e.target.value)}
                    />
                  </div>
                  {companies.length > 1 && (
                    <button 
                      className="btn btn-icon btn-danger" 
                      onClick={() => removeCompany(i)}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            {companies.length < 5 && (
              <button className="btn btn-ghost add-btn" onClick={addCompany}>
                + Add Company
              </button>
            )}
          </div>
          <div className="panel-footer">
            <div className="panel-footer-text">
              Pipeline: <code>SERP → Scrape → Extract → Score</code>
            </div>
            <button 
              className="btn btn-primary" 
              onClick={analyze} 
              disabled={loading}
            >
              {loading ? 'Analyzing...' : 'Run Analysis'}
            </button>
          </div>
        </div>

        {loading && (
          <div className="panel loading-panel">
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <div className="loading-title">Executing Agent Pipeline</div>
              <div className="loading-step">{status}</div>
            </div>
          </div>
        )}

        {results && (
          <section className="results">
            <div className="results-header">
              <div>
                <h2 className="results-title">Analysis Complete</h2>
                <p className="results-subtitle">
                  {results.length} companies ranked by overall score
                </p>
              </div>
              <button className="btn btn-ghost" onClick={() => setResults(null)}>
                Clear
              </button>
            </div>

            <div className="results-grid">
              {results.map((r, i) => (
                <div key={i} className="card">
                  <div className="card-header">
                    <div className="card-header-left">
                      <div className={rankClass(i)}>#{i + 1}</div>
                      <div className="company-meta">
                        <h3>{r.company}</h3>
                        <p>Founder: {r.founder}</p>
                      </div>
                    </div>
                    <div className="overall-score">
                      <div 
                        className="overall-score-value"
                        style={{ color: scoreColor(r.overall_score) }}
                      >
                        {r.overall_score}
                      </div>
                      <div className="overall-score-label">Overall Score</div>
                    </div>
                  </div>

                  <div className="card-body">
                    <div className="scores-row">
                      <ScoreBlock 
                        label="Competitive" 
                        value={r.competitive_score}
                        color={scoreColor(r.competitive_score)}
                      />
                      <ScoreBlock 
                        label="Health" 
                        value={r.health_score}
                        color={scoreColor(r.health_score)}
                      />
                      <ScoreBlock 
                        label="Dev Score" 
                        value={r.dev_score}
                        color={r.dev_score ? scoreColor(r.dev_score) : null}
                      />
                    </div>

                    <div className="details-row">
                      <div className="detail-block">
                        <div className="detail-block-title">Pricing</div>
                        <div className="detail-list">
                          {(r.pricing?.tiers || []).map((t, j) => (
                            <div key={j} className="detail-item">
                              <span className="detail-item-key">{t.name}</span>
                              <span className="detail-item-value">{t.price}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="detail-block">
                        <div className="detail-block-title">Funding</div>
                        <div className="detail-list">
                          <div className="detail-item">
                            <span className="detail-item-key">Stage</span>
                            <span className="detail-item-value">
                              {r.funding?.stage || 'Unknown'}
                            </span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-item-key">Raised</span>
                            <span className="detail-item-value">
                              {r.funding?.total_raised || 'Undisclosed'}
                            </span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-item-key">Last Round</span>
                            <span className="detail-item-value">
                              {r.funding?.last_round || 'Unknown'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="detail-block">
                        <div className="detail-block-title">
                          {r.github ? 'GitHub' : 'Competitors'}
                        </div>
                        {r.github ? (
                          <div className="detail-list">
                            <div className="detail-item">
                              <span className="detail-item-key">User</span>
                              <span className="detail-item-value">
                                @{r.github.username}
                              </span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-item-key">Stars</span>
                              <span className="detail-item-value">
                                {r.github.stars?.toLocaleString() || 0}
                              </span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-item-key">Repos</span>
                              <span className="detail-item-value">
                                {r.github.repos || 0}
                              </span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-item-key">Contrib</span>
                              <span className="detail-item-value">
                                {r.github.contributions?.toLocaleString() || 0}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="tag-list">
                            {(r.competitors || []).map((c, j) => (
                              <span key={j} className="tag">{c}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="insight-block">
                      <div className="insight-label">AI Insight</div>
                      <div className="insight-text">{r.insight}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

// Score Block Component
function ScoreBlock({ label, value, color }) {
  if (value === null || value === undefined) {
    return (
      <div className="score-block">
        <div className="score-block-header">
          <span className="score-block-label">{label}</span>
        </div>
        <div className="no-data">No founder</div>
      </div>
    )
  }

  return (
    <div className="score-block">
      <div className="score-block-header">
        <span className="score-block-label">{label}</span>
      </div>
      <div className="score-block-value" style={{ color }}>
        {value}
      </div>
      <div className="score-bar">
        <div 
          className="score-bar-fill" 
          style={{ 
            width: `${value * 10}%`, 
            background: color 
          }}
        />
      </div>
    </div>
  )
}

export default App
