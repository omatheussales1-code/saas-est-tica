import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import fs from 'fs';
import crypto from 'crypto';
import { GoogleGenAI, Type } from '@google/genai';

let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('Chave de API do Gemini (GEMINI_API_KEY) não configurada. Configure no painel de Segredos.');
    }
    geminiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return geminiClient;
}

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
let useDefaultDbForce = false;
let initializedProjectId: string | null = null;
let resolvedDatabaseId: string = '(default)';

function getDb(): admin.firestore.Firestore {
  if (dbInstance && !useDefaultDbForce) return dbInstance;
  if (useDefaultDbForce) {
    dbInstance = admin.firestore();
    resolvedDatabaseId = '(default)';
    return dbInstance;
  }

  if (admin.apps.length > 0 && !initializedProjectId) {
    initializedProjectId = admin.app().options.projectId || null;
  }

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
        initializedProjectId = targetProjectId;

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
          initializedProjectId = targetProjectId;
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
          initializedProjectId = firebaseConfig.projectId;
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
    const customDbId = process.env.FIREBASE_DATABASE_ID || process.env.FIRESTORE_DATABASE_ID;

    if (customDbId) {
      console.log(`Using explicitly configured database ID from environment variable: ${customDbId}`);
      dbInstance = (admin as any).firestore(customDbId);
      resolvedDatabaseId = customDbId;
    } else if (process.env.VERCEL) {
      // In production / Vercel, the Google AI Studio-specific sandbox database ID does not exist in the custom project.
      // Therefore, we must default to '(default)' directly to avoid 5 NOT_FOUND database errors.
      console.log('Vercel production environment detected. Defaulting directly to the (default) database ID.');
      dbInstance = admin.firestore();
      resolvedDatabaseId = '(default)';
    } else if (firebaseConfig.firestoreDatabaseId) {
      // Prioritize the configured database ID from firebase-applet-config.json.
      // If for any reason it does not exist under a custom service account/project,
      // runWithFirestoreFallback will automatically catch the NOT_FOUND error and fallback to '(default)'.
      console.log(`Using configured Firestore Database ID: ${firebaseConfig.firestoreDatabaseId}`);
      dbInstance = (admin as any).firestore(firebaseConfig.firestoreDatabaseId);
      resolvedDatabaseId = firebaseConfig.firestoreDatabaseId;
    } else {
      console.log('Using default Firestore database ID (default)');
      dbInstance = admin.firestore();
      resolvedDatabaseId = '(default)';
    }
  } catch (dbError: any) {
    console.warn(`Could not initialize Firestore database. Falling back to default database. Error: ${dbError.message}`);
    dbInstance = admin.firestore();
    resolvedDatabaseId = '(default)';
  }

  return dbInstance;
}

