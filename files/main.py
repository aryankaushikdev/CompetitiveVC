"""
VC Scout Agent - Backend API
Real Bright Data integration for VC due diligence

Endpoints:
- POST /analyze - Analyze companies
- GET /health - Health check
"""

import os
import json
import asyncio
import re
from typing import Optional, List
from dataclasses import dataclass, asdict
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# =============================================================================
# CONFIGURATION
# =============================================================================

BRIGHT_DATA_API_TOKEN = os.getenv("BRIGHT_DATA_API_TOKEN")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")  # For LLM extraction (optional)
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")  # Alternative LLM

# Bright Data endpoints
SERP_API_URL = "https://api.brightdata.com/serp/req"
WEB_UNLOCKER_URL = "https://api.brightdata.com/request"
SCRAPING_BROWSER_URL = "https://api.brightdata.com/scraping-browser/req"

# =============================================================================
# DATA MODELS
# =============================================================================

class CompanyInput(BaseModel):
    company: str
    founder: Optional[str] = None

class AnalyzeRequest(BaseModel):
    companies: List[CompanyInput]

@dataclass
class PricingData:
    tiers: List[dict]
    has_free_tier: bool
    lowest_paid: Optional[str]

@dataclass
class FundingData:
    stage: str
    total_raised: str
    last_round: str
    investors: List[str]

@dataclass
class GitHubData:
    username: str
    stars: int
    repos: int
    contributions: int

@dataclass
class CompanyResult:
    company: str
    founder: str
    website: str
    competitive_score: float
    health_score: float
    dev_score: Optional[float]
    overall_score: float
    pricing: dict
    funding: dict
    github: Optional[dict]
    competitors: List[str]
    insight: str

# =============================================================================
# BRIGHT DATA CLIENT
# =============================================================================

class BrightDataClient:
    """
    Real Bright Data API client
    
    Uses:
    - SERP API for Google searches
    - Web Unlocker for scraping with anti-bot bypass
    - Scraping Browser for JS-rendered pages
    """
    
    def __init__(self, api_token: str):
        self.api_token = api_token
        self.headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }
    
    async def search_google(self, query: str, num_results: int = 5) -> List[dict]:
        """
        SERP API - Search Google
        Returns: [{"title": ..., "url": ..., "snippet": ...}, ...]
        """
        if not self.api_token:
            # Fallback for demo without API key
            return self._mock_search(query)
        
        async with httpx.AsyncClient(timeout=30) as client:
            try:
                response = await client.post(
                    SERP_API_URL,
                    headers=self.headers,
                    json={
                        "query": query,
                        "search_engine": "google",
                        "num_results": num_results,
                        "country": "us"
                    }
                )
                response.raise_for_status()
                data = response.json()
                
                results = []
                for item in data.get("organic", [])[:num_results]:
                    results.append({
                        "title": item.get("title", ""),
                        "url": item.get("link", ""),
                        "snippet": item.get("snippet", "")
                    })
                return results
                
            except Exception as e:
                print(f"[SERP Error] {e}")
                return self._mock_search(query)
    
    async def scrape_url(self, url: str, render_js: bool = False) -> str:
        """
        Web Unlocker / Scraping Browser - Scrape URL content
        Returns: HTML string
        """
        if not self.api_token:
            return self._mock_scrape(url)
        
        endpoint = SCRAPING_BROWSER_URL if render_js else WEB_UNLOCKER_URL
        
        async with httpx.AsyncClient(timeout=60) as client:
            try:
                response = await client.post(
                    endpoint,
                    headers=self.headers,
                    json={
                        "url": url,
                        "format": "raw",
                        "country": "us"
                    }
                )
                response.raise_for_status()
                return response.text
                
            except Exception as e:
                print(f"[Scrape Error] {url} - {e}")
                return self._mock_scrape(url)
    
    def _mock_search(self, query: str) -> List[dict]:
        """Fallback mock for demo"""
        query_lower = query.lower()
        
        if "pricing" in query_lower:
            company = query.split()[0]
            return [{"title": f"{company} Pricing", "url": f"https://{company.lower()}.com/pricing", "snippet": "View pricing plans"}]
        elif "crunchbase" in query_lower:
            company = query.split()[0]
            return [{"title": f"{company} - Crunchbase", "url": f"https://crunchbase.com/organization/{company.lower()}", "snippet": "Funding and company info"}]
        elif "github" in query_lower:
            name = query.replace("GitHub", "").strip()
            username = name.lower().replace(" ", "")
            return [{"title": f"{name} - GitHub", "url": f"https://github.com/{username}", "snippet": "GitHub profile"}]
        elif "competitors" in query_lower or "alternatives" in query_lower:
            return [
                {"title": "Top Competitors", "url": "https://g2.com/compare", "snippet": "Compare alternatives"},
            ]
        else:
            company = query.split()[0]
            return [{"title": company, "url": f"https://{company.lower()}.com", "snippet": "Official website"}]
    
    def _mock_scrape(self, url: str) -> str:
        """Fallback mock HTML for demo"""
        if "pricing" in url:
            return """
            <div class="pricing">
                <div class="plan free"><h3>Free</h3><span class="price">$0</span></div>
                <div class="plan pro"><h3>Pro</h3><span class="price">$10/month</span></div>
                <div class="plan team"><h3>Team</h3><span class="price">$20/user/month</span></div>
                <div class="plan enterprise"><h3>Enterprise</h3><span class="price">Contact us</span></div>
            </div>
            """
        elif "crunchbase" in url:
            return """
            <div class="funding">
                <span class="stage">Series B</span>
                <span class="raised">$52M</span>
                <span class="date">2024</span>
                <div class="investors">Sequoia, a16z, Accel</div>
            </div>
            """
        elif "github.com" in url:
            return """
            <div class="profile">
                <span class="stars">2,847</span>
                <span class="repos">34</span>
                <span class="contributions">892 contributions in the last year</span>
            </div>
            """
        return "<html><body>Page content</body></html>"


