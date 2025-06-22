# Lyrics Analysis Tools

This directory contains tools for fetching and analyzing worship song lyrics using MCP (Model Context Protocol) and Ollama integration.

## Components

### 1. `lyrics_search_mcp_server.py`
A lightweight MCP server that fetches song lyrics from the web using DuckDuckGo search and HTML parsing.

**Features:**
- Self-contained with inline dependencies via uv
- Web scraping with intelligent lyrics extraction
- FastMCP integration for LLM tool use

**Usage:**
```bash
# Run as standalone MCP server
uv run lyrics_search_mcp_server.py

# Use as MCP tool
# get_lyrics(title: str, artist: str | None = None, max_results: int = 10) -> str
```

### 2. `analyze_lyrics.py`
Python script that combines MCP lyrics fetching with Ollama-powered analysis for worship planning.

**Features:**
- Fetches lyrics via MCP server
- Analyzes themes, biblical references, worship elements
- Provides service placement recommendations
- Generates structured reports for worship planners

**Usage:**
```bash
# Basic analysis (with available Ollama model)
uv run analyze_lyrics.py "Amazing Grace" "John Newton" --model qwen3:1.7b

# JSON output
uv run analyze_lyrics.py "How Great Thou Art" --json --model qwen3:1.7b

# Simple test (working example)
uv run simple_test.py
```

### 3. `lyrics.sh` 🚀 **SIMPLE & RELIABLE**
Clean shell script that just works - no complex UI, no dependencies, no TTY issues.

**Features:**
- 🐚 **Pure Bash**: Works in any environment
- 🎨 **Colored Output**: Clean ANSI colors for readability
- 🔧 **Smart Detection**: Auto-detects available Ollama models
- ⚙️ **System Testing**: Built-in diagnostics for all components
- 📝 **Multiple Modes**: Direct analysis or interactive menu
- 🛡️ **Error Handling**: Clear error messages and helpful suggestions

**Usage:**
```bash
# Direct analysis
./lyrics.sh "Amazing Grace"
./lyrics.sh "How Great Thou Art" "Traditional"
./lyrics.sh "10,000 Reasons" "Matt Redman"

# Interactive menu
./lyrics.sh

# System testing
./lyrics.sh test

# Help
./lyrics.sh help
```

## Integration Approach

### MCP → Ollama Pipeline

1. **Lyrics Retrieval**: MCP server searches web for song lyrics
2. **Content Processing**: Clean and extract actual lyrics content
3. **AI Analysis**: Ollama analyzes lyrics for worship insights
4. **Structured Output**: Return analysis in format suitable for WorshipWise

### WorshipWise Integration Potential

This tool could integrate with the main WorshipWise application in several ways:

1. **Song Enhancement**: Automatically analyze songs when added to database
2. **Service Planning**: Provide AI insights during service builder
3. **Analytics Enhancement**: Add thematic analysis to existing usage analytics
4. **Recommendation Engine**: Use analysis data for intelligent song suggestions

### Connection Points

```typescript
// Potential integration in WorshipWise
interface LyricsAnalysis {
  title: string;
  artist?: string;
  themes: string[];
  biblical_references: string[];
  worship_elements: string[];
  emotional_tone: string;
  service_placement: string;
  seasonal_appropriateness: string[];
  complexity_level: 'Simple' | 'Moderate' | 'Complex';
  summary: string;
}

// Could be added to existing Song schema
interface Song {
  // ... existing fields
  lyrics_analysis?: LyricsAnalysis;
  last_analyzed?: Date;
}
```

## Prerequisites

### For MCP Server
- Python 3.10+
- uv package manager
- Internet connection for lyrics search

### For Ollama Analysis
- Ollama installed and running (`http://localhost:11434`)
- At least one model available (check with `ollama list`)
- Common lightweight models: `qwen3:1.7b`, `phi3.5`, `gemma2:2b`

## Installation

```bash
# Install uv if not already installed
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a lightweight model
ollama pull qwen2.5:1.5b

# Test the system
./lyrics.sh test

# Try a quick analysis
./lyrics.sh "Amazing Grace"
```

## Example Output

```
WORSHIP SONG ANALYSIS REPORT
==================================================

Song: Amazing Grace
Artist: John Newton

THEMES:
  • Redemption and salvation
  • God's grace and mercy
  • Personal transformation
  • Eternal hope

BIBLICAL REFERENCES:
  • Grace through faith (Ephesians 2:8)
  • Lost and found imagery (Luke 15)
  • Blind receiving sight (John 9)

WORSHIP ELEMENTS:
  • Testimony and personal witness
  • Praise and thanksgiving
  • Reflection and contemplation

EMOTIONAL TONE: Reverent
COMPLEXITY LEVEL: Simple
SERVICE PLACEMENT: Communion or reflection

SEASONAL APPROPRIATENESS:
  • Easter season
  • Baptism services
  • Year-round appropriate

SUMMARY:
A classic hymn of personal testimony about God's transforming grace. 
Perfect for moments of reflection and communion, with universal 
themes that resonate across denominations and seasons.

==================================================
```

## Future Enhancements

- **Batch Processing**: Analyze multiple songs from WorshipWise database
- **Custom Prompts**: Configurable analysis criteria for different churches
- **Cache Integration**: Store analysis results in PocketBase
- **Real-time Updates**: Trigger analysis when new songs are added
- **Multi-language Support**: Analyze songs in different languages
- **Audio Analysis**: Extend to analyze melody and chord progressions