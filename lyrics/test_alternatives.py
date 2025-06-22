#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "requests>=2.31.0",
#   "beautifulsoup4>=4.12",
#   "httpx>=0.27",
# ]
# ///
"""
Test alternative search methods for lyrics
"""

import requests
import httpx
import re
from bs4 import BeautifulSoup
from urllib.parse import quote

def test_genius_search(title, artist=None):
    """Try Genius lyrics API/scraping"""
    query = f"{title} {artist or ''}".strip()
    
    # Try Genius search page directly
    url = f"https://genius.com/search?q={quote(query)}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            # Look for song links
            links = soup.find_all('a', href=re.compile(r'/.*-lyrics$'))
            if links:
                print(f"✓ Found {len(links)} potential songs on Genius")
                return links[0]['href']
        return None
    except Exception as e:
        print(f"Genius search failed: {e}")
        return None

def test_azlyrics_search(title, artist=None):
    """Try AZLyrics direct URL construction"""
    if artist:
        # AZLyrics uses specific URL format
        artist_clean = re.sub(r'[^a-zA-Z0-9]', '', artist.lower())
        title_clean = re.sub(r'[^a-zA-Z0-9]', '', title.lower())
        url = f"https://www.azlyrics.com/lyrics/{artist_clean}/{title_clean}.html"
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code == 200:
                print(f"✓ Found song on AZLyrics: {url}")
                return url
        except Exception as e:
            print(f"AZLyrics failed: {e}")
    
    return None

def test_google_search(query):
    """Try basic Google search (may be rate limited)"""
    url = f"https://www.google.com/search?q={quote(query + ' lyrics')}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            # Look for search result links
            links = soup.find_all('a', href=True)
            lyrics_links = [link['href'] for link in links 
                          if 'lyrics' in link['href'].lower() and 'google' not in link['href']]
            if lyrics_links:
                print(f"✓ Found {len(lyrics_links)} lyrics links via Google")
                return lyrics_links[:3]
        return None
    except Exception as e:
        print(f"Google search failed: {e}")
        return None

def test_direct_lyrics_sites(title, artist=None):
    """Try known lyrics sites directly"""
    sites = [
        "https://www.lyrics.com/lyrics/{artist}/{title}",
        "https://www.metrolyrics.com/{title}-lyrics-{artist}.html",
        "https://www.songlyrics.com/{artist}/{title}-lyrics/"
    ]
    
    if not artist:
        return None
        
    artist_slug = re.sub(r'[^a-zA-Z0-9]', '-', artist.lower()).strip('-')
    title_slug = re.sub(r'[^a-zA-Z0-9]', '-', title.lower()).strip('-')
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    
    working_urls = []
    for site_template in sites:
        url = site_template.format(artist=artist_slug, title=title_slug)
        try:
            response = requests.head(url, headers=headers, timeout=5)
            if response.status_code == 200:
                working_urls.append(url)
                print(f"✓ Found working URL: {url}")
        except:
            continue
    
    return working_urls

def main():
    print("Testing alternative lyrics search methods...")
    
    title = "Amazing Grace"
    artist = "John Newton"
    
    print(f"\nSearching for: {title} by {artist}")
    print("=" * 50)
    
    # Test Genius
    print("\n1. Testing Genius...")
    genius_result = test_genius_search(title, artist)
    
    # Test AZLyrics
    print("\n2. Testing AZLyrics...")
    azlyrics_result = test_azlyrics_search(title, artist)
    
    # Test Google
    print("\n3. Testing Google search...")
    google_results = test_google_search(f"{title} {artist}")
    
    # Test direct sites
    print("\n4. Testing direct lyrics sites...")
    direct_results = test_direct_lyrics_sites(title, artist)
    
    print("\n" + "=" * 50)
    print("SUMMARY:")
    print(f"Genius: {'✓' if genius_result else '✗'}")
    print(f"AZLyrics: {'✓' if azlyrics_result else '✗'}")
    print(f"Google: {'✓' if google_results else '✗'}")
    print(f"Direct sites: {'✓' if direct_results else '✗'}")

if __name__ == "__main__":
    main()