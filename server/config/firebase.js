const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const keyPath = path.resolve(__dirname, 'serviceAccountKey.json');

if (!fs.existsSync(keyPath)) {
  console.error(
    '\n❌  Missing service account key file!\n' +
    `   Expected at: ${keyPath}\n\n` +
    '   Download it from Firebase Console:\n' +
    '   Project Settings → Service Accounts → Generate New Private Key\n' +
    '   Save the file as server/config/serviceAccountKey.json\n'
  );
  process.exit(1);
}

const serviceAccount = require(keyPath);

// Client config uses:  traceback-ctf-201a3.firebasestorage.app  (VITE_FIREBASE_STORAGE_BUCKET)
// Admin SDK / uploads MUST use the GCS bucket ID:  traceback-ctf-201a3.appspot.com
// Do not use .firebasestorage.app here — Storage API returns 404 bucket not found.
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const storageBucket =
  process.env.FIREBASE_STORAGE_BUCKET ||
  `${serviceAccount.project_id}.appspot.com`;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket,
});

const db = admin.firestore();
const auth = admin.auth();
const bucket = admin.storage().bucket();

module.exports = { admin, db, auth, bucket };
