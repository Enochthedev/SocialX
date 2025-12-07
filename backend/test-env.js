const dotenv = require('dotenv');
const path = require('path');

console.log('Current directory:', process.cwd());
console.log('Loading from:', path.join(process.cwd(), '../.env'));

const result = dotenv.config({ path: path.join(process.cwd(), '../.env') });

if (result.error) {
  console.error('Error loading .env:', result.error);
} else {
  console.log('Successfully loaded .env');
}

console.log('OPENROUTER_API_KEY exists:', !!process.env.OPENROUTER_API_KEY);
console.log('TWITTER_API_KEY:', process.env.TWITTER_API_KEY);
console.log('AGENT_USERNAME:', process.env.AGENT_USERNAME);
console.log('POSTGRES_PASSWORD:', process.env.POSTGRES_PASSWORD);
