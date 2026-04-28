#!/bin/bash

# proxy_ping.sh - Command-line proxy timing tool using curl
# Usage: ./proxy_ping.sh --proxy <proxy_url> --url <target_url> [options]

set -e

# Default values
ATTEMPTS=1
VERBOSE=false
OUTPUT_FORMAT="human"
TIMEOUT=30
TARGET_URL="cdn-eu.seatsio.net"

# Function to get default proxy from proxy.txt
get_default_proxy() {
    if [[ -f "data/sor/proxy.txt" ]]; then
        head -n 1 "data/sor/proxy.txt" | tr -d '\r\n'
    else
        echo ""
    fi
}

# Set default proxy URL
PROXY_URL=$(get_default_proxy)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Help function
show_help() {
    cat << EOF
Proxy Timing Tool - Measure response times through proxies

USAGE:
    ./proxy_ping.sh [--proxy <proxy_url>] [--url <target_url>] [OPTIONS]

OPTIONAL:
    --proxy <url>        Proxy URL (uses first proxy from proxy.txt if not provided)
    --url <url>          Target URL to test through proxy (default: cdn-eu.seatsio.net)

OPTIONS:
    -a, --attempts <n>   Number of attempts (default: 1)
    -t, --timeout <n>    Timeout in seconds (default: 30)
    -f, --format <fmt>   Output format: human|json|csv (default: human)
    -v, --verbose        Enable verbose output
    -h, --help           Show this help message

EXAMPLES:
    # Use default proxy from proxy.txt and default URL (cdn-eu.seatsio.net)
    ./proxy_ping.sh

    # Use specific proxy with default URL
    ./proxy_ping.sh --proxy http://proxy.example.com:8080

    # Use default proxy from proxy.txt with custom URL
    ./proxy_ping.sh --url https://httpbin.org/ip

    # Basic timing test with custom proxy and custom URL
    ./proxy_ping.sh --proxy http://proxy.example.com:8080 --url https://httpbin.org/ip

    # Multiple attempts with statistics
    ./proxy_ping.sh --proxy http://proxy.example.com:8080 --url https://httpbin.org/ip --attempts 10

    # HTTPS proxy with authentication
    ./proxy_ping.sh --proxy https://user:pass@proxy.example.com:8080 --url https://httpbin.org/ip

    # JSON output for automation
    ./proxy_ping.sh --proxy http://proxy.example.com:8080 --url https://httpbin.org/ip --format json

    # CSV output for spreadsheets
    ./proxy_ping.sh --proxy http://proxy.example.com:8080 --url https://httpbin.org/ip --format csv

TIMING METRICS:
    - Connection Time: Time to establish connection to proxy (in milliseconds)
    - Time to First Byte: Time until first byte received (in milliseconds)
    - Total Response Time: Complete request/response cycle (in milliseconds)
    - DNS Lookup Time: Time for DNS resolution (in milliseconds)
    - TCP Connect Time: Time for TCP handshake (in milliseconds)

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --proxy)
            PROXY_URL="$2"
            shift 2
            ;;
        --url)
            TARGET_URL="$2"
            shift 2
            ;;
        -a|--attempts)
            ATTEMPTS="$2"
            shift 2
            ;;
        -t|--timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        -f|--format)
            OUTPUT_FORMAT="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validate required arguments (both are now optional with defaults)
if [[ -z "$TARGET_URL" ]]; then
    echo "Error: Failed to set default target URL"
    show_help
    exit 1
fi

if [[ -z "$PROXY_URL" ]]; then
    echo "Error: No proxy provided and proxy.txt is missing or empty"
    show_help
    exit 1
fi

# Validate attempts
if [[ ! "$ATTEMPTS" =~ ^[0-9]+$ ]] || [[ "$ATTEMPTS" -lt 1 ]]; then
    echo "Error: --attempts must be a positive integer"
    exit 1
fi

# Validate timeout
if [[ ! "$TIMEOUT" =~ ^[0-9]+$ ]] || [[ "$TIMEOUT" -lt 1 ]]; then
    echo "Error: --timeout must be a positive integer"
    exit 1
fi

