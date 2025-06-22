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
from duckduckgo_search import ddg
from fastmcp import FastMCP


mcp = FastMCP("Lyrics Search MCP")


def _extract_lyrics(html: str) -> Optional[str]:
    """Try to pull out the lyrics block from an arbitrary HTML page."""
    soup = BeautifulSoup(html, "html.parser")

    # strip non‑content elements
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()

    text = soup.get_text("\n")
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]

    # Heuristic: lyrics tend to be many short lines (1–20 words)
    groups: list[str] = []
    current: list[str] = []
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


@mcp.tool
def get_lyrics(title: str, artist: str | None = None, max_results: int = 10) -> str:  # noqa: D401,E501
    """Fetch the lyrics for **title** (optionally by *artist*) from the web."""

    query = f"{title} {artist or ''} lyrics".strip()
    results = ddg(query, max_results=max_results)
    if not results:
        return "Lyrics not found."

    client = httpx.Client(timeout=10, follow_redirects=True, headers={
        "User-Agent": "Mozilla/5.0 (LyricsSearchMCP)"
    })

    for res in results:
        url = res.get("href") or res.get("url")
        if not url:
            continue
        try:
            response = client.get(url)
            response.raise_for_status()
            lyrics = _extract_lyrics(response.text)
            if lyrics:
                return lyrics
        except Exception:
            # Silently continue to next result on any failure (HTTP errors,
            # parsing errors, etc.)
            continue

    return "Lyrics not found."


if __name__ == "__main__":
    mcp.run()