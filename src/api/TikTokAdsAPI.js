export default class TikTokAdsAPI {
  constructor({ appSecret, accessToken, advertiserId }) {
    this.appSecret = appSecret || import.meta.env.VITE_TIKTOK_ADS_APP_SECRET;
    this.accessToken = accessToken || import.meta.env.VITE_TIKTOK_ADS_ACCESS_TOKEN;
    this.advertiserId = advertiserId || import.meta.env.VITE_TIKTOK_ADS_ADVERTISER_ID;
    this.baseUrl = 'https://business-api.tiktok.com/open_api/v1.3';
  }

  async _request(method, endpoint, params = {}) {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    const headers = {
      'Access-Token': this.accessToken,
      'Content-Type': 'application/json',
    };

    const options = { method, headers };

    if (params.signal) {
      options.signal = params.signal;
      delete params.signal;
    }

    if (method === 'GET' || method === 'DELETE') {
      const qs = new URLSearchParams({ advertiser_id: this.advertiserId, ...params });
      url.search = qs.toString();
    } else {
      options.body = JSON.stringify({ advertiser_id: this.advertiserId, ...params });
    }

    const response = await fetch(url.toString(), options);
    const data = await response.json();

    if (data.code !== 0) {
      const error = new Error(data.message || 'TikTok Ads API Error');
      error.code = data.code;
      error.message = data.message;
      error.requestId = data.request_id;
      throw error;
    }

    return data.data;
  }

  async fetchAllPages(method, endpoint, params = {}, dataKey = 'list') {
    const allResults = [];
    let page = 1;
    const pageSize = params.page_size || 100;

    while (true) {
      const response = await this._request(method, endpoint, {
        ...params,
        page,
        page_size: pageSize,
      });

      const items = response[dataKey] || [];
      allResults.push(...items);

      const total = response.page_info?.total_number || 0;
      if (allResults.length >= total || items.length === 0) break;
      page++;
    }

    return allResults;
  }

  async fetchCampaigns(dateRange, signal) {
    const { start_date, end_date } = this._formatDateRange(dateRange);

    const campaigns = await this.fetchAllPages('GET', '/campaign/get/', {
      start_date,
      end_date,
      page_size: 100,
      fields: JSON.stringify([
        'campaign_name',
        'operation_status',
        'budget',
        'budget_mode',
        'impressions',
        'clicks',
        'cost',
        'conversion',
        'cpa',
        'roas',
        'spend',
        'campaign_id',
      ]),
      signal,
    });

    return campaigns.map((c) => ({
      campaignId: c.campaign_id,
      name: c.campaign_name,
      status: c.operation_status,
      budget: c.budget,
      budgetMode: c.budget_mode,
      impressions: c.impressions || 0,
      clicks: c.clicks || 0,
      spend: parseFloat(c.cost || c.spend || 0),
      conversions: c.conversion || 0,
      cpa: c.cpa || 0,
      roas: c.roas || 0,
    }));
  }

  async fetchAdGroups(dateRange, campaignId, signal) {
    const { start_date, end_date } = this._formatDateRange(dateRange);
    const params = {
      start_date,
      end_date,
      page_size: 100,
      fields: JSON.stringify([
        'adgroup_name',
        'operation_status',
        'budget',
        'budget_mode',
        'impressions',
        'clicks',
        'cost',
        'conversion',
        'cpa',
        'roas',
        'spend',
        'adgroup_id',
        'campaign_id',
      ]),
      signal,
    };

    if (campaignId) {
      params.campaign_ids = JSON.stringify([campaignId]);
    }

    const adGroups = await this.fetchAllPages('GET', '/adgroup/get/', params);

    return adGroups.map((ag) => ({
      adGroupId: ag.adgroup_id,
      campaignId: ag.campaign_id,
      name: ag.adgroup_name,
      status: ag.operation_status,
      budget: ag.budget,
      budgetMode: ag.budget_mode,
      impressions: ag.impressions || 0,
      clicks: ag.clicks || 0,
      spend: parseFloat(ag.cost || ag.spend || 0),
      conversions: ag.conversion || 0,
      cpa: ag.cpa || 0,
      roas: ag.roas || 0,
    }));
  }

  async fetchAds(dateRange, adGroupId, signal) {
    const { start_date, end_date } = this._formatDateRange(dateRange);
    const params = {
      start_date,
      end_date,
      page_size: 100,
      fields: JSON.stringify([
        'ad_name',
        'operation_status',
        'impressions',
        'clicks',
        'cost',
        'conversion',
        'cpc',
        'cpm',
        'ctr',
        'cvr',
        'spend',
        'ad_id',
        'adgroup_id',
        'campaign_id',
      ]),
      signal,
    };

    if (adGroupId) {
      params.adgroup_ids = JSON.stringify([adGroupId]);
    }

    const ads = await this.fetchAllPages('GET', '/ad/get/', params);

    return ads.map((a) => ({
      adId: a.ad_id,
      adGroupId: a.adgroup_id,
      campaignId: a.campaign_id,
      name: a.ad_name,
      status: a.operation_status,
      impressions: a.impressions || 0,
      clicks: a.clicks || 0,
      spend: parseFloat(a.cost || a.spend || 0),
      conversions: a.conversion || 0,
      cpc: a.cpc || 0,
      cpm: a.cpm || 0,
      ctr: a.ctr || 0,
      cvr: a.cvr || 0,
    }));
  }

  async fetchDailyStats(dateRange, signal) {
    const { start_date, end_date } = this._formatDateRange(dateRange);

    const stats = await this._request('GET', '/report/integrated/get/', {
      start_date,
      end_date,
      report_type: 'BASIC',
      dimensions: JSON.stringify(['STAT_GROUP_BY_TIME']),
      metrics: JSON.stringify([
        'spend',
        'impressions',
        'clicks',
        'conversion',
        'cpc',
        'cpm',
        'ctr',
        'cpa',
      ]),
      page_size: 100,
      signal,
    });

    const rows = stats?.list || [];

    return rows.map((row) => {
      const dims = row.dimensions || {};
      const mets = row.metrics || {};
      return {
        date: dims.stat_time_by_day || dims.STAT_GROUP_BY_TIME,
        spend: parseFloat(mets.spend || 0),
        impressions: parseInt(mets.impressions || 0, 10),
        clicks: parseInt(mets.clicks || 0, 10),
        conversions: parseInt(mets.conversion || 0, 10),
        cpc: parseFloat(mets.cpc || 0),
        cpm: parseFloat(mets.cpm || 0),
        ctr: parseFloat(mets.ctr || 0),
        cpa: parseFloat(mets.cpa || 0),
      };
    });
  }

  async fetchAudienceInsights(dateRange, signal) {
    const { start_date, end_date } = this._formatDateRange(dateRange);

    const ageData = await this._request('GET', '/report/integrated/get/', {
      start_date,
      end_date,
      report_type: 'BASIC',
      dimensions: JSON.stringify(['AGE']),
      metrics: JSON.stringify(['spend', 'impressions', 'clicks', 'conversion']),
      page_size: 100,
      signal,
    });

    const genderData = await this._request('GET', '/report/integrated/get/', {
      start_date,
      end_date,
      report_type: 'BASIC',
      dimensions: JSON.stringify(['GENDER']),
      metrics: JSON.stringify(['spend', 'impressions', 'clicks', 'conversion']),
      page_size: 100,
      signal,
    });

    const ageBreakdown = (ageData?.list || []).map((row) => ({
      ageGroup: row.dimensions?.age || row.dimensions?.AGE,
      spend: parseFloat(row.metrics?.spend || 0),
      impressions: parseInt(row.metrics?.impressions || 0, 10),
      clicks: parseInt(row.metrics?.clicks || 0, 10),
      conversions: parseInt(row.metrics?.conversion || 0, 10),
    }));

    const genderBreakdown = (genderData?.list || []).map((row) => ({
      gender: row.dimensions?.gender || row.dimensions?.GENDER,
      spend: parseFloat(row.metrics?.spend || 0),
      impressions: parseInt(row.metrics?.impressions || 0, 10),
      clicks: parseInt(row.metrics?.clicks || 0, 10),
      conversions: parseInt(row.metrics?.conversion || 0, 10),
    }));

    return { age: ageBreakdown, gender: genderBreakdown };
  }

  async fetchPixelEvents(signal) {
    const data = await this._request('GET', '/pixel/list/', {
      advertiser_id: this.advertiserId,
      signal,
    });

    const pixels = data?.list || [];

    return pixels.map((p) => ({
      pixelId: p.pixel_id,
      name: p.name,
      status: p.status,
      events: (p.events || []).map((e) => ({
        eventId: e.event_id,
        eventName: e.event_name,
        eventType: e.event_type,
      })),
    }));
  }

  async getReport(reportType, dateRange, dimensions, metrics, signal) {
    const { start_date, end_date } = this._formatDateRange(dateRange);

    const data = await this._request('GET', '/report/integrated/get/', {
      report_type: reportType,
      start_date,
      end_date,
      dimensions: JSON.stringify(dimensions),
      metrics: JSON.stringify(metrics),
      page_size: 100,
      signal,
    });

    return (data?.list || []).map((row) => ({
      dimensions: row.dimensions,
      metrics: row.metrics,
    }));
  }

  _formatDateRange(dateRange) {
    if (typeof dateRange === 'string') {
      return { start_date: dateRange, end_date: dateRange };
    }
    return {
      start_date: dateRange.startDate || dateRange.start_date || dateRange.from,
      end_date: dateRange.endDate || dateRange.end_date || dateRange.to,
    };
  }
}
