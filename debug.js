function unifyClients(historicClients = [], tiendanubeOrders = []) {
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

    // Index by Name
    const nameKey = normalizeName(client.name);
    if (nameKey.length > 4) {
      nameIndex.set(nameKey, profile.id);
    }
  }

  // ── 2. Process each Tiendanube order ──────────────────────────────
  for (const order of tiendanubeOrders) { if(String(order.id)==='1977094030') console.log('Procesando:', order.id, 'matched:', matchedProfileId);
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

    // 2d. Name match
    if (!matchedProfileId) {
      const orderName = normalizeName(trueName);
      if (orderName.length > 4) {
        matchedProfileId = nameIndex.get(orderName) || null;
      }
    }

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
      const newName = normalizeName(newProfile.name);
      if (newName.length > 4) {
        nameIndex.set(newName, newProfile.id);
      }
    }
  }

  // ── 3. Return sorted array ────────────────────────────────────────
  return Array.from(profilesById.values()).sort(
    (a, b) => b.totalSpent - a.totalSpent
  );
}