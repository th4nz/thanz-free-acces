import admin from 'firebase-admin';

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const db = getDb();
    const { action, adminToken, userId, actionType } = req.body;

    const validAdminSecret = process.env.ADMIN_SECRET || 'thanzadmin';
    if (!adminToken || adminToken !== validAdminSecret) {
      return res.status(401).json({ error: 'Unauthorized admin access.' });
    }

    const usersRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('users');

    if (action === 'stats') {
      const querySnapshot = await usersRef.get();
      
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

      return res.status(200).json({ totalUsers, activeUsers, totalInject, successInject, users });
    }

    if (action === 'user_action' && userId) {
      const targetDocRef = usersRef.doc(userId);
      const targetSnap = await targetDocRef.get();

      if (!targetSnap.exists) {
        return res.status(404).json({ error: 'User tidak ditemukan.' });
      }

      const userData = targetSnap.data();

      if (actionType === 'add_limit') {
        await targetDocRef.update({ dailyLimit: (userData.dailyLimit || 5) + 5 });
      } else if (actionType === 'reset_limit') {
        await targetDocRef.update({ usedToday: 0, lastReset: Date.now() });
      } else if (actionType === 'toggle_status') {
        const newStatus = userData.status === 'active' ? 'disabled' : 'active';
        await targetDocRef.update({ status: newStatus });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Aksi tidak dikenali.' });
  } catch (error) {
    return res.status(500).json({ error: `Backend Error: ${error.message}` });
  }
}      const u = docSnap.data();
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
    return res.status(500).json({ error: err.message || 'Server error.' });
  }
}    querySnapshot.forEach(docSnap => {
      const u = docSnap.data();
      totalUsers++;
      if (u.status === 'active') activeUsers++;
      totalInject += (u.totalInject || 0);
      successInject += (u.successfulInject || 0);
      totalInvalidInject += (u.totalInvalidInject || 0);
      users.push(u);
    });

    if (action === 'stats') {
      return res.status(200).json({
        totalUsers,
        activeUsers,
        totalInject,
        successInject,
        totalInvalidInject,
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
    return res.status(500).json({ error: err.message || 'Server error.' });
  }
}
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
    return res.status(500).json({ error: err.message || 'Server error.' });
  }
                               }
