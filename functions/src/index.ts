import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

// Initialize the Firebase Admin SDK
if (admin.apps.length === 0) {
  const firebaseConfigPath = process.env.FIREBASE_CONFIG;
  if (firebaseConfigPath) {
    admin.initializeApp();
  } else {
    // Fallback if running outside full environment or standard init
    admin.initializeApp();
  }
}

/**
 * Firebase Cloud Function (v2) to act as a secure listener for Kiwify Webhooks.
 * It validates the request using the Kiwify HMAC Signature to guarantee authenticity.
 * 
 * Deployment command:
 *   firebase deploy --only functions
 * 
 * Target URL on Kiwify Dashboard:
 *   https://<region>-<project-id>.cloudfunctions.net/kiwifyWebhook
 */
export const kiwifyWebhook = onRequest({
  cors: true, // Allow CORS if needed, or specify origins
  maxInstances: 10,
}, async (req, res) => {
  // Only accept POST requests
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  console.log("Kiwify Webhook Received via Cloud Functions:", JSON.stringify(req.body, null, 2));

  // 1. Signature Security Verification
  const signature = req.headers["x-kiwify-signature"];
  
  // Try retrieving the secret from secret manager, process env, or firebase config
  const webhookSecret = process.env.KIWIFY_WEBHOOK_SECRET;

  if (webhookSecret) {
    if (!signature) {
      console.error("Webhook Error: Missing x-kiwify-signature header");
      res.status(401).json({ status: "error", message: "Unauthorized: Missing x-kiwify-signature header" });
      return;
    }

    const trimmedSecret = webhookSecret.trim();
    
    // In Firebase Cloud Functions, req.rawBody contains the buffer of the unparsed incoming request body
    const rawBody = req.rawBody;
    const bodyStr = rawBody ? rawBody.toString("utf-8") : JSON.stringify(req.body);

    const digestSha1 = crypto.createHmac("sha1", trimmedSecret).update(bodyStr).digest("hex");
    const digestSha256 = crypto.createHmac("sha256", trimmedSecret).update(bodyStr).digest("hex");

    const cleanSig = signature.toString().trim().toLowerCase();
    const isValid = cleanSig === digestSha1.toLowerCase() || cleanSig === digestSha256.toLowerCase();

    if (!isValid) {
      console.error("Webhook Error: Invalid signature. Received:", cleanSig, "Computed SHA1:", digestSha1, "Computed SHA256:", digestSha256);
      res.status(401).json({
        status: "error",
        message: "Invalid signature",
        received: signature,
        computed: { sha1: digestSha1, sha256: digestSha256 },
        instructions: "Verify if the KIWIFY_WEBHOOK_SECRET matches the Secret Token from the Kiwify Dashboard."
      });
      return;
    }
    console.log("Kiwify signature verified successfully.");
  } else {
    console.warn("Webhook Warning: KIWIFY_WEBHOOK_SECRET environment variable is not set. Skipping signature verification (Not recommended for Production).");
  }

  // 2. Parse payload fields with comprehensive fallbacks
  const event = (req.body.event || "").toString();
  const order_status = (req.body.order_status || req.body.status || "").toString();
  const customer_email = (req.body.customer_email || req.body.customer?.email || req.body.email || "").toString().toLowerCase().trim();
  const customer_name = (req.body.customer_name || req.body.customer?.name || req.body.name || "").toString();
  const product_id = (req.body.product_id || req.body.product?.id || req.body.product_uuid || "").toString();
  const product_name = (req.body.product_name || req.body.product?.name || "").toString();
  const subscription_id = (req.body.subscription_id || req.body.subscription?.id || "").toString();
  const payment_method = (req.body.payment_method || "").toString();
  
  // Subscription status (active, overdue, canceled, etc.)
  const subscription_status = (req.body.subscription?.status || req.body.subscription_status || "").toString();

  if (!customer_email) {
    console.error("Webhook Error: Customer email is missing from body:", JSON.stringify(req.body));
    res.status(400).json({ status: "error", message: "Customer email is missing" });
    return;
  }

  // 3. Status Action Evaluation
  // Access Granted / Renewed (Approved, Paid, or Active Subscription)
  const isPaid = 
    order_status === "paid" || 
    order_status === "approved" || 
    event === "order_approved" || 
    event === "order_paid" ||
    subscription_status === "active";

  // Access Revoked / Blocked (Refunded, Canceled, Chargedback, Overdue, etc.)
  const isRefundedOrCanceled = 
    order_status === "refunded" || 
    order_status === "chargedback" || 
    order_status === "canceled" || 
    order_status === "chargeback" ||
    event === "order_refunded" ||
    event === "order_chargedback" ||
    event === "subscription_canceled" ||
    subscription_status === "canceled" ||
    subscription_status === "overdue" ||
    subscription_status === "refunded" ||
    subscription_status === "chargedback";

  // Use custom database config if provided, otherwise default to default DB
  let firestoreDb: admin.firestore.Firestore;
  try {
    // Attempt load config
    const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG || "{}");
    const customDbId = firebaseConfig.firestoreDatabaseId || "ai-studio-3e2f12e2-b01b-4da0-b986-294c04a94a5c";
    
    if (customDbId) {
      firestoreDb = (admin as any).firestore(customDbId);
    } else {
      firestoreDb = admin.firestore();
    }
  } catch (err) {
    firestoreDb = admin.firestore();
  }

  if (isPaid) {
    try {
      await firestoreDb.collection("authorized_emails").doc(customer_email).set({
        email: customer_email,
        name: customer_name,
        status: "approved",
        originalStatus: order_status || event || "approved",
        productId: product_id,
        productName: product_name,
        subscriptionId: subscription_id,
        paymentMethod: payment_method,
        blocked: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        source: "kiwify-cloud-function"
      });

      console.log(`Access granted/renewed to: ${customer_email} for product: ${product_name}`);
      res.status(200).json({ status: "success", message: "Access granted/renewed successfully" });
      return;
    } catch (error: any) {
      console.error("Error saving active authorization to Firestore:", error);
      res.status(500).json({ 
        status: "error", 
        message: `Error writing to Firestore: ${error.message}`
      });
      return;
    }
  } else if (isRefundedOrCanceled) {
    try {
      await firestoreDb.collection("authorized_emails").doc(customer_email).set({
        email: customer_email,
        name: customer_name,
        status: "canceled",
        originalStatus: order_status || event || "canceled",
        subscriptionStatus: subscription_status,
        productId: product_id,
        productName: product_name,
        subscriptionId: subscription_id,
        paymentMethod: payment_method,
        blocked: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        source: "kiwify-cloud-function"
      });

      console.log(`Access revoked/blocked for: ${customer_email} (Order status: ${order_status}, Subscription status: ${subscription_status})`);
      res.status(200).json({ status: "success", message: "Access revoked/blocked successfully" });
      return;
    } catch (error: any) {
      console.error("Error updating blocked status to Firestore:", error);
      res.status(500).json({ 
        status: "error", 
        message: `Error writing to Firestore: ${error.message}`
      });
      return;
    }
  }

  res.status(200).json({ status: "ignored", message: "Order status received but no grant or revoke action required" });
});
