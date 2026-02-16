import { NextResponse } from 'next/server';
import { getRedis, isRedisConnected } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const redis = getRedis();
    const isConnected = isRedisConnected();

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
        testKey,
        testValue,
        retrieved,
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
