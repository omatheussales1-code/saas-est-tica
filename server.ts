import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import fs from 'fs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readConfigFile(filename: string): string {
  const paths = [
    path.join(process.cwd(), filename),
    path.join(__dirname, filename),
    path.join(__dirname, '..', filename),
    `./${filename}`
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, 'utf-8');
    }
  }
  throw new Error(`File not found: ${filename}`);
}

let firebaseConfig: any = {
  projectId: 'brefer',
  firestoreDatabaseId: 'ai-studio-3e2f12e2-b01b-4da0-b986-294c04a94a5c'
};

try {
  const fileContent = readConfigFile('firebase-applet-config.json');
  firebaseConfig = JSON.parse(fileContent);
} catch (e) {
  console.warn('Could not read firebase-applet-config.json, using defaults.', e);
}

// Initialize Firebase Admin lazily to prevent crashing on server boot
let dbInstance: admin.firestore.Firestore | null = null;

function getDb(): admin.firestore.Firestore {
  if (dbInstance) return dbInstance;

  if (!admin.apps.length) {
    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    try {
      if (serviceAccountVar && serviceAccountVar.trim() !== '' && serviceAccountVar !== 'Secret value') {
        console.log('Initializing Firebase Admin with Service Account from ENV');
        
        let cleanedVar = serviceAccountVar.trim();
        // Remove accidental copy-pasted outer quotes (single or double) from Vercel UI
        if (cleanedVar.startsWith("'") && cleanedVar.endsWith("'")) {
          cleanedVar = cleanedVar.slice(1, -1).trim();
        }
        if (cleanedVar.startsWith('"') && cleanedVar.endsWith('"')) {
          cleanedVar = cleanedVar.slice(1, -1).trim();
        }

        // Robust safeguard: if the user missed the outer curly braces, wrap them!
        if (!cleanedVar.startsWith('{') && !cleanedVar.endsWith('}')) {
          cleanedVar = '{' + cleanedVar + '}';
        } else if (!cleanedVar.startsWith('{') && cleanedVar.endsWith('}')) {
          cleanedVar = '{' + cleanedVar;
        } else if (cleanedVar.startsWith('{') && !cleanedVar.endsWith('}')) {
          cleanedVar = cleanedVar + '}';
        }

        let serviceAccount: any;
        try {
          serviceAccount = JSON.parse(cleanedVar);
        } catch (jsonErr: any) {
          console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT variable as JSON:', jsonErr.message);
          throw new Error(`JSON format error in FIREBASE_SERVICE_ACCOUNT: ${jsonErr.message}. Ensure your Service Account environment variable starts with { and ends with } and is a valid JSON object.`);
        }
        
        // Repair private_key containing escaped literal newlines (\n as two chars)
        if (serviceAccount && typeof serviceAccount.private_key === 'string') {
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }

        const targetProjectId = serviceAccount.project_id || firebaseConfig.projectId;
        console.log(`Targeting Firebase Project ID: ${targetProjectId}`);

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: targetProjectId
        });
      } else {
        // Try to load from service account file using robust reader
        let loadedFromFile = false;
        try {
          const serviceAccountContent = readConfigFile('firebase-service-account.json');
          console.log('Initializing Firebase Admin with Service Account from File');
          let cleanedContent = serviceAccountContent.trim();
          if (cleanedContent.startsWith("'") && cleanedContent.endsWith("'")) {
            cleanedContent = cleanedContent.slice(1, -1).trim();
          }
          if (cleanedContent.startsWith('"') && cleanedContent.endsWith('"')) {
            cleanedContent = cleanedContent.slice(1, -1).trim();
          }
          const serviceAccount = JSON.parse(cleanedContent);
          if (serviceAccount && typeof serviceAccount.private_key === 'string') {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
          }
          const targetProjectId = serviceAccount.project_id || firebaseConfig.projectId;
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: targetProjectId
          });
          loadedFromFile = true;
        } catch (e) {
          // File not found is fine, fallback to default
        }

        if (!loadedFromFile) {
          console.log('Initializing Firebase Admin with default project ID');
          admin.initializeApp({
            projectId: firebaseConfig.projectId
          });
        }
      }
    } catch (error: any) {
      console.error('Failed to parse or initialize Firebase Admin with config:', error);
      console.error('Please verify that the FIREBASE_SERVICE_ACCOUNT environment variable is a valid JSON string (NOT "Secret value" or a simple text token).');
      throw new Error(`Firebase Admin failed to initialize: ${error.message}. Please configure FIREBASE_SERVICE_ACCOUNT with a valid JSON credential from the Firebase Console.`);
    }
  }

  // Determine the correct Firestore Database ID dynamically
  try {
    const isVercel = !!process.env.VERCEL;
    const customDbId = process.env.FIREBASE_DATABASE_ID || process.env.FIRESTORE_DATABASE_ID;

    if (customDbId) {
      console.log(`Using explicitly configured database ID from environment variable: ${customDbId}`);
      dbInstance = (admin as any).firestore(customDbId);
    } else if (isVercel) {
      console.log('Running on Vercel: Using default Firestore database ID (default)');
      dbInstance = admin.firestore();
    } else if (firebaseConfig.firestoreDatabaseId) {
      console.log(`Using configured Firestore Database ID: ${firebaseConfig.firestoreDatabaseId}`);
      dbInstance = (admin as any).firestore(firebaseConfig.firestoreDatabaseId);
    } else {
      console.log('Using default Firestore database ID (default)');
      dbInstance = admin.firestore();
    }
  } catch (dbError: any) {
    console.warn(`Could not initialize Firestore database. Falling back to default database. Error: ${dbError.message}`);
    dbInstance = admin.firestore();
  }

  return dbInstance;
}

