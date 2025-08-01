#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "fastmcp>=2.0.0",
#   "duckduckgo_search>=4.0.0",
#   "beautifulsoup4>=4.12",
#   "httpx>=0.27",
# ]
# ///
"""
Lyrics Search MCP Server
=======================
A lightweight Model Context Protocol (MCP) server that lets an LLM retrieve
song lyrics from the public web using DuckDuckGo search and simple HTML
parsing.  Designed to be self‑contained so it can be executed via

    uv run lyrics_search_mcp_server.py

without any prior environment setup.  All dependencies are declared inline
for automatic resolution by **uv**.

Tools exposed
-------------
get_lyrics(title: str, artist: str | None = None, max_results: int = 10) -> str
    Search the web for lyrics of *title* (optionally by *artist*). Returns the
    raw lyric text or the string "Lyrics not found." if unsuccessful.
"""
from __future__ import annotations

import re
from typing import Optional

import httpx
from bs4 import BeautifulSoup
from duckduckgo_search import DDGS
from fastmcp import FastMCP


mcp = FastMCP("Lyrics Search MCP")


def _extract_lyrics(html: str) -> Optional[str]:
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
    groups: list[str] = []
    current: list[str] = []
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


@mcp.tool
def get_lyrics(title: str, artist: str | None = None, max_results: int = 10) -> str:  # noqa: D401,E501
    """Fetch the lyrics for **title** (optionally by *artist*) from the web."""

    # Try multiple search strategies for better coverage
    search_queries = [
        f"{title} {artist or ''} lyrics".strip(),
        f"{title} {artist or ''} chords lyrics".strip(),
        f"{title} {artist or ''} tabs".strip(),
        f"{title} {artist or ''} guitar chords".strip(),
    ]
    
    all_results = []
    
    for query in search_queries:
        try:
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=max_results//len(search_queries) + 1))
                all_results.extend(results)
        except Exception:
            continue
    
    if not all_results:
        return "Lyrics not found."

    client = httpx.Client(timeout=10, follow_redirects=True, headers={
        "User-Agent": "Mozilla/5.0 (LyricsSearchMCP)"
    })

    # Remove duplicates while preserving order
    seen_urls = set()
    unique_results = []
    for res in all_results:
        url = res.get("href") or res.get("link")
        if url and url not in seen_urls:
            seen_urls.add(url)
            unique_results.append(res)

    for res in unique_results:
        url = res.get("href") or res.get("link")
        if not url:
            continue
        try:
            response = client.get(url)
            response.raise_for_status()
            lyrics = _extract_lyrics(response.text)
            if lyrics:
                client.close()
                return lyrics
        except Exception:
            # Silently continue to next result on any failure (HTTP errors,
            # parsing errors, etc.)
            continue

    client.close()
    return "Lyrics not found."


if __name__ == "__main__":
    mcp.run()