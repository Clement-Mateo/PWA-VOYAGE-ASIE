async function handler(req, res) {
  // Activer CORS plus spécifique
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  try {
    const { query } = req.query;
    
    if (!query || query.trim().length < 3) {
      return res.status(400).json({ error: 'Query too short' });
    }
    
    // Debug : vérifier les variables d'environnement
    console.log('=== FUNCTION CALLED ===');
    console.log('Query:', query);
    console.log('Environment variables:', Object.keys(process.env));
    console.log('API Key exists:', !!process.env.GOOGLE_API_KEY);
    console.log('API Key length:', process.env.GOOGLE_API_KEY?.length);
    
    // Utiliser la variable d'environnement Vercel
    const apiKey = process.env.GOOGLE_API_KEY || process.env.google_api_key || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    if (!apiKey) {
      console.error('API Key not found in environment');
      return res.status(500).json({ 
        error: 'API key not configured',
        debug: {
          hasEnv: !!process.env.GOOGLE_API_KEY,
          envKeys: Object.keys(process.env).filter(k => k.includes('API'))
        }
      });
    }
    
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
    console.log('Calling URL:', url.replace(apiKey, 'API_KEY_HIDDEN'));
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('API Response status:', data.status);
    console.log('=== END FUNCTION ===');
    
    res.status(200).json(data);
    
  } catch (error) {
    console.error('Places API Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

export default handler;