// Wrapper with automatic fallback to '(default)' database on any 5 NOT_FOUND database error
async function runWithFirestoreFallback<T>(operation: (db: admin.firestore.Firestore) => Promise<T>): Promise<T> {
  try {
    const db = getDb();
    return await operation(db);
  } catch (error: any) {
    const errorStr = (error.message || '').toString();
    const isNotFoundError = errorStr.includes('NOT_FOUND') || errorStr.includes('not found') || error.code === 5;
    
    // Check if we are currently using a custom Database ID (not the default one)
    const usingCustomDb = resolvedDatabaseId !== '(default)';
    
    if (isNotFoundError && usingCustomDb && !useDefaultDbForce) {
      console.warn(`Firestore operation failed with NOT_FOUND on custom database ID ${resolvedDatabaseId}. Automatically falling back to default database '(default)' and retrying. Error: ${errorStr}`);
      useDefaultDbForce = true;
      resolvedDatabaseId = '(default)';
      // Re-initialize dbInstance to the default Firestore instance
      dbInstance = admin.firestore();
      return await operation(dbInstance);
    }
    throw error;
  }
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
    const docSnap = await runWithFirestoreFallback((db) => 
      db.collection('authorized_emails').doc(email.toLowerCase().trim()).get()
    );
    
    res.json({ authorized: docSnap.exists });
  } catch (error) {
    console.error('Error checking authorized email:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// AI Voice Dictation Parser for Appointments
app.post('/api/gemini/parse-scheduling', async (req, res) => {
  const { text, contextDate, contextDayOfWeek, contextTime } = req.body;
  if (!text) {
    return res.status(400).json({ status: 'error', message: 'Texto para processamento é obrigatório.' });
  }

  try {
    const ai = getGeminiClient();
    
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Processe o ditado a seguir:
"${text}"`,
      config: {
        systemInstruction: `Você é um assistente especialista e recepcionista para uma clínica de estética que ajuda a extrair e estruturar agendamentos a partir de transcrições de voz (ditado).
Você receberá uma transcrição de voz livre e as informações da data/hora de hoje para resolver termos relativos como "amanhã", "segunda-feira que vem", "às duas da tarde", "daqui a pouco", etc.

Data de hoje: ${contextDate || new Date().toISOString().split('T')[0]}
Dia da semana de hoje: ${contextDayOfWeek || 'desconhecido'}
Hora de hoje: ${contextTime || '09:00'}

Sua tarefa consiste em extrair as seguintes informações e retornar EXCLUSIVAMENTE o formato JSON estruturado seguindo o esquema definido.
Atenção especial para as regras de cálculo de datas relativas:
- Se hoje é quinta-feira e o áudio ditar "amanhã", a dataCalculada é sexta-feira (amanhã).
- Se hoje é quinta-feira e o áudio ditar "segunda que vem" ou "segunda-feira", a dataCalculada é a próxima segunda-feira calendário adentro.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            clientName: {
              type: Type.STRING,
              description: 'Nome do cliente ou paciente mencionado, ex: "Amanda Silva". Retornar vazio ("") se não mencionado.'
            },
            procedureName: {
              type: Type.STRING,
              description: 'Nome do procedimento ou tratamento mencionado, ex: "Limpeza de Pele". Retornar vazio ("") se não mencionado.'
            },
            date: {
              type: Type.STRING,
              description: 'Data do agendamento calculada no formato YYYY-MM-DD. Se não mencionado e não for possível deduzir, retorne a data de hoje.'
            },
            time: {
              type: Type.STRING,
              description: 'Horário do agendamento no formato de 24 horas HH:MM, ex: "14:30". Retornar vazio ("") se não embutido.'
            },
            price: {
              type: Type.NUMBER,
              description: 'O valor cobrado mencionado (número), ex: 150.0. Retornar null se não mencionado.'
            },
            notes: {
              type: Type.STRING,
              description: 'Qualquer observação relevante descrita pelo profissional (como restrições, sintomas ou lembretes), ex: "observações: necessita vir sem maquiagem". Retornar vazio ("") se não mencionado.'
            },
            reasoning: {
              type: Type.STRING,
              description: 'Breve resumo em português da interpretação do agendamento (máximo de 15 palavras) para visualização rápida.'
            }
          },
          required: ['clientName', 'procedureName', 'date', 'time', 'price', 'notes', 'reasoning']
        }
      }
    });

    const parsedResult = JSON.parse(response.text || '{}');
    res.json({ status: 'success', data: parsedResult });
  } catch (error: any) {
    console.error('Error parsing schedule with Gemini:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message || 'Erro ao processar as informações de voz com IA.' 
    });
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
  let parsedProjectId = '';

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
      parsedProjectId = parsed.project_id || '';
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
        parsedProjectId: parsedProjectId || null,
        parseError: parseError || null
      },
      firebaseConfig: {
        projectId: firebaseConfig.projectId,
        firestoreDatabaseId: firebaseConfig.firestoreDatabaseId
      }
    },
    initializedProjectId: initializedProjectId,
    usedDatabase: resolvedDatabaseId,
    firestoreConnection: 'untested'
  };

  try {
    const testDoc = await runWithFirestoreFallback((db) => 
      db.collection('authorized_emails').limit(1).get()
    );
    diagnostics.firestoreConnection = 'successful';
    diagnostics.firestoreDocumentCount = testDoc.size;
    // Update live database/project ID if they changed during fallback
    diagnostics.initializedProjectId = initializedProjectId;
    diagnostics.usedDatabase = resolvedDatabaseId;
  } catch (err: any) {
    diagnostics.status = 'error';
    diagnostics.firestoreConnection = 'failed';
    diagnostics.initializedProjectId = initializedProjectId;
    diagnostics.usedDatabase = resolvedDatabaseId;
    
    const errorMsg = (err.message || err.toString() || '').toString();
    diagnostics.error = errorMsg;
    diagnostics.stack = err.stack;
    
    // Add custom, high-impact Portuguese troubleshooting suggestions
    if (errorMsg.includes('NOT_FOUND') || errorMsg.includes('not found') || err.code === 5) {
      diagnostics.instructions = [
        "ERRO INTERNO: Banco de dados não encontrado / Database Not Found.",
        "",
        "Como corrigir no seu Console do Firebase:",
        `1. Acesse o console: https://console.firebase.google.com/project/${initializedProjectId || parsedProjectId || 'seu-projeto-id'}/firestore`,
        "2. Certifique-se de que você CRIOU o banco de dados do Firestore para este projeto.",
        `3. O banco de dados deve ser criado com o ID '(default)' (a menos que tenha configurado FIREBASE_DATABASE_ID de forma personalizada).`,
        "4. Escolha uma região (ex: us-east1 ou nam5 multi-region) e inicie em 'Modo de Produção' ou 'Modo de Teste'.",
        "5. Uma vez criado o banco '(default)', recarregue esta página de diagnóstico para confirmar o funcionamento."
      ];
    } else {
      diagnostics.instructions = [
        "Erro genérico de conexão com Firestore. Verifique se:",
        "1. Suas credenciais em FIREBASE_SERVICE_ACCOUNT no Vercel estão no formato JSON válido.",
        "2. A chave privada (private_key) não contém quebras de linha erradas.",
        "3. O seu projeto tem faturamento ou permissões ativas para acesso admin."
      ];
    }
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
      await runWithFirestoreFallback((db) => 
        db.collection('authorized_emails').doc(customer_email).set({
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
        })
      );

      console.log(`Access granted/renewed to: ${customer_email} for product: ${product_name}`);
      return res.status(200).json({ status: 'success', message: 'Access granted/renewed successfully' });
    } catch (error: any) {
      console.error('Error saving active authorization to Firestore:', error);
      const errorMsg = (error.message || error.toString() || '').toString();
      let instructions = 'Verify that FIREBASE_SERVICE_ACCOUNT is correctly set as a valid JSON string.';
      if (errorMsg.includes('NOT_FOUND') || errorMsg.includes('not found') || error.code === 5) {
        instructions = `ERRO: Banco de dados não encontrado / Database Not Found. Certifique-se de que você CRIOU o banco de dados do Firestore com o ID '(default)' no console do seu Firebase: https://console.firebase.google.com/project/${initializedProjectId || 'seu-projeto'}/firestore`;
      }
      return res.status(500).json({ 
        status: 'error', 
        message: `Error writing to Firestore: ${error.message}`,
        details: instructions
      });
    }
  } else if (isRefundedOrCanceled) {
    try {
      await runWithFirestoreFallback((db) => 
        db.collection('authorized_emails').doc(customer_email).set({
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
        })
      );

      console.log(`Access revoked/blocked for: ${customer_email} (Order status: ${order_status}, Subscription status: ${subscription_status})`);
      return res.status(200).json({ status: 'success', message: 'Access revoked/blocked successfully' });
    } catch (error: any) {
      console.error('Error updating blocked status to Firestore:', error);
      const errorMsg = (error.message || error.toString() || '').toString();
      let instructions = 'Verify that FIREBASE_SERVICE_ACCOUNT is correctly set as a valid JSON string.';
      if (errorMsg.includes('NOT_FOUND') || errorMsg.includes('not found') || error.code === 5) {
        instructions = `ERRO: Banco de dados não encontrado / Database Not Found. Certifique-se de que você CRIOU o banco de dados do Firestore com o ID '(default)' no console do seu Firebase: https://console.firebase.google.com/project/${initializedProjectId || 'seu-projeto'}/firestore`;
      }
      return res.status(500).json({ 
        status: 'error', 
        message: `Error writing to Firestore: ${error.message}`,
        details: instructions
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
