import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]

  }
});

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const AUTH_FILE = path.join(rootDir, 'email_pass.txt');
const ADMIN_AUTH_FILE = path.join(rootDir, 'email_pass_admins.txt');
const MAX_INSTANCES_PER_USER = 5;
const LIMITS_FILE = path.join(rootDir, 'limits.json');

const tokenBlacklist = new Set();

const getLimits = () => {
  if (!fs.existsSync(LIMITS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(LIMITS_FILE, 'utf-8'));
  } catch (e) {
    return {};
  }
};

// Middleware for JWT
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  if (tokenBlacklist.has(token)) return res.status(401).json({ error: 'Token revoked' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Auth Route
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  // Check admins first
  if (fs.existsSync(ADMIN_AUTH_FILE)) {
    const adminLines = fs.readFileSync(ADMIN_AUTH_FILE, 'utf-8').split('\n').filter(Boolean);
    const admin = adminLines.find(line => {
      const [u, p] = line.split(':');
      return u === email && p === password;
    });
    if (admin) {
      const token = jwt.sign({ email, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
      return res.json({ token, email, role: 'admin' });
    }
  }

  // Check regular users
  if (!fs.existsSync(AUTH_FILE)) {
    return res.status(500).json({ error: 'Auth file not found' });
  }
  const lines = fs.readFileSync(AUTH_FILE, 'utf-8').split('\n').filter(Boolean);
  const user = lines.find(line => {
    const [u, p] = line.split(':');
    return u === email && p === password;
  });

  if (user) {
    const token = jwt.sign({ email, role: 'user' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, email, role: 'user' });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/logout', authenticate, (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    tokenBlacklist.add(token);
  }
  res.json({ success: true });
});

// Admin routes
app.get('/api/admin/users', authenticate, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  
  if (!fs.existsSync(AUTH_FILE)) return res.json([]);
  const limits = getLimits();
  const users = fs.readFileSync(AUTH_FILE, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const [email, password] = line.split(':');
      return { email, password, limit: limits[email] || MAX_INSTANCES_PER_USER };
    });
  
  res.json(users);
});

app.post('/api/admin/users', authenticate, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  
  const { email, password, limit } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  // Update email_pass.txt
  let users = [];
  if (fs.existsSync(AUTH_FILE)) {
    users = fs.readFileSync(AUTH_FILE, 'utf-8').split('\n').filter(Boolean);
  }
  
  const userIndex = users.findIndex(u => u.startsWith(`${email}:`));
  if (userIndex > -1) {
    users[userIndex] = `${email}:${password}`;
  } else {
    users.push(`${email}:${password}`);
  }
  fs.writeFileSync(AUTH_FILE, users.join('\n') + '\n');

  // Update limits.json
  const limits = getLimits();
  limits[email] = parseInt(limit) || MAX_INSTANCES_PER_USER;
  fs.writeFileSync(LIMITS_FILE, JSON.stringify(limits, null, 2));

  res.json({ success: true });
});

app.delete('/api/admin/users/:email', authenticate, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { email } = req.params;
  if (email === 'admin') return res.status(400).json({ error: 'Cannot delete admin' });

  // Update email_pass.txt
  if (fs.existsSync(AUTH_FILE)) {
    const users = fs.readFileSync(AUTH_FILE, 'utf-8')
      .split('\n')
      .filter(Boolean)
      .filter(u => !u.startsWith(`${email}:`));
    fs.writeFileSync(AUTH_FILE, users.join('\n') + '\n');
  }

  // Update limits.json
  const limits = getLimits();
  delete limits[email];
  fs.writeFileSync(LIMITS_FILE, JSON.stringify(limits, null, 2));

  res.json({ success: true });
});