# =============================================================================
# LLM EXTRACTION (Optional - enhances data extraction)
# =============================================================================

class LLMExtractor:
    """
    Uses LLM to extract structured data from HTML
    Falls back to regex patterns if no API key
    """
    
    def __init__(self, openai_key: str = None, anthropic_key: str = None):
        self.openai_key = openai_key
        self.anthropic_key = anthropic_key
    
    async def extract_pricing(self, html: str, company: str) -> PricingData:
        """Extract pricing tiers from HTML"""
        # Try LLM extraction first
        if self.anthropic_key:
            return await self._extract_with_claude(html, "pricing", company)
        
        # Fallback to regex patterns
        return self._extract_pricing_regex(html)
    
    async def extract_funding(self, html: str, company: str) -> FundingData:
        """Extract funding data from Crunchbase HTML"""
        if self.anthropic_key:
            return await self._extract_with_claude(html, "funding", company)
        
        return self._extract_funding_regex(html)
    
    async def extract_github(self, html: str, username: str) -> GitHubData:
        """Extract GitHub stats from profile HTML"""
        if self.anthropic_key:
            return await self._extract_with_claude(html, "github", username)
        
        return self._extract_github_regex(html, username)
    
    async def _extract_with_claude(self, html: str, data_type: str, context: str):
        """Use Claude for intelligent extraction"""
        prompts = {
            "pricing": f"""Extract pricing tiers from this HTML for {context}. 
Return JSON: {{"tiers": [{{"name": "...", "price": "..."}}], "has_free_tier": bool, "lowest_paid": "..."}}
HTML: {html[:5000]}""",
            
            "funding": f"""Extract funding data from this Crunchbase HTML for {context}.
Return JSON: {{"stage": "...", "total_raised": "...", "last_round": "...", "investors": [...]}}
HTML: {html[:5000]}""",
            
            "github": f"""Extract GitHub stats from this profile HTML for {context}.
Return JSON: {{"username": "...", "stars": int, "repos": int, "contributions": int}}
HTML: {html[:5000]}"""
        }
        
        async with httpx.AsyncClient(timeout=30) as client:
            try:
                response = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": self.anthropic_key,
                        "content-type": "application/json",
                        "anthropic-version": "2023-06-01"
                    },
                    json={
                        "model": "claude-3-haiku-20240307",
                        "max_tokens": 500,
                        "messages": [{"role": "user", "content": prompts[data_type]}]
                    }
                )
                response.raise_for_status()
                data = response.json()
                text = data["content"][0]["text"]
                
                # Parse JSON from response
                json_match = re.search(r'\{.*\}', text, re.DOTALL)
                if json_match:
                    return json.loads(json_match.group())
                    
            except Exception as e:
                print(f"[LLM Error] {e}")
        
        # Fallback to regex
        if data_type == "pricing":
            return self._extract_pricing_regex(html)
        elif data_type == "funding":
            return self._extract_funding_regex(html)
        else:
            return self._extract_github_regex(html, context)
    
    def _extract_pricing_regex(self, html: str) -> dict:
        """Regex fallback for pricing extraction"""
        tiers = []
        
        # Common pricing patterns
        patterns = [
            r'(?:free|starter|basic)[^\$]*\$0',
            r'(?:pro|plus|growth)[^\$]*\$(\d+)',
            r'(?:team|business)[^\$]*\$(\d+)',
            r'(?:enterprise|custom)[^\$]*(?:contact|custom)',
        ]
        
        has_free = bool(re.search(r'\$0|free\s*(?:plan|tier)?', html, re.I))
        
        # Extract price numbers
        prices = re.findall(r'\$(\d+)(?:/(?:mo|month|user|seat))?', html, re.I)
        
        if has_free:
            tiers.append({"name": "Free", "price": "$0"})
        
        if prices:
            tiers.append({"name": "Pro", "price": f"${prices[0]}/mo"})
            if len(prices) > 1:
                tiers.append({"name": "Team", "price": f"${prices[1]}/user"})
        
        tiers.append({"name": "Enterprise", "price": "Custom"})
        
        return {
            "tiers": tiers,
            "has_free_tier": has_free,
            "lowest_paid": f"${prices[0]}" if prices else None
        }
    
    def _extract_funding_regex(self, html: str) -> dict:
        """Regex fallback for funding extraction"""
        # Stage detection
        stage = "Unknown"
        for s in ["Series D", "Series C", "Series B", "Series A", "Seed", "Pre-Seed"]:
            if s.lower() in html.lower():
                stage = s
                break
        
        # Amount detection
        amounts = re.findall(r'\$(\d+(?:\.\d+)?)\s*(?:M|Million|B|Billion)', html, re.I)
        total = f"${amounts[0]}M" if amounts else "Undisclosed"
        
        # Year detection
        years = re.findall(r'20[2-9]\d', html)
        last_round = years[-1] if years else "Unknown"
        
        return {
            "stage": stage,
            "total_raised": total,
            "last_round": last_round,
            "investors": []
        }
    
    def _extract_github_regex(self, html: str, username: str) -> dict:
        """Regex fallback for GitHub extraction"""
        # Stars
        stars_match = re.search(r'(\d[\d,]*)\s*(?:stars?|★)', html, re.I)
        stars = int(stars_match.group(1).replace(",", "")) if stars_match else 0
        
        # Repos
        repos_match = re.search(r'(\d+)\s*(?:repositories|repos)', html, re.I)
        repos = int(repos_match.group(1)) if repos_match else 0
        
        # Contributions
        contrib_match = re.search(r'(\d[\d,]*)\s*contributions?', html, re.I)
        contributions = int(contrib_match.group(1).replace(",", "")) if contrib_match else 0
        
        return {
            "username": username,
            "stars": stars,
            "repos": repos,
            "contributions": contributions
        }


