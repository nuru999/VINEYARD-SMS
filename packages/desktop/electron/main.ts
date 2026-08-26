import { app, BrowserWindow, shell } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fsSync from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Auto-load .env from repo root (works without PowerShell env setup)
function loadDotEnv() {
  // Walk up from dist-electron/ to find repo root .env
  const candidates = [
    path.join(__dirname, ".env"),
    path.join(__dirname, "..", ".env"),
    path.join(__dirname, "..", "..", ".env"),
    path.join(__dirname, "..", "..", "..", ".env"),
  ];
  for (const envPath of candidates) {
    if (fsSync.existsSync(envPath)) {
      const lines = fsSync.readFileSync(envPath, "utf-8").split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
        if (key && !(key in process.env)) {
          process.env[key] = value;
        }
      }
      break;
    }
  }
}

loadDotEnv();

// Always point to Render — env vars can override for local dev
const REMOTE_URL = process.env.REMOTE_URL || process.env.WEBSITE_URL || "https://vineyard-sms-gq1q.onrender.com";
const REMOTE_ORIGIN = new URL(REMOTE_URL).origin;

let win: BrowserWindow | null;

function isAllowedNavigation(url: string) {
  if (url === "about:blank" || url.startsWith("data:text/html,")) return true;

  try {
    return new URL(url).origin === REMOTE_ORIGIN;
  } catch {
    return false;
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: "Vineyard School SMS",
    icon: path.join(__dirname, "../assets/icon.png"),
    backgroundColor: "#F8FAFC",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      partition: "persist:vineyard",
    },
  });

  // Remove the default menu entirely on Windows/Linux
  win.setMenu(null);

  // Keep the remote shell on the configured Vineyard origin. External links
  // are opened by the operating system instead of being trusted inside Electron.
  win.webContents.on("will-navigate", (event, url) => {
    if (isAllowedNavigation(url)) return;

    event.preventDefault();
    if (url.startsWith("https://") || url.startsWith("http://")) {
      void shell.openExternal(url);
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://") || url.startsWith("http://")) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  const offlineHtml = `data:text/html,
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Vineyard School - Offline</title>
        <style>
          :root { color-scheme: dark; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: linear-gradient(180deg, #081018 0%, #0D1117 100%);
            color: white;
            font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          }
          .card {
            width: min(440px, calc(100vw - 32px));
            padding: 28px;
            border-radius: 20px;
            background: rgba(15, 23, 42, 0.92);
            border: 1px solid rgba(148, 163, 184, 0.18);
            box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
            text-align: center;
          }
          .logo {
            width: 90px;
            height: 90px;
            margin: 0 auto 18px;
            border-radius: 16px;
            display: grid;
            place-items: center;
            background: white;
            padding: 6px;
            object-fit: contain;
            color: #E91E8C;
            font-size: 34px;
            font-weight: 900;
          }
          h1 { margin: 0 0 8px; font-size: 24px; }
          p { margin: 0 0 18px; color: #94A3B8; line-height: 1.6; font-size: 14px; }
          .status { color: #FCA5A5; font-weight: 700; margin-bottom: 14px; }
          button {
            appearance: none;
            border: 0;
            border-radius: 12px;
            background: #E91E8C;
            color: white;
            padding: 12px 20px;
            font-weight: 700;
            cursor: pointer;
          }
          button:disabled { opacity: 0.6; cursor: not-allowed; }
        </style>
      </head>
      <body>
        <div class="card">
          <img class="logo" src="https://vineyard-sms-gq1q.onrender.com/school-logo.png" onerror="this.style.display='none';document.getElementById('fallback-logo').style.display='grid'" alt="Vineyard School" />
          <div class="logo" id="fallback-logo" style="display:none">V</div>
          <h1>Vineyard School</h1>
          <div class="status">Offline mode</div>
          <p>The app will keep trying to reconnect. Once you’re online, it loads automatically.</p>
          <button id="retry">Retry now</button>
        </div>
        <script>
          const btn = document.getElementById('retry');
          async function retry() {
            btn.disabled = true;
            btn.textContent = 'Checking...';
            try {
              await fetch(${JSON.stringify(REMOTE_URL)}, { method: 'HEAD', cache: 'no-store' });
              location.href = ${JSON.stringify(REMOTE_URL)};
            } catch (e) {
              btn.disabled = false;
              btn.textContent = 'Retry now';
            }
          }
          btn.addEventListener('click', retry);
          setInterval(() => {
            fetch(${JSON.stringify(REMOTE_URL)}, { method: 'HEAD', cache: 'no-store' })
              .then(() => location.href = ${JSON.stringify(REMOTE_URL)})
              .catch(() => {});
          }, 10000);
        </script>
      </body>
    </html>`;

  // Load Render directly — no pre-check that can time out on cold start
  void win.loadURL(REMOTE_URL);

  // True offline fallback: only show offline page when the network request fails
  win.webContents.on("did-fail-load", (_e, code) => {
    // code -3 = ERR_ABORTED (navigation cancelled by new loadURL), ignore it
    if (code !== -3) {
      void win?.loadURL(offlineHtml);
    }
  });

  win.on("closed", () => {
    win = null;
  });
}

// --- App lifecycle ---
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.whenReady().then(createWindow);
