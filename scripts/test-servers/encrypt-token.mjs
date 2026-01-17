import crypto from 'crypto';

const key = 'MqkbXiN5/Nuc0G3pxq9ugEaHW41WHH781hXJxDUklvc=';
const derivedKey = crypto.scryptSync(key, 'saas-quest-salt', 32);
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);

const token = 'test-verification-token-12345';
let encrypted = cipher.update(token, 'utf8', 'hex');
encrypted += cipher.final('hex');
const authTag = cipher.getAuthTag();

const encryptedToken = iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
console.log('Encrypted token:');
console.log(encryptedToken);
