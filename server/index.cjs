import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const STORES_FILE = path.join(__dirname, 'stores.json');

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

const INVALID_EMAIL_PATTERNS = [
  '@noinformado.com',
  'onli@',
  '@nomail.com',
  '@sinmail.com',
  'noemail@',
  'test@test',
  '@example.com',
];

export function isInvalidEmail(email) {
  if (!email || typeof email !== 'string') return true;

  const lower = email.toLowerCase().trim();
  if (lower.length === 0) return true;

  const atParts = lower.split('@');
  if (atParts.length !== 2 || !atParts[0] || !atParts[1]) return true;
  if (!atParts[1].includes('.')) return true;

  return INVALID_EMAIL_PATTERNS.includes(lower);
}

const normalizeName = (name) => {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\u0300-\u036f/g, '')
    .replace(/[^a-z]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const digitsOnly = (value) => {
  if (!value || typeof value !== 'string') return '';
  return value.replace(/\D/g, '');
};

function isInvalidDni(dni) {
  if (!dni || typeof dni !== 'string') return true;
  if (dni.length < 6) return true;
  if (/^(\d)\1+$/.test(dni)) return true;

  const fakeDnis = [
    '1234092267',
    '1234567891',
    '123456789',
    '12345678',
    '123456',
    '12345'
  ];
  if (fakeDnis.includes(dni)) return true;

  return false;
}

function isInvalidPhone(phone) {
  const d = digitsOnly(phone);
  if (d.length < 8) return true;
  if (/^(\d)\1{7,}$/.test(d)) return true;
  if (/^(012345|123456)/.test(d)) return true;
  return false;
}

function resolveSegment(count) {
  if (count === 0) return 'abandoned';
  if (count === 1) return 'regular';
  return 'vip';
}

function getDaysSinceLastPurchase(client) {
  if (!client.purchases || client.purchases.length === 0) return 999;
  const sorted = [...client.purchases].sort((a, b) => new Date(b.date) - new Date(a.date));
  const lastDate = new Date(sorted[0].date);
  return Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
}

function hasLimitedEditionPurchase(client) {
  if (!client.purchases) return false;
  return client.purchases.some(p => 
    p.product?.toLowerCase().includes('limitada') || 
    p.product?.toLowerCase().includes('edicion') || 
    p.product?.toLowerCase().includes('bioma')
  );
}

function hasMysteryBoxPurchase(client) {
  if (!client.purchases) return false;
  return client.purchases.some(p => 
    p.product?.toLowerCase().includes('mystery') || 
    p.product?.toLowerCase().includes('caja sorpresa')
  );
}

function getCouponUsageRate(client) {
  if (!client.purchases || client.purchases.length === 0) return 0;
  const withCoupon = client.purchases.filter(p => p.hasDiscount || p.coupon).length;
  return withCoupon / client.purchases.length;
}

function resolveSegmentTags(client) {
  const tags = [];
  const pc = client.purchaseCount || 0;
  const ts = client.totalSpent || 0;
  const daysSinceLast = getDaysSinceLastPurchase(client);

  if (pc === 0) tags.push('sin_compra');
  else if (pc === 1) tags.push('nuevo');
  else if (pc >= 2 && pc <= 3) tags.push('repetidor');
  else if (pc >= 4) tags.push('fiel');

  if (ts >= 500000) tags.push('alto_valor');
  else if (ts >= 200000) tags.push('medio_valor');

  if (hasLimitedEditionPurchase(client)) tags.push('vip_coleccion');
  if (hasMysteryBoxPurchase(client)) tags.push('mystery_box');

  if (pc >= 2 && daysSinceLast > 90) tags.push('riesgo_churn');
  if (pc >= 2 && daysSinceLast > 180) tags.push('dormido');

  if (daysSinceLast <= 30) tags.push('activo_reciente');

  const couponRate = getCouponUsageRate(client);
  if (couponRate > 0.5) tags.push('sensible_precio');

  return tags;
}

function generateProfileId(orderId) {
  return `TN-${String(orderId).padStart(5, '0')}`;
}

function orderToPurchase(order) {
  const discountTotal = parseFloat(order.discount) || 0;
  const discountCoupon = parseFloat(order.discount_coupon) || 0;
  const discountGateway = parseFloat(order.discount_gateway) || 0;
  const promoDiscountAmount = parseFloat(order.promotional_discount?.total_discount_amount) || 0;

  let smartPromoName = 'Promoción de Tienda';
  if (promoDiscountAmount > 0 && order.total > 0) {
    const subtotal = parseFloat(order.total) + discountTotal;
    if (subtotal > 0) {
      const pct = Math.round((promoDiscountAmount / subtotal) * 100);
      smartPromoName = `Promo Automática ${pct}% OFF`;
    }
  }

  let benefitType = 'normal';
  if (order.coupon) {
    benefitType = 'coupon';
  } else if (promoDiscountAmount > 0) {
    benefitType = 'promo_auto';
  } else if (discountGateway > 0 && discountTotal > 0) {
    benefitType = 'gateway';
  } else if (discountTotal > 0) {
    benefitType = 'manual';
  }

  return {
    date: order.created_at
      ? order.created_at.substring(0, 10)
      : new Date().toISOString().substring(0, 10),
    amount: parseFloat(order.total) || 0,
    product: (order.products || []).map(p => p.name).join(' + '),
    productsArray: order.products || [],
    coupon: order.coupon?.code || null,
    couponType: order.coupon?.type || null,
    couponValue: order.coupon?.value || null,
    couponSaved: order.coupon ? discountCoupon : 0,
    hasDiscount: discountTotal > 0 || promoDiscountAmount > 0,
    discountTotal,
    discountCoupon,
    discountGateway,
    promoDiscountAmount,
    smartPromoName,
    benefitType,
  };
}

function extractCouponInfo(coupon) {
  if (!coupon) return null;

  let raw = null;
  if (typeof coupon === 'string') return { code: coupon, type: null, value: null };
  else if (Array.isArray(coupon) && coupon.length > 0) raw = coupon[0];
  else if (typeof coupon === 'object') raw = coupon;

  if (!raw) return null;
  const code = raw.code || raw.name || null;
  if (!code) return null;

  if (code.toUpperCase().startsWith('DRAFT-ORDER-')) return null;

  return {
    code,
    type: raw.type || null,
    value: raw.value || null,
  };
}

function mergeOrderIntoProfile(profile, order) {
  const purchase = orderToPurchase(order);

  profile.purchases.push(purchase);
  profile.totalSpent += purchase.amount;
  profile.purchaseCount = profile.purchases.length;

  const orderEmail = order.contact_email;
  if (isInvalidEmail(profile.email) && !isInvalidEmail(orderEmail)) {
    profile.email = orderEmail;
  }

  const trueCity = order.shipping_address?.city || order.billing_address?.city || '';
  if (!profile.city && trueCity) {
    profile.city = trueCity;
  }

  const trueProvince = order.shipping_address?.province || order.billing_address?.province || order.shipping_address?.locality || '';
  if (!profile.province && trueProvince) {
    profile.province = trueProvince;
  }

  if (profile.source === 'historic') {
    profile.source = 'unified';
  }

  profile.segment = resolveSegment(profile.purchaseCount);
  profile.segmentTags = resolveSegmentTags(profile);
}

function profileFromOrder(order) {
  const purchase = orderToPurchase(order);
  const purchaseCount = 1;

  const trueName = order.contact_name || order.billing_name || 'Sin nombre';
  const trueEmail = order.contact_email || '';
  const truePhone = order.contact_phone || order.billing_phone || '';
  const trueDni = order.billing_identification || '';

  const trueCity = order.shipping_address?.city || order.billing_address?.city || '';
  const trueProvince = order.shipping_address?.province || order.billing_address?.province || order.shipping_address?.locality || '';

  const newProfile = {
    id: generateProfileId(order.id),
    name: trueName,
    email: trueEmail,
    phone: truePhone,
    city: trueCity,
    province: trueProvince,
    dniCuit: trueDni,
    totalSpent: purchase.amount,
    purchaseCount,
    purchases: [purchase],
    source: 'tiendanube',
    segment: resolveSegment(purchaseCount),
  };

  newProfile.segmentTags = resolveSegmentTags(newProfile);
  return newProfile;
}

export function unifyClients(historicClients = [], tiendanubeOrders = []) {
  const profilesById = new Map();
  const emailIndex = new Map();
  const phoneIndex = new Map();
  const dniIndex = new Map();
  const nameIndex = new Map();

  for (const client of historicClients) {
    const profile = {
      ...client,
      purchases: [...(client.purchases || [])],
      source: 'historic',
      segment: resolveSegment(client.purchaseCount || 0),
    };
    profile.segmentTags = resolveSegmentTags(profile);

    profilesById.set(profile.id, profile);

    if (!isInvalidEmail(client.email)) {
      emailIndex.set(client.email.toLowerCase().trim(), profile.id);
    }

    const phoneKey = digitsOnly(client.phone);
    if (!isInvalidPhone(phoneKey)) {
      phoneIndex.set(phoneKey, profile.id);
    }

    const dniKey = digitsOnly(client.dniCuit);
    if (!isInvalidDni(dniKey)) {
      dniIndex.set(dniKey, profile.id);
    }
  }

  const processedOrderNumbers = new Set();

  for (const order of tiendanubeOrders) {
    const payStatus = (order.payment_status || '').toLowerCase();
    const orderStatus = (order.state || order.status || '').toLowerCase();
    if (
      payStatus === 'cancelled' || payStatus === 'voided' || payStatus === 'refunded' ||
      orderStatus === 'cancelled'
    ) {
      continue;
    }

    const orderNum = order.number || order.id;
    if (processedOrderNumbers.has(orderNum)) {
      continue;
    }
    processedOrderNumbers.add(orderNum);

    const trueName = order.contact_name || order.billing_name || '';
    const trueEmail = order.contact_email || '';
    const truePhone = order.contact_phone || order.billing_phone || '';
    const trueDni = order.billing_identification || '';

    let matchedProfileId = null;

    const orderEmail = trueEmail.toLowerCase().trim();
    if (orderEmail && !isInvalidEmail(orderEmail)) {
      matchedProfileId = emailIndex.get(orderEmail) || null;
    }

    if (!matchedProfileId) {
      const orderPhone = digitsOnly(truePhone);
      if (!isInvalidPhone(orderPhone)) {
        matchedProfileId = phoneIndex.get(orderPhone) || null;
      }
    }

    if (!matchedProfileId) {
      const orderDni = digitsOnly(trueDni);
      if (!isInvalidDni(orderDni)) {
        matchedProfileId = dniIndex.get(orderDni) || null;
      }
    }

    if (matchedProfileId) {
      const profile = profilesById.get(matchedProfileId);
      mergeOrderIntoProfile(profile, order);

      if (!isInvalidEmail(profile.email)) {
        emailIndex.set(profile.email.toLowerCase().trim(), profile.id);
      }
    } else {
      const newProfile = profileFromOrder(order);
      profilesById.set(newProfile.id, newProfile);

      if (!isInvalidEmail(newProfile.email)) {
        emailIndex.set(newProfile.email.toLowerCase().trim(), newProfile.id);
      }
      const newPhone = digitsOnly(newProfile.phone);
      if (!isInvalidPhone(newPhone)) {
        phoneIndex.set(newPhone, newProfile.id);
      }
      const newDni = digitsOnly(newProfile.dniCuit);
      if (!isInvalidDni(newDni)) {
        dniIndex.set(newDni, newProfile.id);
      }
    }
  }

  return Array.from(profilesById.values()).sort(
    (a, b) => b.totalSpent - a.totalSpent
  );
}

module.exports = {
  isInvalidEmail,
  normalizeName,
  digitsOnly,
  isInvalidDni,
  isInvalidPhone,
  resolveSegment,
  getDaysSinceLastPurchase,
  hasLimitedEditionPurchase,
  hasMysteryBoxPurchase,
  getCouponUsageRate,
  resolveSegmentTags,
  generateProfileId,
  orderToPurchase,
  extractCouponInfo,
  mergeOrderIntoProfile,
  profileFromOrder,
  unifyClients
};