// Instances management (Stored in a simple JSON file for persistence)
const INSTANCES_FILE = path.join(rootDir, 'instances.json');
const getInstances = () => {
  if (!fs.existsSync(INSTANCES_FILE)) return [];
  const instances = JSON.parse(fs.readFileSync(INSTANCES_FILE, 'utf-8'));
  // Ensure each instance has a socketPort if it doesn't already
  let modified = false;
  instances.forEach((instance, index) => {
    if (!instance.socketPort) {
      instance.socketPort = 8080 + index;
      modified = true;
    }
  });
  if (modified) {
    fs.writeFileSync(INSTANCES_FILE, JSON.stringify(instances, null, 2));
  }
  return instances;
};
const saveInstances = (instances) => {
  fs.writeFileSync(INSTANCES_FILE, JSON.stringify(instances, null, 2));
};

const copyDir = (src, dest) => {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
};

app.get('/api/instances', authenticate, (req, res) => {
  const allInstances = getInstances();
  if (req.user.role === 'admin') {
    res.json(allInstances);
  } else {
    res.json(allInstances.filter(i => i.owner === req.user.email));
  }
});

app.post('/api/instances', authenticate, (req, res) => {
  try {
    const { name, accounts, envOverrides, socketPort } = req.body;
    if (!name || !accounts) return res.status(400).json({ error: 'Name and accounts are required' });

    const instances = getInstances();

    // Check limit per user
    const limits = getLimits();
    const userLimit = limits[req.user.email] || MAX_INSTANCES_PER_USER;
    const userInstances = instances.filter(i => i.owner === req.user.email);
    if (userInstances.length >= userLimit) {
      return res.status(403).json({ error: `Limit reached: max ${userLimit} instances per user` });
    }

    const firstEmail = accounts.split('\n')[0].split(':')[0] || 'instance';
    const dataDir = `data_${firstEmail.split('@')[0]}_${Date.now()}`;

    // Find next available port if not provided
    let finalSocketPort = parseInt(socketPort);
    if (!finalSocketPort) {
      const usedPorts = instances.map(i => i.socketPort).filter(Boolean);
      finalSocketPort = usedPorts.length > 0 ? Math.max(...usedPorts) + 1 : 8080;
    }

    const newInstance = {
      id: Date.now().toString(),
      name,
      owner: req.user.email,
      email: firstEmail,
      dataDir,
      socketPort: finalSocketPort,
      envOverrides: envOverrides || {},
      status: 'stopped'
    };

    instances.push(newInstance);
    saveInstances(instances);

    // Ensure data dir exists
    const fullDataPath = path.join(rootDir, dataDir);
    const templateDataPath = path.join(rootDir, 'data');

    if (fs.existsSync(templateDataPath)) {
      copyDir(templateDataPath, fullDataPath);
    } else if (!fs.existsSync(fullDataPath)) {
      fs.mkdirSync(fullDataPath, { recursive: true });
    }

    const fullSorPath = path.join(fullDataPath, 'sor');
    if (!fs.existsSync(fullSorPath)) {
      fs.mkdirSync(fullSorPath, { recursive: true });
    }

    fs.writeFileSync(path.join(fullSorPath, 'acc.txt'), accounts.endsWith('\n') ? accounts : accounts + '\n');

    if (!fs.existsSync(path.join(fullSorPath, 'proxy.txt'))) {
      fs.writeFileSync(path.join(fullSorPath, 'proxy.txt'), '');
    }
    if (!fs.existsSync(path.join(fullSorPath, 'hold-tokens.json'))) {
      fs.writeFileSync(path.join(fullSorPath, 'hold-tokens.json'), '{}');
    }

    res.json(newInstance);
  } catch (err) {
    console.error('Error creating instance:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

app.put('/api/instances/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const { name, socketPort } = req.body;
  const instances = getInstances();
  const instanceIndex = instances.findIndex(i => i.id === id && (i.owner === req.user.email || req.user.role === 'admin'));
  
  if (instanceIndex === -1) return res.status(404).json({ error: 'Instance not found' });
  
  if (name) instances[instanceIndex].name = name;
  if (socketPort) instances[instanceIndex].socketPort = parseInt(socketPort);
  
  saveInstances(instances);
  res.json(instances[instanceIndex]);
});

app.delete('/api/instances/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const instances = getInstances();
  const instanceIndex = instances.findIndex(i => i.id === id && (i.owner === req.user.email || req.user.role === 'admin'));
  
  if (instanceIndex === -1) return res.status(404).json({ error: 'Instance not found' });
  
  const instance = instances[instanceIndex];
  
  // Stop process if running
  const child = processes.get(id);
  if (child) {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch (e) {
      child.kill();
    }
    processes.delete(id);
  }
  
  // Remove from instances list
  instances.splice(instanceIndex, 1);
  saveInstances(instances);
  
  // Delete data directory
  const dataPath = path.join(rootDir, instance.dataDir);
  if (fs.existsSync(dataPath)) {
    try {
      fs.rmSync(dataPath, { recursive: true, force: true });
    } catch (err) {
      console.error(`Failed to delete data directory ${dataPath}:`, err);
    }
  }
  
  res.json({ success: true });
});

// Running processes
const processes = new Map();

app.post('/api/instances/:id/start', authenticate, (req, res) => {
  const { id } = req.params;
  const { script } = req.body; // e.g. 'start.sh' or 'scripts/socket_listen.js'
  const instances = getInstances();
  const instance = instances.find(i => i.id === id && (i.owner === req.user.email || req.user.role === 'admin'));
  
  if (!instance) return res.status(404).json({ error: 'Instance not found' });
  if (processes.has(id)) return res.status(400).json({ error: 'Already running' });

  const env = {
    ...process.env,
    DATA_DIR: instance.dataDir,
    SOCKET_PORT: instance.socketPort || 8080,
    ...instance.envOverrides
  };

  const spawnOptions = { cwd: rootDir, env, detached: true };
  let child;
  if (script.endsWith('.sh')) {
    child = spawn('bash', [script], spawnOptions);
  } else {
    child = spawn('node', [script], spawnOptions);
  }

  processes.set(id, child);
  
  child.stdout.on('data', (data) => {
    io.to(id).emit('logs', data.toString());
  });
  
  child.stderr.on('data', (data) => {
    io.to(id).emit('logs', data.toString());
  });
  
  child.on('close', (code) => {
    processes.delete(id);
    io.to(id).emit('status', 'stopped');
    io.to(id).emit('logs', `Process exited with code ${code}\n`);
  });

  res.json({ success: true });
});

app.post('/api/instances/:id/stop', authenticate, (req, res) => {
  const { id } = req.params;
  const instances = getInstances();
  const instance = instances.find(i => i.id === id && (i.owner === req.user.email || req.user.role === 'admin'));
  if (!instance) return res.status(404).json({ error: 'Instance not found' });

  const child = processes.get(id);
  if (child) {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch (e) {
      child.kill();
    }
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Not running' });
  }
});

const ALLOWED_FILES = new Set(['acc.txt', 'proxy.txt', 'hold-tokens.json', 'held_objects.json', 'number_of_booked_seats_for_each_acc.txt']);

// File management in data folder
app.get('/api/instances/:id/files', authenticate, (req, res) => {
  const { id } = req.params;
  const instance = getInstances().find(i => i.id === id && (i.owner === req.user.email || req.user.role === 'admin'));
  if (!instance) return res.status(404).json({ error: 'Instance not found' });

  const dataPath = path.join(rootDir, instance.dataDir, 'sor');
  if (!fs.existsSync(dataPath)) return res.json([]);

  const files = fs.readdirSync(dataPath).filter(f => ALLOWED_FILES.has(f));
  res.json(files);
});

app.get('/api/instances/:id/files/:filename', authenticate, (req, res) => {
    const { id, filename } = req.params;
    if (!ALLOWED_FILES.has(filename)) return res.status(403).json({ error: 'Access denied' });
    const instance = getInstances().find(i => i.id === id && (i.owner === req.user.email || req.user.role === 'admin'));
    if (!instance) return res.status(404).json({ error: 'Instance not found' });
    const filePath = path.join(rootDir, instance.dataDir, 'sor', filename);
    if (!fs.existsSync(filePath)) return res.status(404).send('File not found');
    res.send(fs.readFileSync(filePath, 'utf-8'));
});

app.post('/api/instances/:id/files/:filename', authenticate, (req, res) => {
    const { id, filename } = req.params;
    if (!ALLOWED_FILES.has(filename)) return res.status(403).json({ error: 'Access denied' });
    const { content } = req.body;
    const instance = getInstances().find(i => i.id === id && (i.owner === req.user.email || req.user.role === 'admin'));
    if (!instance) return res.status(404).json({ error: 'Instance not found' });
    const filePath = path.join(rootDir, instance.dataDir, 'sor', filename);
    fs.writeFileSync(filePath, content);
    res.json({ success: true });
});

// WebSocket logic
io.on('connection', (socket) => {
  socket.on('join', (instanceId) => {
    socket.join(instanceId);
    if (processes.has(instanceId)) {
      socket.emit('status', 'running');
    } else {
      socket.emit('status', 'stopped');
    }
  });
});

app.post('/api/instances/:id/env', authenticate, (req, res) => {
  const { id } = req.params;
  const { envOverrides } = req.body;
  const instances = getInstances();
  const instanceIndex = instances.findIndex(i => i.id === id && (i.owner === req.user.email || req.user.role === 'admin'));
  
  if (instanceIndex === -1) return res.status(404).json({ error: 'Instance not found' });
  
  instances[instanceIndex].envOverrides = envOverrides;
  saveInstances(instances);
  res.json({ success: true });
});

app.get('/api/instances/:id/env', authenticate, (req, res) => {
  const { id } = req.params;
  const instance = getInstances().find(i => i.id === id && (i.owner === req.user.email || req.user.role === 'admin'));
  if (!instance) return res.status(404).json({ error: 'Instance not found' });
  res.json(instance.envOverrides || {});
});

const ENV_FILE = path.join(rootDir, '.env');

app.get('/api/config/env', authenticate, (req, res) => {
  if (!fs.existsSync(ENV_FILE)) return res.json({});
  
  const content = fs.readFileSync(ENV_FILE, 'utf-8');
  const lines = content.split('\n');
  const config = {};
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    
    const [key, ...rest] = trimmed.split('=');
    if (!key) return;
    
    let value = rest.join('=').trim();
    
    // Split by # to remove trailing comment
    const hashIndex = value.indexOf('#');
    if (hashIndex !== -1) {
      value = value.substring(0, hashIndex).trim();
    }
    
    // Remove quotes
    if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
      value = value.substring(1, value.length - 1);
    }
    
    config[key.trim()] = value;
  });
  
  res.json(config);
});

app.post('/api/config/env', authenticate, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  
  const newConfig = req.body;
  if (!fs.existsSync(ENV_FILE)) {
    return res.status(404).json({ error: '.env file not found' });
  }
  
  const content = fs.readFileSync(ENV_FILE, 'utf-8');
  const lines = content.split('\n');
  
  const updatedLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;
    
    const [key] = trimmed.split('=');
    const trimmedKey = key.trim();
    
    if (Object.prototype.hasOwnProperty.call(newConfig, trimmedKey)) {
      const newValue = newConfig[trimmedKey];
      const hashIndex = line.indexOf('#');
      const comment = hashIndex !== -1 ? line.substring(hashIndex) : '';
      
      // Preserve indentation if possible (though .env usually doesn't have much)
      const indent = line.match(/^\s*/)[0];
      return `${indent}${trimmedKey}='${newValue}'${comment ? ' ' + comment : ''}`;
    }
    return line;
  });
  
  fs.writeFileSync(ENV_FILE, updatedLines.join('\n'));
  res.json({ success: true });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`WebUI Backend running on http://localhost:${PORT}`);
});
