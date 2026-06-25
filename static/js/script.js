/* ============================================================
   Tulip AI Assistant — frontend logic (vanilla JS + Flask)
   ============================================================ */

(function () {
  "use strict";

  const messagesEl = document.getElementById("messages");
  const formEl = document.getElementById("chat-form");
  const inputEl = document.getElementById("message-input");
  const sendBtn = document.getElementById("send-btn");
  const themeToggle = document.getElementById("theme-toggle");
  const root = document.documentElement;

  let isBusy = false;

  /* ---------- Tulip SVG markup for bot avatars ---------- */
  const TULIP_SVG = `
    <svg viewBox="0 0 24 24" fill="none" class="tulip-icon">
      <path d="M12 21c0-4-3-5-3-9a3 3 0 0 1 6 0c0 4-3 5-3 9Z" fill="currentColor" opacity="0.55" />
      <path d="M12 12c-1.6-2-3-2.2-4.2-1.6C6 11.2 6.4 13.8 8.4 15 10 16 12 15 12 12Z" fill="currentColor" />
      <path d="M12 12c1.6-2 3-2.2 4.2-1.6C18 11.2 17.6 13.8 15.6 15 14 16 12 15 12 12Z" fill="currentColor" />
      <path d="M12 12c0-2.2.6-3.6 1.6-4.4C12.8 5.4 12 5 12 5s-.8.4-1.6 2.6C11.4 8.4 12 9.8 12 12Z" fill="currentColor" />
    </svg>`;

  /* ---------- Theme handling ---------- */
  function applyTheme(theme) {
    const isDark = theme === "dark";
    root.classList.toggle("dark", isDark);
    root.classList.toggle("light", !isDark);
    themeToggle.setAttribute(
      "aria-label",
      isDark ? "Switch to light mode" : "Switch to dark mode"
    );
  }

  // Restore saved preference, else fall back to system preference.
  const savedTheme = localStorage.getItem("tulip-theme");
  if (savedTheme) {
    applyTheme(savedTheme);
  } else if (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    applyTheme("dark");
  }

  themeToggle.addEventListener("click", function () {
    const next = root.classList.contains("dark") ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem("tulip-theme", next);
  });

  /* ---------- Rendering helpers ---------- */
  function scrollToBottom() {
    messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: "smooth" });
  }

  function appendMessage(role, text) {
    const row = document.createElement("div");
    row.className = "row " + (role === "user" ? "row--user" : "row--bot");

    if (role === "bot") {
      const avatar = document.createElement("span");
      avatar.className = "row__avatar";
      avatar.setAttribute("aria-hidden", "true");
      avatar.innerHTML = TULIP_SVG;
      row.appendChild(avatar);
    }

    const bubble = document.createElement("div");
    bubble.className =
      "bubble " + (role === "user" ? "bubble--user" : "bubble--bot");
    bubble.textContent = text;
    row.appendChild(bubble);

    messagesEl.appendChild(row);
    scrollToBottom();
  }

  function showTyping() {
    const row = document.createElement("div");
    row.className = "row row--bot";
    row.id = "typing-row";

    const avatar = document.createElement("span");
    avatar.className = "row__avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.innerHTML = TULIP_SVG;

    const typing = document.createElement("div");
    typing.className = "typing";
    typing.setAttribute("aria-label", "Tulip is typing");
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement("span");
      dot.className = "typing__dot";
      typing.appendChild(dot);
    }

    row.appendChild(avatar);
    row.appendChild(typing);
    messagesEl.appendChild(row);
    scrollToBottom();
  }

  function removeTyping() {
    const t = document.getElementById("typing-row");
    if (t) t.remove();
  }

  function setBusy(busy) {
    isBusy = busy;
    sendBtn.disabled = busy;
    sendBtn.classList.toggle("is-loading", busy);
  }

  /* ---------- Talk to the Flask backend ---------- */
  async function getBotReply(message) {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message }),
    });

    if (!res.ok) {
      throw new Error("Request failed with status " + res.status);
    }

    const data = await res.json();
    return data.response;
  }

  /* ---------- Form submission ---------- */
  formEl.addEventListener("submit", async function (e) {
    e.preventDefault();
    const text = inputEl.value.trim();
    if (!text || isBusy) return;

    appendMessage("user", text);
    inputEl.value = "";
    setBusy(true);
    showTyping();

    try {
      const reply = await getBotReply(text);
      removeTyping();
      appendMessage("bot", reply || "…");
    } catch (err) {
      removeTyping();
      appendMessage(
        "bot",
        "Oh dear, I couldn't reach the garden just now. Please try again in a moment. 🌷"
      );
      console.error("[tulip] chat error:", err);
    } finally {
      setBusy(false);
      inputEl.focus();
    }
  });

  /* ---------- Initial greeting ---------- */
  appendMessage(
    "bot",
    "Hello, lovely! I'm Tulip, your calm little AI companion. Ask me anything and I'll bloom an answer for you. 🌷"
  );
})();