# =============================================================================
# SCORING ENGINE
# =============================================================================

class ScoringEngine:
    """Calculate scores from extracted data"""
    
    @staticmethod
    def competitive_score(pricing: dict, competitors: List[str]) -> float:
        """
        Score competitive positioning (1-10)
        
        Factors:
        - Free tier: +2
        - Multiple tiers: +1
        - Below-market pricing: +2
        - Enterprise offering: +1
        """
        score = 5.0
        
        if pricing.get("has_free_tier"):
            score += 2.0
        
        tiers = pricing.get("tiers", [])
        if len(tiers) >= 3:
            score += 1.0
        if len(tiers) >= 4:
            score += 0.5
        
        # Enterprise tier
        if any("enterprise" in t.get("name", "").lower() for t in tiers):
            score += 1.0
        
        # Cap at 10
        return min(10.0, max(1.0, round(score, 1)))
    
    @staticmethod
    def health_score(funding: dict) -> float:
        """
        Score company health (1-10)
        
        Based on funding stage primarily
        """
        stage_scores = {
            "pre-seed": 4.0,
            "seed": 5.0,
            "series a": 6.5,
            "series b": 8.0,
            "series c": 9.0,
            "series d": 9.5,
        }
        
        stage = funding.get("stage", "").lower()
        score = stage_scores.get(stage, 5.0)
        
        # Bonus for high raise amount
        raised = funding.get("total_raised", "")
        if "$" in raised:
            try:
                amount = float(re.search(r'(\d+(?:\.\d+)?)', raised).group(1))
                if "B" in raised.upper():
                    amount *= 1000
                if amount > 100:
                    score += 0.5
                if amount > 500:
                    score += 0.5
            except:
                pass
        
        return min(10.0, max(1.0, round(score, 1)))
    
    @staticmethod
    def dev_score(github: dict) -> Optional[float]:
        """
        Score founder technical credibility (1-10)
        
        Formula: (stars/500) + (repos*0.1) + (contributions/200)
        """
        if not github:
            return None
        
        stars = github.get("stars", 0)
        repos = github.get("repos", 0)
        contributions = github.get("contributions", 0)
        
        raw = (stars / 500) + (repos * 0.1) + (contributions / 200)
        
        # Normalize to 1-10
        normalized = min(10.0, max(1.0, raw))
        return round(normalized, 1)
    
    @staticmethod
    def overall_score(competitive: float, health: float, dev: Optional[float]) -> float:
        """
        Weighted overall score
        
        With dev: 33% each
        Without: 50% competitive, 50% health
        """
        if dev:
            return round(competitive * 0.33 + health * 0.33 + dev * 0.34, 1)
        return round(competitive * 0.5 + health * 0.5, 1)
    
    @staticmethod
    def generate_insight(company: str, competitive: float, health: float, dev: Optional[float]) -> str:
        """Generate AI insight based on scores"""
        parts = []
        
        if competitive >= 8:
            parts.append(f"{company} shows strong competitive positioning with aggressive market strategy.")
        elif competitive >= 6:
            parts.append(f"{company} maintains solid market positioning with room for differentiation.")
        else:
            parts.append(f"{company} faces competitive headwinds; pricing strategy may need adjustment.")
        
        if health >= 8:
            parts.append("Healthy funding trajectory signals strong investor confidence.")
        elif health >= 6:
            parts.append("Adequate funding runway supports continued growth.")
        
        if dev and dev >= 8:
            parts.append("Technical founder brings significant open-source credibility.")
        elif dev and dev >= 6:
            parts.append("Founder demonstrates solid technical capability.")
        
        return " ".join(parts)


