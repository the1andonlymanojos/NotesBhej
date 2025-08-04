import Redis from "ioredis";

// Create Redis client with proper configuration
const client = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

// Handle connection events
client.on('connect', () => {
  console.log('Redis client connected');
});

client.on('error', (err) => {
  console.error('Redis client error:', err);
});

client.on('close', () => {
  console.log('Redis client connection closed');
});

export default client;