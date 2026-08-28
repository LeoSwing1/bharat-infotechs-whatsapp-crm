const crypto = require("crypto");

function key() {
  const raw = process.env.WHATSAPP_ENCRYPTION_KEY || "development-only-change-me";
  return crypto.createHash("sha256").update(raw).digest();
}

function encrypt(value) {
  if (value == null || value === "") return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${ciphertext.toString("base64url")}`;
}

function decrypt(value) {
  if (value == null || value === "") return "";
  const raw = String(value);
  if (!raw.startsWith("v1:")) return raw;
  const [, ivB64, tagB64, dataB64] = raw.split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB64, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64url")), decipher.final()]).toString("utf8");
}

module.exports = { encrypt, decrypt };