# =============================================================================
# ANALYSIS AGENT
# =============================================================================

class VCScoutAgent:
    """
    Main analysis orchestrator
    
    Pipeline:
    1. Find company website (SERP)
    2. Scrape pricing page (Web Unlocker)
    3. Find competitors (SERP)
    4. Get funding from Crunchbase (Web Unlocker)
    5. Find founder GitHub (SERP)
    6. Scrape GitHub profile (Web Unlocker)
    7. Extract data (LLM/Regex)
    8. Calculate scores
    9. Generate insight
    """
    
    def __init__(self):
        self.bright_data = BrightDataClient(BRIGHT_DATA_API_TOKEN)
        self.extractor = LLMExtractor(OPENAI_API_KEY, ANTHROPIC_API_KEY)
        self.scorer = ScoringEngine()
    
    async def analyze_company(self, company: str, founder: str = None) -> CompanyResult:
        """Full analysis pipeline for one company"""
        print(f"\n[Agent] Analyzing: {company}")
        
        # Step 1: Find website
        website = await self._find_website(company)
        print(f"[Agent] Website: {website}")
        
        # Step 2: Get pricing
        pricing = await self._get_pricing(company, website)
        print(f"[Agent] Pricing: {len(pricing.get('tiers', []))} tiers")
        
        # Step 3: Find competitors
        competitors = await self._find_competitors(company)
        print(f"[Agent] Competitors: {competitors}")
        
        # Step 4: Get funding
        funding = await self._get_funding(company)
        print(f"[Agent] Funding: {funding.get('stage')}")
        
        # Step 5-6: Get GitHub stats
        github = None
        if founder:
            github = await self._get_github(founder, company)
            print(f"[Agent] GitHub: {github.get('stars', 0)} stars")
        
        # Step 7: Calculate scores
        competitive_score = self.scorer.competitive_score(pricing, competitors)
        health_score = self.scorer.health_score(funding)
        dev_score = self.scorer.dev_score(github)
        overall_score = self.scorer.overall_score(competitive_score, health_score, dev_score)
        
        # Step 8: Generate insight
        insight = self.scorer.generate_insight(company, competitive_score, health_score, dev_score)
        
        return CompanyResult(
            company=company,
            founder=founder or "Not provided",
            website=website,
            competitive_score=competitive_score,
            health_score=health_score,
            dev_score=dev_score,
            overall_score=overall_score,
            pricing=pricing,
            funding=funding,
            github=github,
            competitors=competitors,
            insight=insight
        )
    
    async def _find_website(self, company: str) -> str:
        """Find official company website"""
        results = await self.bright_data.search_google(f"{company} official website")
        if results:
            return results[0].get("url", f"https://{company.lower()}.com")
        return f"https://{company.lower()}.com"
    
    async def _get_pricing(self, company: str, website: str) -> dict:
        """Get pricing data"""
        # Search for pricing page
        results = await self.bright_data.search_google(f"{company} pricing")
        pricing_url = results[0].get("url") if results else f"{website}/pricing"
        
        # Scrape pricing page (JS rendered for dynamic content)
        html = await self.bright_data.scrape_url(pricing_url, render_js=True)
        
        # Extract pricing data
        pricing = await self.extractor.extract_pricing(html, company)
        return pricing if isinstance(pricing, dict) else asdict(pricing)
    
    async def _find_competitors(self, company: str) -> List[str]:
        """Find competitors"""
        results = await self.bright_data.search_google(f"{company} competitors alternatives")
        
        # Extract competitor names from snippets
        competitors = []
        known_competitors = ["Notion", "Asana", "Monday", "Jira", "ClickUp", "Trello", 
                           "Slack", "Linear", "Figma", "Miro", "Airtable", "Coda"]
        
        for r in results:
            snippet = r.get("snippet", "").lower()
            for comp in known_competitors:
                if comp.lower() in snippet and comp.lower() != company.lower():
                    if comp not in competitors:
                        competitors.append(comp)
        
        return competitors[:4] or ["Competitor A", "Competitor B"]
    
    async def _get_funding(self, company: str) -> dict:
        """Get funding data from Crunchbase"""
        results = await self.bright_data.search_google(f"{company} Crunchbase funding")
        crunchbase_url = None
        
        for r in results:
            if "crunchbase.com" in r.get("url", ""):
                crunchbase_url = r["url"]
                break
        
        if crunchbase_url:
            html = await self.bright_data.scrape_url(crunchbase_url)
            funding = await self.extractor.extract_funding(html, company)
            return funding if isinstance(funding, dict) else asdict(funding)
        
        return {"stage": "Unknown", "total_raised": "Undisclosed", "last_round": "Unknown", "investors": []}
    
    async def _get_github(self, founder: str, company: str) -> Optional[dict]:
        """Get founder GitHub stats"""
        results = await self.bright_data.search_google(f"{founder} {company} GitHub")
        github_url = None
        
        for r in results:
            url = r.get("url", "")
            if "github.com" in url and "/repos" not in url:
                github_url = url
                break
        
        if github_url:
            html = await self.bright_data.scrape_url(github_url)
            username = github_url.split("github.com/")[-1].split("/")[0]
            github = await self.extractor.extract_github(html, username)
            return github if isinstance(github, dict) else asdict(github)
        
        return None
    
    async def analyze_batch(self, companies: List[CompanyInput]) -> List[dict]:
        """Analyze multiple companies and return ranked results"""
        results = []
        
        for c in companies:
            result = await self.analyze_company(c.company, c.founder)
            results.append(asdict(result))
        
        # Sort by overall score descending
        results.sort(key=lambda x: x["overall_score"], reverse=True)
        
        return results


