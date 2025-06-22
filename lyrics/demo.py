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
Demo of enhanced lyrics search with chord/tab sources
"""

from enhanced_test import search_lyrics_enhanced, test_ollama

def demo_song(title, artist=None):
    """Demo analysis for a specific song."""
    print(f"\n{'='*60}")
    print(f"🎵 DEMO: {title}" + (f" by {artist}" if artist else ""))
    print('='*60)
    
    lyrics = search_lyrics_enhanced(title, artist, max_results=6)
    
    if lyrics:
        print(f"\n✅ SUCCESS! Found lyrics ({len(lyrics)} chars)")
        print(f"\nFirst 300 characters:")
        print("-" * 40)
        print(lyrics[:300] + "...")
        print("-" * 40)
        
        print(f"\n🤖 Ollama Analysis:")
        analysis = test_ollama(lyrics)
        print(analysis)
    else:
        print(f"\n❌ No lyrics found for '{title}'")
    
    return lyrics is not None

def main():
    """Run demo with various songs."""
    print("🎵 ENHANCED LYRICS SEARCH DEMO")
    print("Testing chord/tab site integration")
    print("\nThis demo shows how the enhanced search finds lyrics from:")
    print("• Traditional lyrics sites")
    print("• Guitar chord sites") 
    print("• Tab sites")
    print("• Music teaching sites")
    
    # Test songs that are commonly found on chord/tab sites
    test_songs = [
        ("Amazing Grace", None),
        ("How Great Thou Art", None),
        ("Blessed Be Your Name", "Matt Redman"),
        ("10,000 Reasons", "Matt Redman"),
        ("Good Good Father", "Chris Tomlin"),
    ]
    
    successful = 0
    total = len(test_songs)
    
    for title, artist in test_songs:
        if demo_song(title, artist):
            successful += 1
    
    print(f"\n{'='*60}")
    print(f"📊 DEMO RESULTS: {successful}/{total} songs found")
    print(f"Success rate: {(successful/total)*100:.1f}%")
    print("="*60)
    
    if successful > 0:
        print("\n✅ Enhanced search with chord/tab sites is working!")
        print("The system successfully finds lyrics from multiple source types.")
    else:
        print("\n❌ No lyrics found. Check your internet connection.")

if __name__ == "__main__":
    main()