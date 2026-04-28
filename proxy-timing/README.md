# Proxy Timing Implementation

A comprehensive solution for measuring response times through proxies, similar to ping functionality.

## Features

- **Command-line timing** with curl
- **Python implementation** for proxy connection timing
- **Node.js solution** for timing proxy requests
- **Multiple metrics**: Connection time, time to first byte, total response time
- **Statistical analysis** with multiple attempts
- **Authentication support** for both HTTP and HTTPS proxies

## Installation

### Command Line (curl)
No installation required - uses built-in curl with timing options.

### Python
```bash
pip install requests urllib3
```

### Node.js
```bash
npm install axios node-fetch
```

## Quick Start

### Command Line Examples
```bash
# Basic proxy timing with curl
./proxy_ping.sh --proxy http://proxy.example.com:8080 --url https://httpbin.org/ip

# With authentication
./proxy_ping.sh --proxy http://user:pass@proxy.example.com:8080 --url https://httpbin.org/ip

# Multiple attempts with statistics
./proxy_ping.sh --proxy http://proxy.example.com:8080 --url https://httpbin.org/ip --attempts 10
```

### Python
```python
from proxy_timing import ProxyTimer

timer = ProxyTimer()
results = timer.measure_proxy(
    proxy_url="http://proxy.example.com:8080",
    target_url="https://httpbin.org/ip",
    attempts=10
)
print(results.get_statistics())
```

### Node.js
```javascript
const { ProxyTimer } = require('./proxy_timing');

const timer = new ProxyTimer();
const results = await timer.measureProxy({
    proxyUrl: "http://proxy.example.com:8080",
    targetUrl: "https://httpbin.org/ip",
    attempts: 10
});
console.log(results.getStatistics());
```

## Documentation

See individual implementation files for detailed documentation:
- [Command Line](proxy_ping.sh)
- [Python](proxy_timing.py)
- [Node.js](proxy_timing.js)