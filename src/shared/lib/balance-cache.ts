// Cache management for API balances using localStorage

const CACHE_KEY = 'api-balances-cache';
const CACHE_EXPIRY_KEY = 'api-balances-cache-expiry';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export interface CachedBalanceData {
  balances: any[];
  rates: any;
  timestamp: number;
}

/**
 * Save balance data to localStorage
 */
export function saveBalanceCache(data: { balances: any[]; rates: any }): void {
  try {
    const cacheData: CachedBalanceData = {
      ...data,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    localStorage.setItem(CACHE_EXPIRY_KEY, String(Date.now() + CACHE_DURATION));
    console.log('[Balance Cache] Data saved to localStorage');
  } catch (error) {
    console.error('[Balance Cache] Error saving to localStorage:', error);
  }
}

/**
 * Get balance data from localStorage
 */
export function getBalanceCache(): CachedBalanceData | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const expiry = localStorage.getItem(CACHE_EXPIRY_KEY);
    
    if (!cached || !expiry) {
      console.log('[Balance Cache] No cache found');
      return null;
    }

    const now = Date.now();
    const expiryTime = parseInt(expiry, 10);

    // Check if cache is expired
    if (now > expiryTime) {
      console.log('[Balance Cache] Cache expired, clearing');
      clearBalanceCache();
      return null;
    }

    const data = JSON.parse(cached) as CachedBalanceData;
    console.log('[Balance Cache] Cache hit, age:', Math.round((now - data.timestamp) / 1000), 'seconds');
    return data;
  } catch (error) {
    console.error('[Balance Cache] Error reading from localStorage:', error);
    return null;
  }
}

/**
 * Clear balance cache from localStorage
 */
export function clearBalanceCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_EXPIRY_KEY);
    console.log('[Balance Cache] Cache cleared');
  } catch (error) {
    console.error('[Balance Cache] Error clearing cache:', error);
  }
}

/**
 * Check if cache exists and is valid
 */
export function hasCachedData(): boolean {
  const cached = getBalanceCache();
  return cached !== null && cached.balances && cached.balances.length > 0;
}

/**
 * Get cache age in seconds
 */
export function getCacheAge(): number | null {
  const cached = getBalanceCache();
  if (!cached) return null;
  return Math.round((Date.now() - cached.timestamp) / 1000);
}