# Function to perform a single timing test
perform_timing_test() {
    local attempt=$1
    local proxy_url=$2
    local target_url=$3
    local timeout=$4
    
    # Create a temporary file to store timing information
    local temp_file=$(mktemp)
    
    # Perform curl with timing information
    if curl -s \
        --proxy "$proxy_url" \
        --max-time "$timeout" \
        --write-out "time_namelookup: %{time_namelookup}\ntime_connect: %{time_connect}\ntime_appconnect: %{time_appconnect}\ntime_pretransfer: %{time_pretransfer}\ntime_redirect: %{time_redirect}\ntime_starttransfer: %{time_starttransfer}\ntime_total: %{time_total}\nhttp_code: %{http_code}\nsize_download: %{size_download}\n" \
        --output /dev/null \
        "$target_url" > "$temp_file" 2>/dev/null; then
        
        # Parse timing information and convert to milliseconds
        local time_namelookup=$(echo "scale=3; $(grep "time_namelookup:" "$temp_file" | cut -d' ' -f2) * 1000" | bc -l)
        local time_connect=$(echo "scale=3; $(grep "time_connect:" "$temp_file" | cut -d' ' -f2) * 1000" | bc -l)
        local time_appconnect=$(echo "scale=3; $(grep "time_appconnect:" "$temp_file" | cut -d' ' -f2) * 1000" | bc -l)
        local time_pretransfer=$(echo "scale=3; $(grep "time_pretransfer:" "$temp_file" | cut -d' ' -f2) * 1000" | bc -l)
        local time_redirect=$(echo "scale=3; $(grep "time_redirect:" "$temp_file" | cut -d' ' -f2) * 1000" | bc -l)
        local time_starttransfer=$(echo "scale=3; $(grep "time_starttransfer:" "$temp_file" | cut -d' ' -f2) * 1000" | bc -l)
        local time_total=$(echo "scale=3; $(grep "time_total:" "$temp_file" | cut -d' ' -f2) * 1000" | bc -l)
        local http_code=$(grep "http_code:" "$temp_file" | cut -d' ' -f2)
        local size_download=$(grep "size_download:" "$temp_file" | cut -d' ' -f2)
        
        # Calculate derived metrics (already in milliseconds)
        local connection_time=$(echo "scale=3; $time_connect - $time_namelookup" | bc -l)
        local time_to_first_byte=$(echo "scale=3; $time_starttransfer - $time_connect" | bc -l)
        local transfer_time=$(echo "scale=3; $time_total - $time_starttransfer" | bc -l)
        
        echo "attempt:$attempt|$time_namelookup|$time_connect|$time_appconnect|$time_starttransfer|$time_total|$connection_time|$time_to_first_byte|$transfer_time|$http_code|$size_download"
    else
        echo "attempt:$attempt|FAILED|FAILED|FAILED|FAILED|FAILED|FAILED|FAILED|FAILED|FAILED|0"
    fi
    
    rm -f "$temp_file"
}