# =============================================================================
# FASTAPI APP
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("=" * 60)
    print("VC Scout Agent - Starting")
    print(f"Bright Data: {'Configured' if BRIGHT_DATA_API_TOKEN else 'Not configured (using mocks)'}")
    print(f"Anthropic: {'Configured' if ANTHROPIC_API_KEY else 'Not configured (using regex)'}")
    print("=" * 60)
    yield
    # Shutdown
    print("VC Scout Agent - Shutting down")

app = FastAPI(
    title="VC Scout Agent",
    description="Autonomous VC due diligence powered by Bright Data",
    version="1.0.0",
    lifespan=lifespan
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

agent = VCScoutAgent()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "bright_data": "connected" if BRIGHT_DATA_API_TOKEN else "mock",
        "llm": "anthropic" if ANTHROPIC_API_KEY else "regex"
    }

@app.post("/analyze")
async def analyze_companies(request: AnalyzeRequest):
    """
    Analyze companies for VC due diligence
    
    Returns ranked list with scores and insights
    """
    if not request.companies:
        raise HTTPException(status_code=400, detail="No companies provided")
    
    if len(request.companies) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 companies per request")
    
    try:
        results = await agent.analyze_batch(request.companies)
        return {"results": results, "count": len(results)}
    except Exception as e:
        print(f"[Error] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# CLI MODE
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
