const crypto = require('crypto');

const payload = {
  "object": "instagram",
  "entry": [
    {
      "id": "17841467249121482",
      "time": 1759906495,
      "messaging": [
        {
          "sender": {
            "id": "720612303820175"
          },
          "recipient": {
            "id": "17841467249121482"
          },
          "timestamp": 1759906495657,
          "message": {
            "mid": "aWdfZAG1faXRlbToxOklHTWVzc2FnZAUlEOjE3ODQxNDY3MjQ5MTIxNDgyOjM0MDI4MjM2Njg0MTcxMDMwMTI0NDI1OTg3MjMyMDc1ODc1MTAxMjozMjQ2NDU0NDcxOTA0NzY1NzA5MjE5NTA5NTE3NTc1NzgyNAZDZD",
            "text": "Hello"
          }
        }
      ]
    }
  ]
};

// Get app secret from command line or use default
const appSecret = process.argv[2] || process.env.INSTAGRAM_APP_SECRET;

if (!appSecret) {
  console.error('Error: Please provide INSTAGRAM_APP_SECRET as argument or environment variable');
  console.log('Usage: node generate-webhook-signature.js YOUR_APP_SECRET');
  process.exit(1);
}

// Note: The signature must match the EXACT bytes sent
// Postman might add/remove whitespace, so test with the debug endpoint first
const payloadString = JSON.stringify(payload);
const signature = crypto.createHmac('sha256', appSecret).update(payloadString).digest('hex');
const fullSignature = `sha256=${signature}`;

console.log('\n=== Instagram Webhook Test Data ===\n');
console.log('URL: http://localhost:3001/api/webhooks/instagram');
console.log('\nHeaders:');
console.log('Content-Type: application/json');
console.log('X-Hub-Signature-256:', fullSignature);
console.log('\nBody (copy exactly, no extra spaces):');
console.log(payloadString);
console.log('\n=== Postman Setup ===\n');
console.log('IMPORTANT: Postman formats JSON with spaces/newlines, which breaks the signature!');
console.log('\nOption 1 (Recommended):');
console.log('1. Send your request to: POST http://localhost:3001/api/webhooks/instagram/debug');
console.log('2. Copy the "expectedSignature" from the response');
console.log('3. Use that in X-Hub-Signature-256 header for the actual webhook');
console.log('\nOption 2:');
console.log('In Postman, go to Body > raw > select JSON, but paste the minified version:');
console.log('Minified body:', payloadString);
console.log('Signature for minified:', fullSignature);
