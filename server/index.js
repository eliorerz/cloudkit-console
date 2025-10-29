import express from 'express';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());

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

  // Generate kubectl command
  const kubeconfigPath = process.env.KUBECONFIG || '/etc/kubeconfig/kubeconfig';
  const command = `KUBECONFIG=${kubeconfigPath} kubectl create token ${serviceAccount} -n ${namespace} --duration=8h`;

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
