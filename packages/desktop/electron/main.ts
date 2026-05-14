import { app, BrowserWindow, ipcMain, dialog, Notification } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import https from "node:https";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REMOTE_URL = "https://tev9r78fiuvrwtmm0bicj-preview-4200.runable.site";

let win: BrowserWindow | null;

function checkOnline(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = https.request(
      { hostname: "tev9r78fiuvrwtmm0bicj-preview-4200.runable.site", path: "/api/health", method: "HEAD", timeout: 4000 },
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

  // Show loading screen first
  win.loadURL(`data:text/html,
    <html style="background:#0D1117;margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif">
    <div style="text-align:center">
      <div style="width:80px;height:80px;border-radius:20px;background:#1B4D4D;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:36px;font-weight:900;color:#E91E8C">V</div>
      <div style="color:#fff;font-size:20px;font-weight:700">Vineyard School</div>
      <div style="color:#8b949e;font-size:13px;margin-top:8px">Loading...</div>
    </div></html>
  `);

  checkOnline().then((online) => {
    if (online) {
      win?.loadURL(REMOTE_URL);
    } else {
      // Show offline page
      win?.loadURL(`data:text/html,
        <html style="background:#0D1117;margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif">
        <div style="text-align:center;max-width:400px;padding:24px">
          <div style="width:80px;height:80px;border-radius:20px;background:#1B4D4D;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:36px;font-weight:900;color:#E91E8C">V</div>
          <div style="color:#fff;font-size:22px;font-weight:700;margin-bottom:8px">Vineyard School</div>
          <div style="color:#F87171;font-size:14px;margin-bottom:20px">No internet connection</div>
          <div style="color:#8b949e;font-size:13px;line-height:1.6;margin-bottom:24px">
            Vineyard School requires an internet connection to load your data securely. Please connect to WiFi or a mobile hotspot and relaunch the app.
          </div>
          <button onclick="window.__retryConnect()" style="background:#E91E8C;color:#fff;border:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">
            Retry Connection
          </button>
          <script>
            window.__retryConnect = function() {
              document.querySelector('button').textContent = 'Checking...';
              document.querySelector('button').disabled = true;
              fetch('https://tev9r78fiuvrwtmm0bicj-preview-4200.runable.site/', {method:'HEAD',cache:'no-store'})
                .then(() => location.href = 'https://tev9r78fiuvrwtmm0bicj-preview-4200.runable.site/')
                .catch(() => { document.querySelector('button').textContent = 'Retry Connection'; document.querySelector('button').disabled = false; });
            }
          </script>
        </div></html>
      `);
    }
  });

  // Auto-retry: if the remote URL fails to load, check again after 5s
  win.webContents.on("did-fail-load", (_e, code, _desc, url) => {
    if (code !== -3 && url?.startsWith("https://")) {
      setTimeout(() => {
        checkOnline().then((online) => {
          if (online) win?.loadURL(REMOTE_URL);
        });
      }, 5000);
    }
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
