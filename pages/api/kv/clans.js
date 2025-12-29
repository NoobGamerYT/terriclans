import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // GET all clans
    if (req.method === 'GET') {
      const clans = await kv.get('clans') || [];
      return res.status(200).json(Array.isArray(clans) ? clans : []);
    }
    
    // POST new clan (admin only)
    if (req.method === 'POST') {
      const { password, name, description, leader, memberCount } = req.body;
      
      // Verify admin password
      const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
      if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      if (!name || !description || !leader) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Get existing clans
      const clans = await kv.get('clans') || [];
      
      // Create new clan with unique ID
      const newClan = {
        id: `clan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: name.trim(),
        description: description.trim(),
        leader: leader.trim(),
        memberCount: parseInt(memberCount) || 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Add to array
      clans.push(newClan);
      
      // Save to KV
      await kv.set('clans', clans);
      
      return res.status(200).json({ 
        success: true, 
        clan: newClan,
        message: 'Clan added to KV database'
      });
    }
    
    // DELETE clan (admin only)
    if (req.method === 'DELETE') {
      const { password, id } = req.body;
      
      const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
      if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Get existing clans
      const clans = await kv.get('clans') || [];
      
      // Filter out the clan to delete
      const filteredClans = clans.filter(clan => clan.id !== id);
      
      // Save updated list
      await kv.set('clans', filteredClans);
      
      return res.status(200).json({ 
        success: true,
        message: 'Clan deleted from KV database'
      });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('KV API Error (clans):', error);
    return res.status(500).json({ 
      error: 'Database error', 
      details: error.message 
    });
  }
}
