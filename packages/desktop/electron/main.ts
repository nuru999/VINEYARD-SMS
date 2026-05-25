import { app, BrowserWindow, ipcMain, dialog, Notification } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import https from "node:https";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REMOTE_URL = process.env.REMOTE_URL || process.env.WEBSITE_URL || "http://localhost:3000";

let win: BrowserWindow | null;

function checkOnline(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = https.request(
      { hostname: new URL(REMOTE_URL).hostname, path: "/api/health", method: "HEAD", timeout: 4000 },
      () => resolve(true)
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => { req.destroy(); resolve(false); });
    req.end();
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: "Vineyard School",
    icon: path.join(__dirname, "../assets/icon.png"),
    backgroundColor: "#0D1117",
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      partition: "persist:vineyard",
    },
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
            width: 76px;
            height: 76px;
            margin: 0 auto 18px;
            border-radius: 20px;
            display: grid;
            place-items: center;
            background: linear-gradient(135deg, #1B4D4D 0%, #123030 100%);
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
          <div class="logo">V</div>
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

  win.loadURL(`data:text/html,
    <html style="background:#0D1117;margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif">
    <div style="text-align:center">
      <div style="width:80px;height:80px;border-radius:20px;background:#1B4D4D;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:36px;font-weight:900;color:#E91E8C">V</div>
      <div style="color:#fff;font-size:20px;font-weight:700">Vineyard School</div>
      <div style="color:#8b949e;font-size:13px;margin-top:8px">Loading...</div>
    </div></html>
  `);

  checkOnline().then((online) => {
    win?.loadURL(online ? REMOTE_URL : offlineHtml);
  });

  win.webContents.on("did-fail-load", (_e, code) => {
    if (code !== -3) setTimeout(() => checkOnline().then((online) => { if (online) win?.loadURL(REMOTE_URL); }), 3000);
  });

  win.on("closed", () => { win = null; });
}

// --- IPC Handlers ---
ipcMain.handle("dialog:open", async (_, opts) => {
  const result = await dialog.showOpenDialog(opts);
  return result.canceled ? [] : result.filePaths;
});

ipcMain.handle("dialog:save", async (_, opts) => {
  const result = await dialog.showSaveDialog(opts);
  return result.canceled ? null : result.filePath;
});

ipcMain.handle("fs:read", async (_, filePath: string) => {
  return fs.readFile(filePath, "utf-8");
});

ipcMain.handle("fs:write", async (_, filePath: string, data: string) => {
  await fs.writeFile(filePath, data, "utf-8");
});

ipcMain.handle("notification:show", (_, title: string, body: string) => {
  new Notification({ title, body }).show();
});

ipcMain.handle("window:minimize", () => win?.minimize());
ipcMain.handle("window:maximize", () => {
  if (win?.isMaximized()) win.unmaximize();
  else win?.maximize();
});
ipcMain.handle("window:close", () => win?.close());

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
