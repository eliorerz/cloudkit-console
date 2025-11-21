import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const FULFILLMENT_API = process.env.FULFILLMENT_API_URL || 'https://fulfillment-api-innabox-devel.apps.ostest.test.metalkube.org';
const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'https://keycloak-innabox-devel.apps.ostest.test.metalkube.org';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'innabox';
const OIDC_CLIENT_ID = process.env.OIDC_CLIENT_ID || 'cloudkit-console';
const NAMESPACE = process.env.NAMESPACE || 'innabox-devel';
const GENERIC_TEMPLATE_ID = process.env.GENERIC_TEMPLATE_ID || 'cloudkit.templates.ocp_virt_vm';

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
    namespace: NAMESPACE,
    genericTemplateId: GENERIC_TEMPLATE_ID
  });
});

// OS Images catalog endpoint
app.get('/api/os-images', (req, res) => {
  const osImagesPath = path.join(__dirname, '../config/os-images.json');

  try {
    // Check if file exists (mounted from ConfigMap in production)
    if (fs.existsSync(osImagesPath)) {
      const osImagesData = fs.readFileSync(osImagesPath, 'utf8');
      res.json(JSON.parse(osImagesData));
    } else {
      // Fallback data for local development
      res.json({
        images: [
          {
            os: "fedora",
            displayName: "Fedora",
            icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/fedora/fedora-original.svg",
            repository: "quay.io/containerdisks/fedora",
            versions: ["43", "42", "41"],
            osType: "linux"
          },
          {
            os: "centos-stream",
            displayName: "CentOS Stream",
            icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/centos/centos-original.svg",
            repository: "quay.io/containerdisks/centos-stream",
            versions: ["10", "9"],
            osType: "linux"
          },
          {
            os: "ubuntu",
            displayName: "Ubuntu",
            icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/ubuntu/ubuntu-original.svg",
            repository: "quay.io/containerdisks/ubuntu",
            versions: ["25.04", "24.04"],
            osType: "linux"
          },
          {
            os: "debian",
            displayName: "Debian",
            icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/debian/debian-original.svg",
            repository: "quay.io/containerdisks/debian",
            versions: ["13", "12", "11"],
            osType: "linux"
          }
        ]
      });
    }
  } catch (error) {
    console.error('Error reading OS images config:', error);
    res.status(500).json({ error: 'Failed to load OS images catalog' });
  }
});

// Host Classes catalog endpoint
app.get('/api/host-classes', (req, res) => {
  const hostClassesPath = path.join(__dirname, '../config/host-classes.json');

  try {
    // Check if file exists (mounted from ConfigMap in production)
    if (fs.existsSync(hostClassesPath)) {
      const hostClassesData = fs.readFileSync(hostClassesPath, 'utf8');
      res.json(JSON.parse(hostClassesData));
    } else {
      // Fallback data for local development
      res.json({
        "fc430": {
          "name": "FC430",
          "description": "Cisco UCS C240 M4",
          "category": "Compute Optimized",
          "cpu": {
            "type": "Intel Xeon E5-2680 v4",
            "cores": 28,
            "sockets": 2,
            "threadsPerCore": 2
          },
          "ram": {
            "size": "256GB",
            "type": "DDR4"
          },
          "disk": {
            "type": "SSD",
            "size": "2x 480GB",
            "interface": "SATA"
          },
          "gpu": null
        },
        "fc640": {
          "name": "FC640",
          "description": "Dell PowerEdge R640",
          "category": "Balanced",
          "cpu": {
            "type": "Intel Xeon Gold 6238R",
            "cores": 56,
            "sockets": 2,
            "threadsPerCore": 2
          },
          "ram": {
            "size": "384GB",
            "type": "DDR4"
          },
          "disk": {
            "type": "NVMe SSD",
            "size": "4x 960GB",
            "interface": "PCIe"
          },
          "gpu": null
        },
        "fc740": {
          "name": "FC740",
          "description": "HPE ProLiant DL380 Gen10",
          "category": "Storage Optimized",
          "cpu": {
            "type": "Intel Xeon Gold 6248R",
            "cores": 48,
            "sockets": 2,
            "threadsPerCore": 2
          },
          "ram": {
            "size": "512GB",
            "type": "DDR4"
          },
          "disk": {
            "type": "NVMe SSD",
            "size": "8x 1.6TB",
            "interface": "PCIe"
          },
          "gpu": null
        }
      });
    }
  } catch (error) {
    console.error('Error reading host classes config:', error);
    res.status(500).json({ error: 'Failed to load host classes catalog' });
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
