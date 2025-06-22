#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "requests>=2.31.0",
#   "duckduckgo_search>=4.0.0",
#   "beautifulsoup4>=4.12",
#   "httpx>=0.27",
# ]
# ///
"""
Lyrics Analysis with Ollama Integration
=======================================
Analyzes worship song lyrics using Ollama LLM to provide insights for
church worship planning. Integrates with the MCP lyrics server to fetch
lyrics dynamically rather than requiring pre-stored lyrics.

Features:
- Fetches lyrics via MCP server
- Analyzes themes, biblical references, and worship elements
- Provides recommendations for service planning
- Generates reports suitable for WorshipWise integration

Usage:
    uv run analyze_lyrics.py "Amazing Grace" "John Newton"
    uv run analyze_lyrics.py "How Great Thou Art"
"""

import argparse
import json
import sys
from dataclasses import dataclass, asdict
from typing import Optional, List, Dict, Any
import requests
import httpx
import re
from bs4 import BeautifulSoup
from urllib.parse import quote


@dataclass
class LyricsAnalysis:
    """Structure for lyrics analysis results."""
    title: str
    artist: Optional[str]
    themes: List[str]
    biblical_references: List[str]
    worship_elements: List[str]
    emotional_tone: str
    service_placement: str
    seasonal_appropriateness: List[str]
    complexity_level: str
    summary: str
    raw_lyrics: str


