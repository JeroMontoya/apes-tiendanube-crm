/**
 * AI Ad Classifier Engine Client
 * 
 * Este módulo obtiene la clasificación de anuncios procesada por el Backend
 * a través del endpoint real.
 */

export async function analyzeAndClassifyAds() {
  try {
    const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';
    const response = await fetch(`${API_BASE}/api/competitors/ads`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error("Error fetching classified ads from backend:", error);
    // Return empty fallback matrix if server is unreachable
    return {
      apes: { perfil: [], web: [], venta: [], remarketing: [] },
      topara: { perfil: [], web: [], venta: [], remarketing: [] },
      qulybet: { perfil: [], web: [], venta: [], remarketing: [] },
      laskabran: { perfil: [], web: [], venta: [], remarketing: [] },
      columbia: { perfil: [], web: [], venta: [], remarketing: [] }
    };
  }
}
