#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = ["duckduckgo_search>=4.0.0"]
# ///
from duckduckgo_search import DDGS
import time

print("Testing DDGS directly...")
try:
    print("Creating DDGS object...")
    with DDGS() as ddgs:
        print("DDGS object created successfully")
        print("Attempting search...")
        start_time = time.time()
        results = list(ddgs.text("test", max_results=1))
        end_time = time.time()
        print(f"Search completed in {end_time - start_time:.2f} seconds")
        print(f"Got {len(results)} results")
        if results:
            print(f"First result: {results[0]}")
        else:
            print("No results returned")
except Exception as e:
    print(f"Error: {e}")
    print(f"Error type: {type(e)}")
    import traceback
    traceback.print_exc()