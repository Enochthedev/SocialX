#!/bin/bash

# SocialX Setup Validation Script
# Checks if all prerequisites are installed and configured

set -e

echo "🔍 SocialX Setup Validation"
echo "============================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0

# Helper functions
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 is installed"
        if [ ! -z "$2" ]; then
            VERSION=$($1 $2 2>&1 | head -n 1)
            echo "  Version: $VERSION"
        fi
        return 0
    else
        echo -e "${RED}✗${NC} $1 is NOT installed"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 exists"
        return 0
    else
        echo -e "${RED}✗${NC} $1 is missing"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

warn_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 exists"
        return 0
    else
        echo -e "${YELLOW}!${NC} $1 is missing (optional)"
        WARNINGS=$((WARNINGS + 1))
        return 1
    fi
}

# Check Node.js
echo "Checking Node.js..."
if check_command "node" "--version"; then
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo -e "${RED}  Warning: Node.js version should be 18 or higher${NC}"
        ERRORS=$((ERRORS + 1))
    fi
fi
echo ""

# Check npm
echo "Checking npm..."
check_command "npm" "--version"
echo ""

# Check Python
echo "Checking Python..."
if check_command "python3" "--version"; then
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1-2)
    echo "  Note: Python 3.11+ recommended"
fi
echo ""

# Check pip
echo "Checking pip..."
check_command "pip3" "--version" || check_command "pip" "--version"
echo ""

# Check Docker (optional but recommended)
echo "Checking Docker (recommended)..."
if check_command "docker" "--version"; then
    check_command "docker-compose" "--version" || check_command "docker" "compose version"
else
    echo -e "${YELLOW}  Docker not found. You can still run manually.${NC}"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Check PostgreSQL (optional if using Docker)
echo "Checking PostgreSQL (required if not using Docker)..."
if ! command -v docker &> /dev/null; then
    check_command "psql" "--version"
else
    echo -e "${YELLOW}  Skipping (using Docker)${NC}"
fi
echo ""

# Check Git
echo "Checking Git..."
check_command "git" "--version"
echo ""

# Check required files
echo "Checking project files..."
check_file "package.json" || check_file "backend/package.json"
check_file "docker-compose.yml"
check_file "backend/src/index.ts"
check_file "ai-engine/src/main.py"
check_file "ai-engine/requirements.txt"
echo ""

# Check environment file
echo "Checking environment configuration..."
if check_file ".env"; then
    echo "  Checking critical environment variables..."

    if grep -q "OPENROUTER_API_KEY=your_openrouter_api_key_here" .env || \
       ! grep -q "OPENROUTER_API_KEY=" .env; then
        echo -e "${RED}  ✗ OPENROUTER_API_KEY not set${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}  ✓ OPENROUTER_API_KEY is set${NC}"
    fi

    if grep -q "TWITTER_API_KEY=your_twitter_api_key" .env || \
       ! grep -q "TWITTER_API_KEY=" .env; then
        echo -e "${RED}  ✗ TWITTER_API_KEY not set${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}  ✓ TWITTER_API_KEY is set${NC}"
    fi

    if grep -q "AGENT_USERNAME=your_twitter_handle" .env || \
       ! grep -q "AGENT_USERNAME=" .env; then
        echo -e "${RED}  ✗ AGENT_USERNAME not set${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}  ✓ AGENT_USERNAME is set${NC}"
    fi
else
    echo -e "${RED}  No .env file found!${NC}"
    echo "  Run: cp .env.example .env"
    echo "  Then edit .env with your API keys"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check if ports are available
echo "Checking if ports are available..."
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}  ! Port $1 is already in use${NC}"
        WARNINGS=$((WARNINGS + 1))
        return 1
    else
        echo -e "${GREEN}  ✓ Port $1 is available${NC}"
        return 0
    fi
}

check_port 3000  # Backend
check_port 5000  # AI Engine
check_port 5432  # PostgreSQL
check_port 8000  # ChromaDB
check_port 6379  # Redis
echo ""

# Summary
echo "============================"
echo "Validation Summary"
echo "============================"
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! You're ready to go!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Start services: docker-compose up -d"
    echo "  2. Check logs: docker-compose logs -f"
    echo "  3. View status: curl http://localhost:3000/status"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}! Validation passed with $WARNINGS warning(s)${NC}"
    echo "  You can proceed, but review the warnings above."
else
    echo -e "${RED}✗ Validation failed with $ERRORS error(s) and $WARNINGS warning(s)${NC}"
    echo "  Please fix the errors above before proceeding."
    exit 1
fi