# Function to calculate statistics
calculate_statistics() {
    local values=("$@")
    local count=${#values[@]}
    
    if [[ $count -eq 0 ]]; then
        echo "0|0|0|0"
        return
    fi
    
    # Sort values
    local sorted=($(printf '%s\n' "${values[@]}" | sort -n))
    
    # Calculate mean
    local sum=0
    for value in "${sorted[@]}"; do
        sum=$(echo "$sum + $value" | bc -l)
    done
    local mean=$(echo "scale=3; $sum / $count" | bc -l)
    
    # Calculate min and max
    local min=${sorted[0]}
    local max=${sorted[-1]}
    
    # Calculate median
    local median=""
    if [[ $((count % 2)) -eq 1 ]]; then
        local mid=$((count / 2))
        median=${sorted[$mid]}
    else
        local mid=$((count / 2))
        local val1=${sorted[$mid-1]}
        local val2=${sorted[$mid]}
        median=$(echo "scale=3; ($val1 + $val2) / 2" | bc -l)
    fi
    
    echo "$min|$max|$mean|$median"
}

# Main timing loop
echo "Starting proxy timing tests..."
echo "Proxy: $PROXY_URL"
echo "Target: $TARGET_URL"
echo "Attempts: $ATTEMPTS"
echo ""

declare -a connection_times=()
declare -a first_byte_times=()
declare -a total_times=()
declare -a dns_times=()
declare -a tcp_times=()

successful_attempts=0

for ((i=1; i<=ATTEMPTS; i++)); do
    if [[ "$VERBOSE" == true ]]; then
        echo "Attempt $i/$ATTEMPTS..."
    fi
    
    result=$(perform_timing_test "$i" "$PROXY_URL" "$TARGET_URL" "$TIMEOUT")
    
    # Parse result
    IFS='|' read -ra PARTS <<< "$result"
    attempt=${PARTS[0]#attempt:}
    time_namelookup=${PARTS[1]}
    time_connect=${PARTS[2]}
    time_appconnect=${PARTS[3]}
    time_starttransfer=${PARTS[4]}
    time_total=${PARTS[5]}
    connection_time=${PARTS[6]}
    time_to_first_byte=${PARTS[7]}
    transfer_time=${PARTS[8]}
    http_code=${PARTS[9]}
    size_download=${PARTS[10]}
    
    # Check if request was successful
    if [[ "$http_code" != "FAILED" ]] && [[ "$http_code" != "000" ]]; then
        successful_attempts=$((successful_attempts + 1))
        connection_times+=("$connection_time")
        first_byte_times+=("$time_to_first_byte")
        total_times+=("$time_total")
        dns_times+=("$time_namelookup")
        tcp_times+=("$time_connect")
    fi
    
    # Display individual result
    if [[ "$OUTPUT_FORMAT" == "human" ]]; then
        if [[ "$http_code" == "FAILED" ]]; then
            echo -e "${RED}Attempt $attempt: FAILED${NC}"
        else
            printf "${GREEN}Attempt $attempt:${NC} Total: %.1fms | DNS: %.1fms | Connect: %.1fms | First Byte: %.1fms | Code: %s\n${NC}" \
                "$time_total" "$time_namelookup" "$connection_time" "$time_to_first_byte" "$http_code"
        fi
    fi
    
    # Add delay between attempts (except for last attempt)
    if [[ $i -lt $ATTEMPTS ]]; then
        sleep 1
    fi
done

echo ""

# Calculate and display statistics
if [[ $successful_attempts -gt 0 ]]; then
    if [[ "$OUTPUT_FORMAT" == "human" ]]; then
        echo -e "${BLUE}=== STATISTICS ===${NC}"
        
        # DNS lookup statistics
        dns_stats=($(calculate_statistics "${dns_times[@]}"))
        printf "${YELLOW}DNS Lookup:${NC} Min: %.1fms | Max: %.1fms | Mean: %.1fms | Median: %.1fms\n" \
            "${dns_stats[0]}" "${dns_stats[1]}" "${dns_stats[2]}" "${dns_stats[3]}"
        
        # Connection time statistics
        conn_stats=($(calculate_statistics "${connection_times[@]}"))
        printf "${YELLOW}Connection Time:${NC} Min: %.1fms | Max: %.1fms | Mean: %.1fms | Median: %.1fms\n" \
            "${conn_stats[0]}" "${conn_stats[1]}" "${conn_stats[2]}" "${conn_stats[3]}"
        
        # Time to first byte statistics
        ttfb_stats=($(calculate_statistics "${first_byte_times[@]}"))
        printf "${YELLOW}Time to First Byte:${NC} Min: %.1fms | Max: %.1fms | Mean: %.1fms | Median: %.1fms\n" \
            "${ttfb_stats[0]}" "${ttfb_stats[1]}" "${ttfb_stats[2]}" "${ttfb_stats[3]}"
        
        # Total response time statistics
        total_stats=($(calculate_statistics "${total_times[@]}"))
        printf "${YELLOW}Total Response Time:${NC} Min: %.1fms | Max: %.1fms | Mean: %.1fms | Median: %.1fms\n" \
            "${total_stats[0]}" "${total_stats[1]}" "${total_stats[2]}" "${total_stats[3]}"
        
        printf "${BLUE}Success Rate:${NC} %d/%d (%.1f%%)\n${NC}" "$successful_attempts" "$ATTEMPTS" \
            "$(echo "scale=1; $successful_attempts * 100 / $ATTEMPTS" | bc -l)"
            
    elif [[ "$OUTPUT_FORMAT" == "json" ]]; then
        # JSON output
        dns_stats=($(calculate_statistics "${dns_times[@]}"))
        conn_stats=($(calculate_statistics "${connection_times[@]}"))
        ttfb_stats=($(calculate_statistics "${first_byte_times[@]}"))
        total_stats=($(calculate_statistics "${total_times[@]}"))
        
        cat << EOF
{
    "proxy": "$PROXY_URL",
    "target": "$TARGET_URL",
    "attempts": $ATTEMPTS,
    "successful": $successful_attempts,
    "success_rate": $(echo "scale=2; $successful_attempts * 100 / $ATTEMPTS" | bc -l),
    "timing": {
        "dns_lookup": {"min": ${dns_stats[0]}, "max": ${dns_stats[1]}, "mean": ${dns_stats[2]}, "median": ${dns_stats[3]}},
        "connection_time": {"min": ${conn_stats[0]}, "max": ${conn_stats[1]}, "mean": ${conn_stats[2]}, "median": ${conn_stats[3]}},
        "time_to_first_byte": {"min": ${ttfb_stats[0]}, "max": ${ttfb_stats[1]}, "mean": ${ttfb_stats[2]}, "median": ${ttfb_stats[3]}},
        "total_response_time": {"min": ${total_stats[0]}, "max": ${total_stats[1]}, "mean": ${total_stats[2]}, "median": ${total_stats[3]}}
    }
}
EOF
        
    elif [[ "$OUTPUT_FORMAT" == "csv" ]]; then
        # CSV header
        echo "attempt,dns_lookup,connection_time,time_to_first_byte,total_response_time,http_code"
        
        # Note: For CSV, we'd need to store individual results
        # This is a simplified version - in practice, you'd store all results
        echo "stats,${dns_stats[2]},${conn_stats[2]},${ttfb_stats[2]},${total_stats[2]},success_rate:$(echo "scale=1; $successful_attempts * 100 / $ATTEMPTS" | bc -l)%"
    fi
else
    echo -e "${RED}All attempts failed. Check proxy configuration and connectivity.${NC}"
    if [[ "$OUTPUT_FORMAT" == "json" ]]; then
        echo '{"error": "All requests failed"}'
    fi
fi