#!/bin/bash
# Simple lyrics analyzer - no fancy UI, just works

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Header
show_header() {
    echo -e "${MAGENTA}"
    cat << 'EOF'
██╗     ██╗   ██╗██████╗ ██╗ ██████╗███████╗
██║     ╚██╗ ██╔╝██╔══██╗██║██╔════╝██╔════╝
██║      ╚████╔╝ ██████╔╝██║██║     ███████╗
██║       ╚██╔╝  ██╔══██╗██║██║     ╚════██║
███████╗   ██║   ██║  ██║██║╚██████╗███████║
╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝ ╚═════╝╚══════╝

    ♪ Worship Song Lyrics Analysis ♪
EOF
    echo -e "${NC}"
}

# Show usage
show_usage() {
    echo -e "${CYAN}Usage:${NC}"
    echo "  $0                              # Interactive menu"
    echo "  $0 \"Song Title\"                # Quick analysis"
    echo "  $0 \"Song Title\" \"Artist\"       # Analysis with artist"
    echo "  $0 test                         # Test system"
    echo "  $0 help                         # Show this help"
    echo
    echo -e "${CYAN}Examples:${NC}"
    echo "  $0 \"Amazing Grace\""
    echo "  $0 \"How Great Thou Art\" \"Traditional\""
    echo "  $0 \"10,000 Reasons\" \"Matt Redman\""
}

# Test system
test_system() {
    echo -e "${YELLOW}🧪 System Test${NC}"
    echo "==============="
    
    # Test uv
    if command -v uv >/dev/null 2>&1; then
        echo -e "${GREEN}✅ uv: $(uv --version)${NC}"
    else
        echo -e "${RED}❌ uv not found${NC}"
        echo "Install: curl -LsSf https://astral.sh/uv/install.sh | sh"
        return 1
    fi
    
    # Test Ollama
    if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
        models=$(curl -s http://localhost:11434/api/tags | jq -r '.models | length' 2>/dev/null || echo "0")
        echo -e "${GREEN}✅ Ollama: $models models available${NC}"
    else
        echo -e "${RED}❌ Ollama not running${NC}"
        echo "Start with: ollama serve"
        return 1
    fi
    
    # Test lyrics search
    if uv run simple_test.py >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Lyrics search working${NC}"
    else
        echo -e "${YELLOW}⚠️  Lyrics search may have issues${NC}"
    fi
    
    echo -e "${GREEN}🎉 System ready!${NC}"
}

# Run analysis
analyze_song() {
    local title="$1"
    local artist="$2"
    
    echo -e "${BLUE}📝 Analyzing: $title${NC}"
    [ -n "$artist" ] && echo -e "${BLUE}👤 Artist: $artist${NC}"
    echo
    
    # Build command
    local cmd="uv run analyze_lyrics.py \"$title\""
    [ -n "$artist" ] && cmd="$cmd \"$artist\""
    
    # Get first available model
    if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
        model=$(curl -s http://localhost:11434/api/tags | jq -r '.models[0].name' 2>/dev/null || echo "qwen2.5:1.5b")
        cmd="$cmd --model $model"
        echo -e "${CYAN}Using model: $model${NC}"
    else
        echo -e "${YELLOW}⚠️  Ollama not available, using default model${NC}"
    fi
    
    echo -e "${YELLOW}🔍 Running analysis...${NC}"
    echo
    
    # Run analysis
    if eval "$cmd"; then
        echo
        echo -e "${GREEN}✅ Analysis complete!${NC}"
    else
        echo
        echo -e "${RED}❌ Analysis failed${NC}"
        echo "Try: $0 test"
        return 1
    fi
}

# Interactive menu
interactive_menu() {
    while true; do
        echo
        echo -e "${CYAN}🎵 MAIN MENU${NC}"
        echo "============="
        echo "1. 🔍 Analyze a song"
        echo "2. 🧪 Test system"
        echo "3. ❓ Help"
        echo "4. 🚪 Exit"
        echo
        
        read -p "Choose [1-4]: " choice
        echo
        
        case "$choice" in
            1)
                read -p "Song title: " title
                [ -z "$title" ] && { echo -e "${RED}Title required${NC}"; continue; }
                
                read -p "Artist (optional): " artist
                analyze_song "$title" "$artist"
                ;;
            2)
                test_system
                ;;
            3)
                show_usage
                ;;
            4)
                echo -e "${GREEN}👋 Goodbye!${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}Invalid choice${NC}"
                ;;
        esac
        
        echo
        read -p "Press Enter to continue..."
    done
}

# Main
main() {
    show_header
    
    case "${1:-}" in
        "test")
            test_system
            ;;
        "help"|"--help"|"-h")
            show_usage
            ;;
        "")
            interactive_menu
            ;;
        *)
            # Direct analysis
            title="$1"
            artist="$2"
            
            if [ -z "$title" ]; then
                echo -e "${RED}❌ Song title required${NC}"
                show_usage
                exit 1
            fi
            
            analyze_song "$title" "$artist"
            ;;
    esac
}

main "$@"