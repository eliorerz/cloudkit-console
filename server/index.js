import express from 'express';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const FULFILLMENT_API = process.env.FULFILLMENT_API_URL || 'https://fulfillment-api-foobar.apps.ostest.test.metalkube.org';
const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'https://keycloak-foobar.apps.ostest.test.metalkube.org';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'innabox';
const OIDC_CLIENT_ID = process.env.OIDC_CLIENT_ID || 'cloudkit-console';
const NAMESPACE = process.env.NAMESPACE || 'innabox-devel';
const API_URL = new URL(FULFILLMENT_API);

// Middleware
app.use(express.json());

// Helper function to make HTTPS requests
const makeRequest = (path, token, method = 'GET', body = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_URL.hostname,
      port: API_URL.port || 443,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      rejectUnauthorized: false
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          reject({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
};

// API endpoint to generate Kubernetes token
app.post('/api/generate-token', async (req, res) => {
  const { serviceAccount } = req.body;

  if (!serviceAccount) {
    return res.status(400).json({ error: 'serviceAccount is required' });
  }

  // Validate serviceAccount to prevent command injection
  const validServiceAccounts = ['fulfillment-admin', 'fulfillment-client'];
  if (!validServiceAccounts.includes(serviceAccount)) {
    return res.status(400).json({ error: 'Invalid service account' });
  }

  // Generate kubectl command - use configured namespace
  const command = `kubectl create token ${serviceAccount} -n ${NAMESPACE} --duration=8h`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error generating token: ${error.message}`);
      console.error(`stderr: ${stderr}`);
      return res.status(500).json({ error: 'Failed to generate token' });
    }

    const token = stdout.trim();
    if (!token) {
      return res.status(500).json({ error: 'Empty token received' });
    }

    res.json({ token });
  });
});

// Proxy API requests to fulfillment API
app.get('/api/clusters', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const data = await makeRequest('/api/fulfillment/v1/clusters', token);
    res.json(data);
  } catch (error) {
    console.error('Error fetching clusters:', error);
    res.status(error.status || 500).json({ error: 'Failed to fetch clusters', details: error.data });
  }
});

app.get('/api/templates', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const data = await makeRequest('/api/fulfillment/v1/virtual_machine_templates', token);
    res.json(data);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(error.status || 500).json({ error: 'Failed to fetch templates', details: error.data });
  }
});

app.post('/api/templates', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const data = await makeRequest('/api/fulfillment/v1/virtual_machine_templates', token, 'POST', req.body);
    res.json(data);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(error.status || 500).json({ error: 'Failed to create template', details: error.data });
  }
});

app.delete('/api/templates/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    await makeRequest(`/api/fulfillment/v1/virtual_machine_templates/${req.params.id}`, token, 'DELETE');
    res.json({ success: true });
  } catch (error) {
    console.error(`Error deleting template ${req.params.id}:`, error);
    res.status(error.status || 500).json({ error: 'Failed to delete template', details: error.data });
  }
});

app.get('/api/hubs', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const data = await makeRequest('/api/private/v1/hubs', token);
    res.json(data);
  } catch (error) {
    console.error('Error fetching hubs:', error);
    res.status(error.status || 500).json({ error: 'Failed to fetch hubs', details: error.data });
  }
});

app.get('/api/hubs/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const data = await makeRequest(`/api/private/v1/hubs/${req.params.id}`, token);
    res.json(data);
  } catch (error) {
    console.error(`Error fetching hub ${req.params.id}:`, error);
    res.status(error.status || 500).json({ error: 'Failed to fetch hub', details: error.data });
  }
});

app.post('/api/hubs', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const data = await makeRequest('/api/private/v1/hubs', token, 'POST', req.body);
    res.json(data);
  } catch (error) {
    console.error('Error creating hub:', error);
    res.status(error.status || 500).json({ error: 'Failed to create hub', details: error.data });
  }
});

app.put('/api/hubs/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const data = await makeRequest(`/api/private/v1/hubs/${req.params.id}`, token, 'PUT', req.body);
    res.json(data);
  } catch (error) {
    console.error(`Error updating hub ${req.params.id}:`, error);
    res.status(error.status || 500).json({ error: 'Failed to update hub', details: error.data });
  }
});

app.delete('/api/hubs/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    await makeRequest(`/api/private/v1/hubs/${req.params.id}`, token, 'DELETE');
    res.json({ success: true });
  } catch (error) {
    console.error(`Error deleting hub ${req.params.id}:`, error);
    res.status(error.status || 500).json({ error: 'Failed to delete hub', details: error.data });
  }
});

app.get('/api/vms', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const data = await makeRequest('/api/fulfillment/v1/virtual_machines', token);
    res.json(data);
  } catch (error) {
    console.error('Error fetching vms:', error);
    res.status(error.status || 500).json({ error: 'Failed to fetch vms', details: error.data });
  }
});

app.get('/api/vms/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const data = await makeRequest(`/api/fulfillment/v1/virtual_machines/${req.params.id}`, token);
    res.json(data);
  } catch (error) {
    console.error(`Error fetching vm ${req.params.id}:`, error);
    res.status(error.status || 500).json({ error: 'Failed to fetch vm', details: error.data });
  }
});

app.post('/api/vms', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const data = await makeRequest('/api/fulfillment/v1/virtual_machines', token, 'POST', req.body);
    res.json(data);
  } catch (error) {
    console.error('Error creating vm:', error);
    res.status(error.status || 500).json({ error: 'Failed to create vm', details: error.data });
  }
});

app.put('/api/vms/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const data = await makeRequest(`/api/fulfillment/v1/virtual_machines/${req.params.id}`, token, 'PUT', req.body);
    res.json(data);
  } catch (error) {
    console.error(`Error updating vm ${req.params.id}:`, error);
    res.status(error.status || 500).json({ error: 'Failed to update vm', details: error.data });
  }
});

app.delete('/api/vms/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    await makeRequest(`/api/fulfillment/v1/virtual_machines/${req.params.id}`, token, 'DELETE');
    res.json({ success: true });
  } catch (error) {
    console.error(`Error deleting vm ${req.params.id}:`, error);
    res.status(error.status || 500).json({ error: 'Failed to delete vm', details: error.data });
  }
});

app.get('/api/hosts', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const data = await makeRequest('/api/fulfillment/v1/hosts', token);
    res.json(data);
  } catch (error) {
    console.error('Error fetching hosts:', error);
    res.status(error.status || 500).json({ error: 'Failed to fetch hosts', details: error.data });
  }
});

app.get('/api/host_pools', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const data = await makeRequest('/api/fulfillment/v1/host_pools', token);
    res.json(data);
  } catch (error) {
    console.error('Error fetching host pools:', error);
    res.status(error.status || 500).json({ error: 'Failed to fetch host pools', details: error.data });
  }
});

// Configuration endpoint for frontend
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
