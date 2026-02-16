import { NextResponse } from 'next/server';
import { getRedis, isRedisConnected } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const redis = getRedis();
    const isConnected = isRedisConnected();
    const redisUrl = process.env.REDIS_URL;

    // Parse URL for display (hide password)
    let safeUrl = 'Not configured';
    if (redisUrl) {
      try {
        const urlObj = new URL(redisUrl);
        safeUrl = `${urlObj.protocol}//${urlObj.hostname}:${urlObj.port}${urlObj.pathname}`;
      } catch {
        safeUrl = 'Invalid URL format';
      }
    }

    // Try to set and get a test key
    const testKey = 'redis-health-check';
    const testValue = 'ok-' + Date.now();

    await redis.set(testKey, testValue, 'EX', 10);
    const retrieved = await redis.get(testKey);

    const success = retrieved === testValue;

    return NextResponse.json({
      redis: {
        connected: isConnected,
        testPassed: success,
        configUrl: safeUrl,
        testKey,
        testValue,
        retrieved,
        note: isConnected
          ? '✓ Redis is connected and working'
          : '⚠️ Using fallback (no-op) mode - Redis not connected. Check REDIS_URL and network connectivity.',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Redis health check failed',
        message: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
