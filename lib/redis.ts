import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: 'https://innocent-osprey-55846.upstash.io',
  token: process.env.REDIS_KEY!,
});

