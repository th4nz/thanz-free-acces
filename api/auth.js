import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, query, where, getDocs, runTransaction } from 'firebase/firestore';

const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined
};

// Inisialisasi Firebase sederhana tanpa mengandalkan admin SDK berlebihan jika menggunakan konfigurasi standar Firestore
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const appId = "am-pro-toolkit-v2";

function generateToken() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let rand = "";
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `THANZ-${rand}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, username, token } = req.body;

    // 1. REGISTER USER
    if (action === 'register') {
      if (!username || typeof username !== 'string') {
        return res.status(400).json({ error: 'Username tidak valid.' });
      }

      const cleanUsername = username.trim();
      const normalized = cleanUsername.toLowerCase();

      if (normalized === 'thanz') {
        return res.status(400).json({ error: 'Username is reserved.' });
      }
      if (cleanUsername.length < 3) {
        return res.status(400).json({ error: 'Username minimal 3 karakter.' });
      }

      // Cek duplikasi case-insensitive di Firestore
      const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
      const q = query(usersRef, where('usernameNormalized', '==', normalized));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        return res.status(400).json({ error: 'Username already exists.' });
      }

      // Generate unique token THANZ-XXXX
      let generatedToken = generateToken();
      let tokenExists = true;
      let attempts = 0;

      while (tokenExists && attempts < 10) {
        const tokenQ = query(usersRef, where('token', '==', generatedToken));
        const tokenSnap = await getDocs(tokenQ);
        if (tokenSnap.empty) {
          tokenExists = false;
        } else {
          generatedToken = generateToken();
          attempts++;
        }
      }

      const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const newUser = {
        userId,
        username: cleanUsername,
        usernameNormalized: normalized,
        token: generatedToken,
        createdAt: Date.now(),
        dailyLimit: 5,
        usedToday: 0,
        lastReset: Date.now(),
        totalInject: 0,
        successfulInject: 0,
        status: 'active'
      };

      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', userId), newUser);

      return res.status(200).json({ success: true, token: generatedToken });
    }

    // 2. LOGIN USER
    if (action === 'login') {
      if (!username || !token) {
        return res.status(400).json({ error: 'Username dan token diperlukan.' });
      }

      const cleanUsername = username.trim().toLowerCase();
      const cleanToken = token.trim();

      // Cek apakah Admin Login
      if (cleanUsername === (process.env.ADMIN_USERNAME || 'thanz').toLowerCase() && cleanToken === (process.env.ADMIN_SECRET || 'thanzadmin')) {
        return res.status(200).json({ isAdmin: true, adminToken: process.env.ADMIN_SECRET || 'thanzadmin' });
      }

      const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
      const q = query(usersRef, where('usernameNormalized', '==', cleanUsername));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return res.status(401).json({ error: 'Invalid token or username.' });
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      if (userData.token !== cleanToken) {
        return res.status(401).json({ error: 'Invalid token.' });
      }

      if (userData.status !== 'active') {
        return res.status(403).json({ error: 'Your account has been disabled.' });
      }

      return res.status(200).json({ isAdmin: false, user: userData });
    }

    // 3. VERIFY TOKEN SESSION
    if (action === 'verify_token') {
      if (!token) return res.status(400).json({ error: 'Token required.' });

      const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
      const q = query(usersRef, where('token', '==', token));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return res.status(404).json({ error: 'Invalid token.' });
      }

      const userData = querySnapshot.docs[0].data();
      if (userData.status !== 'active') {
        return res.status(403).json({ error: 'Account disabled.' });
      }

      return res.status(200).json({ user: userData });
    }

    // 4. CONSUME LIMIT (ATOMIC TRANSACTION & 24H RESET)
    if (action === 'consume_limit') {
      if (!token) return res.status(400).json({ error: 'Token required.' });

      const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
      const q = query(usersRef, where('token', '==', token));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return res.status(404).json({ error: 'Invalid token.' });
      }

      const userDocRef = querySnapshot.docs[0].ref;

      let updatedUser = null;

      await runTransaction(db, async (transaction) => {
        const userDocSnap = await transaction.get(userDocRef);
        if (!userDocSnap.exists()) throw new Error('User not found.');

        let data = userDocSnap.data();
        if (data.status !== 'active') throw new Error('Your account has been disabled.');

        const now = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000;

        // Cek reset 24 jam server-side
        if (now - (data.lastReset || 0) >= twentyFourHours) {
          data.usedToday = 0;
          data.lastReset = now;
        }

        if (data.usedToday >= data.dailyLimit) {
          throw new Error('Your daily inject limit has been reached.');
        }

        data.usedToday += 1;
        data.totalInject = (data.totalInject || 0) + 1;
        data.successfulInject = (data.successfulInject || 0) + 1;

        transaction.update(userDocRef, {
          usedToday: data.usedToday,
          lastReset: data.lastReset,
          totalInject: data.totalInject,
          successfulInject: data.successfulInject
        });

        updatedUser = data;
      });

      return res.status(200).json({ success: true, user: updatedUser });
    }

    return res.status(400).json({ error: 'Action tidak dikenali.' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error.' });
  }
}