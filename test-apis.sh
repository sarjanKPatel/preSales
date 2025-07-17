#!/bin/bash

# API Testing Script for PropelIQ
# Make sure your dev server is running on http://localhost:3000

echo "🚀 PropelIQ API Testing Script"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to test API
test_api() {
    local name="$1"
    local url="$2"
    local method="$3"
    local data="$4"
    
    echo -e "${BLUE}Testing: $name${NC}"
    echo "URL: $url"
    echo "Method: $method"
    if [ ! -z "$data" ]; then
        echo "Data: $data"
    fi
    echo ""
    
    if [ "$method" = "POST" ]; then
        response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$url" \
            -H "Content-Type: application/json" \
            -d "$data")
    else
        response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$url")
    fi
    
    # Extract HTTP status
    http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
    # Extract response body
    body=$(echo "$response" | sed '/HTTP_STATUS:/d')
    
    if [ "$http_status" = "200" ]; then
        echo -e "${GREEN}✅ Success (HTTP $http_status)${NC}"
    else
        echo -e "${RED}❌ Failed (HTTP $http_status)${NC}"
    fi
    
    echo "Response:"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    echo ""
    echo "----------------------------------------"
    echo ""
}

# Check if server is running
echo -e "${YELLOW}Checking if server is running...${NC}"
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✅ Server is running on http://localhost:3000${NC}"
else
    echo -e "${RED}❌ Server is not running. Please start with: npm run dev${NC}"
    exit 1
fi

echo ""

# Test 1: OpenAI Connection Test
test_api "OpenAI Connection Test" \
    "http://localhost:3000/api/test-openai" \
    "POST" \
    '{"message": "Hello, this is a test message."}'

# Test 2: Chat API Test
test_api "Chat API Test" \
    "http://localhost:3000/api/chat" \
    "POST" \
    '{"message": "Hello, can you help me with sales proposal tips?", "sessionId": "test-session-123", "proposalContext": "Testing chat functionality"}'

# Test 3: Pre-Demo Checklist Test
test_api "Pre-Demo Checklist Test" \
    "http://localhost:3000/api/pre-demo-checklist" \
    "POST" \
    '{"company": "TechStart Inc", "useCase": "Sales automation", "requirements": "Lead generation and CRM integration"}'

# Test 4: Deep Research Test (with timeout)
echo -e "${BLUE}Testing: Deep Research Test${NC}"
echo "URL: http://localhost:3000/api/deep-research"
echo "Method: POST"
echo "Data: {\"company\": \"Acme Corp\", \"requirements\": \"Sales automation\", \"useCase\": \"Lead generation\"}"
echo ""
echo -e "${YELLOW}Note: This test may take 30-60 seconds due to multiple AI calls${NC}"
echo ""

# Deep Research test with timeout
timeout 120 curl -s -X POST "http://localhost:3000/api/deep-research" \
    -H "Content-Type: application/json" \
    -d '{"company": "Acme Corp", "requirements": "Sales automation", "useCase": "Lead generation"}' \
    --no-buffer | while IFS= read -r line; do
    if [[ $line == data:* ]]; then
        data=$(echo "$line" | sed 's/^data: //')
        echo "Received: $data"
    fi
done

echo ""
echo -e "${GREEN}🎉 All tests completed!${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Check the responses above for any errors"
echo "2. If you see errors, check your .env.local file for OPENAI_API_KEY"
echo "3. Visit http://localhost:3000/test-apis for interactive testing"
echo "4. Check browser console for detailed error messages" 