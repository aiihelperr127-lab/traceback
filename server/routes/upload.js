const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Storage } = require('@google-cloud/storage');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');
require('../config/firebase');
const admin = require('firebase-admin');

const router = Router();
router.use(authenticate, requireAdmin);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

let cachedBucket = null;
let resolveOnce = null;

/**
 * Picks a real GCS bucket (env name often 404s if wrong). Lists project buckets once.
 */
async function getUploadBucket() {
  if (cachedBucket) return cachedBucket;
  if (resolveOnce) return resolveOnce;

  resolveOnce = (async () => {
    const keyPath = path.resolve(__dirname, '../config/serviceAccountKey.json');
    if (!fs.existsSync(keyPath)) {
      throw new Error('Missing server/config/serviceAccountKey.json');
    }
    const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    const projectId = serviceAccount.project_id;
    const storage = new Storage({ credentials: serviceAccount, projectId });
    const [buckets] = await storage.getBuckets({ maxResults: 100 });

    if (!buckets.length) {
      throw new Error(
        'No Storage buckets in this Google project. In Firebase Console open Storage and click Get started to create the default bucket, then upload again.'
      );
    }

    const names = buckets.map((b) => b.name);
    const envName = (process.env.FIREBASE_STORAGE_BUCKET || '').trim();
    let name = null;

    if (envName && names.includes(envName)) name = envName;
    if (!name && names.includes(`${projectId}.appspot.com`)) name = `${projectId}.appspot.com`;
    if (!name && names.includes(`${projectId}.firebasestorage.app`)) name = `${projectId}.firebasestorage.app`;
    if (!name) {
      name = names.find((n) => n.includes(projectId)) || names[0];
    }

    cachedBucket = admin.storage().bucket(name);
    console.log('[upload] Storage bucket:', name);
    return cachedBucket;
  })();

  return resolveOnce;
}

function uploadErrorMessage(err) {
  const msg = err?.message || String(err);
  const code = err?.code || err?.response?.status;
  if (code === 404 || msg.includes('does not exist')) {
    return msg.includes('bucket')
      ? msg
      : 'Storage bucket not found. Enable Storage in Firebase Console (Storage → Get started), then restart the API.';
  }
  if (msg.includes('permission') || code === 403) {
    return 'Storage permission denied. Give the service account Storage Object Admin on the project.';
  }
  if (err?.name === 'MulterError' && err.code === 'LIMIT_FILE_SIZE') {
    return 'File too large (max 50 MB per file).';
  }
  return msg.length > 220 ? 'Upload failed. See server log.' : msg;
}

router.post('/', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files selected. Choose at least one file.' });
    }

    let bucket;
    try {
      bucket = await getUploadBucket();
    } catch (e) {
      return res.status(503).json({
        error: uploadErrorMessage(e),
        code: 'STORAGE_BUCKET_UNAVAILABLE',
      });
    }

    const uploaded = [];

    const blockExt = new Set([
      '.exe', '.dll', '.bat', '.cmd', '.ps1', '.sh', '.msi', '.scr', '.com', '.vbs', '.js', '.jar',
    ]);
    for (const file of req.files) {
      const ext = path.extname(file.originalname).toLowerCase();
      if (blockExt.has(ext)) {
        return res.status(400).json({ error: `File type not allowed: ${ext}` });
      }
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `challenges/${crypto.randomBytes(6).toString('hex')}_${safeName}`;
      const blob = bucket.file(storagePath);

      try {
        await blob.save(file.buffer, {
          metadata: {
            contentType: file.mimetype || 'application/octet-stream',
            metadata: { originalName: file.originalname },
          },
        });
      } catch (e) {
        return res.status(502).json({
          error: uploadErrorMessage(e),
          code: 'STORAGE_SAVE_FAILED',
        });
      }

      try {
        await blob.makePublic();
      } catch (e) {
        return res.status(502).json({
          error:
            'Uploaded but could not make file public. Grant Storage access or relax rules. ' +
            uploadErrorMessage(e),
          code: 'STORAGE_MAKE_PUBLIC_FAILED',
        });
      }

      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${encodeURI(storagePath)}`;
      uploaded.push({
        name: file.originalname,
        url: publicUrl,
        size: file.size,
      });
    }

    return res.json({ files: uploaded, ok: true });
  } catch (err) {
    return res.status(500).json({
      error: uploadErrorMessage(err),
      code: 'UPLOAD_FAILED',
    });
  }
});

module.exports = router;
