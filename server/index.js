import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const FULFILLMENT_API = process.env.FULFILLMENT_API_URL || 'https://fulfillment-api-innabox-devel.apps.ostest.test.metalkube.org';
const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'https://keycloak-innabox-devel.apps.ostest.test.metalkube.org';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'innabox';
const OIDC_CLIENT_ID = process.env.OIDC_CLIENT_ID || 'cloudkit-console';
const NAMESPACE = process.env.NAMESPACE || 'innabox-devel';

// Middleware
app.use(express.json());

// Configuration endpoint - provides runtime config to frontend
// This allows the frontend to discover API URLs without hardcoding
app.get('/api/config', (req, res) => {
  res.json({
    keycloakUrl: KEYCLOAK_URL,
    keycloakRealm: KEYCLOAK_REALM,
    oidcClientId: OIDC_CLIENT_ID,
    fulfillmentApiUrl: FULFILLMENT_API,
    namespace: NAMESPACE
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, '../dist')));

// SPA fallback - serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`CloudKit Console server listening on port ${PORT}`);
});
