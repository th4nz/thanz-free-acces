import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore';

const appId = "am-pro-toolkit-v2";

let initError = null;
let dbInstance = null;

function initDb() {
  if (dbInstance) return dbInstance;
  if (initError) return null;

  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined;
    const firebaseConfig = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey
    };

    if (!firebaseConfig.projectId || !firebaseConfig.clientEmail || !firebaseConfig.privateKey) {
      initError = 'Missing Firebase environment variables. Ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY are set.';
      return null;
    }

    const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
    dbInstance = getFirestore(app);
    return dbInstance;
  } catch (err) {
    initError = err && err.message ? err.message : String(err);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = initDb();
    if (!db) {
      return res.status(500).json({ error: `Firebase init error: ${initError}` });
    }

    const { action, adminToken, userId, actionType } = req.body;

    const validAdminSecret = process.env.ADMIN_SECRET || 'thanzadmin';
    if (!adminToken || adminToken !== validAdminSecret) {
      return res.status(401).json({ error: 'Unauthorized admin access.' });
    }

    const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
    const querySnapshot = await getDocs(usersRef);

    let users = [];
    let totalUsers = 0;
    let activeUsers = 0;
    let totalInject = 0;
    let successInject = 0;

    querySnapshot.forEach(docSnap => {
      const u = docSnap.data();
      totalUsers++;
      if (u.status === 'active') activeUsers++;
      totalInject += (u.totalInject || 0);
      successInject += (u.successfulInject || 0);
      users.push(u);
    });

    if (action === 'stats') {
      return res.status(200).json({
        totalUsers,
        activeUsers,
        totalInject,
        successInject,
        users
      });
    }

    if (action === 'user_action' && userId) {
      const targetDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', userId);
      const targetSnap = await getDoc(targetDocRef);

      if (!targetSnap.exists()) {
        return res.status(404).json({ error: 'User tidak ditemukan.' });
      }

      const userData = targetSnap.data();

      if (actionType === 'add_limit') {
        await updateDoc(targetDocRef, { dailyLimit: (userData.dailyLimit || 5) + 5 });
      } else if (actionType === 'reset_limit') {
        await updateDoc(targetDocRef, { usedToday: 0, lastReset: Date.now() });
      } else if (actionType === 'toggle_status') {
        const newStatus = userData.status === 'active' ? 'disabled' : 'active';
        await updateDoc(targetDocRef, { status: newStatus });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Action admin tidak valid.' });
  } catch (err) {
    console.error('Unhandled error in /api/admin:', err);
    return res.status(500).json({ error: err && err.message ? err.message : 'Server error.' });
  }
}
