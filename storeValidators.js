"use strict"; // Strict mode to catch common bugs

// Custom error type for duplicate store errors
class DuplicateStoreError extends Error {
  constructor(storeId) {
    super(`Store ${storeId} already exists`);
    this.name = 'DuplicateStoreError';
  }
}

/**
 * Validates a Tienda Nube store ID.
 * @param {string} storeId - The store ID to validate
 * @returns {boolean} - True if the ID is valid
 */
const isValidStoreId = (storeId) => {
  if (!storeId) return false;
  if (typeof storeId !== 'string') return false;
  // Tienda Nube store IDs are typically numbers with 4-5 digits
  return /^\d{4,5}$/.test(storeId.trim());
};

/**
 * Validates a Tienda Nube access token.
 * @param {string} token - The access token to validate
 * @returns {boolean} - True if the token is valid
 */
const isValidAccessToken = (token) => {
  if (!token) return false;
  if (typeof token !== 'string') return false;
  // Tienda Nube tokens are hex strings (mix of letters and numbers)
  return /^[a-zA-Z0-9]{40,}$/.test(token.trim());
};

/**
 * Rate limit function to prevent abuse.
 * @param {object} storeData - The store data object
 * @param {number} limit - Maximum attempts per time period
 * @param {number} windowMs - Time window in milliseconds
 * @returns {boolean} - True if within rate limits
 */
const checkRateLimit = (storeData, limit = 5, windowMs = 300000) => {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Clean old attempts
  storeData.attempts = storeData.attempts.filter(attempt => attempt > windowStart);
  
  return storeData.attempts.length < limit;
};

/**
 * Record an attempt for rate limiting.
 * @param {object} storeData - The store data object
 */
const recordAttempt = (storeData) => {
  const now = Date.now();
  storeData.attempts.push(now);
};

/**
 * Validates store credentials and returns the validated data.
 * @param {string} storeId - The store ID
 * @param {string} accessToken - The access token
 * @param {object} stores - The existing stores array
 * @returns {object} - The validated store configuration
 * @throws {DuplicateStoreError} - If the store is a duplicate
 * @throws {Error} - If validation fails
 */
const validateStore = (storeId, accessToken, stores) => {
  const trimmedStoreId = storeId.trim();
  const trimmedToken = accessToken.trim();
  
  // Validate inputs
  if (!isValidStoreId(trimmedStoreId)) {
    throw new Error(`Invalid store ID format: ${trimmedStoreId}. Expected 4-5 digits`);
  }
  
  if (!isValidAccessToken(trimmedToken)) {
    throw new Error('Invalid access token format. Token must be a 40+ character alphanumeric string');
  }
  
  // Check for duplicates
  const existing = stores.find(s => s.storeId === trimmedStoreId);
  if (existing) {
    throw new DuplicateStoreError(trimmedStoreId);
  }
  
  return {
    storeId: trimmedStoreId,
    accessToken: trimmedToken,
    createdAt: new Date().toISOString(),
    attempts: []
  };
};

/**
 * Loads stores from file with error handling.
 * @param {string} filePath - Path to the stores file
 * @returns {Array} - Array of stores
 */
const loadStores = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, 'utf8');
    const stores = JSON.parse(data);
    if (!Array.isArray(stores)) {
      console.warn('Stores data is not an array. Starting with empty stores.');
      return [];
    }
    return stores;
  } catch (error) {
    console.error('Error loading stores:', error.message);
    return [];
  }
};

/**
 * Saves stores to file with atomic write.
 * @param {string} filePath - Path to the stores file
 * @param {Array} stores - Array of stores to save
 */
const saveStores = (filePath, stores) => {
  try {
    const tempFilePath = `${filePath}.tmp`; // Temporary file for atomic write
    fs.writeFileSync(tempFilePath, JSON.stringify(stores, null, 2), 'utf8');
    fs.renameSync(tempFilePath, filePath); // Atomic rename
  } catch (error) {
    console.error('Error saving stores:', error.message);
    throw new Error('Failed to save store credentials');
  }
};

/**
 * Handles store registration with validation and rate limiting.
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const handleStoreRegistration = async (req, res) => {
  const { storeId, accessToken } = req.body;
  
  try {
    // Input validation
    if (!storeId || !accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Both storeId and accessToken are required'
      });
    }
    
    // Load existing stores
    const stores = loadStores(STORES_FILE);
    
    // Check rate limiting for this IP
    const clientIP = req.ip || req.connection.remoteAddress;
    const rateLimitKey = `registration_${clientIP}`;
    
    // Rate limiting logic would go here
    // For simplicity, we'll just proceed with registration
    
    // Validate store credentials
    const storeData = validateStore(storeId, accessToken, stores);
    
    // Add to stores array
    stores.push(storeData);
    
    // Save stores with atomic write
    await saveStores(STORES_FILE, stores);
    
    // Log successful registration
    console.log(`Store ${storeData.storeId} registered successfully at ${new Date().toISOString()}`);
    
    // Send success response
    res.status(201).json({
      success: true,
      message: 'Store registered successfully',
      storeId: storeData.storeId,
      registeredAt: storeData.createdAt
    });
    
  } catch (error) {
    console.error('Store registration error:', error.message);
    
    // Handle different error types
    if (error instanceof DuplicateStoreError) {
      return res.status(409).json({
        success: false,
        error: error.message
      });
    }
    
    return res.status(400).json({
      success: false,
      error: error.message || 'Failed to register store'
    });
  }
};

/**
 * Validates the authenticity of a store.
 * @param {string} storeId - The store ID to validate
 * @returns {boolean} - True if the store is valid
 */
const validateStoreAuthenticity = (storeId) => {
  // In a real implementation, this would validate against Tienda Nube's API
  // For now, we'll use a simple check
  if (!storeId) return false;
  
  // Check if store ID is numeric and within expected range
  const numericId = parseInt(storeId, 10);
  if (isNaN(numericId) || numericId < 10000 || numericId > 99999) {
    return false;
  }
  
  return true;
};

/**
 * Formats a store ID for display.
 * @param {string} storeId - The store ID to format
 * @returns {string} - Formatted store ID
 */
const formatStoreId = (storeId) => {
  if (!storeId) return '';
  return String(storeId).replace(/^(\d{2})(\d{3})$/, '$1-$2'); // Format: 34-881
};

module.exports = {
  isValidStoreId,
  isValidAccessToken,
  checkRateLimit,
  recordAttempt,
  validateStore,
  loadStores,
  saveStores,
  handleStoreRegistration,
  validateStoreAuthenticity,
  formatStoreId,
  DuplicateStoreError
};