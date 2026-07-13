export default class GoogleAdsAPI {
  constructor({ clientId, clientSecret, refreshToken, developerToken, customerId } = {}) {
    this.clientId = clientId || import.meta.env.VITE_GOOGLE_ADS_CLIENT_ID || '';
    this.clientSecret = clientSecret || import.meta.env.VITE_GOOGLE_ADS_CLIENT_SECRET || '';
    this.refreshToken = refreshToken || import.meta.env.VITE_GOOGLE_ADS_REFRESH_TOKEN || '';
    this.developerToken = developerToken || import.meta.env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN || '';
    this.customerId = customerId || import.meta.env.VITE_GOOGLE_ADS_CUSTOMER_ID || '';
    this.accessToken = null;
    this.tokenExpiry = 0;
  }

  async _getAccessToken() {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!this.clientId || !this.clientSecret || !this.refreshToken) {
      throw new Error('Missing OAuth2 credentials: clientId, clientSecret, and refreshToken are required');
    }

    const res = await fetch('/gapi-oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Google OAuth2 token refresh failed: ${detail}`);
    }

    const data = await res.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return this.accessToken;
  }

  async search(query, { signal } = {}) {
    if (!this.customerId) {
      throw new Error('Missing Google Ads customer ID');
    }

    const accessToken = await this._getAccessToken();
    const url = `/gapi-ads/v18/customers/${this.customerId}/googleAds:search`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': this.developerToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
      signal,
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Google Ads API search failed: ${detail}`);
    }

    const data = await res.json();
    return data.results || [];
  }

  _parseDateRange(dateRange) {
    if (!dateRange) {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      return {
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
      };
    }
    if (dateRange.startDate && dateRange.endDate) {
      return { startDate: dateRange.startDate, endDate: dateRange.endDate };
    }
    if (dateRange.startDate) {
      return { startDate: dateRange.startDate, endDate: new Date().toISOString().slice(0, 10) };
    }
    return { startDate: '2024-01-01', endDate: '2024-01-31' };
  }

  async fetchCampaigns(dateRange, { signal } = {}) {
    const { startDate, endDate } = this._parseDateRange(dateRange);
    const query = [
      'SELECT campaign.id,',
      'campaign.name,',
      'campaign.status,',
      'metrics.impressions,',
      'metrics.clicks,',
      'metrics.cost_micros,',
      'metrics.conversions,',
      'metrics.conversions_value,',
      'metrics.cost_per_conversion,',
      'metrics.ctr,',
      'metrics.average_cpc',
      'FROM campaign',
      `WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'`,
      'AND campaign.status != \'REMOVED\'',
      'ORDER BY metrics.cost_micros DESC',
    ].join(' ');

    try {
      const results = await this.search(query, { signal });
      return results.map(r => {
        const m = r.metrics || {};
        const costMicros = parseInt(m.costMicros || '0', 10);
        const cost = costMicros / 1_000_000;
        const conversions = parseFloat(m.conversions || '0');
        const conversionValue = parseFloat(m.conversionsValue || '0');
        return {
          campaignId: r.campaign?.id,
          campaignName: r.campaign?.name,
          status: r.campaign?.status,
          impressions: parseInt(m.impressions || '0', 10),
          clicks: parseInt(m.clicks || '0', 10),
          cost,
          conversions,
          conversionValue,
          roas: cost > 0 ? conversionValue / cost : 0,
          ctr: parseFloat(m.ctr || '0'),
          averageCpc: parseInt(m.averageCpc || '0', 10) / 1_000_000,
        };
      });
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching Google Ads campaigns:', error);
      }
      throw error;
    }
  }

  async fetchAdGroups(dateRange, campaignId, { signal } = {}) {
    const { startDate, endDate } = this._parseDateRange(dateRange);
    const campaignFilter = campaignId ? `AND campaign.id = ${campaignId}` : '';
    const query = [
      'SELECT campaign.id,',
      'campaign.name,',
      'ad_group.id,',
      'ad_group.name,',
      'ad_group.status,',
      'metrics.impressions,',
      'metrics.clicks,',
      'metrics.cost_micros,',
      'metrics.conversions,',
      'metrics.conversions_value,',
      'metrics.ctr,',
      'metrics.average_cpc',
      'FROM ad_group',
      `WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'`,
      `AND ad_group.status != 'REMOVED'`,
      campaignFilter,
      'ORDER BY metrics.cost_micros DESC',
    ].filter(Boolean).join(' ');

    try {
      const results = await this.search(query, { signal });
      return results.map(r => {
        const m = r.metrics || {};
        const costMicros = parseInt(m.costMicros || '0', 10);
        const cost = costMicros / 1_000_000;
        const conversions = parseFloat(m.conversions || '0');
        const conversionValue = parseFloat(m.conversionsValue || '0');
        return {
          campaignId: r.campaign?.id,
          campaignName: r.campaign?.name,
          adGroupId: r.adGroup?.id,
          adGroupName: r.adGroup?.name,
          status: r.adGroup?.status,
          impressions: parseInt(m.impressions || '0', 10),
          clicks: parseInt(m.clicks || '0', 10),
          cost,
          conversions,
          conversionValue,
          roas: cost > 0 ? conversionValue / cost : 0,
          ctr: parseFloat(m.ctr || '0'),
          averageCpc: parseInt(m.averageCpc || '0', 10) / 1_000_000,
        };
      });
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching Google Ads ad groups:', error);
      }
      throw error;
    }
  }

  async fetchKeywords(dateRange, adGroupId, { signal } = {}) {
    const { startDate, endDate } = this._parseDateRange(dateRange);
    const adGroupFilter = adGroupId ? `AND ad_group.id = ${adGroupId}` : '';
    const query = [
      'SELECT campaign.id,',
      'campaign.name,',
      'ad_group.id,',
      'ad_group.name,',
      'ad_group_criterion.keyword.text,',
      'ad_group_criterion.keyword.match_type,',
      'ad_group_criterion.status,',
      'metrics.impressions,',
      'metrics.clicks,',
      'metrics.cost_micros,',
      'metrics.conversions,',
      'metrics.conversions_value,',
      'metrics.average_cpc,',
      'metrics.ctr',
      'FROM keyword_view',
      `WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'`,
      `AND ad_group_criterion.status != 'REMOVED'`,
      adGroupFilter,
      'ORDER BY metrics.cost_micros DESC',
    ].filter(Boolean).join(' ');

    try {
      const results = await this.search(query, { signal });
      return results.map(r => {
        const m = r.metrics || {};
        const costMicros = parseInt(m.costMicros || '0', 10);
        const cost = costMicros / 1_000_000;
        return {
          campaignId: r.campaign?.id,
          campaignName: r.campaign?.name,
          adGroupId: r.adGroup?.id,
          adGroupName: r.adGroup?.name,
          keyword: r.adGroupCriterion?.keyword?.text,
          matchType: r.adGroupCriterion?.keyword?.matchType,
          status: r.adGroupCriterion?.status,
          impressions: parseInt(m.impressions || '0', 10),
          clicks: parseInt(m.clicks || '0', 10),
          cost,
          cpc: parseInt(m.averageCpc || '0', 10) / 1_000_000,
          conversions: parseFloat(m.conversions || '0'),
          conversionValue: parseFloat(m.conversionsValue || '0'),
          ctr: parseFloat(m.ctr || '0'),
        };
      });
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching Google Ads keywords:', error);
      }
      throw error;
    }
  }

  async fetchDailyStats(dateRange, { signal } = {}) {
    const { startDate, endDate } = this._parseDateRange(dateRange);
    const query = [
      'SELECT segments.date,',
      'metrics.impressions,',
      'metrics.clicks,',
      'metrics.cost_micros,',
      'metrics.conversions,',
      'metrics.conversions_value',
      'FROM campaign',
      `WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'`,
      'AND campaign.status != \'REMOVED\'',
      'ORDER BY segments.date ASC',
    ].join(' ');

    try {
      const results = await this.search(query, { signal });
      const dailyMap = {};

      for (const r of results) {
        const date = r.segments?.date;
        if (!date) continue;
        const m = r.metrics || {};
        const costMicros = parseInt(m.costMicros || '0', 10);
        const cost = costMicros / 1_000_000;

        if (!dailyMap[date]) {
          dailyMap[date] = {
            date,
            impressions: 0,
            clicks: 0,
            cost: 0,
            conversions: 0,
            conversionValue: 0,
          };
        }

        dailyMap[date].impressions += parseInt(m.impressions || '0', 10);
        dailyMap[date].clicks += parseInt(m.clicks || '0', 10);
        dailyMap[date].cost += cost;
        dailyMap[date].conversions += parseFloat(m.conversions || '0');
        dailyMap[date].conversionValue += parseFloat(m.conversionsValue || '0');
      }

      return Object.values(dailyMap).map(d => ({
        ...d,
        cpc: d.clicks > 0 ? d.cost / d.clicks : 0,
        cpa: d.conversions > 0 ? d.cost / d.conversions : 0,
        roas: d.cost > 0 ? d.conversionValue / d.cost : 0,
      }));
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching Google Ads daily stats:', error);
      }
      throw error;
    }
  }

  async fetchConversionActions({ signal } = {}) {
    if (!this.customerId) {
      throw new Error('Missing Google Ads customer ID');
    }

    const query = [
      'SELECT conversion_action.id,',
      'conversion_action.name,',
      'conversion_action.type,',
      'conversion_action.status,',
      'conversion_action.category,',
      'conversion_action.tag_snippets,',
      'conversion_action.include_in_conversions_metric,',
      'conversion_action.counting_type',
      'FROM conversion_action',
      'ORDER BY conversion_action.name ASC',
    ].join(' ');

    try {
      const results = await this.search(query, { signal });
      return results.map(r => ({
        id: r.conversionAction?.id,
        name: r.conversionAction?.name,
        type: r.conversionAction?.type,
        status: r.conversionAction?.status,
        category: r.conversionAction?.category,
        tagSnippets: r.conversionAction?.tagSnippets || [],
        includeInConversionsMetric: r.conversionAction?.includeInConversionsMetric,
        countingType: r.conversionAction?.countingType,
      }));
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching Google Ads conversion actions:', error);
      }
      throw error;
    }
  }
}