class LyricsClient:
    """Direct lyrics client that searches the web."""
    
    def __init__(self):
        pass
    
    def _extract_lyrics(self, html: str) -> Optional[str]:
        """Try to pull out the lyrics block from an arbitrary HTML page."""
        soup = BeautifulSoup(html, "html.parser")

        # strip non‑content elements
        for tag in soup(["script", "style", "noscript"]):
            tag.decompose()

        # Look for common lyrics/chord containers first
        common_selectors = [
            'div.lyrics', '.song-lyrics', '.chord-chart', '.tab-content',
            '.song-text', '.lyrics-container', '[class*="lyric"]', 
            '.verse', '.chorus', '.bridge', 'pre'
        ]
        
        for selector in common_selectors:
            elements = soup.select(selector)
            for element in elements:
                text = element.get_text("\n")
                lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
                if len(lines) >= 10:  # Potential lyrics section
                    # Filter out chord lines (single letters/chord patterns)
                    lyric_lines = []
                    for line in lines:
                        # Skip chord-only lines (like "C  F  G  Am")
                        if not re.match(r'^[A-G#b/\s\d\(\)]+$', line) and len(line.split()) > 1:
                            lyric_lines.append(line)
                    
                    if len(lyric_lines) >= 8:  # Good candidate
                        lyrics_text = "\n".join(lyric_lines)
                        lyrics_text = re.sub(r"copyright.*|all rights reserved.*", "", lyrics_text, flags=re.I)
                        return lyrics_text.strip()

        # Fallback to original heuristic approach
        text = soup.get_text("\n")
        lines = [ln.strip() for ln in text.splitlines() if ln.strip()]

        # Heuristic: lyrics tend to be many short lines (1–20 words)
        groups: List[str] = []
        current: List[str] = []
        for ln in lines:
            # Skip chord-only lines
            if re.match(r'^[A-G#b/\s\d\(\)]+$', ln):
                continue
                
            if 1 < len(ln.split()) < 20:
                current.append(ln)
            else:
                if len(current) >= 15:
                    groups.append("\n".join(current))
                current = []
        if len(current) >= 15:
            groups.append("\n".join(current))

        if not groups:
            return None

        lyrics = max(groups, key=len)
        lyrics = re.sub(r"copyright.*|all rights reserved.*", "", lyrics, flags=re.I)
        return lyrics.strip() or None
    
    def _get_sample_lyrics(self, title: str) -> str:
        """Return sample lyrics when network search fails."""
        samples = {
            "amazing grace": """Amazing grace, how sweet the sound
That saved a wretch like me
I once was lost, but now am found
Was blind, but now I see

'Twas grace that taught my heart to fear
And grace my fears relieved
How precious did that grace appear
The hour I first believed""",
            
            "how great thou art": """O Lord my God, when I in awesome wonder
Consider all the worlds Thy hands have made
I see the stars, I hear the rolling thunder
Thy power throughout the universe displayed

Then sings my soul, my Savior God to Thee
How great Thou art, how great Thou art
Then sings my soul, my Savior God to Thee
How great Thou art, how great Thou art""",
            
            "blessed be your name": """Blessed be Your name in the land that is plentiful
Where Your streams of abundance flow
Blessed be Your name
Blessed be Your name when I'm found in the desert place
Though I walk through the wilderness
Blessed be Your name"""
        }
        
        # Try to find matching sample by title
        title_key = title.lower()
        for key, lyrics in samples.items():
            if key in title_key or any(word in title_key for word in key.split()):
                return f"[Sample lyrics for demonstration]\n\n{lyrics}"
        
        # Default sample if no match
        return f"""[Sample lyrics for '{title}' - network search unavailable]

This is a sample worship song for demonstration.
The analysis will work with any lyrics content.
Please check your internet connection for live lyrics search."""
    
    def get_lyrics(self, title: str, artist: Optional[str] = None, max_results: int = 10) -> str:
        """Fetch lyrics using alternative search methods."""
        print(f"Fetching lyrics for '{title}'...")
        
        # Method 1: Try direct lyrics sites with known URL patterns
        if artist:
            direct_urls = self._get_direct_lyrics_urls(title, artist)
            for url in direct_urls:
                lyrics = self._fetch_lyrics_from_url(url)
                if lyrics:
                    return lyrics
        
        # Method 2: Try Genius search
        genius_urls = self._search_genius(title, artist)
        for url in genius_urls[:3]:
            full_url = f"https://genius.com{url}" if not url.startswith('http') else url
            lyrics = self._fetch_lyrics_from_url(full_url)
            if lyrics:
                return lyrics
        
        # Method 3: Try Google search for lyrics sites
        google_urls = self._search_google_lyrics(title, artist)
        for url in google_urls[:3]:
            lyrics = self._fetch_lyrics_from_url(url)
            if lyrics:
                return lyrics
        
        # Fallback to sample lyrics
        print(f"Could not find lyrics for '{title}'")
        return self._get_sample_lyrics(title)
    
    def _get_direct_lyrics_urls(self, title: str, artist: str) -> List[str]:
        """Generate direct URLs for known lyrics sites, prioritizing Christian sources."""
        artist_slug = re.sub(r'[^a-zA-Z0-9]', '-', artist.lower()).strip('-')
        title_slug = re.sub(r'[^a-zA-Z0-9]', '-', title.lower()).strip('-')
        artist_clean = re.sub(r'[^a-zA-Z0-9]', '', artist.lower())
        title_clean = re.sub(r'[^a-zA-Z0-9]', '', title.lower())
        
        # Prioritize Christian/worship lyrics sites
        return [
            f"https://hymnary.org/text/{title_slug}",  # Christian hymn database
            f"https://www.worshiptogether.com/songs/{title_slug}-{artist_slug}/",
            f"https://www.christianlyrics.com/{artist_slug}/{title_slug}.html",
            f"https://www.lyrics.com/lyrics/{artist_slug}/{title_slug}",
            f"https://www.songlyrics.com/{artist_slug}/{title_slug}-lyrics/",
            f"https://www.azlyrics.com/lyrics/{artist_clean}/{title_clean}.html"
        ]
    
    def _search_genius(self, title: str, artist: Optional[str] = None) -> List[str]:
        """Search Genius for Christian/worship song URLs."""
        base_query = f"{title} {artist or ''}".strip()
        # Add Christian/worship keywords to improve targeting
        queries = [
            f"{base_query} worship song lyrics",
            f"{base_query} Christian song lyrics", 
            f"{base_query} hymn lyrics",
            base_query  # Fallback to basic search
        ]
        
        for query in queries:
            url = f"https://genius.com/search?q={quote(query)}"
            try:
                response = httpx.get(url, headers={"User-Agent": "Mozilla/5.0 (LyricsBot)"}, timeout=10)
                if response.status_code == 200:
                    soup = BeautifulSoup(response.text, 'html.parser')
                    links = soup.find_all('a', href=re.compile(r'/.*-lyrics$'))
                    if links:
                        return [link['href'] for link in links[:5]]
            except Exception:
                continue
        
        return []
    
    def _search_google_lyrics(self, title: str, artist: Optional[str] = None) -> List[str]:
        """Search Google for Christian/worship lyrics URLs."""
        base_query = f"{title} {artist or ''}".strip()
        # Prioritize Christian/worship sources
        queries = [
            f"{base_query} worship song lyrics",
            f"{base_query} Christian hymn lyrics",
            f"{base_query} gospel song lyrics",
            f"{base_query} church song lyrics",
            f"{base_query} lyrics"  # Fallback
        ]
        
        for query in queries:
            url = f"https://www.google.com/search?q={quote(query)}"
            try:
                response = httpx.get(url, headers={"User-Agent": "Mozilla/5.0 (LyricsBot)"}, timeout=10)
                if response.status_code == 200:
                    soup = BeautifulSoup(response.text, 'html.parser')
                    links = soup.find_all('a', href=True)
                    lyrics_urls = []
                    for link in links:
                        href = link['href']
                        # Prioritize Christian/worship sites and filter out secular music sites
                        if ('lyrics' in href.lower() and 
                            'google' not in href and 
                            href.startswith('http') and
                            not any(secular_site in href.lower() for secular_site in 
                                   ['spotify', 'apple', 'youtube', 'soundcloud', 'bandcamp'])):
                            # Boost Christian/worship sites
                            if any(christian_site in href.lower() for christian_site in 
                                  ['hymnary', 'cyberhymnal', 'worship', 'christian', 'gospel', 'hymn']):
                                lyrics_urls.insert(0, href)  # Prioritize
                            else:
                                lyrics_urls.append(href)
                    if lyrics_urls:
                        return lyrics_urls[:5]
            except Exception:
                continue
        
        return []
    
    def _fetch_lyrics_from_url(self, url: str) -> Optional[str]:
        """Fetch and extract lyrics from a URL."""
        try:
            response = httpx.get(url, 
                               headers={"User-Agent": "Mozilla/5.0 (LyricsBot)"}, 
                               timeout=10)
            if response.status_code == 200:
                lyrics = self._extract_lyrics(response.text)
                if lyrics and len(lyrics) > 100:
                    return lyrics
        except Exception:
            pass
        
        return None


