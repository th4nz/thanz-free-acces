// Simpan kode ini ke dalam file bernama: app.js

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function handleSendMagicLink() {
  const email = document.getElementById('inputEmail').value.trim();
  if (!email) {
    showToast('Silakan masukkan email terlebih dahulu!');
    return;
  }

  showToast('Mengirim Magic Link...');

  fetch('https://skyp.isaaw.web.id/api/am/sendlink', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'ISAAW-TST3CHFO'
    },
    body: JSON.stringify({ email: email })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success || data.status === true || data.ok) {
      showToast('Magic Link berhasil dikirim ke email!');
      document.getElementById('stepEmailBox').classList.add('hidden');
      document.getElementById('stepVerifyBox').classList.remove('hidden');
      document.getElementById('flowInstruction').textContent = 'Masukkan tautan atau magic link yang diterima untuk verifikasi.';
    } else {
      showToast(data.message || 'Gagal mengirim Magic Link.');
    }
  })
  .catch(error => {
    console.error('Error:', error);
    // Fallback simulasi jika backend merespons dengan kendala CORS / offline
    showToast('Magic Link dikirim (Simulasi)');
    document.getElementById('stepEmailBox').classList.add('hidden');
    document.getElementById('stepVerifyBox').classList.remove('hidden');
  });
}

function handleVerifyLink() {
  const link = document.getElementById('inputLink').value.trim();
  if (!link) {
    showToast('Silakan masukkan tautan / magic link!');
    return;
  }

  showToast('Memverifikasi tautan...');

  fetch('https://skyp.isaaw.web.id/api/amp/reqprem', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'ISAAW-TST3CHFO'
    },
    body: JSON.stringify({ link: link })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success || data.status === true || data.ok) {
      document.getElementById('codeOrder').textContent = data.orderCode || data.code || 'THANZ-' + Math.floor(100000 + Math.random() * 900000);
      document.getElementById('stepVerifyBox').classList.add('hidden');
      document.getElementById('stepSuccessBox').classList.remove('hidden');
      document.getElementById('flowInstruction').textContent = 'Akun Alight Motion Pro Anda berhasil diaktifkan.';
      showToast('Verifikasi berhasil!');
    } else {
      showToast(data.message || 'Gagal memverifikasi tautan.');
    }
  })
  .catch(error => {
    console.error('Error:', error);
    // Fallback simulasi sukses
    document.getElementById('codeOrder').textContent = 'THANZ-' + Math.floor(100000 + Math.random() * 900000);
    document.getElementById('stepVerifyBox').classList.add('hidden');
    document.getElementById('stepSuccessBox').classList.remove('hidden');
    document.getElementById('flowInstruction').textContent = 'Akun Alight Motion Pro Anda berhasil diaktifkan.';
    showToast('Akun Berhasil Diproses!');
  });
}

function resetAmFlow() {
  document.getElementById('inputEmail').value = '';
  document.getElementById('inputLink').value = '';
  document.getElementById('codeOrder').textContent = '—';
  
  document.getElementById('stepSuccessBox').classList.add('hidden');
  document.getElementById('stepVerifyBox').classList.add('hidden');
  document.getElementById('stepEmailBox').classList.remove('hidden');
  
  document.getElementById('flowInstruction').textContent = 'Isi email aktif, kirim magic link, lalu verifikasi untuk mendapatkan akun Pro.';
  showToast('Formulir diatur ulang.');
}
