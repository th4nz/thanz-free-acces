document.addEventListener("DOMContentLoaded", () => {
  let currentEmail = "";
  let inboxPollTimer = null;

  // Generate / Ambil Device ID unik dari browser HP user
  let deviceId = localStorage.getItem("dravn_device_id");
  if (!deviceId) {
    deviceId = "DEV-" + Math.random().toString(36).substring(2, 10).toUpperCase() + Date.now().toString(36);
    localStorage.setItem("dravn_device_id", deviceId);
  }

  // Cek apakah device sudah pernah klaim
  if (localStorage.getItem("dravn_claimed_status") === "true") {
    const emailBox = document.getElementById("stepEmailBox");
    const warning = document.getElementById("deviceWarning");
    if (emailBox) emailBox.classList.add("hidden");
    if (warning) warning.classList.remove("hidden");
  }

  function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => toast.classList.remove("show"), 3500);
  }

  window.handleSendMagicLink = async function () {
    const emailInput = document.getElementById("inputEmail");
    const email = emailInput ? emailInput.value.trim() : "";

    if (!email || !email.includes("@")) {
      showToast("Masukkan alamat email yang valid.");
      return;
    }

    currentEmail = email;
    showToast("Mengirim magic link...");

    try {
      const response = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const result = await response.json();

      if (!response.ok || result.status === false) {
        throw new Error(result.message || "Gagal mengirim magic link.");
      }

      document.getElementById("stepEmailBox").classList.add("hidden");
      document.getElementById("stepVerifyBox").classList.remove("hidden");
      document.getElementById("flowInstruction").textContent = `Magic link terkirim ke ${email}.`;
      showToast("Magic link berhasil dikirim!");

      startInboxPolling(email);
    } catch (err) {
      showToast(err.message || "Terjadi kesalahan koneksi.");
    }
  };

  function startInboxPolling(email) {
    clearInterval(inboxPollTimer);
    let attempts = 0;

    inboxPollTimer = setInterval(async () => {
      attempts++;
      if (attempts > 30) {
        clearInterval(inboxPollTimer);
        return;
      }

      try {
        const response = await fetch("/api/inbox", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });
        const result = await response.json();

        if (result.status && result.data && result.data.messages && result.data.messages.length > 0) {
          const msg = result.data.messages[0];
          if (msg.login_url) {
            const inputLink = document.getElementById("inputLink");
            if (inputLink && !inputLink.value) {
              inputLink.value = msg.login_url;
              showToast("Magic link otomatis ditemukan!");
              clearInterval(inboxPollTimer);
            }
          }
        }
      } catch {}
    }, 4000);
  }

  window.handleVerifyLink = async function () {
    const linkInput = document.getElementById("inputLink");
    const link = linkInput ? linkInput.value.trim() : "";

    if (!link) {
      showToast("Masukkan magic link terlebih dahulu.");
      return;
    }

    showToast("Memverifikasi & Mendaftarkan akun...");

    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentEmail, link, deviceId })
      });
      const result = await response.json();

      if (!response.ok || result.status === false) {
        throw new Error(result.message || "Verifikasi gagal.");
      }

      clearInterval(inboxPollTimer);
      localStorage.setItem("dravn_claimed_status", "true");

      document.getElementById("stepVerifyBox").classList.add("hidden");
      document.getElementById("stepSuccessBox").classList.remove("hidden");
      
      document.getElementById("resToken").textContent = result.data?.thnz_token || "THNZ-ERR";
      document.getElementById("resCredits").textContent = `${result.data?.credits || 5} Kredit Tersedia`;
      document.getElementById("flowInstruction").textContent = "Akun sukses terdaftar dengan token unik!";
      showToast("Berhasil! Token & Kredit aktif.");
    } catch (err) {
      showToast(err.message || "Gagal memverifikasi.");
    }
  };

  window.resetAmFlow = function () {
    location.reload();
  };
});
