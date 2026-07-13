/**
 * Meta Ad Library API Service
 * 
 * Provides access to Meta's Ad Library API for competitor intelligence.
 * Note: Requires Meta Developer App with Ad Library API access.
 * 
 * Documentation: https://developers.facebook.com/docs/marketing-api/ad-library
 */

class MetaAdLibraryAPI {
  constructor(accessToken, appId, appSecret) {
    if (!accessToken) {
      throw new Error('MetaAdLibraryAPI: accessToken is required');
    }
    this.accessToken = accessToken;
    this.appId = appId;
    this.appSecret = appSecret;
    this.baseUrl = 'https://graph.facebook.com/v19.0';
  }

  // ─── Core Request Helper ───────────────────────────────────────────

  async _request(endpoint, params = {}) {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.append('access_token', this.accessToken);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    try {
      const response = await fetch(url.toString());
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`Meta Ad Library API Error: ${data.error?.message || response.statusText}`);
      }
      
      return { success: true, data };
    } catch (err) {
      console.error('MetaAdLibraryAPI request failed:', err);
      return { success: false, error: err.message };
    }
  }

  // ─── Ad Search ────────────────────────────────────────────────────

  /**
   * Search ads by keyword, page, or advertiser
   * @param {Object} options
   * @param {string} [options.searchTerm] - Keyword to search in ad copy
   * @param {string} [options.pageId] - Facebook Page ID
   * @param {string} [options.advertiserId] - Advertiser ID
   * @param {string} [options.country] - Country code (e.g., 'CO', 'US')
   * @param {string} [options.adType] - 'POLITICAL_AND_ISSUE_ADS' | 'ALL'
   * @param {string} [options.startDate] - YYYY-MM-DD
   * @param {string} [options.endDate] - YYYY-MM-DD
   * @param {number} [options.limit=100] - Results per page
   * @param {string} [options.after] - Pagination cursor
   */
  async searchAds(options = {}) {
    const {
      searchTerm,
      pageId,
      advertiserId,
      country = 'CO',
      adType = 'ALL',
      startDate,
      endDate,
      limit = 100,
      after,
    } = options;

    const params = {
      ad_reached_countries: `['${country}']`,
      ad_type: adType,
      limit,
      fields: 'id,ad_creative_body,ad_creative_link_caption,ad_creative_link_title,ad_creative_link_description,ad_delivery_start_time,ad_delivery_stop_time,ad_snapshot_url,currency,spend,impressions,page_id,page_name',
    };

    if (searchTerm) params.search_terms = searchTerm;
    if (pageId) params.search_page_ids = `['${pageId}']`;
    if (advertiserId) params.advertiser_ids = `['${advertiserId}']`;
    if (startDate) params.ad_delivery_date_min = startDate;
    if (endDate) params.ad_delivery_date_max = endDate;
    if (after) params.after = after;

    return this._request('/ads_archive', params);
  }

  /**
   * Get all ads for a specific page (competitor)
   */
  async getPageAds(pageId, options = {}) {
    return this.searchAds({ pageId, ...options });
  }

  /**
   * Get all ads by advertiser ID
   */
  async getAdvertiserAds(advertiserId, options = {}) {
    return this.searchAds({ advertiserId, ...options });
  }

  /**
   * Search ads by keyword across all advertisers
   */
  async searchByKeyword(keyword, options = {}) {
    return this.searchAds({ searchTerm: keyword, ...options });
  }

  // ─── Page/Advertiser Info ────────────────────────────────────────

  /**
   * Get page info by page info from Ad Library
   */
  async getPageInfo(pageId) {
    return this._request(`/${pageId}`, {
      fields: 'id,name,fan_count,category,category_list,website,instagram_handle,verification_status'
    });
  }

  /**
   * Search pages by name (for finding competitor pages)
   */
  async searchPages(query, country = 'CO') {
    return this._request('/search', {
      q: query,
      type: 'page',
      limit: 20,
      fields: 'id,name,fan_count,category,category_list,website,instagram_handle'
    });
  }

  // ─── Creative Analysis ───────────────────────────────────────────

  /**
   * Get detailed creative info for an ad
   */
  async getAdCreative(adId) {
    return this._request(`/${adId}`, {
      fields: 'id,ad_creative_body,ad_creative_link_caption,ad_creative_link_title,ad_creative_link_description,ad_creative_media,ad_delivery_start_time,ad_delivery_stop_time,ad_snapshot_url,currency,spend,impressions,page_id,page_name,ad_delivery_by_region,demographic_distribution'
    });
  }

  /**
   * Analyze competitor ad strategy
   */
  async analyzeCompetitorStrategy(pageId, options = {}) {
    const { startDate, endDate, limit = 500 } = options;
    
    const result = await this.searchAds({
      pageId,
      startDate,
      endDate,
      limit,
    });

    if (!result.success) return result;

    const ads = result.data.data || [];
    
    // Analyze ad patterns
    const analysis = {
      totalAds: ads.length,
      activeAds: ads.filter(a => !a.ad_delivery_stop_time).length,
      pausedAds: ads.filter(a => a.ad_delivery_stop_time).length,
      dateRange: { start: startDate, end: endDate },
      creatives: [],
      hooks: [],
      ctas: [],
      mediaTypes: {},
      spendEstimate: 0,
      impressionsEstimate: 0,
      frequency: {},
      messaging: {
        commonWords: {},
        avgBodyLength: 0,
        avgTitleLength: 0,
      },
    };

    ads.forEach(ad => {
      // Creative analysis
      if (ad.ad_creative_body) {
        analysis.hooks.push(ad.ad_creative_body.substring(0, 100));
        analysis.messaging.avgBodyLength += ad.ad_creative_body.length;
        // Extract common words
        const words = ad.ad_creative_body.toLowerCase().match(/\b\w{4,}\b/g) || [];
        words.forEach(w => analysis.messaging.commonWords[w] = (analysis.messaging.commonWords[w] || 0) + 1);
      }
      if (ad.ad_creative_link_title) {
        analysis.ctas.push(ad.ad_creative_link_title);
        analysis.messaging.avgTitleLength += ad.ad_creative_link_title.length;
      }
      
      // Media type
      if (ad.ad_creative_media) {
        const type = ad.ad_creative_media.type || 'unknown';
        analysis.mediaTypes[type] = (analysis.mediaTypes[type] || 0) + 1;
      }
      
      // Spend & impressions
      if (ad.spend) analysis.spendEstimate += parseFloat(ad.spend.upper_bound || ad.spend.lower_bound || 0);
      if (ad.impressions) analysis.impressionsEstimate += parseFloat(ad.impressions.upper_bound || ad.impressions.lower_bound || 0);
      
      // Delivery timeline
      if (ad.ad_delivery_start_time) {
        const month = ad.ad_delivery_start_time.substring(0, 7);
        analysis.frequency[month] = (analysis.frequency[month] || 0) + 1;
      }
    });

    analysis.messaging.avgBodyLength = ads.length ? Math.round(analysis.messaging.avgBodyLength / ads.length) : 0;
    analysis.messaging.avgTitleLength = ads.length ? Math.round(analysis.messaging.avgTitleLength / ads.length) : 0;
    
    // Top hooks, CTAs, words
    analysis.topHooks = this._getTopItems(analysis.hooks, 10);
    analysis.topCTAs = this._getTopItems(analysis.ctas, 10);
    analysis.topWords = this._getTopItems(Object.entries(analysis.messaging.commonWords).map(([w, c]) => ({ word: w, count: c })), 20);

    return { success: true, data: analysis };
  }

  _getTopItems(arr, limit = 10) {
    if (arr.length === 0) return [];
    if (typeof arr[0] === 'string') {
      const counts = {};
      arr.forEach(item => counts[item] = (counts[item] || 0) + 1);
      return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([item, count]) => ({ item, count }));
    }
    return arr.sort((a, b) => b.count - a.count).slice(0, limit);
  }

  // ─── Competitor Tracking ─────────────────────────────────────────

  /**
   * Track multiple competitors
   */
  async trackCompetitors(competitorPages, options = {}) {
    const results = {};
    const { startDate, endDate } = options;
    
    for (const competitor of competitorPages) {
      const { pageId, name, category } = competitor;
      const result = await this.analyzeCompetitorStrategy(pageId, { startDate, endDate });
      if (result.success) {
        results[name] = { ...result.data, category, pageId };
      }
    }
    
    return { success: true, data: results };
  }

  /**
   * Get competitive landscape overview
   */
  async getCompetitiveLandscape(competitorPages, options = {}) {
    const tracking = await this.trackCompetitors(competitorPages, options);
    
    if (!tracking.success) return tracking;
    
    const competitors = Object.values(tracking.data);
    
    // Aggregate insights
    const landscape = {
      totalCompetitors: competitors.length,
      totalAds: competitors.reduce((sum, c) => sum + c.totalAds, 0),
      totalSpend: competitors.reduce((sum, c) => sum + c.spendEstimate, 0),
      totalImpressions: competitors.reduce((sum, c) => sum + c.impressionsEstimate, 0),
      avgAdsPerCompetitor: Math.round(competitors.reduce((sum, c) => sum + c.totalAds, 0) / competitors.length),
      topSpenders: competitors.sort((a, b) => b.spendEstimate - a.spendEstimate).slice(0, 5).map(c => ({ name: c.name || 'Unknown', spend: c.spendEstimate, ads: c.totalAds })),
      mostActive: competitors.sort((a, b) => b.totalAds - a.totalAds).slice(0, 5).map(c => ({ name: c.name || 'Unknown', ads: c.totalAds, active: c.activeAds })),
      mediaMix: {},
      commonHooks: [],
      commonCTAs: [],
      messagingPatterns: {},
    };
    
    // Aggregate media types
    competitors.forEach(c => {
      Object.entries(c.mediaTypes || {}).forEach(([type, count]) => {
        landscape.mediaMix[type] = (landscape.mediaMix[type] || 0) + count;
      });
      
      // Collect top hooks/CTAs
      c.topHooks?.forEach(h => landscape.commonHooks.push(h));
      c.topCTAs?.forEach(c => landscape.commonCTAs.push(c));
    });
    
    landscape.topHooks = this._getTopItems(landscape.commonHooks, 10);
    landscape.topCTAs = this._getTopItems(landscape.commonCTAs, 10);
    
    return { success: true, data: landscape };
  }
}

export async function getMetaAdLibraryInsights(accessToken, competitorPages, options = {}) {
  const api = new MetaAdLibraryAPI(accessToken);
  return api.getCompetitiveLandscape(competitorPages, options);
}

export { MetaAdLibraryAPI };