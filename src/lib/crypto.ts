import { KeyManagementServiceClient } from '@google-cloud/kms';
import { env } from '@/config/env';

let kmsClient: KeyManagementServiceClient | null = null;

function getKMSClient(): KeyManagementServiceClient {
  if (!kmsClient) {
    // Handle both literal \n and actual newlines in private key
    // Also handle double-escaped \\n from Coolify
    let privateKey = env.GOOGLE_PRIVATE_KEY;

    console.log('\n=== DEBUG: Google KMS Private Key ===');
    console.log('Original from Coolify (first 100 chars):', privateKey.substring(0, 100));
    console.log('Contains \\n:', privateKey.includes('\\n'));

    // Replace any number of backslashes followed by 'n' with actual newline
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\+n/g, '\n');
    }

    // Remove any trailing backslashes
    privateKey = privateKey.replace(/\\+$/g, '');

    console.log('After transformation (first 100 chars):', privateKey.substring(0, 100));
    console.log('Starts with BEGIN:', privateKey.startsWith('-----BEGIN PRIVATE KEY-----'));
    console.log('Ends with END:', privateKey.endsWith('-----END PRIVATE KEY-----'));
    console.log('=== END DEBUG ===\n');

    kmsClient = new KeyManagementServiceClient({
      projectId: env.GOOGLE_PROJECT_ID,
      credentials: {
        client_email: env.GOOGLE_CLIENT_EMAIL,
        private_key: privateKey,
      },
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
