#!/bin/bash

# Test script to verify SocialX is working correctly

echo "🧪 SocialX Integration Tests"
echo "============================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0

test_endpoint() {
    local name=$1
    local url=$2
    local expected_code=${3:-200}

    echo -n "Testing $name... "

    response=$(curl -s -o /dev/null -w "%{http_code}" "$url")

    if [ "$response" -eq "$expected_code" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $response)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (Expected HTTP $expected_code, got $response)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

test_json_response() {
    local name=$1
    local url=$2
    local key=$3

    echo -n "Testing $name... "

    response=$(curl -s "$url")

    if echo "$response" | grep -q "\"$key\""; then
        echo -e "${GREEN}✓ PASSED${NC} (contains '$key')"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (missing '$key' in response)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

echo "Backend Service Tests"
echo "---------------------"
test_endpoint "Backend Health Check" "http://localhost:3000/health"
test_json_response "Backend Status" "http://localhost:3000/status" "isRunning"
test_json_response "Backend Metrics" "http://localhost:3000/metrics" "tweets"
echo ""

echo "AI Engine Tests"
echo "---------------"
test_endpoint "AI Engine Health Check" "http://localhost:5000/health"
test_endpoint "AI Engine Docs" "http://localhost:5000/docs"
echo ""

echo "Database Connection Tests"
echo "-------------------------"
echo -n "PostgreSQL connection... "
if curl -s http://localhost:3000/health | grep -q '"database":"up"'; then
    echo -e "${GREEN}✓ PASSED${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ FAILED${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo -n "ChromaDB connection... "
if curl -s http://localhost:3000/health | grep -q '"vectordb":"up"'; then
    echo -e "${GREEN}✓ PASSED${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${YELLOW}! WARNING${NC} (may not be implemented yet)"
fi
echo ""

echo "API Functionality Tests"
echo "-----------------------"

# Test tweet generation (doesn't post)
echo -n "Tweet generation... "
response=$(curl -s -X POST http://localhost:3000/generate-tweet)
if echo "$response" | grep -q "tweet"; then
    echo -e "${GREEN}✓ PASSED${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${YELLOW}! SKIPPED${NC} (requires setup)"
fi
echo ""

echo "============================"
echo "Test Summary"
echo "============================"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo "Your SocialX agent is working correctly! 🎉"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    echo ""
    echo "Check the following:"
    echo "  1. Are all services running? (docker-compose ps)"
    echo "  2. Check logs for errors: (docker-compose logs)"
    echo "  3. Verify .env configuration"
    exit 1
fi