// Vercel config to disable automatic pre-parsing so express can parse the raw stream with rawBody verification
export const config = {
  api: {
    bodyParser: false,
  },
};

const app = express();

app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));

app.use(express.urlencoded({
  extended: true,
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

// Kiwify Webhook Diagnostics
app.get('/api/webhook/kiwify', async (req, res) => {
  console.log('Kiwify Webhook Diagnostics requested.');
  
  let firebaseServiceAccountValue = process.env.FIREBASE_SERVICE_ACCOUNT || '';
  let serviceAccountStatus = 'Missing';
  let serviceAccountLength = 0;
  let parsedSuccessfully = false;
  let parseError = '';

  if (firebaseServiceAccountValue && firebaseServiceAccountValue.trim() !== '' && firebaseServiceAccountValue !== 'Secret value') {
    serviceAccountStatus = 'Present';
    serviceAccountLength = firebaseServiceAccountValue.length;
    
    try {
      let cleanedVar = firebaseServiceAccountValue.trim();
      if (cleanedVar.startsWith("'") && cleanedVar.endsWith("'")) {
        cleanedVar = cleanedVar.slice(1, -1).trim();
      }
      if (cleanedVar.startsWith('"') && cleanedVar.endsWith('"')) {
        cleanedVar = cleanedVar.slice(1, -1).trim();
      }

      // Robust safeguard: if the user missed the outer curly braces, wrap them!
      if (!cleanedVar.startsWith('{') && !cleanedVar.endsWith('}')) {
        cleanedVar = '{' + cleanedVar + '}';
      } else if (!cleanedVar.startsWith('{') && cleanedVar.endsWith('}')) {
        cleanedVar = '{' + cleanedVar;
      } else if (cleanedVar.startsWith('{') && !cleanedVar.endsWith('}')) {
        cleanedVar = cleanedVar + '}';
      }

      const parsed = JSON.parse(cleanedVar);
      parsedSuccessfully = !!parsed.project_id && !!parsed.private_key;
    } catch (err: any) {
      parseError = err.message;
    }
  }

  let rawSecret = process.env.KIWIFY_WEBHOOK_SECRET || '';
  let cleanedSecret = rawSecret.trim();
  if (cleanedSecret.startsWith("'") && cleanedSecret.endsWith("'")) {
    cleanedSecret = cleanedSecret.slice(1, -1).trim();
  }
  if (cleanedSecret.startsWith('"') && cleanedSecret.endsWith('"')) {
    cleanedSecret = cleanedSecret.slice(1, -1).trim();
  }

  const diagnostics: any = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: {
      isVercel: !!process.env.VERCEL,
      kiwifyWebhookSecret: {
        configured: !!rawSecret,
        rawLength: rawSecret.length,
        cleaned: cleanedSecret || null
      },
      firebaseServiceAccount: {
        status: serviceAccountStatus,
        rawLength: serviceAccountLength,
        parsedOk: parsedSuccessfully,
        parseError: parseError || null
      },
      firebaseConfig: {
        projectId: firebaseConfig.projectId,
        firestoreDatabaseId: firebaseConfig.firestoreDatabaseId
      }
    },
    firestoreConnection: 'untested'
  };

  try {
    const db = getDb();
    const testDoc = await db.collection('authorized_emails').limit(1).get();
    diagnostics.firestoreConnection = 'successful';
    diagnostics.firestoreDocumentCount = testDoc.size;
  } catch (err: any) {
    diagnostics.status = 'error';
    diagnostics.firestoreConnection = 'failed';
    diagnostics.error = err.message;
    diagnostics.stack = err.stack;
  }

  res.json(diagnostics);
});

// Kiwify Webhook
app.post('/api/webhook/kiwify', async (req, res) => {
  console.log('Kiwify Webhook Received:', JSON.stringify(req.body, null, 2));

  // Security Check: Verify signature if secret is provided
  const signature = req.headers['x-kiwify-signature'];
  let webhookSecret = process.env.KIWIFY_WEBHOOK_SECRET;

  if (webhookSecret) {
    // Sanitize copy-pasted secret keys containing single/double quotes from environment dashboard
    let cleanedSecret = webhookSecret.trim();
    if (cleanedSecret.startsWith("'") && cleanedSecret.endsWith("'")) {
      cleanedSecret = cleanedSecret.slice(1, -1).trim();
    }
    if (cleanedSecret.startsWith('"') && cleanedSecret.endsWith('"')) {
      cleanedSecret = cleanedSecret.slice(1, -1).trim();
    }

    if (!signature) {
      console.error('Webhook Error: Missing x-kiwify-signature header');
      return res.status(401).json({ status: 'error', message: 'Unauthorized: Missing x-kiwify-signature header' });
    }

    const rawBody = (req as any).rawBody;
    const bodyStr = rawBody ? rawBody.toString('utf-8') : JSON.stringify(req.body);

    const digestSha1 = crypto.createHmac('sha1', cleanedSecret).update(bodyStr).digest('hex');
    const digestSha256 = crypto.createHmac('sha256', cleanedSecret).update(bodyStr).digest('hex');

    const cleanSig = signature.toString().trim().toLowerCase();
    const isValid = cleanSig === digestSha1.toLowerCase() || cleanSig === digestSha256.toLowerCase();

    if (!isValid) {
      console.error('Webhook Error: Invalid signature. Received:', cleanSig, 'Computed SHA1:', digestSha1, 'Computed SHA256:', digestSha256);
      return res.status(401).json({ 
        status: 'error', 
        message: 'Invalid signature',
        received: signature,
        computed: { sha1: digestSha1, sha256: digestSha256 },
        instructions: 'Verify if the KIWIFY_WEBHOOK_SECRET configured matches the Secret Token from Kiwify Dashboard. If you want to bypass signature checking for testing, temporarily unset or remove the KIWIFY_WEBHOOK_SECRET environment variable.'
      });
    }
    console.log('Kiwify signature verified successfully.');
  } else {
    console.warn('Webhook Warning: KIWIFY_WEBHOOK_SECRET not set. Skipping signature verification.');
  }

  // Support comprehensive fallbacks for Kiwify fields
  const event = (req.body.event || '').toString();
  const order_status = (req.body.order_status || req.body.status || '').toString();
  const customer_email = (req.body.customer_email || req.body.customer?.email || req.body.email || '').toString().toLowerCase().trim();
  const customer_name = (req.body.customer_name || req.body.customer?.name || req.body.name || '').toString();
  const product_id = (req.body.product_id || req.body.product?.id || req.body.product_uuid || '').toString();
  const product_name = (req.body.product_name || req.body.product?.name || '').toString();
  const subscription_id = (req.body.subscription_id || req.body.subscription?.id || '').toString();
  const payment_method = (req.body.payment_method || '').toString();
  
  // subscription status from Kiwify (active, overdue, canceled, etc.)
  const subscription_status = (req.body.subscription?.status || req.body.subscription_status || '').toString();

  if (!customer_email) {
    console.error('Webhook Error: Customer email is missing from body:', JSON.stringify(req.body));
    return res.status(400).json({ status: 'error', message: 'Customer email is missing' });
  }

  // 1. Grant/Renew Access Statuses (Approved or Paid or Active)
  const isPaid = 
    order_status === 'paid' || 
    order_status === 'approved' || 
    event === 'order_approved' || 
    event === 'order_paid' ||
    subscription_status === 'active';

  // 2. Block/Revoke Access Statuses (Refunded, Canceled, Overdue, Chargedback, etc.)
  const isRefundedOrCanceled = 
    order_status === 'refunded' || 
    order_status === 'chargedback' || 
    order_status === 'canceled' || 
    order_status === 'chargeback' ||
    event === 'order_refunded' ||
    event === 'order_chargedback' ||
    event === 'subscription_canceled' ||
    subscription_status === 'canceled' ||
    subscription_status === 'overdue' ||
    subscription_status === 'refunded' ||
    subscription_status === 'chargedback';

  if (isPaid) {
    try {
      const db = getDb();
      await db.collection('authorized_emails').doc(customer_email).set({
        email: customer_email,
        name: customer_name,
        status: 'approved',
        originalStatus: order_status || event || 'approved',
        productId: product_id,
        productName: product_name,
        subscriptionId: subscription_id,
        paymentMethod: payment_method,
        blocked: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        source: 'kiwify'
      });

      console.log(`Access granted/renewed to: ${customer_email} for product: ${product_name}`);
      return res.status(200).json({ status: 'success', message: 'Access granted/renewed successfully' });
    } catch (error: any) {
      console.error('Error saving active authorization to Firestore:', error);
      return res.status(500).json({ 
        status: 'error', 
        message: `Error writing to Firestore: ${error.message}`,
        details: 'Verify that FIREBASE_SERVICE_ACCOUNT is correctly set as a valid JSON string.'
      });
    }
  } else if (isRefundedOrCanceled) {
    try {
      const db = getDb();
      // Set to blocked/canceled in Firestore to instantly deny access on both front-end and back-end checks
      await db.collection('authorized_emails').doc(customer_email).set({
        email: customer_email,
        name: customer_name,
        status: 'canceled', // Explicit canceled status to block access immediately
        originalStatus: order_status || event || 'canceled',
        subscriptionStatus: subscription_status,
        productId: product_id,
        productName: product_name,
        subscriptionId: subscription_id,
        paymentMethod: payment_method,
        blocked: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        source: 'kiwify'
      });

      console.log(`Access revoked/blocked for: ${customer_email} (Order status: ${order_status}, Subscription status: ${subscription_status})`);
      return res.status(200).json({ status: 'success', message: 'Access revoked/blocked successfully' });
    } catch (error: any) {
      console.error('Error updating blocked status to Firestore:', error);
      return res.status(500).json({ 
        status: 'error', 
        message: `Error writing to Firestore: ${error.message}`,
        details: 'Verify that FIREBASE_SERVICE_ACCOUNT is correctly set as a valid JSON string.'
      });
    }
  }

  res.status(200).json({ status: 'ignored', message: 'Order status received but no grant or revoke action required' });
});

async function setupApp() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
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
