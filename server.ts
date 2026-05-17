import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import fs from 'fs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));

// Initialize Firebase Admin
let adminApp;
try {
  if (!admin.apps.length) {
    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (serviceAccountVar) {
      console.log('Initializing Firebase Admin with Service Account from ENV');
      const serviceAccount = JSON.parse(serviceAccountVar);
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: firebaseConfig.projectId
      });
    } else if (fs.existsSync('./firebase-service-account.json')) {
      console.log('Initializing Firebase Admin with Service Account from File');
      const serviceAccount = JSON.parse(fs.readFileSync('./firebase-service-account.json', 'utf-8'));
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: firebaseConfig.projectId
      });
    } else {
      console.log('Initializing Firebase Admin with default project ID');
      adminApp = admin.initializeApp({
        projectId: firebaseConfig.projectId
      });
    }
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error);
}

const db = admin.firestore();
// If firestoreDatabaseId is specified, we might need to target it specifically.
// Note: firebase-admin v11.3.0+ supports databaseId in firestore()
const firestore = firebaseConfig.firestoreDatabaseId 
  ? db.collection('dummy').firestore.databaseId === firebaseConfig.firestoreDatabaseId 
    ? db 
    : (db as any).databaseId 
      ? db 
      : admin.firestore() // fallback
  : db;

const app = express();

app.use(express.json());

// Auth check for client-side auto-registration
app.post('/api/auth/check-email', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ status: 'error', message: 'Email required' });

  try {
    const docRef = db.collection('authorized_emails').doc(email.toLowerCase().trim());
    const docSnap = await docRef.get();
    
    res.json({ authorized: docSnap.exists });
  } catch (error) {
    console.error('Error checking authorized email:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// Kiwify Webhook
app.post('/api/webhook/kiwify', async (req, res) => {
  console.log('Kiwify Webhook Received:', JSON.stringify(req.body, null, 2));

  // Security Check: Verify signature if secret is provided
  const signature = req.headers['x-kiwify-signature'];
  const webhookSecret = process.env.KIWIFY_WEBHOOK_SECRET;

  if (webhookSecret) {
    if (!signature) {
      console.error('Webhook Error: Missing x-kiwify-signature header');
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const hmac = crypto.createHmac('sha1', webhookSecret);
    const digest = hmac.update(JSON.stringify(req.body)).digest('hex');

    if (signature !== digest) {
      console.error('Webhook Error: Invalid signature');
      return res.status(401).json({ status: 'error', message: 'Invalid signature' });
    }
  } else {
    console.warn('Webhook Warning: KIWIFY_WEBHOOK_SECRET not set. Skipping signature verification.');
  }

  const { order_status, customer_email, customer_name } = req.body;

  if (order_status === 'paid' || order_status === 'approved') {
    try {
      if (customer_email) {
        const email = customer_email.toLowerCase().trim();
        
        await db.collection('authorized_emails').doc(email).set({
          email,
          name: customer_name || '',
          status: order_status,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          source: 'kiwify'
        });

        console.log(`Access granted to: ${email}`);
        return res.status(200).json({ status: 'success', message: 'Access granted' });
      }
    } catch (error) {
      console.error('Error saving to Firestore:', error);
      return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
  }

  res.status(200).json({ status: 'ignored', message: 'Order status not handled or missing email' });
});

async function setupApp() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    
    app.get('/demo', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });

    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

// For local development or non-Vercel environments
if (!process.env.VERCEL) {
  setupApp().then(() => {
    const PORT = Number(process.env.PORT) || 3000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running at http://0.0.0.0:${PORT}`);
    });
  });
}

// Setup for Vercel
setupApp();

export default app;
