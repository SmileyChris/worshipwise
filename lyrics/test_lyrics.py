#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "requests>=2.31.0",
#   "fastmcp>=2.0.0",
#   "duckduckgo_search>=4.0.0",
#   "beautifulsoup4>=4.12",
#   "httpx>=0.27",
# ]
# ///
"""
Simple test of lyrics fetching and Ollama analysis
"""

import requests
import json
from lyrics_search_mcp_server import get_lyrics

def test_ollama(text, model="qwen3:1.7b"):
    """Simple test of Ollama API"""
    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": model,
                "prompt": f"Analyze this worship song text and provide 3 main themes: {text[:500]}...",
                "stream": False,
                "options": {"temperature": 0.3}
            },
            timeout=30
        )
        
        if response.status_code == 200:
            return response.json()["response"]
        else:
            return f"Error: {response.status_code}"
    except Exception as e:
        return f"Error: {e}"

def main():
    print("Testing lyrics fetching...")
    lyrics = get_lyrics("How Great Thou Art")
    print(f"Lyrics found: {len(lyrics)} characters")
    print(f"First 200 chars: {lyrics[:200]}...")
    
    print("\nTesting Ollama analysis...")
    analysis = test_ollama(lyrics)
    print(f"Analysis: {analysis}")

if __name__ == "__main__":
    main()