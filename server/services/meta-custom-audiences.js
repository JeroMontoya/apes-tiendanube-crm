import axios from 'axios';
import crypto from 'crypto';

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_BASE = 'https://graph.facebook.com';

function getCredentials() {
  const accessToken = process.env.META_ACCESS_TOKEN || process.env.META_CAPI_ACCESS_TOKEN;
  const adAccountId = process.env.META_AD_ACCOUNT_ID;
  if (!accessToken || !adAccountId) {
    console.warn('[META CA] Credenciales no configuradas (META_ACCESS_TOKEN / META_AD_ACCOUNT_ID)');
    return null;
  }
  return { accessToken, adAccountId };
}

function normalizePhone(phone) {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

function sha256(data) {
  if (!data) return undefined;
  return crypto.createHash('sha256').update(data.trim().toLowerCase()).digest('hex');
}

function sha256Phone(phone) {
  const countryCode = process.env.META_COUNTRY_CODE || '54';
  const normalized = normalizePhone(phone);
  if (!normalized) return undefined;
  const withCode = normalized.startsWith(countryCode) ? normalized : `${countryCode}${normalized}`;
  return crypto.createHash('sha256').update(withCode).digest('hex');
}

function sha256Email(email) {
  if (!email) return undefined;
  return crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
}

async function createAudience(name, description, subtype = 'CUSTOM', customerFileSource = 'USER_PROVIDED_ONLY') {
  const creds = getCredentials();
  if (!creds) return { success: false, error: 'Meta credentials not configured' };

  try {
    const response = await axios.post(
      `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/act_${creds.adAccountId}/customaudiences`,
      null,
      {
        params: {
          access_token: creds.accessToken,
          name,
          description,
          subtype,
          customer_file_source: customerFileSource,
        },
        timeout: 15000,
      }
    );
    console.log(`[META CA] Audience created: ${name} (ID: ${response.data.id})`);
    return { success: true, audience_id: response.data.id, name };
  } catch (error) {
    const errData = error.response?.data?.error || {};
    console.error(`[META CA] Create audience error: ${errData.message || error.message}`);
    return { success: false, error: errData.message || error.message };
  }
}

async function addUsersToAudience(audienceId, users, sessionId = null) {
  const creds = getCredentials();
  if (!creds) return { success: false, error: 'Meta credentials not configured' };

  if (!users || users.length === 0) {
    return { success: false, error: 'No users to add' };
  }

  const schema = ['EMAIL', 'PHONE'];
  const data = users.map(u => [
    u.email ? sha256(u.email) : undefined,
    u.phone ? sha256Phone(u.phone) : undefined,
  ].filter(Boolean));

  const validCount = data.length;
  if (validCount === 0) {
    return { success: false, error: 'No valid user data after hashing' };
  }

  const payload = {
    payload: {
      schema,
      data,
    },
    access_token: creds.accessToken,
  };

  if (sessionId) {
    payload.session = { session_id: sessionId };
  }

  try {
    const response = await axios.post(
      `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${audienceId}/users`,
      payload,
      { timeout: 30000 }
    );
    console.log(`[META CA] ${data.length} users added to audience ${audienceId}`);
    return { success: true, users_added: data.length, response: response.data };
  } catch (error) {
    const errData = error.response?.data?.error || {};
    console.error(`[META CA] Add users error: ${errData.message || error.message}`);
    if (error.response?.data) {
      console.error('[META CA] Full response:', JSON.stringify(error.response.data).substring(0, 500));
    }
    return { success: false, error: errData.message || error.message };
  }
}

async function deleteUsersFromAudience(audienceId, users) {
  const creds = getCredentials();
  if (!creds) return { success: false, error: 'Meta credentials not configured' };

  const schema = ['EMAIL', 'PHONE'];
  const data = users.map(u => [
    u.email ? sha256(u.email) : undefined,
    u.phone ? sha256Phone(u.phone) : undefined,
  ].filter(Boolean));

  try {
    const response = await axios.delete(
      `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${audienceId}/users`,
      {
        data: { payload: { schema, data } },
        params: { access_token: creds.accessToken },
        timeout: 30000,
      }
    );
    return { success: true, response: response.data };
  } catch (error) {
    const errData = error.response?.data?.error || {};
    return { success: false, error: errData.message || error.message };
  }
}

async function getAudienceSize(audienceId) {
  const creds = getCredentials();
  if (!creds) return { success: false, error: 'Meta credentials not configured' };

  try {
    const response = await axios.get(
      `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${audienceId}`,
      {
        params: {
          access_token: creds.accessToken,
          fields: 'id,name,approximate_count,subtype,description',
        },
        timeout: 10000,
      }
    );
    return { success: true, audience: response.data };
  } catch (error) {
    const errData = error.response?.data?.error || {};
    return { success: false, error: errData.message || error.message };
  }
}

async function createLookalikeAudience(sourceAudienceId, name, lookalikeCountry = 'CO', lookalikeRatio = 0.01) {
  const creds = getCredentials();
  if (!creds) return { success: false, error: 'Meta credentials not configured' };

  try {
    const response = await axios.post(
      `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/act_${creds.adAccountId}/customaudiences`,
      null,
      {
        params: {
          access_token: creds.accessToken,
          name,
          subtype: 'LOOKALIKE',
          origin_audience_id: sourceAudienceId,
          lookalike_spec: JSON.stringify({
            country: lookalikeCountry,
            ratio: lookalikeRatio,
          }),
        },
        timeout: 15000,
      }
    );
    console.log(`[META CA] Lookalike created: ${name} (ID: ${response.data.id})`);
    return { success: true, audience_id: response.data.id, name };
  } catch (error) {
    const errData = error.response?.data?.error || {};
    console.error(`[META CA] Lookalike error: ${errData.message || error.message}`);
    return { success: false, error: errData.message || error.message };
  }
}

export {
  getCredentials,
  sha256,
  createAudience,
  addUsersToAudience,
  deleteUsersFromAudience,
  getAudienceSize,
  createLookalikeAudience,
};
