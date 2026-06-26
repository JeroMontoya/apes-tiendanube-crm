/**
 * unifyClients.js
 * ---------------
 * Client unification engine for APES CRM.
 *
 * Merges two data sources (historic spreadsheet + Tiendanube orders)
 * into a single, deduplicated client list using multi-key matching:
 *   1. Email  (skipping known-invalid patterns)
 *   2. Phone  (digits-only normalisation)
 *   3. DNI    (digits-only normalisation)
 */

// ─── Helpers ────────────────────────────────────────────────────────

const INVALID_EMAIL_PATTERNS = [
  '@noinformado.com',
  'onli@',
  '@nomail.com',
  '@sinmail.com',
  'noemail@',
  'test@test',
  '@example.com',
];

/**
 * Returns `true` when the email should NOT be trusted as a
 * real contact address (placeholder / obviously fake).
 * @param {string} email
 * @returns {boolean}
 */
export function isInvalidEmail(email) {
  if (!email || typeof email !== 'string') return true;

  const lower = email.toLowerCase().trim();
  if (lower.length === 0) return true;

  // Basic structure check — must have exactly one @ with text on both sides
  const atParts = lower.split('@');
  if (atParts.length !== 2 || !atParts[0] || !atParts[1]) return true;
  if (!atParts[1].includes('.')) return true;

  return INVALID_EMAIL_PATTERNS.some((pattern) => lower.includes(pattern));
}

/**
 * Normalizes a name for fuzzy matching (lowercase, no accents, no special chars).
 */
