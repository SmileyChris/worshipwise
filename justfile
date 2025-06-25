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

# Test commands
test *args:
    @if [ -z "{{args}}" ]; then \
        npm run test; \
    else \
        npm run test:unit -- {{args}}; \
    fi

# Code quality
check:
    npm run check
    npx prettier --check .
    npx eslint .