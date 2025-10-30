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
const API_URL = new URL(FULFILLMENT_API);

// Middleware
app.use(express.json());

// Helper function to make HTTPS requests
const makeRequest = (path, token) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_URL.hostname,
      port: API_URL.port || 443,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
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

    req.end();
  });
};

// API endpoint to generate Kubernetes token
app.post('/api/generate-token', async (req, res) => {
  const { serviceAccount, namespace } = req.body;

  if (!serviceAccount || !namespace) {
    return res.status(400).json({ error: 'serviceAccount and namespace are required' });
  }

  // Validate serviceAccount to prevent command injection
  const validServiceAccounts = ['fulfillment-admin', 'fulfillment-client'];
  if (!validServiceAccounts.includes(serviceAccount)) {
    return res.status(400).json({ error: 'Invalid service account' });
  }

  // Generate kubectl command - use in-cluster config
  const command = `kubectl create token ${serviceAccount} -n ${namespace} --duration=8h`;

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
    const data = await makeRequest('/api/fulfillment/v1/cluster_templates', token);
    res.json(data);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(error.status || 500).json({ error: 'Failed to fetch templates', details: error.data });
  }
});

app.get('/api/hubs', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const data = await makeRequest('/api/fulfillment/v1/host_pools', token);
    res.json(data);
  } catch (error) {
    console.error('Error fetching hubs:', error);
    res.status(error.status || 500).json({ error: 'Failed to fetch hubs', details: error.data });
  }
});

app.get('/api/vms', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const data = await makeRequest('/api/fulfillment/v1/virtual_machine_templates', token);
    res.json(data);
  } catch (error) {
    console.error('Error fetching vms:', error);
    res.status(error.status || 500).json({ error: 'Failed to fetch vms', details: error.data });
  }
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
