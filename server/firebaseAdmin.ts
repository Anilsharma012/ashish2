// server/firebaseAdmin.ts
import admin from "firebase-admin";
import fs from "fs";
import path from "path";

let initialized = false;

export function getAdmin() {
  if (initialized) return admin;

  // 1) .env inline JSON (one-line)
  const envJson = process.env.FIREBASE_SERVICE_ACCOUNT;

  // 2) .env me path diya ho to (optional)
  const envPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  // 3) default repo path
  const defaultPath = path.resolve(
    process.cwd(),
    "server/credentials/firebase-service-account.json"
  );

  let parsed: any;

  if (envJson) {
    parsed = JSON.parse(envJson);
  } else if (envPath && fs.existsSync(envPath)) {
    parsed = JSON.parse(fs.readFileSync(envPath, "utf8"));
  } else if (fs.existsSync(defaultPath)) {
    parsed = JSON.parse(fs.readFileSync(defaultPath, "utf8"));
  } else {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT missing. Provide inline JSON in env, " +
        "or set FIREBASE_SERVICE_ACCOUNT_PATH, or place credentials at server/credentials/firebase-service-account.json"
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: String(parsed.private_key).replace(/\\n/g, "\n"),
    }),
  });

  initialized = true;
  return admin;
}
