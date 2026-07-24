/**
 * @file instagram-graph.js
 * @description Instagram Graph API connector for APES Marketing 360°
 * @author ANTIGRAVITY / ONYX v21.0
 *
 * Uses long-lived Page Access Token via INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_USER_ID
 */

const IG_API_VERSION = 'v19.0';
const IG_BASE_URL = `https://graph.facebook.com/${IG_API_VERSION}`;

/**
 * Fetch Instagram Business Profile summary (followers, media count)
 */
export async function getProfileSummary() {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const userId = process.env.INSTAGRAM_USER_ID;
  if (!accessToken || !userId) throw new Error('Missing INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_USER_ID');

  const res = await fetch(
    `${IG_BASE_URL}/${userId}?fields=followers_count,media_count,name,username,biography&access_token=${accessToken}`
  );
  if (!res.ok) throw new Error(`Instagram Profile API ${res.status}: ${await res.text()}`);
  return res.json();
}

/**
 * Fetch recent media with engagement metrics (likes, comments, reach)
 */
export async function getRecentMedia(limit = 25) {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const userId = process.env.INSTAGRAM_USER_ID;
  if (!accessToken || !userId) throw new Error('Missing INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_USER_ID');

  const fields = ['id', 'caption', 'media_type', 'media_url', 'like_count', 'comments_count', 'timestamp', 'permalink'].join(',');
  const res = await fetch(
    `${IG_BASE_URL}/${userId}/media?fields=${fields}&limit=${limit}&access_token=${accessToken}`
  );
  if (!res.ok) throw new Error(`Instagram Media API ${res.status}: ${await res.text()}`);
  return res.json();
}

/**
 * Fetch Story Insights for last 24h
 */
export async function getStoryInsights(mediaId) {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!accessToken || !mediaId) return null;

  const res = await fetch(
    `${IG_BASE_URL}/${mediaId}/insights?metric=impressions,reach,exits,reply&access_token=${accessToken}`
  );
  if (!res.ok) return null;
  return res.json();
}

/**
 * Fetch Account Insights (reach, impressions, profile views over period)
 */
export async function getAccountInsights(period = 'day', since = null, until = null) {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const userId = process.env.INSTAGRAM_USER_ID;
  if (!accessToken || !userId) return null;

  const sinceDate = since || Math.floor((Date.now() - 30 * 86400000) / 1000);
  const untilDate = until || Math.floor(Date.now() / 1000);

  const metrics = 'impressions,reach,profile_views,website_clicks';
  const res = await fetch(
    `${IG_BASE_URL}/${userId}/insights?metric=${metrics}&period=${period}&since=${sinceDate}&until=${untilDate}&access_token=${accessToken}`
  );
  if (!res.ok) return null;
  return res.json();
}

/**
 * Full sync: collect all Instagram data
 */
export async function syncAllInstagramData() {
  const results = { profile: null, media: [], insights: null, errors: {} };

  try {
    results.profile = await getProfileSummary();
  } catch (e) {
    results.errors.profile = e.message;
  }

  try {
    const mediaData = await getRecentMedia(25);
    results.media = mediaData.data || [];
  } catch (e) {
    results.errors.media = e.message;
  }

  try {
    results.insights = await getAccountInsights();
  } catch (e) {
    results.errors.insights = e.message;
  }

  return results;
}

/**
 * Calculate aggregate engagement stats from media array
 */
export function calculateEngagement(media) {
  if (!media || media.length === 0) {
    return { total_likes: 0, total_comments: 0, avg_engagement_rate: 0, total_posts: 0 };
  }

  const totalLikes = media.reduce((s, m) => s + (m.like_count || 0), 0);
  const totalComments = media.reduce((s, m) => s + (m.comments_count || 0), 0);
  const avgEngagement = totalLikes + totalComments;

  return {
    total_likes: totalLikes,
    total_comments: totalComments,
    total_engagement: avgEngagement,
    total_posts: media.length,
    avg_likes_per_post: Math.round(totalLikes / media.length),
    avg_comments_per_post: Math.round(totalComments / media.length),
  };
}
