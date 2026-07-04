export class MetaAPI {
  constructor(adAccountId, accessToken) {
    this.adAccountId = adAccountId ? adAccountId.trim() : '';
    this.accessToken = accessToken ? accessToken.trim() : '';
    this.version = 'v20.0';
    this.baseUrl = `https://graph.facebook.com/${this.version}`;
  }

  getFormattedAccountId() {
    let id = this.adAccountId;
    if (!id.startsWith('act_')) {
      id = `act_${id}`;
    }
    return id;
  }

  async testConnection() {
    try {
      const accountId = this.getFormattedAccountId();
      const url = `${this.baseUrl}/${accountId}?access_token=${this.accessToken}`;
      const res = await fetch(url);
      if (!res.ok) {
        const errorData = await res.json();
        return { success: false, error: errorData.error };
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: { message: e.message } };
    }
  }

  // ── Date Range Helper ────────────────────────────────────────────────
  _buildDateParams(dateRange) {
    if (!dateRange) return 'date_preset=maximum';
    if (typeof dateRange === 'string') return `date_preset=${dateRange}`;
    
    // Object: { preset, metaPreset, startDate, endDate }
    if (dateRange.preset === 'custom' || dateRange.metaPreset === 'custom') {
      return `time_range={"since":"${dateRange.startDate}","until":"${dateRange.endDate}"}`;
    }
    return `date_preset=${dateRange.metaPreset || 'maximum'}`;
  }

  // ── Fetch Helper ──────────────────────────────────────────────────────
  async _fetch(url) {
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Meta API Error: ${res.statusText}`);
    }
    return res.json();
  }

  // ── Global + Campaign Insights ────────────────────────────────────────
  async getInsights(dateRange) {
    try {
      const accountId = this.getFormattedAccountId();
      const dateParams = this._buildDateParams(dateRange);

      const summaryFields = 'spend,impressions,clicks,cpc,cpm,ctr,actions,cost_per_action_type,purchase_roas';
      const summaryUrl = `${this.baseUrl}/${accountId}/insights?fields=${summaryFields}&${dateParams}&access_token=${this.accessToken}`;

      const campaignFields = 'campaign_id,campaign_name,spend,impressions,clicks,cpc,ctr,actions,cost_per_action_type,purchase_roas,objective';
      const campaignUrl = `${this.baseUrl}/${accountId}/insights?level=campaign&fields=${campaignFields}&${dateParams}&access_token=${this.accessToken}`;

      const [summaryData, campaignData] = await Promise.all([
        this._fetch(summaryUrl).catch(() => ({ data: [] })),
        this._fetch(campaignUrl).catch(() => ({ data: [] }))
      ]);

      let global = { spend: 0, impressions: 0, clicks: 0, cpc: 0, cpm: 0, ctr: 0, actions: [], purchase_roas: [] };
      if (summaryData.data && summaryData.data.length > 0) {
        global = summaryData.data[0];
      }

      return {
        global,
        campaigns: campaignData.data || []
      };
    } catch (error) {
      console.error('Error fetching Meta Insights:', error);
      return null;
    }
  }

  // ── Ad Sets for a Campaign ────────────────────────────────────────────
  async getAdSets(campaignId, dateRange) {
    try {
      const dateParams = this._buildDateParams(dateRange);
      const fields = 'adset_id,adset_name,spend,impressions,clicks,cpc,ctr,actions,cost_per_action_type,purchase_roas';
      const url = `${this.baseUrl}/${campaignId}/insights?level=adset&fields=${fields}&${dateParams}&access_token=${this.accessToken}`;
      const data = await this._fetch(url);
      return data.data || [];
    } catch (error) {
      console.error('Error fetching Ad Sets:', error);
      return [];
    }
  }

  // ── Ads for an Ad Set ─────────────────────────────────────────────────
  async getAds(adSetId, dateRange) {
    try {
      const dateParams = this._buildDateParams(dateRange);
      const fields = 'ad_id,ad_name,spend,impressions,clicks,cpc,ctr,actions,cost_per_action_type,purchase_roas';
      const url = `${this.baseUrl}/${adSetId}/insights?level=ad&fields=${fields}&${dateParams}&access_token=${this.accessToken}`;
      const data = await this._fetch(url);

      // Fetch ad creatives (thumbnails) in parallel
      const adIds = (data.data || []).map(a => a.ad_id).filter(Boolean);
      let creatives = {};
      if (adIds.length > 0) {
        try {
          const creativePromises = adIds.map(id =>
            this._fetch(`${this.baseUrl}/${id}?fields=creative{thumbnail_url,body,title,image_url}&access_token=${this.accessToken}`)
              .catch(() => null)
          );
          const creativeResults = await Promise.all(creativePromises);
          creativeResults.forEach((cr, i) => {
            if (cr?.creative) {
              creatives[adIds[i]] = cr.creative;
            }
          });
        } catch { /* ignore creative errors */ }
      }

      return (data.data || []).map(ad => ({
        ...ad,
        creative: creatives[ad.ad_id] || null
      }));
    } catch (error) {
      console.error('Error fetching Ads:', error);
      return [];
    }
  }

  // ── Top Ads (Global) ─────────────────────────────────────────────────
  async getTopAds(dateRange) {
    try {
      const accountId = this.getFormattedAccountId();
      const dateParams = this._buildDateParams(dateRange);
      const fields = 'ad_id,ad_name,spend,impressions,clicks,cpc,ctr,actions,cost_per_action_type,purchase_roas';
      const url = `${this.baseUrl}/${accountId}/insights?level=ad&fields=${fields}&${dateParams}&access_token=${this.accessToken}&limit=50`;
      const data = await this._fetch(url);

      const adIds = (data.data || []).map(a => a.ad_id).filter(Boolean);
      let creatives = {};
      if (adIds.length > 0) {
        try {
          const creativePromises = adIds.map(id =>
            this._fetch(`${this.baseUrl}/${id}?fields=creative{thumbnail_url,body,title,image_url}&access_token=${this.accessToken}`)
              .catch(() => null)
          );
          const creativeResults = await Promise.all(creativePromises);
          creativeResults.forEach((cr, i) => {
            if (cr?.creative) {
              creatives[adIds[i]] = cr.creative;
            }
          });
        } catch { /* ignore creative errors */ }
      }

      return (data.data || []).map(ad => ({
        ...ad,
        creative: creatives[ad.ad_id] || null
      }));
    } catch (error) {
      console.error('Error fetching Top Ads:', error);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ── WRITE OPERATIONS (ads_management permission required) ─────────────
  // ═══════════════════════════════════════════════════════════════════════

  // ── POST Helper ───────────────────────────────────────────────────────
  async _post(url, body = {}) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || `Meta API POST Error: ${res.statusText}`);
    }
    return data;
  }

  // ── Get Campaigns with status (not just insights) ─────────────────────
  async getCampaigns() {
    try {
      const accountId = this.getFormattedAccountId();
      const fields = 'id,name,status,effective_status,objective,daily_budget,lifetime_budget,budget_remaining,start_time,updated_time';
      const url = `${this.baseUrl}/${accountId}/campaigns?fields=${fields}&access_token=${this.accessToken}&limit=100`;
      const data = await this._fetch(url);
      return data.data || [];
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      return [];
    }
  }

  async getAdSetsConfig(campaignId) {
    try {
      const fields = 'id,name,status,effective_status,daily_budget,lifetime_budget,targeting,optimization_goal,billing_event,bid_amount,start_time,end_time';
      let url;
      if (campaignId) {
        url = `${this.baseUrl}/${campaignId}/adsets?fields=${fields}&access_token=${this.accessToken}&limit=100`;
      } else {
        const accountId = this.getFormattedAccountId();
        url = `${this.baseUrl}/${accountId}/adsets?fields=${fields}&access_token=${this.accessToken}&limit=100`;
      }
      const data = await this._fetch(url);
      return data.data || [];
    } catch (error) {
      console.error('Error fetching ad sets config:', error);
      return [];
    }
  }

  async getAdsConfig(adsetId) {
    try {
      const fields = 'id,name,status,effective_status,creative{id,name,image_url,thumbnail_url,body,title,object_story_spec}';
      let url;
      if (adsetId) {
        url = `${this.baseUrl}/${adsetId}/ads?fields=${fields}&access_token=${this.accessToken}&limit=100`;
      } else {
         const accountId = this.getFormattedAccountId();
         url = `${this.baseUrl}/${accountId}/ads?fields=${fields}&access_token=${this.accessToken}&limit=100`;
      }
      const data = await this._fetch(url);
      return data.data || [];
    } catch (error) {
      console.error('Error fetching ads config:', error);
      return [];
    }
  }

  // ── Update Campaign Status (ACTIVE / PAUSED) ─────────────────────────
  async updateCampaignStatus(campaignId, newStatus) {
    try {
      const url = `${this.baseUrl}/${campaignId}?access_token=${this.accessToken}`;
      const data = await this._post(url, { status: newStatus });
      return { success: true, data };
    } catch (error) {
      console.error('Error updating campaign status:', error);
      return { success: false, error: error.message };
    }
  }

  // ── Update Campaign (name, budget, etc.) ──────────────────────────────
  async updateCampaign(campaignId, updates) {
    try {
      const url = `${this.baseUrl}/${campaignId}?access_token=${this.accessToken}`;
      const data = await this._post(url, updates);
      return { success: true, data };
    } catch (error) {
      console.error('Error updating campaign:', error);
      return { success: false, error: error.message };
    }
  }

  // ── Create Campaign ───────────────────────────────────────────────────
  async createCampaign({ name, objective = 'OUTCOME_SALES', dailyBudget, status = 'PAUSED' }) {
    try {
      const accountId = this.getFormattedAccountId();
      const url = `${this.baseUrl}/${accountId}/campaigns?access_token=${this.accessToken}`;
      const body = {
        name,
        objective,
        status,
        special_ad_categories: []
      };
      // Budget in centavos (Meta uses cents)
      if (dailyBudget) {
        body.daily_budget = Math.round(dailyBudget * 100);
      }
      const data = await this._post(url, body);
      return { success: true, data };
    } catch (error) {
      console.error('Error creating campaign:', error);
      return { success: false, error: error.message };
    }
  }

  // ── Ad Sets ──────────────────────────────────────────────────────────
  
  async createAdSet({ name, campaignId, dailyBudget, targeting, status = 'PAUSED', optimizationGoal = 'REACH', billingEvent = 'IMPRESSIONS', bidAmount }) {
    try {
      const accountId = this.getFormattedAccountId();
      const url = `${this.baseUrl}/${accountId}/adsets?access_token=${this.accessToken}`;
      const body = {
        name,
        campaign_id: campaignId,
        status,
        optimization_goal: optimizationGoal,
        billing_event: billingEvent,
        targeting: targeting || { geo_locations: { countries: ['CO'] } }
      };
      
      if (dailyBudget) body.daily_budget = Math.round(dailyBudget * 100);
      if (bidAmount) body.bid_amount = Math.round(bidAmount * 100);
      else body.bid_strategy = 'LOWEST_COST_WITHOUT_CAP'; // default if no bid amount
      
      const data = await this._post(url, body);
      return { success: true, data };
    } catch (error) {
      console.error('Error creating ad set:', error);
      return { success: false, error: error.message };
    }
  }

  async updateAdSet(adsetId, updates) {
    try {
      const url = `${this.baseUrl}/${adsetId}?access_token=${this.accessToken}`;
      // Ensure daily_budget is in cents if provided
      if (updates.daily_budget) updates.daily_budget = Math.round(updates.daily_budget * 100);
      const data = await this._post(url, updates);
      return { success: true, data };
    } catch (error) {
      console.error('Error updating ad set:', error);
      return { success: false, error: error.message };
    }
  }

  // ── Ads & Creatives ──────────────────────────────────────────────────
  
  async uploadImageFromUrl(imageUrl) {
    try {
      const accountId = this.getFormattedAccountId();
      // Meta adimages allows passing a 'url' parameter
      const url = `${this.baseUrl}/${accountId}/adimages?access_token=${this.accessToken}`;
      const data = await this._post(url, { url: imageUrl });
      
      // The response usually contains { images: { "url_hash": { hash: "..." } } }
      // We extract the first hash
      if (data && data.images) {
        const keys = Object.keys(data.images);
        if (keys.length > 0) {
          return { success: true, hash: data.images[keys[0]].hash };
        }
      }
      return { success: false, error: 'No image hash returned' };
    } catch (error) {
      console.error('Error uploading image:', error);
      return { success: false, error: error.message };
    }
  }

  async createAdCreative({ name, pageId, imageHash, headline, bodyText, linkUrl }) {
    try {
      const accountId = this.getFormattedAccountId();
      const url = `${this.baseUrl}/${accountId}/adcreatives?access_token=${this.accessToken}`;
      
      const body = {
        name,
        object_story_spec: {
          page_id: pageId,
          link_data: {
            image_hash: imageHash,
            link: linkUrl,
            message: bodyText,
            name: headline // This acts as the headline in many formats
          }
        }
      };
      
      const data = await this._post(url, body);
      return { success: true, data };
    } catch (error) {
      console.error('Error creating ad creative:', error);
      return { success: false, error: error.message };
    }
  }

  async createAd({ name, adsetId, creativeId, status = 'PAUSED' }) {
    try {
      const accountId = this.getFormattedAccountId();
      const url = `${this.baseUrl}/${accountId}/ads?access_token=${this.accessToken}`;
      const body = {
        name,
        adset_id: adsetId,
        creative: { creative_id: creativeId },
        status
      };
      const data = await this._post(url, body);
      return { success: true, data };
    } catch (error) {
      console.error('Error creating ad:', error);
      return { success: false, error: error.message };
    }
  }

  async updateAd(adId, updates) {
    try {
      const url = `${this.baseUrl}/${adId}?access_token=${this.accessToken}`;
      const data = await this._post(url, updates);
      return { success: true, data };
    } catch (error) {
      console.error('Error updating ad:', error);
      return { success: false, error: error.message };
    }
  }
}
