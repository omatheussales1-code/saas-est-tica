import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
// Note: In AI Studio environment, we can often rely on default credentials 
// or manual initialization if a service account is provided.
// Since we don't have a service account file, we'll try to initialize with the project ID.
const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId
  });
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Kiwify Webhook
  app.post('/api/webhook/kiwify', async (req, res) => {
    console.log('Kiwify Webhook Received:', JSON.stringify(req.body, null, 2));

    const { order_status, customer_email, customer_name } = req.body;

    // Kiwify statuses: paid, approved, refused, refunded, etc.
    // Usually 'paid' or 'approved' means access granted.
    if (order_status === 'paid' || order_status === 'approved') {
      try {
        if (customer_email) {
          const email = customer_email.toLowerCase().trim();
          
          // Save to authorized_emails collection
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    
    // Explicitly handle /demo to ensure it serves index.html
    app.get('/demo', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });

    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
