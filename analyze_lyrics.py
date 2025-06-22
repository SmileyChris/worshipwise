#!/usr/bin/env python3
"""
CLI script to analyze worship song lyrics using Ollama with qwen3:1.7b
and return thematic labels as JSON.
"""

import json
import sys
import argparse
import subprocess
from pathlib import Path


def call_ollama(prompt: str, model: str = "qwen3:1.7b") -> str:
    """Call Ollama with the given prompt and model."""
    try:
        result = subprocess.run(
            ["ollama", "run", model],
            input=prompt,
            text=True,
            capture_output=True,
            check=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Error calling Ollama: {e}", file=sys.stderr)
        print(f"stderr: {e.stderr}", file=sys.stderr)
        sys.exit(1)
    except FileNotFoundError:
        print("Error: Ollama not found. Please install Ollama first.", file=sys.stderr)
        sys.exit(1)


def analyze_lyrics(lyrics: str) -> str:
    """Analyze lyrics and return thematic labels."""
    prompt = f"""Review the following song lyrics and return a short list of high-level thematic labels that best categorize the song within a worship song library. Focus on spiritual, emotional, and theological themes expressed in the lyrics. Output only a JSON array of 3 to 7 lowercase string labels, with no explanation or additional text.

Lyrics:
{lyrics}"""
    
    response = call_ollama(prompt)
    
    # Try to extract JSON from response if there's extra text
    try:
        # Look for JSON array in the response
        start = response.find('[')
        end = response.rfind(']') + 1
        if start != -1 and end != 0:
            json_str = response[start:end]
            # Validate it's proper JSON
            json.loads(json_str)
            return json_str
        else:
            return response
    except (json.JSONDecodeError, ValueError):
        return response


def main():
    parser = argparse.ArgumentParser(description="Analyze worship song lyrics for thematic labels")
    parser.add_argument("lyrics", nargs="?", help="Song lyrics text (or use --file)")
    parser.add_argument("-f", "--file", help="Read lyrics from file")
    parser.add_argument("-m", "--model", default="qwen3:1.7b", help="Ollama model to use")
    
    args = parser.parse_args()
    
    if args.file:
        try:
            lyrics = Path(args.file).read_text(encoding='utf-8')
        except FileNotFoundError:
            print(f"Error: File '{args.file}' not found", file=sys.stderr)
            sys.exit(1)
        except Exception as e:
            print(f"Error reading file: {e}", file=sys.stderr)
            sys.exit(1)
    elif args.lyrics:
        lyrics = args.lyrics
    else:
        # Read from stdin
        try:
            lyrics = sys.stdin.read().strip()
        except KeyboardInterrupt:
            sys.exit(1)
        
        if not lyrics:
            print("Error: No lyrics provided", file=sys.stderr)
            parser.print_help()
            sys.exit(1)
    
    if not lyrics.strip():
        print("Error: Empty lyrics provided", file=sys.stderr)
        sys.exit(1)
    
    result = analyze_lyrics(lyrics)
    print(result)


if __name__ == "__main__":
    main()