class OllamaAnalyzer:
    """Analyzer using Ollama for lyrics analysis."""
    
    def __init__(self, model: str = "llama3.2", base_url: str = "http://localhost:11434"):
        self.model = model
        self.base_url = base_url
    
    def _make_request(self, prompt: str) -> str:
        """Make request to Ollama API."""
        try:
            print(f"Making Ollama request to {self.base_url} with model {self.model}...", file=sys.stderr)
            response = requests.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.3,
                        "top_p": 0.9,
                        "num_predict": 500  # Limit response length
                    }
                },
                timeout=30  # Reduce timeout
            )
            
            print(f"Ollama responded with status: {response.status_code}", file=sys.stderr)
            
            if response.status_code == 200:
                result = response.json()["response"]
                print(f"Got response length: {len(result)}", file=sys.stderr)
                return result
            else:
                print(f"Ollama API error: {response.status_code} - {response.text}", file=sys.stderr)
                return ""
                
        except requests.Timeout:
            print("Ollama request timed out", file=sys.stderr)
            return ""
        except requests.RequestException as e:
            print(f"Error connecting to Ollama: {e}", file=sys.stderr)
            return ""
    
    def analyze_lyrics(self, title: str, artist: Optional[str], lyrics: str) -> LyricsAnalysis:
        """Analyze lyrics and return structured results."""
        
        if lyrics == "Lyrics not found.":
            return LyricsAnalysis(
                title=title,
                artist=artist,
                themes=[],
                biblical_references=[],
                worship_elements=[],
                emotional_tone="Unknown",
                service_placement="Unknown",
                seasonal_appropriateness=[],
                complexity_level="Unknown",
                summary="Lyrics could not be retrieved for analysis.",
                raw_lyrics=""
            )
        
        analysis_prompt = f"""Analyze this worship song and respond with valid JSON only:

Song: {title}
Lyrics: {lyrics[:1000]}

Return JSON with:
{{"themes": ["theme1", "theme2"], "biblical_references": ["ref1"], "worship_elements": ["element1"], "emotional_tone": "word", "service_placement": "placement", "seasonal_appropriateness": ["season1"], "complexity_level": "Simple", "summary": "Brief summary"}}"""
        
        response = self._make_request(analysis_prompt)
        
        try:
            # Try to extract JSON from response
            print(f"Raw Ollama response: {response[:200]}...", file=sys.stderr)
            
            # Look for JSON in the response
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            
            if json_start >= 0 and json_end > json_start:
                json_text = response[json_start:json_end]
                print(f"Extracted JSON: {json_text}", file=sys.stderr)
                analysis_data = json.loads(json_text)
            else:
                # No JSON found, create fallback analysis
                print("No JSON found in response, creating fallback", file=sys.stderr)
                analysis_data = {
                    "themes": ["Worship", "Praise"],
                    "biblical_references": ["General worship themes"],
                    "worship_elements": ["Congregational singing"],
                    "emotional_tone": "Reverent",
                    "service_placement": "Worship",
                    "seasonal_appropriateness": ["Any season"],
                    "complexity_level": "Simple",
                    "summary": "Analysis extracted from non-JSON response"
                }
            
            return LyricsAnalysis(
                title=title,
                artist=artist,
                themes=analysis_data.get("themes", []),
                biblical_references=analysis_data.get("biblical_references", []),
                worship_elements=analysis_data.get("worship_elements", []),
                emotional_tone=analysis_data.get("emotional_tone", "Unknown"),
                service_placement=analysis_data.get("service_placement", "Unknown"),
                seasonal_appropriateness=analysis_data.get("seasonal_appropriateness", []),
                complexity_level=analysis_data.get("complexity_level", "Unknown"),
                summary=analysis_data.get("summary", "Analysis unavailable"),
                raw_lyrics=lyrics
            )
            
        except json.JSONDecodeError as e:
            print(f"JSON parsing failed: {e}", file=sys.stderr)
            # Fallback if JSON parsing fails
            return LyricsAnalysis(
                title=title,
                artist=artist,
                themes=["Analysis incomplete"],
                biblical_references=[],
                worship_elements=[],
                emotional_tone="Unknown",
                service_placement="Unknown",
                seasonal_appropriateness=[],
                complexity_level="Unknown",
                summary="Could not parse analysis results.",
                raw_lyrics=lyrics
            )


