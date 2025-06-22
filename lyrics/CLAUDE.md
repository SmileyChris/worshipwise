# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a lyrics analysis toolkit that combines MCP (Model Context Protocol) servers with Ollama-powered AI analysis for worship song planning. It's designed as a companion tool for the WorshipWise church management system, providing intelligent analysis of worship song lyrics to help with service planning and song selection.

## Core Architecture

### MCP + Ollama Pipeline
The system uses a two-stage pipeline:

1. **Lyrics Retrieval**: `lyrics_search_mcp_server.py` - FastMCP server that searches the web for lyrics using DuckDuckGo search and intelligent HTML parsing
2. **AI Analysis**: `analyze_lyrics.py` - Python script that feeds lyrics to Ollama for worship-focused analysis including themes, biblical references, and service placement recommendations

### Key Components

- **`lyrics_search_mcp_server.py`**: Self-contained MCP server with inline uv dependencies for lyrics retrieval
- **`analyze_lyrics.py`**: Full analysis pipeline with direct lyrics client and Ollama integration
- **`lyrics.sh`**: Simple bash interface - the most reliable entry point for users
- **`simple_test.py`**: Testing script for verifying system functionality

## Development Commands

### Running Analysis
```bash
# Recommended: Use the shell script (most reliable)
./lyrics.sh                              # Interactive menu
./lyrics.sh "Amazing Grace"               # Quick analysis
./lyrics.sh "How Great Thou Art" "Traditional"  # With artist
./lyrics.sh test                          # System diagnostics

# Direct Python execution
uv run analyze_lyrics.py "Song Title" "Artist" --model qwen2.5:1.5b
uv run analyze_lyrics.py "Song Title" --json    # JSON output

# MCP server standalone
uv run lyrics_search_mcp_server.py

# Testing
uv run simple_test.py                     # Basic functionality test
```

### System Requirements
```bash
# Install dependencies
curl -LsSf https://astral.sh/uv/install.sh | sh    # uv package manager
curl -fsSL https://ollama.ai/install.sh | sh       # Ollama

# Setup Ollama model
ollama pull qwen2.5:1.5b                 # Lightweight model recommended
ollama serve                             # Start Ollama service

# Verify system
./lyrics.sh test                         # Built-in diagnostics
```

## Code Architecture

### Lyrics Retrieval Strategy
The system uses a multi-layered search approach prioritizing Christian/worship sources:

1. **Direct Christian Sites**: Hymnary.org, WorshipTogether, ChristianLyrics
2. **Genius Search**: With worship/Christian keyword enhancement  
3. **Google Search**: Filtered to prioritize religious content
4. **Fallback Samples**: Built-in sample lyrics for demonstration

### Lyrics Extraction Algorithm
Intelligent HTML parsing using BeautifulSoup with:
- Common lyrics container detection (`.lyrics`, `.song-lyrics`, `.chord-chart`)
- Chord line filtering (removes guitar chord patterns like "C F G Am")
- Heuristic text analysis (groups of 15+ short lines)
- Copyright text removal
- Christian content detection scoring

### Ollama Integration
- Uses local Ollama instance (http://localhost:11434)
- Supports multiple models with auto-detection
- Structured JSON prompts for consistent analysis output
- Fallback handling for parsing failures
- Temperature-controlled generation (0.3 for consistency)

### Analysis Structure
```python
@dataclass
class LyricsAnalysis:
    title: str
    artist: Optional[str]
    themes: List[str]                    # Main worship themes
    biblical_references: List[str]       # Scripture connections
    worship_elements: List[str]          # Praise, contemplation, etc.
    emotional_tone: str                  # Reverent, joyful, etc.
    service_placement: str               # Communion, opening, etc.
    seasonal_appropriateness: List[str]  # Easter, Christmas, etc.
    complexity_level: str                # Simple, Moderate, Complex
    summary: str                         # Brief analysis summary
    raw_lyrics: str                      # Original lyrics text
```

## Integration Patterns

### WorshipWise Integration Points
This tool is designed to integrate with the main WorshipWise application:

```typescript
// Potential Song schema extension
interface Song {
  // ... existing WorshipWise fields
  lyrics_analysis?: LyricsAnalysis;
  last_analyzed?: Date;
}

// Analysis trigger points
- Song creation/editing in database
- Service builder recommendations  
- Analytics dashboard enhancement
- AI-powered song suggestions
```

### Execution Modes
1. **Interactive Mode**: `./lyrics.sh` menu-driven interface
2. **Direct Analysis**: `./lyrics.sh "Title" "Artist"` command-line
3. **JSON Output**: `--json` flag for programmatic integration
4. **System Testing**: Built-in diagnostics and health checks

## Error Handling & Reliability

### Robust Fallback Chain
- Network timeouts with graceful degradation
- Multiple search sources (DDG, Google, direct sites)
- Sample lyrics when network fails
- Model auto-detection for Ollama
- Clear error messaging with helpful suggestions

### Christian Content Focus
- Prioritizes Christian/worship lyrics sources
- Filters out secular music platforms
- Content scoring for worship relevance
- Enhanced search with religious keywords

## File Dependencies

### Python Dependencies (via uv inline)
- `fastmcp>=2.0.0` - MCP server framework
- `duckduckgo_search>=4.0.0` - Web search
- `beautifulsoup4>=4.12` - HTML parsing
- `httpx>=0.27` - HTTP client
- `requests>=2.31.0` - HTTP requests

### External Dependencies
- **uv**: Python package manager for inline dependencies
- **Ollama**: Local LLM service (localhost:11434)
- **jq**: JSON parsing in shell scripts (optional)
- **curl**: HTTP requests in shell scripts

## Testing Strategy

### Test Files
- `simple_test.py`: Core functionality verification
- `test_*.py`: Various component tests
- `./lyrics.sh test`: Integrated system diagnostics

### Health Checks
The system includes comprehensive health checking:
- uv installation and version
- Ollama service availability and model count
- Network connectivity for lyrics search
- End-to-end analysis pipeline

## Usage Notes

### Recommended Workflow
1. Use `./lyrics.sh test` to verify system health
2. Use `./lyrics.sh` interactive mode for exploration
3. Use direct command-line for automation
4. JSON output mode for integration with other tools

### Performance Considerations
- Lyrics search can take 10-30 seconds depending on network
- Ollama analysis typically 5-15 seconds depending on model
- Lightweight models recommended: qwen2.5:1.5b, phi3.5, gemma2:2b
- Results cached by Ollama for repeated analysis

### Content Handling
- Lyrics are truncated for copyright compliance
- Focus on analysis rather than full lyrics reproduction
- Christian content prioritization in search results
- Sample lyrics provided when network search fails