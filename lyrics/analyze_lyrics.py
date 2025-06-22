#!/usr/bin/env python3
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
    python analyze_lyrics.py "Amazing Grace" "John Newton"
    python analyze_lyrics.py "How Great Thou Art"
"""

import argparse
import json
import subprocess
import sys
from dataclasses import dataclass, asdict
from typing import Optional, List, Dict, Any
import requests


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


class MCPLyricsClient:
    """Client for interacting with the MCP lyrics server."""
    
    def __init__(self, server_script: str = "./lyrics_search_mcp_server.py"):
        self.server_script = server_script
    
    def get_lyrics(self, title: str, artist: Optional[str] = None) -> str:
        """Fetch lyrics using the MCP server."""
        try:
            # Build command to run MCP server with tool call
            cmd = [
                "uv", "run", self.server_script,
                "--tool", "get_lyrics",
                "--args", json.dumps({"title": title, "artist": artist})
            ]
            
            result = subprocess.run(
                cmd, 
                capture_output=True, 
                text=True, 
                timeout=30
            )
            
            if result.returncode == 0:
                return result.stdout.strip()
            else:
                print(f"MCP server error: {result.stderr}", file=sys.stderr)
                return "Lyrics not found."
                
        except subprocess.TimeoutExpired:
            print("MCP server timeout", file=sys.stderr)
            return "Lyrics not found."
        except Exception as e:
            print(f"Error calling MCP server: {e}", file=sys.stderr)
            return "Lyrics not found."


class OllamaAnalyzer:
    """Analyzer using Ollama for lyrics analysis."""
    
    def __init__(self, model: str = "llama3.2", base_url: str = "http://localhost:11434"):
        self.model = model
        self.base_url = base_url
    
    def _make_request(self, prompt: str) -> str:
        """Make request to Ollama API."""
        try:
            response = requests.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.3,
                        "top_p": 0.9
                    }
                },
                timeout=60
            )
            
            if response.status_code == 200:
                return response.json()["response"]
            else:
                print(f"Ollama API error: {response.status_code}", file=sys.stderr)
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
        
        analysis_prompt = f"""
Analyze these worship song lyrics for church service planning. Provide a structured analysis in JSON format.

Song: {title}
Artist: {artist or "Unknown"}

Lyrics:
{lyrics[:2000]}...

Please analyze and return JSON with these fields:
- themes: Array of main theological/spiritual themes (max 5)
- biblical_references: Array of specific biblical concepts or imagery
- worship_elements: Array of worship aspects (praise, prayer, confession, etc.)
- emotional_tone: Single word describing overall emotional character
- service_placement: Recommended placement (opening, worship, communion, closing)
- seasonal_appropriateness: Array of appropriate seasons/occasions
- complexity_level: "Simple", "Moderate", or "Complex" for congregation singing
- summary: 2-3 sentence summary for worship planners

Return only valid JSON, no additional text.
"""
        
        response = self._make_request(analysis_prompt)
        
        try:
            # Try to parse JSON response
            analysis_data = json.loads(response)
            
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
            
        except json.JSONDecodeError:
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
    lyrics_client = MCPLyricsClient(args.mcp_server)
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