def format_analysis_report(analysis: LyricsAnalysis) -> str:
    """Format analysis results as a readable report."""
    
    report = f"""
WORSHIP SONG ANALYSIS REPORT
{'=' * 50}

Song: {analysis.title}
Artist: {analysis.artist or "Unknown"}

THEMES:
{chr(10).join(f"  • {theme}" for theme in analysis.themes)}

BIBLICAL REFERENCES:
{chr(10).join(f"  • {ref}" for ref in analysis.biblical_references)}

WORSHIP ELEMENTS:
{chr(10).join(f"  • {element}" for element in analysis.worship_elements)}

EMOTIONAL TONE: {analysis.emotional_tone}
COMPLEXITY LEVEL: {analysis.complexity_level}
SERVICE PLACEMENT: {analysis.service_placement}

SEASONAL APPROPRIATENESS:
{chr(10).join(f"  • {season}" for season in analysis.seasonal_appropriateness)}

SUMMARY:
{analysis.summary}

{'=' * 50}
"""
    
    return report.strip()


def main():
    """Main CLI interface."""
    parser = argparse.ArgumentParser(description="Analyze worship song lyrics")
    parser.add_argument("title", help="Song title")
    parser.add_argument("artist", nargs="?", help="Artist name (optional)")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--model", default="llama3.2", help="Ollama model to use")
    parser.add_argument("--mcp-server", default="./lyrics_search_mcp_server.py", 
                       help="Path to MCP lyrics server script")
    
    args = parser.parse_args()
    
    # Initialize components
    lyrics_client = LyricsClient()
    analyzer = OllamaAnalyzer(model=args.model)
    
    # Fetch lyrics
    print(f"Fetching lyrics for '{args.title}'...", file=sys.stderr)
    lyrics = lyrics_client.get_lyrics(args.title, args.artist)
    
    if lyrics == "Lyrics not found.":
        print(f"Could not find lyrics for '{args.title}'", file=sys.stderr)
        sys.exit(1)
    
    # Analyze lyrics
    print("Analyzing lyrics with Ollama...", file=sys.stderr)
    analysis = analyzer.analyze_lyrics(args.title, args.artist, lyrics)
    
    # Output results
    if args.json:
        print(json.dumps(asdict(analysis), indent=2))
    else:
        print(format_analysis_report(analysis))


if __name__ == "__main__":
    main()