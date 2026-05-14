import { ipcMain as a, dialog as s, Notification as h, app as t, BrowserWindow as r } from "electron";
import { fileURLToPath as f } from "node:url";
import l from "node:path";
import d from "node:fs/promises";
const c = l.dirname(f(import.meta.url)), w = process.env.NODE_ENV !== "production", p = process.env.WEBSITE_URL ?? "http://localhost:3000", u = l.join(c, "../web-dist");
let e;
function m() {
  e = new r({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: l.join(c, "preload.mjs"),
      contextIsolation: !0,
      nodeIntegration: !1
    }
  }), w ? e.loadURL(p) : e.loadFile(l.join(u, "index.html"));
}
a.handle("dialog:open", async (n, i) => {
  const o = await s.showOpenDialog(i);
  return o.canceled ? [] : o.filePaths;
});
a.handle("dialog:save", async (n, i) => {
  const o = await s.showSaveDialog(i);
  return o.canceled ? null : o.filePath;
});
a.handle("fs:read", async (n, i) => d.readFile(i, "utf-8"));
a.handle("fs:write", async (n, i, o) => {
  await d.writeFile(i, o, "utf-8");
});
a.handle("notification:show", (n, i, o) => {
  new h({ title: i, body: o }).show();
});
a.handle("window:minimize", () => e == null ? void 0 : e.minimize());
a.handle("window:maximize", () => {
  e != null && e.isMaximized() ? e.unmaximize() : e == null || e.maximize();
});
a.handle("window:close", () => e == null ? void 0 : e.close());
t.on("window-all-closed", () => {
  process.platform !== "darwin" && (t.quit(), e = null);
});
t.on("activate", () => {
  r.getAllWindows().length === 0 && m();
});
t.whenReady().then(m);
