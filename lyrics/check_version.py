#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = ["duckduckgo_search>=4.0.0"]
# ///
import duckduckgo_search
print(f"DuckDuckGo Search version: {duckduckgo_search.__version__}")