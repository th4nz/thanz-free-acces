import admin from 'firebase-admin';

// Fungsi aman untuk memanggil database Admin
function getDb() {
  if (!admin.apps.length) {
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
      throw new Error('SYSTEM HALTED: Environment Variables Firebase belum di-set dengan benar di Dashboard Vercel!');
    }
    
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      })
    });
  }
  return admin.firestore();
}

const appId = "am-pro-toolkit-v2";

function generateToken() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let rand = "";
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `THANZ-${rand}`;
}

const getClientIp = (req) => {
  let ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  if (ip.includes(',')) ip = ip.split(',')[0].trim();
  return ip;
};

export default async function handler(req, res) {
  // CORS Headers (opsional tapi baik untuk mencegah error tambahan)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = getDb(); // Inisialisasi DB di sini agar jika error, tertangkap Try-Catch
    const { action, username, token } = req.body;
    const clientIp = getClientIp(req);
    
    const usersRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('users');

    // ==========================================
    // 1. REGISTER USER
    // ==========================================
    if (action === 'register') {
      if (!username || typeof username !== 'string') {
        return res.status(400).json({ error: 'Username tidak valid.' });
      }

      const userSnap = await usersRef.where('username', '==', username).get();
      if (!userSnap.empty) {
        return res.status(400).json({ error: 'Username sudah digunakan, silakan pilih yang lain.' });
      }

      const ipSafeStr = clientIp.replace(/[.#:$[\]]/g, '_'); 
      const ipRegistryRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('registered_ips').doc(ipSafeStr);
      
      const newToken = generateToken();
      const userId = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const newUserRef = usersRef.doc(userId);

      let createdUser = null;

      await db.runTransaction(async (transaction) => {
        const ipDocSnap = await transaction.get(ipRegistryRef);
        const isLocal = clientIp === 'unknown' || clientIp === '::1' || clientIp === '127.0.0.1';

        if (ipDocSnap.exists && !isLocal) {
          throw new Error('IP_EXISTS');
        }

        transaction.set(ipRegistryRef, {
          userId: userId,
          username: username,
          registeredAt: Date.now(),
          ip: clientIp
        });

        const newUserData = {
          userId,
          username,
          token: newToken,
          registeredIp: clientIp,
          status: 'active',
          dailyLimit: 5,
          usedToday: 0,
          lastReset: Date.now(),
          totalInject: 0,
          successfulInject: 0,
          createdAt: Date.now()
        };

        transaction.set(newUserRef, newUserData);
        createdUser = newUserData;
      });

      return res.status(200).json({ success: true, user: createdUser, token: newToken });
    }

    // ==========================================
    // 2. LOGIN USER
    // ==========================================
    if (action === 'login') {
      if (!username || !token) {
        return res.status(400).json({ error: 'Username dan Token wajib diisi.' });
      }
      
      const snap = await usersRef.where('username', '==', username).where('token', '==', token).get();
      if (snap.empty) {
        return res.status(401).json({ error: 'Username atau Token salah.' });
      }
      
      const userData = snap.docs[0].data();
      if (userData.status !== 'active') {
        return res.status(403).json({ error: 'Akun Anda telah dinonaktifkan oleh Admin.' });
      }
      
      return res.status(200).json({ success: true, user: userData });
    }

    // ==========================================
    // 3. INJECT ACTION
    // ==========================================
    if (action === 'inject') {
      if (!token) return res.status(400).json({ error: 'Token diperlukan.' });
      
      const querySnapshot = await usersRef.where('token', '==', token).get();
      if (querySnapshot.empty) {
        return res.status(401).json({ error: 'Invalid token.' });
      }

      const userDocRef = querySnapshot.docs[0].ref;
      let updatedUser = null;

      await db.runTransaction(async (transaction) => {
        const userDocSnap = await transaction.get(userDocRef);
        if (!userDocSnap.exists) throw new Error('User not found.');

        let data = userDocSnap.data();
        if (data.status !== 'active') throw new Error('Your account has been disabled.');

        const now = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000;

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

    return res.status(400).json({ error: 'Aksi tidak dikenali.' });

  } catch (error) {
    if (error.message === 'IP_EXISTS') {
      return res.status(403).json({ error: 'Perangkat ini sudah pernah mendaftar. (1 Perangkat = 1 Akun).' });
    }
    // Jika Vercel crash, error-nya akan ditampilkan rapi sebagai JSON di sini!
    return res.status(500).json({ error: `Backend Error: ${error.message}` });
  }
                                   }
