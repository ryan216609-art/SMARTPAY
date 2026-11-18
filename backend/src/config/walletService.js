
import {
  Wallet
} from "ethers";

import {
  createCipheriv,
  createDecipheriv,
  randomBytes
} from "node:crypto";

// Obtém e valida a chave de criptografia do .env
function getEncryptionKey() {
  const key = process.env.WALLET_ENCRYPTION_KEY;

  if (!key || !/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error(
      "WALLET_ENCRYPTION_KEY ausente ou inválida. Ela deve conter 64 caracteres hexadecimais."
    );
  }

  return Buffer.from(key, "hex");
}

// Criptografa uma chave privada usando AES-256-GCM
export function encryptPrivateKey(privateKey) {
  const key = getEncryptionKey();
  const iv = randomBytes(12);

  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(privateKey, "utf8"),
    cipher.final()
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex")
  ].join(":");
}

// Descriptografa uma chave privada armazenada no banco
export function decryptPrivateKey(encryptedData) {
  const key = getEncryptionKey();

  const parts = encryptedData.split(":");

  if (parts.length !== 3) {
    throw new Error("Formato de chave criptografada inválido.");
  }

  const [ivHex, authTagHex, encryptedHex] = parts;

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  if (iv.length !== 12 || authTag.length !== 16 || encrypted.length === 0) {
    throw new Error("Dados de criptografia inválidos.");
  }

  const decipher = createDecipheriv("aes-256-gcm", key, iv);

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);

  return decrypted.toString("utf8");
}

// Cria uma carteira Ethereum individual
export function createUserWallet() {
  const wallet = Wallet.createRandom();

  return {
    address: wallet.address,
    encryptedPrivateKey: encryptPrivateKey(wallet.privateKey)
  };
}
