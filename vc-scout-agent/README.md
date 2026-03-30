# VC Scout Agent

**Autonomous Due Diligence Intelligence — Powered by Bright Data**

Full-stack application for VC investment analysis. Input company names and founders, get real-time competitive positioning, funding data, and founder technical credibility scores.

![VC Scout](https://img.shields.io/badge/Bright%20Data-MCP-blue)
![Python](https://img.shields.io/badge/Python-3.11+-green)
![React](https://img.shields.io/badge/React-18-blue)

---

## 🎯 What It Does

| Input | Agent Scrapes |
|-------|--------------|
| **Company name** | Pricing page, competitors, Crunchbase |
| **Founder name** | GitHub profile, dev metrics |

| Output | Details |
|--------|---------|
| **Competitive Score** | Pricing tiers vs market positioning |
| **Health Score** | Funding stage, amount raised, investors |
| **Dev Score** | GitHub stars, repos, contributions |
| **AI Insight** | Strategic summary for investment decisions |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND (React + Vite)                                    │
│  localhost:3000                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ POST /analyze
┌─────────────────────────────────────────────────────────────┐
│  BACKEND (FastAPI)                                          │
│  localhost:8000                                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  VCScoutAgent                                        │   │
│  │  ├─ BrightDataClient (SERP, Web Unlocker)           │   │
│  │  ├─ LLMExtractor (Claude/Regex fallback)            │   │
│  │  └─ ScoringEngine (formulas)                        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  BRIGHT DATA APIs                                           │
│  ├─ SERP API: Google search                                │
│  ├─ Web Unlocker: Anti-bot bypass scraping                 │
│  └─ Scraping Browser: JS-rendered pages                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Clone & Setup

```bash
git clone <repo>
cd vc-scout-agent
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your API keys
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment (optional)
cp .env.example .env
```

### 4. Run

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
python main.py
# Running on http://localhost:8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Running on http://localhost:3000
```

### 5. Use

1. Open http://localhost:3000
2. Enter company names (e.g., "Linear", "Notion")
3. Optionally add founder names for Dev Score
4. Click "Run Analysis"
5. View ranked results with scores and insights

---

## ⚙️ Configuration

### Backend Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BRIGHT_DATA_API_TOKEN` | **Yes*** | Bright Data API token |
| `ANTHROPIC_API_KEY` | No | Claude API for better extraction |
| `OPENAI_API_KEY` | No | Alternative to Anthropic |

*Without Bright Data token, the backend uses mock data for demo purposes.

### Getting Bright Data API Token

1. Sign up at [brightdata.com](https://brightdata.com)
2. Go to **API Tokens** in dashboard
3. Create new token with these permissions:
   - SERP API
   - Web Unlocker
   - Scraping Browser
4. Copy token to `.env`

---

## 📊 Scoring Methodology

### Competitive Score (1-10)

| Factor | Points |
|--------|--------|
| Free tier available | +2.0 |
| 3+ pricing tiers | +1.0 |
| 4+ pricing tiers | +0.5 |
| Enterprise tier | +1.0 |

### Health Score (1-10)

| Stage | Base Score |
|-------|------------|
| Pre-Seed | 4.0 |
| Seed | 5.0 |
| Series A | 6.5 |
| Series B | 8.0 |
| Series C+ | 9.0+ |

### Dev Score (1-10)

```
dev_score = (stars / 500) + (repos × 0.1) + (contributions / 200)
```

### Overall Score

- **With Dev Score:** 33% Competitive + 33% Health + 34% Dev
- **Without Dev Score:** 50% Competitive + 50% Health

---

## 🔧 API Reference

### `POST /analyze`

Analyze companies for VC due diligence.

**Request:**
```json
{
  "companies": [
    { "company": "Linear", "founder": "Karri Saarinen" },
    { "company": "Notion", "founder": "Ivan Zhao" }
  ]
}
```

**Response:**
```json
{
  "results": [
    {
      "company": "Linear",
      "founder": "Karri Saarinen",
      "website": "https://linear.app",
      "competitive_score": 8.5,
      "health_score": 8.0,
      "dev_score": 7.2,
      "overall_score": 7.9,
      "pricing": {
        "tiers": [
          { "name": "Free", "price": "$0" },
          { "name": "Pro", "price": "$10/mo" }
        ],
        "has_free_tier": true
      },
      "funding": {
        "stage": "Series B",
        "total_raised": "$52M",
        "last_round": "2024"
      },
      "github": {
        "username": "karrisaarinen",
        "stars": 2847,
        "repos": 34,
        "contributions": 892
      },
      "competitors": ["Jira", "Asana"],
      "insight": "Linear shows strong competitive positioning..."
    }
  ],
  "count": 1
}
```

### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "bright_data": "connected",
  "llm": "anthropic"
}
```

---

## 📁 Project Structure

```
vc-scout-agent/
├── backend/
│   ├── main.py              # FastAPI app + agent logic
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example         # Environment template
│   └── .env                  # Your API keys (gitignored)
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main React component
│   │   ├── App.css          # Component styles
│   │   ├── index.css        # Global styles
│   │   └── main.jsx         # Entry point
│   ├── index.html           # HTML template
│   ├── package.json         # Node dependencies
│   ├── vite.config.js       # Vite config
│   └── .env.example         # Environment template
│
└── README.md                # This file
```

---

## 🎪 Demo Script (60 seconds)

> "I'm a VC evaluating 3 companies for investment."

1. Open the app
2. Enter: Linear, Notion, Figma with founders
3. Click "Run Analysis"
4. Show the ranked results

> "The agent autonomously scraped pricing pages, Crunchbase funding data, and founder GitHub profiles."

> "Linear ranks #1 — strong dev founder with 2,800+ GitHub stars, competitive pricing with free tier, Series B funding."

> "**Zero manual research. Fully autonomous.**"

---

## 🏆 Built For

- **Unicorn Mafia × TechBible Hackathon**
- **Bright Data Web MCP Track**
- **Cherry Ventures** watching 👀

---

## 📝 License

MIT

---

Made with ☕ and [Bright Data](https://brightdata.com)
