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
Direct test of lyrics fetching and Ollama
"""

import requests
import httpx
import re
from bs4 import BeautifulSoup
from urllib.parse import quote

def extract_lyrics(html):
    """Extract lyrics from HTML."""
    soup = BeautifulSoup(html, "html.parser")
    
    # Remove script/style tags
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    
    text = soup.get_text("\n")
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    
    # Find lyrics sections (many short lines)
    groups = []
    current = []
    for ln in lines:
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

def search_lyrics(title, artist=None, max_results=5):
    """Search for lyrics using alternative methods with detailed feedback."""
    print(f"🔍 Searching for: '{title}' {f'by {artist}' if artist else ''}")
    print("=" * 60)
    
    # Method 1: Try direct Christian/worship lyrics sites
    if artist:
        print("📖 Step 1: Checking Christian/worship lyrics databases...")
        direct_urls = get_direct_lyrics_urls(title, artist)
        for i, url in enumerate(direct_urls, 1):
            site_name = url.split('/')[2]  # Extract domain
            print(f"  {i}. Trying {site_name}...")
            lyrics = fetch_lyrics_from_url(url)
            if lyrics:
                print(f"  ✅ Found lyrics on {site_name}!")
                return lyrics
            else:
                print(f"  ❌ Not found on {site_name}")
    else:
        print("⚠️  Step 1: Skipped (no artist provided for direct URLs)")
    
    # Method 2: Try Genius search with Christian keywords
    print("\n🎵 Step 2: Searching Genius with worship/Christian keywords...")
    genius_urls = search_genius(title, artist)
    if genius_urls:
        print(f"  Found {len(genius_urls)} potential matches on Genius")
        for i, url in enumerate(genius_urls[:3], 1):
            full_url = f"https://genius.com{url}" if not url.startswith('http') else url
            song_title = url.split('/')[-1].replace('-lyrics', '').replace('-', ' ').title()
            print(f"  {i}. Trying: {song_title}")
            lyrics = fetch_lyrics_from_url(full_url)
            if lyrics:
                print(f"  ✅ Found lyrics for: {song_title}")
                return lyrics
            else:
                print(f"  ❌ Could not extract lyrics from: {song_title}")
    else:
        print("  ❌ No matches found on Genius")
    
    # Method 3: Try Google search with Christian filters
    print("\n🔍 Step 3: Google search with Christian/worship filters...")
    google_urls = search_google_lyrics(title, artist)
    if google_urls:
        print(f"  Found {len(google_urls)} filtered search results")
        for i, url in enumerate(google_urls[:3], 1):
            site_name = url.split('/')[2] if '/' in url else url
            print(f"  {i}. Trying {site_name}...")
            lyrics = fetch_lyrics_from_url(url)
            if lyrics:
                print(f"  ✅ Found lyrics on {site_name}!")
                return lyrics
            else:
                print(f"  ❌ Could not extract lyrics from {site_name}")
    else:
        print("  ❌ No suitable Christian/worship sites found in search results")
    
    print("\n❌ Search completed - no lyrics found from online sources")
    print("💡 Using sample lyrics for demonstration purposes")
    return None

def get_direct_lyrics_urls(title, artist):
    """Generate direct URLs for known lyrics sites, prioritizing Christian sources."""
    artist_slug = re.sub(r'[^a-zA-Z0-9]', '-', artist.lower()).strip('-')
    title_slug = re.sub(r'[^a-zA-Z0-9]', '-', title.lower()).strip('-')
    artist_clean = re.sub(r'[^a-zA-Z0-9]', '', artist.lower())
    title_clean = re.sub(r'[^a-zA-Z0-9]', '', title.lower())
    
    # Prioritize Christian/worship lyrics sites
    urls = [
        f"https://hymnary.org/text/{title_slug}",  # Christian hymn database
        f"https://www.worshiptogether.com/songs/{title_slug}-{artist_slug}/",
        f"https://www.christianlyrics.com/{artist_slug}/{title_slug}.html",
        f"https://www.lyrics.com/lyrics/{artist_slug}/{title_slug}",
        f"https://www.songlyrics.com/{artist_slug}/{title_slug}-lyrics/",
        f"https://www.azlyrics.com/lyrics/{artist_clean}/{title_clean}.html"
    ]
    return urls

def search_genius(title, artist=None):
    """Search Genius for Christian/worship song URLs."""
    # Add Christian/worship keywords to improve targeting
    base_query = f"{title} {artist or ''}".strip()
    queries = [
        f"{base_query} worship song lyrics",
        f"{base_query} Christian song lyrics", 
        f"{base_query} hymn lyrics",
        base_query  # Fallback to basic search
    ]
    
    for query in queries:
        url = f"https://genius.com/search?q={quote(query)}"
        try:
            response = requests.get(url, headers={"User-Agent": "Mozilla/5.0 (LyricsBot)"}, timeout=10)
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                links = soup.find_all('a', href=re.compile(r'/.*-lyrics$'))
                if links:
                    return [link['href'] for link in links[:5]]
        except Exception as e:
            print(f"Genius search failed for '{query}': {e}")
            continue
    
    return []

def search_google_lyrics(title, artist=None):
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
            response = requests.get(url, headers={"User-Agent": "Mozilla/5.0 (LyricsBot)"}, timeout=10)
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
        except Exception as e:
            print(f"Google search failed for '{query}': {e}")
            continue
    
    return []

def fetch_lyrics_from_url(url):
    """Fetch and extract lyrics from a URL with detailed feedback."""
    try:
        response = requests.get(url, 
                              headers={"User-Agent": "Mozilla/5.0 (LyricsBot)"}, 
                              timeout=10)
        
        if response.status_code == 200:
            lyrics = extract_lyrics(response.text)
            if lyrics and len(lyrics) > 100:
                # Check if this looks like a worship/Christian song
                christian_indicators = ['lord', 'god', 'jesus', 'christ', 'holy', 'praise', 
                                      'worship', 'hallelujah', 'amen', 'savior', 'heaven']
                lyrics_lower = lyrics.lower()
                christian_score = sum(1 for word in christian_indicators if word in lyrics_lower)
                
                if christian_score >= 2:
                    indicator = "🙏 (Christian content detected)"
                elif christian_score >= 1:
                    indicator = "⛪ (Religious content detected)"
                else:
                    indicator = "📝 (General lyrics)"
                
                print(f"    ✅ Found lyrics! ({len(lyrics)} chars) {indicator}")
                return lyrics[:1000]  # Limit to avoid copyright issues
            else:
                print(f"    ❌ Page loaded but no lyrics extracted")
        elif response.status_code == 404:
            print(f"    ❌ Page not found (404)")
        elif response.status_code == 403:
            print(f"    ❌ Access denied (403)")
        else:
            print(f"    ❌ HTTP error {response.status_code}")
            
    except requests.exceptions.Timeout:
        print(f"    ❌ Request timed out")
    except requests.exceptions.ConnectionError:
        print(f"    ❌ Connection failed")
    except Exception as e:
        print(f"    ❌ Error: {str(e)[:50]}...")
    
    return None

def test_ollama(text, model="qwen3:1.7b"):
    """Test Ollama analysis."""
    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": model,
                "prompt": f"Analyze this worship song text. List 3 main themes and the overall tone: {text}",
                "stream": False,
                "options": {"temperature": 0.3}
            },
            timeout=30
        )
        
        if response.status_code == 200:
            return response.json()["response"]
        else:
            return f"Ollama Error: {response.status_code}"
    except Exception as e:
        return f"Ollama Error: {e}"

def main():
    print("Testing lyrics search...")
    lyrics = search_lyrics("How Great Thou Art")
    
    if not lyrics:
        print("✗ Network search failed, using sample lyrics for testing...")
        # Use sample lyrics when network fails
        lyrics = """How great Thou art, how great Thou art
Then sings my soul, my Savior God to Thee
How great Thou art, how great Thou art

O Lord my God, when I in awesome wonder
Consider all the worlds Thy hands have made
I see the stars, I hear the rolling thunder
Thy power throughout the universe displayed

Then sings my soul, my Savior God to Thee
How great Thou art, how great Thou art
Then sings my soul, my Savior God to Thee
How great Thou art, how great Thou art"""
    
    if lyrics:
        print(f"✓ Found lyrics ({len(lyrics)} chars)")
        print(f"Sample: {lyrics[:100]}...")
        
        print("\nTesting Ollama analysis...")
        analysis = test_ollama(lyrics)
        print(f"Analysis: {analysis}")
    else:
        print("✗ Complete failure - no lyrics available")

if __name__ == "__main__":
    main()