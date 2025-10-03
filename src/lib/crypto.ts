import { KeyManagementServiceClient } from '@google-cloud/kms';
import { env } from '@/config/env';

let kmsClient: KeyManagementServiceClient | null = null;

function getKMSClient(): KeyManagementServiceClient {
  if (!kmsClient) {
    kmsClient = new KeyManagementServiceClient({
      projectId: env.GOOGLE_PROJECT_ID,
    });
  }
  return kmsClient;
}

function getKeyName(): string {
  return `projects/${env.GOOGLE_PROJECT_ID}/locations/${env.GOOGLE_CLOUD_KMS_LOCATION}/keyRings/${env.GOOGLE_CLOUD_KMS_KEY_RING}/cryptoKeys/${env.GOOGLE_CLOUD_KMS_KEY}`;
}

export async function encryptToken(plaintext: string): Promise<string> {
  const client = getKMSClient();
  const keyName = getKeyName();

  const plaintextBuffer = Buffer.from(plaintext, 'utf8');

  const [encryptResponse] = await client.encrypt({
    name: keyName,
    plaintext: plaintextBuffer,
  });

  if (!encryptResponse.ciphertext) {
    throw new Error('Failed to encrypt: No ciphertext returned');
  }

  return Buffer.from(encryptResponse.ciphertext).toString('base64');
}

export async function decryptToken(encryptedData: string): Promise<string> {
  const client = getKMSClient();
  const keyName = getKeyName();

  const ciphertextBuffer = Buffer.from(encryptedData, 'base64');

  const [decryptResponse] = await client.decrypt({
    name: keyName,
    ciphertext: ciphertextBuffer,
  });

  if (!decryptResponse.plaintext) {
    throw new Error('Failed to decrypt: No plaintext returned');
  }

  return decryptResponse.plaintext.toString('utf8');
}
