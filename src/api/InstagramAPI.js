// Instagram Graph API — crecimiento de seguidores real.
// Usa el MISMO access token de Meta (meta_access_token) siempre que ese
// token tenga los permisos instagram_basic + instagram_manage_insights.
// Si el token fue generado solo para Ads, puede que falte pedir esos
// permisos de nuevo en Meta Business Suite.

export class InstagramAPI {
  constructor(igBusinessAccountId, accessToken) {
    this.igId = igBusinessAccountId ? String(igBusinessAccountId).trim() : '';
    this.accessToken = accessToken ? accessToken.trim() : '';
    this.version = 'v22.0'; // OJO: Meta deprecó 'impressions'/'profile_views'/'website_clicks' desde v22.0
    this.baseUrl = `https://graph.facebook.com/${this.version}`;
  }

  get isConfigured() {
    return !!(this.igId && this.accessToken);
  }

  async testConnection() {
    try {
      const url = `${this.baseUrl}/${this.igId}?fields=username,followers_count&access_token=${this.accessToken}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      return { success: true, data };
    } catch (e) {
      return { success: false, error: { message: e.message } };
    }
  }

  /**
   * Trae una serie diaria (time_series) para las métricas de cuenta vigentes
   * en v22.0: alcance, cuentas alcanzadas, interacciones totales y vistas.
   * follower_count se pide aparte porque Instagram lo sirve con period=day
   * pero SIN metric_type=time_series (es un caso especial de la API).
   */
  async getDetailedInsights(startDate, endDate) {
    if (!this.isConfigured) {
      throw new Error('Falta configurar el ID de cuenta de Instagram Business o el token de acceso.');
    }

    const since = Math.floor(new Date(startDate).getTime() / 1000);
    const until = Math.floor(new Date(endDate).getTime() / 1000);

    // 1) Perfil actual
    const profileUrl = `${this.baseUrl}/${this.igId}?fields=username,followers_count,media_count&access_token=${this.accessToken}`;
    const profileRes = await fetch(profileUrl);
    const profileData = await profileRes.json();
    if (!profileRes.ok) {
      throw new Error(profileData.error?.message || 'Error consultando el perfil de Instagram.');
    }

    // 2) Métricas de cuenta con serie diaria (reach, accounts_engaged, total_interactions, views)
    const seriesMetrics = 'reach,accounts_engaged,total_interactions,views';
    const seriesUrl = `${this.baseUrl}/${this.igId}/insights?metric=${seriesMetrics}&period=day&metric_type=time_series&since=${since}&until=${until}&access_token=${this.accessToken}`;
    const seriesRes = await fetch(seriesUrl);
    const seriesData = await seriesRes.json();

    const parsed = {};
    if (seriesRes.ok) {
      (seriesData.data || []).forEach(metric => {
        parsed[metric.name] = (metric.values || []).map(v => ({ date: v.end_time?.slice(0, 10), value: v.value }));
      });
    } else {
      console.warn('[Instagram] Error trayendo métricas de cuenta:', seriesData.error?.message);
    }

    // 3) Seguidores día a día (endpoint separado, sin metric_type=time_series)
    const followersUrl = `${this.baseUrl}/${this.igId}/insights?metric=follower_count&period=day&since=${since}&until=${until}&access_token=${this.accessToken}`;
    const followersRes = await fetch(followersUrl);
    const followersData = await followersRes.json();
    let followerSeries = [];
    if (followersRes.ok) {
      followerSeries = (followersData?.data?.[0]?.values || []).map(v => ({ date: v.end_time?.slice(0, 10), value: v.value }));
    } else {
      console.warn('[Instagram] Error trayendo follower_count:', followersData.error?.message);
    }

    const sumSeries = (arr) => (arr || []).reduce((s, p) => s + (p.value || 0), 0);
    const deltaOf = (arr) => {
      if (!arr || arr.length < 2) return 0;
      const first = arr[0].value || 0;
      const last = arr[arr.length - 1].value || 0;
      return first > 0 ? ((last - first) / first) * 100 : (last > 0 ? 100 : 0);
    };

    return {
      username: profileData.username,
      followersCount: profileData.followers_count,
      mediaCount: profileData.media_count,
      followerSeries,
      followerDeltaPct: deltaOf(followerSeries),
      metrics: {
        reach: { series: parsed.reach || [], total: sumSeries(parsed.reach), deltaPct: deltaOf(parsed.reach) },
        accountsEngaged: { series: parsed.accounts_engaged || [], total: sumSeries(parsed.accounts_engaged), deltaPct: deltaOf(parsed.accounts_engaged) },
        totalInteractions: { series: parsed.total_interactions || [], total: sumSeries(parsed.total_interactions), deltaPct: deltaOf(parsed.total_interactions) },
        views: { series: parsed.views || [], total: sumSeries(parsed.views), deltaPct: deltaOf(parsed.views) },
      },
    };
  }

  /**
   * Versión simple (legacy, solo crecimiento de seguidores) — se mantiene
   * por compatibilidad con lo que ya estaba integrado.
   */
  async getGrowthInsights(startDate, endDate) {
    const detailed = await this.getDetailedInsights(startDate, endDate);
    const series = detailed.followerSeries.map(p => ({ date: p.date, followers: p.value }));
    const first = series[0]?.followers;
    const last = series[series.length - 1]?.followers ?? detailed.followersCount;
    const growth = first ? last - first : 0;
    return {
      username: detailed.username,
      followersCount: detailed.followersCount,
      mediaCount: detailed.mediaCount,
      series,
      growth,
      growthPct: detailed.followerDeltaPct,
    };
  }
}
