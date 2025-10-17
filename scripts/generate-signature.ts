import 'dotenv/config';
import { generateMetaWebhookSignature } from '../src/utils/signature.util';

// ============================================================================
// CONFIGURE YOUR INSTAGRAM IDS HERE:
// ============================================================================
// You can set these via environment variables or edit directly below
//
// To use env vars:
// YOUR_IG_BUSINESS_ACCOUNT_ID=123 SENDER_IG_USER_ID=456 MESSAGE_TEXT="Hello" yarn generate:signature

const YOUR_IG_BUSINESS_ACCOUNT_ID = process.env.YOUR_IG_BUSINESS_ACCOUNT_ID || 'REPLACE_WITH_YOUR_IG_ACCOUNT_ID';
const SENDER_IG_USER_ID = process.env.SENDER_IG_USER_ID || 'REPLACE_WITH_SENDER_ID';
const MESSAGE_TEXT = process.env.MESSAGE_TEXT || 'What services do you offer?';

// ============================================================================

// Your webhook payload - paste the exact JSON you'll send in Postman
const payload = {
  "object": "instagram",
  "entry": [
    {
      "time": 1720485326181,
      "id": "17841467478201709",
      "messaging": [
        {
          "sender": {
            "id": "720612303820175"
          },
          "recipient": {
            "id": "17841467249121482"
          },
          "timestamp": 1720485324614,
          "message": {
            "mid": "aWdfZAG1faXRlbToxOklHTWVzc2FnZAUlEOjE3ODQxNDY3NDc4MjAxNzA5OjM0MDI4MjM2Njg0MTcxMDMwMTI0NDI1OTYwNjQ2NjI5NTMzNjQ2MTozMTczNzM1MjQ2NTc0NDk1MzkzNDg2NzY1NjM4MzM5Nzg4OAZDZD",
            "text": "Hello"
          }
        }
      ]
    }
  ]
}

// Convert payload to JSON string (exactly as it will be sent)
const rawBody = JSON.stringify(payload);
const bodyBuffer = Buffer.from(rawBody, 'utf-8');

// Generate signature using INSTAGRAM_APP_SECRET from .env
const appSecret = process.env.INSTAGRAM_APP_SECRET;

if (!appSecret) {
  console.error('❌ Error: INSTAGRAM_APP_SECRET not found in .env file');
  process.exit(1);
}

const signature = generateMetaWebhookSignature(bodyBuffer, appSecret);

console.log('\n📋 Copy this for Postman:\n');
console.log('='.repeat(60));
console.log('\n1. Header Name:');
console.log('   X-Hub-Signature-256');
console.log('\n2. Header Value:');
console.log('   ' + signature);
console.log('\n3. Request Body (raw JSON - NO SPACES, COMPACT):');
console.log(rawBody);
console.log('\n4. Request Body (formatted for readability):');
console.log(JSON.stringify(payload, null, 2));
console.log('\n' + '='.repeat(60));
console.log('\n⚠️  IMPORTANT: In Postman, use the COMPACT version (step 3) or');
console.log('   paste the formatted version and then click "Beautify" to ensure');
console.log('   the exact same formatting!\n');
