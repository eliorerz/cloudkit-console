/**
 * Simple in-memory metrics tracking for monitoring
 */

class Metrics {
  constructor() {
    this.startTime = Date.now();
    this.requests = {
      total: 0,
      success: 0,
      clientError: 0,
      serverError: 0,
    };
    this.responseTimes = [];
    this.maxResponseTimes = 1000; // Keep last 1000 response times
  }

  recordRequest(statusCode, duration) {
    this.requests.total++;

    if (statusCode >= 200 && statusCode < 300) {
      this.requests.success++;
    } else if (statusCode >= 400 && statusCode < 500) {
      this.requests.clientError++;
    } else if (statusCode >= 500) {
      this.requests.serverError++;
    }

    // Track response time
    this.responseTimes.push(duration);
    if (this.responseTimes.length > this.maxResponseTimes) {
      this.responseTimes.shift();
    }
  }

  getMetrics() {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const avgResponseTime = this.responseTimes.length > 0
      ? Math.round(this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length)
      : 0;

    const p95ResponseTime = this.responseTimes.length > 0
      ? this.calculatePercentile(this.responseTimes, 95)
      : 0;

    const p99ResponseTime = this.responseTimes.length > 0
      ? this.calculatePercentile(this.responseTimes, 99)
      : 0;

    return {
      uptime_seconds: uptime,
      requests_total: this.requests.total,
      requests_success: this.requests.success,
      requests_client_error: this.requests.clientError,
      requests_server_error: this.requests.serverError,
      response_time_avg_ms: avgResponseTime,
      response_time_p95_ms: p95ResponseTime,
      response_time_p99_ms: p99ResponseTime,
      memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      memory_total_mb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    };
  }

  getPrometheusMetrics() {
    const metrics = this.getMetrics();

    return `# HELP osac_ui_uptime_seconds Application uptime in seconds
# TYPE osac_ui_uptime_seconds gauge
osac_ui_uptime_seconds ${metrics.uptime_seconds}

# HELP osac_ui_requests_total Total number of HTTP requests
# TYPE osac_ui_requests_total counter
osac_ui_requests_total ${metrics.requests_total}

# HELP osac_ui_requests_success Total number of successful HTTP requests (2xx)
# TYPE osac_ui_requests_success counter
osac_ui_requests_success ${metrics.requests_success}

# HELP osac_ui_requests_client_error Total number of client error HTTP requests (4xx)
# TYPE osac_ui_requests_client_error counter
osac_ui_requests_client_error ${metrics.requests_client_error}

# HELP osac_ui_requests_server_error Total number of server error HTTP requests (5xx)
# TYPE osac_ui_requests_server_error counter
osac_ui_requests_server_error ${metrics.requests_server_error}

# HELP osac_ui_response_time_avg_ms Average response time in milliseconds
# TYPE osac_ui_response_time_avg_ms gauge
osac_ui_response_time_avg_ms ${metrics.response_time_avg_ms}

# HELP osac_ui_response_time_p95_ms 95th percentile response time in milliseconds
# TYPE osac_ui_response_time_p95_ms gauge
osac_ui_response_time_p95_ms ${metrics.response_time_p95_ms}

# HELP osac_ui_response_time_p99_ms 99th percentile response time in milliseconds
# TYPE osac_ui_response_time_p99_ms gauge
osac_ui_response_time_p99_ms ${metrics.response_time_p99_ms}

# HELP osac_ui_memory_usage_mb Memory usage in megabytes
# TYPE osac_ui_memory_usage_mb gauge
osac_ui_memory_usage_mb ${metrics.memory_usage_mb}

# HELP osac_ui_memory_total_mb Total memory allocated in megabytes
# TYPE osac_ui_memory_total_mb gauge
osac_ui_memory_total_mb ${metrics.memory_total_mb}
`;
  }

  calculatePercentile(arr, percentile) {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return Math.round(sorted[index] || 0);
  }
}

export const metrics = new Metrics();
