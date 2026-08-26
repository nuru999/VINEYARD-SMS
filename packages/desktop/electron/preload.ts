import { contextBridge } from "electron";

// Keep the bridge intentionally minimal because the renderer loads remote web
// content. Do not expose filesystem, shell, dialog, or arbitrary IPC access.
contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
});
