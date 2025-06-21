# WorshipWise justfile

# Show available commands
default:
    @just --list

# Development
dev:
    ./scripts/start-dev.sh

# Setup
setup:
    ./scripts/install-pocketbase.sh
    npm install
    npx playwright install

# Build
build:
    npm run build

# Test
test:
    npm run test

# Code quality
check:
    npm run check
    npx prettier --check .
    npx eslint .