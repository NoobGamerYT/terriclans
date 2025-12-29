import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // GET all requests
    if (req.method === 'GET') {
      const requests = await kv.get('requests') || [];
      return res.status(200).json(Array.isArray(requests) ? requests : []);
    }
    
    // POST new request
    if (req.method === 'POST') {
      const { clanName, description, leader, memberCount } = req.body;
      
      if (!clanName || !description || !leader) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Get existing requests
      const requests = await kv.get('requests') || [];
      
      // Create new request
      const newRequest = {
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        clanName: clanName.trim(),
        description: description.trim(),
        leader: leader.trim(),
        memberCount: parseInt(memberCount) || 1,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      
      // Add to array
      requests.push(newRequest);
      
      // Save to KV
      await kv.set('requests', requests);
      
      return res.status(200).json({ 
        success: true, 
        request: newRequest,
        message: 'Request added to KV database'
      });
    }
    
    // PATCH update request status (admin only)
    if (req.method === 'PATCH') {
      const { password, id, status } = req.body;
      
      // Verify admin password
      const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
      if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      
      // Get existing requests
      const requests = await kv.get('requests') || [];
      
      // Find and update request
      const requestIndex = requests.findIndex(r => r.id === id);
      if (requestIndex === -1) {
        return res.status(404).json({ error: 'Request not found' });
      }
      
      // Update request
      requests[requestIndex].status = status;
      requests[requestIndex].processedAt = new Date().toISOString();
      
      // Save to KV
      await kv.set('requests', requests);
      
      // If approved, also add to clans
      if (status === 'approved') {
        const approvedRequest = requests[requestIndex];
        
        // Get existing clans
        const clans = await kv.get('clans') || [];
        
        // Create clan from approved request
        const newClan = {
          id: `clan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: approvedRequest.clanName,
          description: approvedRequest.description,
          leader: approvedRequest.leader,
          memberCount: approvedRequest.memberCount,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          approvedFromRequest: approvedRequest.id
        };
        
        // Add to clans
        clans.push(newClan);
        await kv.set('clans', clans);
      }
      
      return res.status(200).json({ 
        success: true, 
        request: requests[requestIndex],
        message: `Request ${status} and updated in KV database`
      });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('KV API Error (requests):', error);
    return res.status(500).json({ 
      error: 'Database error', 
      details: error.message 
    });
  }
}
