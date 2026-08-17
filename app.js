document.addEventListener("DOMContentLoaded", () => {
  let currentEmail = "";
  let amStep = 1;
  let inboxPollTimer = null;

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

      amStep = 2;
      const stepEmailBox = document.getElementById("stepEmailBox");
      const stepVerifyBox = document.getElementById("stepVerifyBox");
      const flowInstruction = document.getElementById("flowInstruction");

      if (stepEmailBox) stepEmailBox.classList.add("hidden");
      if (stepVerifyBox) stepVerifyBox.classList.remove("hidden");
      if (flowInstruction) {
        flowInstruction.textContent = `Magic link terkirim ke ${email}. Cek manual atau tunggu otomatis.`;
      }
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
      } catch {
        // Abaikan error background polling
      }
    }, 4000);
  }

  window.handleVerifyLink = async function () {
    const linkInput = document.getElementById("inputLink");
    const link = linkInput ? linkInput.value.trim() : "";

    if (!link) {
      showToast("Masukkan tautan / magic link terlebih dahulu.");
      return;
    }

    showToast("Memverifikasi akun Pro...");

    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentEmail, link })
      });
      const result = await response.json();

      if (!response.ok || result.status === false) {
        throw new Error(result.message || "Verifikasi gagal.");
      }

      amStep = 3;
      clearInterval(inboxPollTimer);

      const stepVerifyBox = document.getElementById("stepVerifyBox");
      const stepSuccessBox = document.getElementById("stepSuccessBox");
      const codeOrder = document.getElementById("codeOrder");
      const flowInstruction = document.getElementById("flowInstruction");

      if (stepVerifyBox) stepVerifyBox.classList.add("hidden");
      if (stepSuccessBox) stepSuccessBox.classList.remove("hidden");
      if (codeOrder) {
        codeOrder.textContent = result.data?.order_id || result.data?.code || "SUCCESS-AM-PRO";
      }
      if (flowInstruction) flowInstruction.textContent = "Akun Alight Motion berhasil menjadi Pro!";
      showToast("Akun Berhasil Diproses!");
    } catch (err) {
      showToast(err.message || "Gagal memverifikasi tautan.");
    }
  };

  window.resetAmFlow = function () {
    amStep = 1;
    currentEmail = "";
    clearInterval(inboxPollTimer);

    const inputEmail = document.getElementById("inputEmail");
    const inputLink = document.getElementById("inputLink");
    const stepSuccessBox = document.getElementById("stepSuccessBox");
    const stepVerifyBox = document.getElementById("stepVerifyBox");
    const stepEmailBox = document.getElementById("stepEmailBox");
    const flowInstruction = document.getElementById("flowInstruction");

    if (inputEmail) inputEmail.value = "";
    if (inputLink) inputLink.value = "";
    if (stepSuccessBox) stepSuccessBox.classList.add("hidden");
    if (stepVerifyBox) stepVerifyBox.classList.add("hidden");
    if (stepEmailBox) stepEmailBox.classList.remove("hidden");
    if (flowInstruction) {
      flowInstruction.textContent = "Isi email aktif, kirim magic link, lalu verifikasi untuk mendapatkan akun Pro.";
    }
  };
});
