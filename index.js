const { app, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow;

function getAppIcon() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "package.json"), "utf-8"));
    const iconPath = pkg?.build?.win?.icon;
    if (iconPath) {
      const fullPath = path.join(__dirname, iconPath);
      if (fs.existsSync(fullPath)) return fullPath;
    }
  } catch (err) {
    console.warn("⚠️ Failed to read icon from package.json:", err);
  }
  return null;
}

function createWindow() {
  const icon = getAppIcon();

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: icon || undefined,
    webPreferences: {
      nodeIntegration: true,
    },
    autoHideMenuBar: true,
  });

  mainWindow.loadFile(path.join(__dirname, "public", "index.html"));
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
