export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { syncAllInstagramData, calculateEngagement } = await import('../../server/services/instagram-graph.js');

    const data = await syncAllInstagramData();
    const engagement = calculateEngagement(data.media);

    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate');
    return res.status(200).json({ profile: data.profile, media: data.media, engagement, insights: data.insights, errors: data.errors });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
