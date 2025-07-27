const fs = require("fs");
const path = require("path");
const axios = require("axios");

const CONFIG_PATH = path.join(__dirname, "config.json");
const PACKAGE_JSON_PATH = path.join(__dirname, "package.json");
const PACKAGE_LOCK_PATH = path.join(__dirname, "package-lock.json");
const PUBLIC_DIR = path.join(__dirname, "public");
const INDEX_HTML_PATH = path.join(PUBLIC_DIR, "index.html");

function readJson(filepath) {
  return JSON.parse(fs.readFileSync(filepath, "utf-8"));
}

function writeJson(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

function fileExists(filepath) {
  try {
    return fs.existsSync(filepath);
  } catch {
    return false;
  }
}

function sanitizeName(name) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");
}

async function downloadIcon(url, outputPath) {
  console.log(`⬇️ Downloading icon from: ${url}`);
  const response = await axios.get(url, { responseType: "arraybuffer" });
  fs.writeFileSync(outputPath, response.data);
  console.log(`✅ Icon downloaded to: ${outputPath}`);
}

function updateIndexHtml(config) {
  if (!fileExists(INDEX_HTML_PATH)) {
    console.warn("⚠️ index.html not found, skipping HTML updates.");
    return;
  }

  let html = fs.readFileSync(INDEX_HTML_PATH, "utf-8");

  // Update <title>
  html = html.replace(/<title>(.*?)<\/title>/i, `<title>${config.name}</title>`);

  // Update html,body background color only
  html = html.replace(
    /(html,\s*body\s*{[^}]*background:\s*)([^;]+)(;?)/i,
    (match, before, colorValue, after) => `${before}${config.color}${after}`
  );

  // Update localStorage.setItem('NAME', '...')
  html = html.replace(
    /localStorage\.setItem\(['"]NAME['"],\s*['"][^'"]*['"]\);/,
    `localStorage.setItem('NAME', '${config.ID}');`
  );

  fs.writeFileSync(INDEX_HTML_PATH, html);
  console.log("🎨 index.html updated (title, background color, NAME ID).");
}

async function applyConfig() {
  const config = readJson(CONFIG_PATH);
  const pkg = readJson(PACKAGE_JSON_PATH);

  console.log("📦 Updating package.json with matching config.json keys...");

  const keysToUpdate = ["name", "version", "description"];
  const sanitizedName = sanitizeName(config.name);

  keysToUpdate.forEach((key) => {
    if (config[key] !== undefined) {
      if (key === "name") {
        pkg[key] = sanitizedName;
      } else {
        pkg[key] = config[key];
      }
    }
  });

  pkg.build = pkg.build || {};
  if (config.appId) pkg.build.appId = config.appId;
  if (config.productName) {
    pkg.build.productName = config.productName;
  } else {
    pkg.build.productName = config.name; // fallback pretty name
  }

  const baseIconPath = path.join(PUBLIC_DIR, "icon.png");
  if (!fileExists(baseIconPath)) {
    await downloadIcon(config.windowsicon, baseIconPath);
  } else {
    console.log("⏭️ Skipping icon download, already exists.");
  }

  pkg.build.win = { icon: "public/icon.png", target: "nsis" };
  pkg.build.mac = { icon: "public/icon.png", target: "dmg" };
  pkg.build.linux = { icon: "public/icon.png", target: "AppImage" };
  pkg.build.directories = { output: "dist" };

  writeJson(PACKAGE_JSON_PATH, pkg);
  console.log("✅ package.json updated successfully.");

  // Optionally patch package-lock.json
  if (fileExists(PACKAGE_LOCK_PATH)) {
    const pkgLock = readJson(PACKAGE_LOCK_PATH);
    if (pkgLock.name) {
      pkgLock.name = sanitizedName;
      writeJson(PACKAGE_LOCK_PATH, pkgLock);
      console.log("🔁 package-lock.json updated with sanitized name.");
    }
  }

  updateIndexHtml(config);
}

applyConfig().catch((err) => {
  console.error("❌ Error updating config:", err);
  process.exit(1);
});
