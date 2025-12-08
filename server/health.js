/**
 * Health check utilities for monitoring external dependencies
 */
import https from 'https';
import http from 'http';
import { logger } from './logger.js';

/**
 * Check if a URL is reachable with a timeout
 */
async function checkEndpoint(url, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;

    // Accept self-signed certificates in non-production environments
    const options = {
      timeout: timeoutMs,
      rejectUnauthorized: false
    };

    const req = protocol.get(url, options, (res) => {
      const duration = Date.now() - startTime;
      // Consider 2xx, 3xx, 4xx as "reachable" (service is responding)
      // Only 5xx or connection errors indicate unhealthy
      const healthy = res.statusCode < 500;

      resolve({
        healthy,
        status: res.statusCode,
        duration,
      });

      // Consume response data to free up memory
      res.resume();
    });

    req.on('error', (error) => {
      const duration = Date.now() - startTime;
      resolve({
        healthy: false,
        error: error.message,
        duration,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const duration = Date.now() - startTime;
      resolve({
        healthy: false,
        error: 'Timeout',
        duration,
      });
    });
  });
}

/**
 * Check health of all external dependencies
 */
export async function checkHealth(fulfillmentApiUrl, keycloakUrl, keycloakRealm) {
  const checks = {};

  // Check Fulfillment API
  try {
    const fulfillmentCheck = await checkEndpoint(`${fulfillmentApiUrl}/api/fulfillment/v1/virtual_machines?size=1`);
    checks.fulfillment_api = {
      status: fulfillmentCheck.healthy ? 'healthy' : 'unhealthy',
      response_time_ms: fulfillmentCheck.duration,
      ...( fulfillmentCheck.error && { error: fulfillmentCheck.error }),
      ...( fulfillmentCheck.status && { http_status: fulfillmentCheck.status }),
    };
  } catch (error) {
    checks.fulfillment_api = {
      status: 'unhealthy',
      error: error.message,
    };
  }

  // Check Keycloak (OIDC well-known endpoint)
  try {
    const keycloakCheck = await checkEndpoint(
      `${keycloakUrl}/realms/${keycloakRealm}/.well-known/openid-configuration`
    );
    checks.keycloak = {
      status: keycloakCheck.healthy ? 'healthy' : 'unhealthy',
      response_time_ms: keycloakCheck.duration,
      ...( keycloakCheck.error && { error: keycloakCheck.error }),
      ...( keycloakCheck.status && { http_status: keycloakCheck.status }),
    };
  } catch (error) {
    checks.keycloak = {
      status: 'unhealthy',
      error: error.message,
    };
  }

  // Overall health is healthy if all dependencies are healthy
  const overall = Object.values(checks).every(check => check.status === 'healthy')
    ? 'healthy'
    : 'degraded';

  return {
    status: overall,
    checks,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Simple health check (no external dependencies)
 */
export function checkBasicHealth() {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
  };
}