function normalizeName(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strips every non-digit character from a string.
 * Useful for normalising phones and DNIs for index lookup.
 * @param {string} value
 * @returns {string}
 */
function digitsOnly(value) {
  if (!value || typeof value !== 'string') return '';
  return value.replace(/\D/g, '');
}

/**
 * Checks if a DNI is obviously fake/generic.
 */
function isInvalidDni(dni) {
  if (!dni || typeof dni !== 'string') return true;
  if (dni.length < 6) return true;
  if (/^(\d)\1+$/.test(dni)) return true; // e.g. 1111111
  
  // Generic / shared fake DNIs blocklist
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

/**
 * Checks if a Phone is obviously fake/generic.
 */
function isInvalidPhone(phone) {
  const d = digitsOnly(phone);
  if (d.length < 8) return true;
  if (/^(\d)\1{7,}$/.test(d)) return true; // All same digits
  if (/^(012345|123456)/.test(d)) return true; // Sequential
  return false;
}

/**
 * Derives the client segment from their purchase count.
 * @param {number} count
 * @returns {'abandoned' | 'regular' | 'vip'}
 */
function resolveSegment(count) {
  if (count === 0) return 'abandoned';
  if (count === 1) return 'regular';
  return 'vip';
}

/**
 * Generates a deterministic ID for new profiles created from
 * Tiendanube orders that do not match any historic record.
 * @param {number|string} orderId
 * @returns {string}
 */
function generateProfileId(orderId) {
  return `TN-${String(orderId).padStart(5, '0')}`;
}

// ─── Core ───────────────────────────────────────────────────────────

/**
 * Converts a single Tiendanube order into a purchase record
 * compatible with the unified client model.
 * @param {object} order
 * @returns {object}
 */
function orderToPurchase(order) {
  const couponInfo = extractCouponInfo(order.coupon);
  const discountTotal = parseFloat(order.discount) || 0;
  const discountCoupon = parseFloat(order.discount_coupon) || 0;
  const discountGateway = parseFloat(order.discount_gateway) || 0;
  const promoDiscountAmount = parseFloat(order.promotional_discount?.total_discount_amount) || 0;

  // Calculate exact percentage for automatic promotions
  let smartPromoName = 'Promoción de Tienda';
  if (promoDiscountAmount > 0 && order.total > 0) {
    // try to calculate % from the original subtotal (total + discount)
    const subtotal = parseFloat(order.total) + discountTotal;
    if (subtotal > 0) {
      const pct = Math.round((promoDiscountAmount / subtotal) * 100);
      smartPromoName = `Promo Automática ${pct}% OFF`;
    }
  }

  // Classify the type of benefit applied
  let benefitType = 'normal'; // no benefit
  if (couponInfo) {
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
    product: (order.products || []).map((p) => p.name).join(' + '),
    productsArray: order.products || [],
    // Coupon-specific fields
    coupon: couponInfo?.code || null,
    couponType: couponInfo?.type || null,       // 'percentage' | 'absolute'
    couponValue: couponInfo?.value || null,      // e.g. "10.00" for 10%
    couponSaved: couponInfo ? discountCoupon : 0, // money saved by coupon
    // Discount breakdown
    hasDiscount: discountTotal > 0 || promoDiscountAmount > 0,
    discountTotal,
    discountCoupon,
    discountGateway,
    promoDiscountAmount,
    smartPromoName,
    benefitType,
  };
}

/**
 * Extracts coupon info from TiendaNube coupon field.
 * Returns null for DRAFT-ORDER coupons (internal manual discounts).
 */
function extractCouponInfo(coupon) {
  if (!coupon) return null;

  let raw = null;
  if (typeof coupon === 'string') return { code: coupon, type: null, value: null };
  else if (Array.isArray(coupon) && coupon.length > 0) raw = coupon[0];
  else if (typeof coupon === 'object') raw = coupon;

  if (!raw) return null;
  const code = raw.code || raw.name || null;
  if (!code) return null;

  // TiendaNube injects DRAFT-ORDER-* for manual/internal discounts — not real coupons
  if (code.toUpperCase().startsWith('DRAFT-ORDER-')) return null;

  return {
    code,
    type: raw.type || null,   // 'percentage' | 'absolute'
    value: raw.value || null,  // the discount value (e.g. "10.00")
  };
}

/**
 * Merges a Tiendanube order into an existing unified profile.
 * Mutates `profile` in place.
 * @param {object} profile  — the unified client object
 * @param {object} order    — the Tiendanube order
 */
function mergeOrderIntoProfile(profile, order) {
  const purchase = orderToPurchase(order);

  profile.purchases.push(purchase);
  profile.totalSpent += purchase.amount;
  profile.purchaseCount = profile.purchases.length;

  // Upgrade email if the existing one is invalid and the order has a valid one
  const orderEmail = order.contact_email;
  if (isInvalidEmail(profile.email) && !isInvalidEmail(orderEmail)) {
    profile.email = orderEmail;
  }

  // Upgrade city if missing
  const trueCity = order.shipping_address?.city || order.billing_address?.city || '';
  if (!profile.city && trueCity) {
    profile.city = trueCity;
  }

  // Upgrade province if missing
  const trueProvince = order.shipping_address?.province || order.billing_address?.province || order.shipping_address?.locality || '';
  if (!profile.province && trueProvince) {
    profile.province = trueProvince;
  }

  // Mark as unified since data comes from both sources
  if (profile.source === 'historic') {
    profile.source = 'unified';
  }

  // Recalculate segment
  profile.segment = resolveSegment(profile.purchaseCount);
}

/**
 * Creates a fresh unified profile from a Tiendanube order that
 * didn't match any existing client.
 * @param {object} order
 * @returns {object}
 */
function profileFromOrder(order) {
  const purchase = orderToPurchase(order);
  const purchaseCount = 1;

  // STRICTLY use order-level data. Ignore order.customer completely to break forced groupings.
  const trueName = order.contact_name || order.billing_name || 'Sin nombre';
  const trueEmail = order.contact_email || '';
  const truePhone = order.contact_phone || order.billing_phone || '';
  const trueDni = order.billing_identification || '';
  
  const trueCity = order.shipping_address?.city || order.billing_address?.city || '';
  const trueProvince = order.shipping_address?.province || order.billing_address?.province || order.shipping_address?.locality || '';

  return {
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
}

/**
 * Unifies historic client records with Tiendanube orders into a
 * single, deduplicated client list.
 *
 * @param {Array<object>} historicClients  — records from the spreadsheet
 * @param {Array<object>} tiendanubeOrders — orders from Tiendanube API
 * @returns {Array<object>} sorted by totalSpent descending
 */
export function unifyClients(historicClients = [], tiendanubeOrders = []) {
  // ── 1. Seed the unified map with historic clients ─────────────────
  /** @type {Map<string, object>} id → unified profile */
  const profilesById = new Map();

  /** @type {Map<string, string>} normalised key → profile id */
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

    profilesById.set(profile.id, profile);

    // Index by email (only if valid)
    if (!isInvalidEmail(client.email)) {
      emailIndex.set(client.email.toLowerCase().trim(), profile.id);
    }

    // Index by phone
    const phoneKey = digitsOnly(client.phone);
    if (!isInvalidPhone(phoneKey)) {
      phoneIndex.set(phoneKey, profile.id);
    }

    // Index by DNI
    const dniKey = digitsOnly(client.dniCuit);
    if (!isInvalidDni(dniKey)) {
      dniIndex.set(dniKey, profile.id);
    }


  }

  // ── 2. Process each Tiendanube order ──────────────────────────────
  const processedOrderNumbers = new Set(); // Prevent duplicate order counting

  for (const order of tiendanubeOrders) {
    // Skip cancelled / voided orders — they are NOT real revenue.
    // TiendaNube uses TWO fields: `status` (order lifecycle) and `payment_status` (payment lifecycle).
    // An order can be status='cancelled' but payment_status='paid' — still not a valid sale.
    const payStatus = (order.payment_status || '').toLowerCase();
    const orderStatus = (order.state || order.status || '').toLowerCase();
    if (
      payStatus === 'cancelled' || payStatus === 'voided' || payStatus === 'refunded' ||
      orderStatus === 'cancelled'
    ) {
      continue;
    }

    // Skip duplicate order numbers (same order appearing twice in the API)
    const orderNum = order.number || order.id;
    if (processedOrderNumbers.has(orderNum)) {
      continue;
    }
    processedOrderNumbers.add(orderNum);

    // STRICTLY use order-level data. Ignore order.customer completely to break forced groupings.
    const trueName = order.contact_name || order.billing_name || '';
    const trueEmail = order.contact_email || '';
    const truePhone = order.contact_phone || order.billing_phone || '';
    const trueDni = order.billing_identification || '';

    // Attempt match in priority order: email → phone → DNI
    let matchedProfileId = null;

    // 2a. Email match (skip invalid)
    const orderEmail = trueEmail.toLowerCase().trim();
    if (orderEmail && !isInvalidEmail(orderEmail)) {
      matchedProfileId = emailIndex.get(orderEmail) || null;
    }

    // 2b. Phone match
    if (!matchedProfileId) {
      const orderPhone = digitsOnly(truePhone);
      if (!isInvalidPhone(orderPhone)) {
        matchedProfileId = phoneIndex.get(orderPhone) || null;
      }
    }

    // 2c. DNI match
    if (!matchedProfileId) {
      const orderDni = digitsOnly(trueDni);
      if (!isInvalidDni(orderDni)) {
        matchedProfileId = dniIndex.get(orderDni) || null;
      }
    }

    // Name matching removed because it causes false positives for people with the same name.
    // We strictly merge by Email, Phone, or DNI.

    // ── Merge or create ─────────────────────────────────────────────
    if (matchedProfileId) {
      const profile = profilesById.get(matchedProfileId);
      mergeOrderIntoProfile(profile, order);

      // Update indexes with potentially-new email
      if (!isInvalidEmail(profile.email)) {
        emailIndex.set(profile.email.toLowerCase().trim(), profile.id);
      }
    } else {
      const newProfile = profileFromOrder(order);
      profilesById.set(newProfile.id, newProfile);

      // Index the new profile
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

  // ── 3. Return sorted array ────────────────────────────────────────
  return Array.from(profilesById.values()).sort(
    (a, b) => b.totalSpent - a.totalSpent
  );
}
