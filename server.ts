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

// Initialize Firebase Admin lazily to prevent crashing on server boot
let dbInstance: admin.firestore.Firestore | null = null;

function getDb(): admin.firestore.Firestore {
  if (dbInstance) return dbInstance;

  const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));

  if (!admin.apps.length) {
    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    try {
      if (serviceAccountVar && serviceAccountVar.trim() !== '' && serviceAccountVar !== 'Secret value') {
        console.log('Initializing Firebase Admin with Service Account from ENV');
        const serviceAccount = JSON.parse(serviceAccountVar);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: firebaseConfig.projectId
        });
      } else if (fs.existsSync('./firebase-service-account.json')) {
        console.log('Initializing Firebase Admin with Service Account from File');
        const serviceAccount = JSON.parse(fs.readFileSync('./firebase-service-account.json', 'utf-8'));
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: firebaseConfig.projectId
        });
      } else {
        console.log('Initializing Firebase Admin with default project ID');
        admin.initializeApp({
          projectId: firebaseConfig.projectId
        });
      }
    } catch (error: any) {
      console.error('Failed to parse or initialize Firebase Admin with config:', error);
      console.error('Please verify that the FIREBASE_SERVICE_ACCOUNT environment variable is a valid JSON string (NOT "Secret value" or a simple text token).');
      throw new Error(`Firebase Admin failed to initialize: ${error.message}. Please configure FIREBASE_SERVICE_ACCOUNT with a valid JSON credential from the Firebase Console.`);
    }
  }

  const baseDb = admin.firestore();
  
  dbInstance = firebaseConfig.firestoreDatabaseId 
    ? (baseDb.collection('dummy').firestore as any).databaseId === firebaseConfig.firestoreDatabaseId 
      ? baseDb 
      : (baseDb as any).databaseId 
        ? baseDb 
        : admin.firestore() // fallback
    : baseDb;

  return dbInstance;
}

const app = express();

app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));

// Auth check for client-side auto-registration
app.post('/api/auth/check-email', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ status: 'error', message: 'Email required' });

  try {
    const docRef = getDb().collection('authorized_emails').doc(email.toLowerCase().trim());
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
      return res.status(401).json({ status: 'error', message: 'Unauthorized: Missing x-kiwify-signature header' });
    }

    const hmac = crypto.createHmac('sha1', webhookSecret);
    const rawBody = (req as any).rawBody;

    let digest: string;
    if (rawBody) {
      digest = hmac.update(rawBody).digest('hex');
    } else {
      console.warn('Webhook Warning: rawBody not available, falling back to JSON.stringify for hashing.');
      digest = hmac.update(JSON.stringify(req.body)).digest('hex');
    }

    if (signature !== digest) {
      console.error('Webhook Error: Invalid signature. Received:', signature, 'Computed:', digest);
      return res.status(401).json({ 
        status: 'error', 
        message: 'Invalid signature',
        received: signature,
        computed: digest,
        instructions: 'Verify if the KIWIFY_WEBHOOK_SECRET configured matches the Secret Token from Kiwify Dashboard.'
      });
    }
    console.log('Kiwify signature verified successfully.');
  } else {
    console.warn('Webhook Warning: KIWIFY_WEBHOOK_SECRET not set. Skipping signature verification.');
  }

  const order_status = req.body.order_status;
  const customer_email = req.body.customer_email || req.body.customer?.email;
  const customer_name = req.body.customer_name || req.body.customer?.name;
  const product_id = req.body.product_id;
  const product_name = req.body.product_name || req.body.product?.name;
  const subscription_id = req.body.subscription_id;
  const payment_method = req.body.payment_method;
  
  // subscription status from Kiwify (active, overdue, canceled, etc.)
  const subscription_status = req.body.subscription?.status;

  if (!customer_email) {
    console.error('Webhook Error: Customer email is missing from body:', JSON.stringify(req.body));
    return res.status(400).json({ status: 'error', message: 'Customer email is missing' });
  }

  const email = customer_email.toLowerCase().trim();

  // 1. Grant/Renew Access Statuses
  const isPaid = order_status === 'paid' || order_status === 'approved';
  const isSubscriptionActive = subscription_status === 'active';

  // 2. Block/Revoke Access Statuses
  const isRefundedOrCanceled = 
    order_status === 'refunded' || 
    order_status === 'chargedback' || 
    order_status === 'canceled' || 
    order_status === 'chargeback' ||
    subscription_status === 'canceled' ||
    subscription_status === 'overdue' ||
    subscription_status === 'refunded' ||
    subscription_status === 'chargedback';

  if (isPaid || isSubscriptionActive) {
    try {
      const db = getDb();
      await db.collection('authorized_emails').doc(email).set({
        email,
        name: customer_name || '',
        status: 'approved',
        originalStatus: order_status || 'approved',
        productId: product_id || '',
        productName: product_name || '',
        subscriptionId: subscription_id || '',
        paymentMethod: payment_method || '',
        blocked: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        source: 'kiwify'
      });

      console.log(`Access granted/renewed to: ${email} for product: ${product_name}`);
      return res.status(200).json({ status: 'success', message: 'Access granted/renewed successfully' });
    } catch (error: any) {
      console.error('Error saving active authorization to Firestore:', error);
      return res.status(500).json({ 
        status: 'error', 
        message: `Error writing to Firestore: ${error.message}`,
        details: 'Verify that FIREBASE_SERVICE_ACCOUNT is correctly set as a valid JSON string on the hosting dashboard (e.g., Vercel).'
      });
    }
  } else if (isRefundedOrCanceled) {
    try {
      const db = getDb();
      // Set to blocked/canceled in Firestore to instantly deny access on both front-end and back-end checks
      await db.collection('authorized_emails').doc(email).set({
        email,
        name: customer_name || '',
        status: 'canceled', // Explicit canceled status to block access immediately
        originalStatus: order_status || 'canceled',
        subscriptionStatus: subscription_status || '',
        productId: product_id || '',
        productName: product_name || '',
        subscriptionId: subscription_id || '',
        paymentMethod: payment_method || '',
        blocked: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        source: 'kiwify'
      });

      console.log(`Access revoked/blocked for: ${email} (Order status: ${order_status}, Subscription status: ${subscription_status})`);
      return res.status(200).json({ status: 'success', message: 'Access revoked/blocked successfully' });
    } catch (error: any) {
      console.error('Error updating blocked status to Firestore:', error);
      return res.status(500).json({ 
        status: 'error', 
        message: `Error writing to Firestore: ${error.message}`,
        details: 'Verify that FIREBASE_SERVICE_ACCOUNT is correctly set as a valid JSON string on the hosting dashboard (e.g., Vercel).'
      });
    }
  }

  res.status(200).json({ status: 'ignored', message: 'Order status received but no grant or revoke action required' });
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
