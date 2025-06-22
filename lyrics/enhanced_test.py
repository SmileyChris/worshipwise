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
Enhanced test with chord/tab search strategies
"""

import requests
import httpx
import re
from bs4 import BeautifulSoup
from duckduckgo_search import DDGS

def extract_lyrics_enhanced(html):
    """Enhanced lyrics extraction with chord/tab site support."""
    soup = BeautifulSoup(html, "html.parser")
    
    # Remove script/style tags
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
                    return lyrics_text.strip()[:1000]  # Limit length
    
    # Fallback to general text extraction
    text = soup.get_text("\n")
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    
    # Find lyrics sections (many short lines, excluding chords)
    groups = []
    current = []
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
    return lyrics.strip()[:1000] if lyrics.strip() else None

def search_lyrics_enhanced(title, artist=None, max_results=8):
    """Enhanced search with multiple strategies."""
    # Try multiple search strategies including chord/tab sites
    search_queries = [
        f"{title} {artist or ''} lyrics".strip(),
        f"{title} {artist or ''} chords lyrics".strip(),
        f"{title} {artist or ''} tabs".strip(),
        f"{title} {artist or ''} guitar chords".strip(),
    ]
    
    print(f"Using search strategies: {search_queries}")
    
    all_results = []
    
    for query in search_queries:
        try:
            print(f"Searching: {query}")
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=max_results//len(search_queries) + 1))
                print(f"  Found {len(results)} results")
                all_results.extend(results)
        except Exception as e:
            print(f"  Search failed: {e}")
            continue
    
    if not all_results:
        return None
    
    # Remove duplicates
    seen_urls = set()
    unique_results = []
    for res in all_results:
        url = res.get("href") or res.get("link")
        if url and url not in seen_urls:
            seen_urls.add(url)
            unique_results.append(res)
    
    print(f"Total unique URLs to try: {len(unique_results)}")
    
    client = httpx.Client(timeout=10, follow_redirects=True, headers={
        "User-Agent": "Mozilla/5.0 (LyricsTest)"
    })
    
    for i, res in enumerate(unique_results):
        url = res.get("href") or res.get("link")
        if not url:
            continue
        
        try:
            print(f"  Trying URL {i+1}/{len(unique_results)}: {url[:50]}...")
            response = client.get(url)
            response.raise_for_status()
            lyrics = extract_lyrics_enhanced(response.text)
            if lyrics:
                client.close()
                print(f"  ✓ Success! Found lyrics on URL {i+1}")
                return lyrics
        except Exception as e:
            print(f"  ✗ Failed: {e}")
            continue
    
    client.close()
    return None

def test_ollama(text, model="qwen3:1.7b"):
    """Test Ollama analysis."""
    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": model,
                "prompt": f"Analyze this worship song text. List 3 main themes and overall tone in 2-3 sentences: {text}",
                "stream": False,
                "options": {"temperature": 0.3, "num_predict": 150}
            },
            timeout=20
        )
        
        if response.status_code == 200:
            return response.json()["response"]
        else:
            return f"Ollama Error: {response.status_code}"
    except Exception as e:
        return f"Ollama Error: {e}"

def main():
    import sys
    
    if len(sys.argv) > 1:
        title = sys.argv[1]
        artist = sys.argv[2] if len(sys.argv) > 2 else None
    else:
        title = "Blessed Be Your Name"
        artist = "Matt Redman"
    
    print(f"Testing enhanced lyrics search for: '{title}' by {artist or 'Unknown'}")
    print("=" * 60)
    
    lyrics = search_lyrics_enhanced(title, artist)
    
    if lyrics:
        print(f"\n✓ Found lyrics ({len(lyrics)} chars)")
        print(f"Sample:\n{lyrics[:200]}...")
        
        print("\nTesting Ollama analysis...")
        analysis = test_ollama(lyrics)
        print(f"Analysis: {analysis}")
    else:
        print("\n✗ No lyrics found")

if __name__ == "__main__":
    main()