import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  try {
    // Test KV connection
    const testKey = 'health_check';
    const testValue = { timestamp: new Date().toISOString() };
    
    await kv.set(testKey, testValue);
    const retrieved = await kv.get(testKey);
    
    // Get counts
    const clans = await kv.get('clans') || [];
    const requests = await kv.get('requests') || [];
    
    return res.status(200).json({
      status: 'healthy',
      kv: {
        connected: true,
        test: retrieved && retrieved.timestamp ? 'OK' : 'FAILED'
      },
      counts: {
        clans: Array.isArray(clans) ? clans.length : 0,
        requests: Array.isArray(requests) ? requests.length : 0
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
