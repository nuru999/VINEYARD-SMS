import { ipcMain as i, dialog as p, Notification as y, app as a, BrowserWindow as h } from "electron";
import { fileURLToPath as g } from "node:url";
import l from "node:path";
import f from "node:fs/promises";
import x from "node:https";
const d = l.dirname(g(import.meta.url)), s = "https://templateweb-production-7d1c1up.railway.app";
let e;
function c() {
  return new Promise((o) => {
    const t = x.request(
      { hostname: "templateweb-production-7d1c1up.railway.app", path: "/api/health", method: "HEAD", timeout: 4e3 },
      () => o(!0)
    );
    t.on("error", () => o(!1)), t.on("timeout", () => {
      t.destroy(), o(!1);
    }), t.end();
  });
}
function m() {
  e = new h({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: "Vineyard School",
    icon: l.join(d, "../assets/icon.png"),
    backgroundColor: "#0D1117",
    webPreferences: {
      preload: l.join(d, "preload.mjs"),
      contextIsolation: !0,
      nodeIntegration: !1,
      webSecurity: !1,
      partition: "persist:vineyard"
    }
  }), e.loadURL(`data:text/html,
    <html style="background:#0D1117;margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif">
    <div style="text-align:center">
      <div style="width:80px;height:80px;border-radius:20px;background:#1B4D4D;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:36px;font-weight:900;color:#E91E8C">V</div>
      <div style="color:#fff;font-size:20px;font-weight:700">Vineyard School</div>
      <div style="color:#8b949e;font-size:13px;margin-top:8px">Loading...</div>
    </div></html>
  `), c().then((o) => {
    o ? e == null || e.loadURL(s) : e == null || e.loadURL(`data:text/html,
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
              fetch('https://templateweb-production-7d1c1up.railway.app/', {method:'HEAD',cache:'no-store'})
                .then(() => location.href = 'https://templateweb-production-7d1c1up.railway.app/')
                .catch(() => { document.querySelector('button').textContent = 'Retry Connection'; document.querySelector('button').disabled = false; });
            }
          <\/script>
        </div></html>
      `);
  }), e.webContents.on("did-fail-load", (o, t, n, r) => {
    t !== -3 && (r != null && r.startsWith("https://")) && setTimeout(() => {
      c().then((u) => {
        u && (e == null || e.loadURL(s));
      });
    }, 5e3);
  }), e.on("closed", () => {
    e = null;
  });
}
i.handle("dialog:open", async (o, t) => {
  const n = await p.showOpenDialog(t);
  return n.canceled ? [] : n.filePaths;
});
i.handle("dialog:save", async (o, t) => {
  const n = await p.showSaveDialog(t);
  return n.canceled ? null : n.filePath;
});
i.handle("fs:read", async (o, t) => f.readFile(t, "utf-8"));
i.handle("fs:write", async (o, t, n) => {
  await f.writeFile(t, n, "utf-8");
});
i.handle("notification:show", (o, t, n) => {
  new y({ title: t, body: n }).show();
});
i.handle("window:minimize", () => e == null ? void 0 : e.minimize());
i.handle("window:maximize", () => {
  e != null && e.isMaximized() ? e.unmaximize() : e == null || e.maximize();
});
i.handle("window:close", () => e == null ? void 0 : e.close());
a.on("window-all-closed", () => {
  process.platform !== "darwin" && (a.quit(), e = null);
});
a.on("activate", () => {
  h.getAllWindows().length === 0 && m();
});
a.whenReady().then(m);
