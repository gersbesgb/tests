require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes("change-this")) {
  console.error("\n[Indium Web] Set a real JWT_SECRET in your .env file before running in production.");
  console.error("  Generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"\n");
}

// Restrict to your Cloudflare Pages domain once you have one, e.g.
//   ALLOWED_ORIGIN=https://indium-macros.pages.dev,https://your-custom-domain.com
// Left blank (default) it allows any origin, which is fine for testing
// but should be locked down before real users log in.
const allowed = (process.env.ALLOWED_ORIGIN || "").split(",").map(s => s.trim()).filter(Boolean);
const app = express();
app.use(cors(allowed.length ? { origin: allowed } : {}));
app.use(express.json());

app.use("/api/auth", require("./routes/auth"));
app.use("/api/keys", require("./routes/keys"));
app.use("/api/receipts", require("./routes/receipts"));

// Static site (the dashboard/landing page) + the downloadable .exe
app.use(express.static(path.join(__dirname, "public")));
app.get("/download", (req, res) => {
  const dir = path.join(__dirname, "public", "downloads");
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith(".exe")) : [];
  if (!files.length) return res.status(404).send("No build uploaded yet — drop \"Indium Macros.exe\" into public/downloads/.");
  res.download(path.join(dir, files[0]));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Indium Web running on http://localhost:${PORT}`));
