#!/bin/bash

# WorshipWise PocketBase Installation Script
# This script downloads and sets up PocketBase for the WorshipWise project

set -e  # Exit on any error

# Configuration
POCKETBASE_VERSION="0.28.3"  # Latest stable version as of Dec 2024
POCKETBASE_DIR="pocketbase"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to detect OS and architecture
detect_platform() {
    local os=""
    local arch=""
    
    # Detect OS
    case "$(uname -s)" in
        Linux*)     os="linux";;
        Darwin*)    os="darwin";;
        CYGWIN*)    os="windows";;
        MINGW*)     os="windows";;
        *)          log_error "Unsupported operating system: $(uname -s)"; exit 1;;
    esac
    
    # Detect architecture
    case "$(uname -m)" in
        x86_64|amd64)   arch="amd64";;
        arm64|aarch64)  arch="arm64";;
        armv7l)         arch="armv7";;
        *)              log_error "Unsupported architecture: $(uname -m)"; exit 1;;
    esac
    
    echo "${os}_${arch}"
}

# Function to get the latest PocketBase version
get_latest_version() {
    # Try to get latest version from GitHub API (silently)
    if command -v curl >/dev/null 2>&1; then
        local latest_version
        latest_version=$(curl -s https://api.github.com/repos/pocketbase/pocketbase/releases/latest 2>/dev/null | grep '"tag_name":' | sed -E 's/.*"v([^"]+)".*/\1/' 2>/dev/null)
        
        if [ -n "$latest_version" ] && [ "$latest_version" != "null" ]; then
            echo "$latest_version"
            return
        fi
    fi
    
    # Fallback to configured version
    echo "$POCKETBASE_VERSION"
}

# Function to check if PocketBase is already installed
check_existing_installation() {
    if [ -f "$PROJECT_ROOT/$POCKETBASE_DIR/pocketbase" ]; then
        log_info "PocketBase is already installed"
        
        # Check version
        local current_version
        cd "$PROJECT_ROOT/$POCKETBASE_DIR"
        current_version=$(./pocketbase --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || echo "unknown")
        cd - > /dev/null
        
        log_info "Current version: $current_version"
        
        # Ask if user wants to reinstall
        read -p "Do you want to reinstall/update PocketBase? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_success "Using existing PocketBase installation"
            exit 0
        fi
    fi
}

# Function to download and install PocketBase
install_pocketbase() {
    local platform="$1"
    local version="$2"
    local download_url="https://github.com/pocketbase/pocketbase/releases/download/v${version}/pocketbase_${version}_${platform}.zip"
    local temp_dir=$(mktemp -d)
    local zip_file="$temp_dir/pocketbase.zip"
    
    log_info "Installing PocketBase v$version for platform: $platform"
    log_info "Download URL: $download_url"
    
    # Create pocketbase directory if it doesn't exist
    mkdir -p "$PROJECT_ROOT/$POCKETBASE_DIR"
    
    # Download PocketBase
    log_info "Downloading PocketBase..."
    if command -v curl >/dev/null 2>&1; then
        curl -L -o "$zip_file" "$download_url"
    elif command -v wget >/dev/null 2>&1; then
        wget -O "$zip_file" "$download_url"
    else
        log_error "Neither curl nor wget is available. Please install one of them."
        exit 1
    fi
    
    # Check if download was successful
    if [ ! -f "$zip_file" ]; then
        log_error "Failed to download PocketBase"
        exit 1
    fi
    
    # Extract PocketBase
    log_info "Extracting PocketBase..."
    if command -v unzip >/dev/null 2>&1; then
        unzip -q "$zip_file" -d "$temp_dir"
    else
        log_error "unzip is not available. Please install unzip."
        exit 1
    fi
    
    # Remove existing readme/changelog files
    rm -f "$PROJECT_ROOT/$POCKETBASE_DIR/CHANGELOG.md"
    rm -f "$PROJECT_ROOT/$POCKETBASE_DIR/LICENSE.md"
    rm -f "$PROJECT_ROOT/$POCKETBASE_DIR/README.md"
    
    # Move PocketBase binary to project directory
    mv "$temp_dir/pocketbase" "$PROJECT_ROOT/$POCKETBASE_DIR/"
    
    # Make executable
    chmod +x "$PROJECT_ROOT/$POCKETBASE_DIR/pocketbase"
    
    # Cleanup
    rm -rf "$temp_dir"
    
    log_success "PocketBase v$version installed successfully!"
}

# Function to verify installation
verify_installation() {
    log_info "Verifying PocketBase installation..."
    
    cd "$PROJECT_ROOT/$POCKETBASE_DIR"
    
    # Check if binary exists and is executable
    if [ ! -x "./pocketbase" ]; then
        log_error "PocketBase binary is not executable"
        exit 1
    fi
    
    # Check version
    local version_output
    version_output=$(./pocketbase --version 2>&1 || echo "Version check failed")
    
    if [[ $version_output == *"Version check failed"* ]]; then
        log_error "PocketBase binary is not working correctly"
        exit 1
    fi
    
    log_success "PocketBase is working correctly"
    log_info "Version: $version_output"
    
    cd - > /dev/null
}

# Function to set up initial configuration
setup_configuration() {
    log_info "Setting up PocketBase configuration..."
    
    # Create migrations directory if it doesn't exist
    mkdir -p "$PROJECT_ROOT/$POCKETBASE_DIR/migrations"
    
    # Check if migrations exist
    if [ -f "$PROJECT_ROOT/$POCKETBASE_DIR/migrations/1734267000_create_songs.js" ]; then
        log_success "Existing migrations found - keeping them"
    else
        log_info "No migrations found - they will be created when you first run the server"
    fi
    
    # Create a comprehensive .gitignore for PocketBase directory
    cat > "$PROJECT_ROOT/$POCKETBASE_DIR/.gitignore" << 'EOF'
# PocketBase data directory (contains database and uploaded files)
pb_data/

# PocketBase migrations directory (auto-generated)
pb_migrations/

# PocketBase executable (downloaded by install script)
pocketbase

# Log files
*.log

# Backup files
*.backup

# Temporary files
*.tmp
*.temp
EOF
    log_success "Created comprehensive .gitignore for PocketBase directory"
}

# Function to display next steps
show_next_steps() {
    echo
    log_success "🎉 PocketBase installation complete!"
    echo
    log_info "Next steps:"
    echo "  1. Start the development environment:"
    echo "     ./scripts/start-dev.sh"
    echo
    echo "  2. Or start PocketBase only:"
    echo "     cd pocketbase && ./pocketbase serve --dev"
    echo
    echo "  3. Access the admin panel at:"
    echo "     http://localhost:8090/_/"
    echo
    echo "  4. Create your admin account (first time only)"
    echo
    log_info "For more information, see README_DEVELOPMENT.md"
}

# Main installation flow
main() {
    echo "🎵 WorshipWise PocketBase Installer"
    echo "=================================="
    echo
    
    # Change to project root
    cd "$PROJECT_ROOT"
    
    # Check for existing installation
    check_existing_installation
    
    # Detect platform
    local platform
    platform=$(detect_platform)
    log_info "Detected platform: $platform"
    
    # Get version to install
    local version
    if [ -n "$1" ]; then
        version="$1"
        log_info "Using specified version: $version"
    else
        log_info "Checking for latest PocketBase version..."
        version=$(get_latest_version)
        log_info "Using version: $version"
    fi
    
    # Install PocketBase
    install_pocketbase "$platform" "$version"
    
    # Verify installation
    verify_installation
    
    # Setup configuration
    setup_configuration
    
    # Show next steps
    show_next_steps
}

# Help function
show_help() {
    echo "WorshipWise PocketBase Installer"
    echo
    echo "Usage: $0 [OPTIONS] [VERSION]"
    echo
    echo "OPTIONS:"
    echo "  -h, --help     Show this help message"
    echo "  -v, --version  Show installer version"
    echo
    echo "ARGUMENTS:"
    echo "  VERSION        Specific PocketBase version to install (optional)"
    echo "                 If not specified, latest version will be used"
    echo
    echo "Examples:"
    echo "  $0                    # Install latest version"
    echo "  $0 0.23.4            # Install specific version"
    echo
    echo "Environment Variables:"
    echo "  POCKETBASE_VERSION   Default version to install"
    echo
}

# Parse command line arguments
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    -v|--version)
        echo "WorshipWise PocketBase Installer v1.0.0"
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac