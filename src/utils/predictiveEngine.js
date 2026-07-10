function getDaysSinceLastPurchase(client) {
  if (!client.purchases || client.purchases.length === 0) return 999;
  const sorted = [...client.purchases].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const lastDate = new Date(sorted[0].date);
  return Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
}

function getAvgPurchaseFrequency(client) {
  if (!client.purchases || client.purchases.length < 2) return 0;
  const sorted = [...client.purchases].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const firstDate = new Date(sorted[0].date).getTime();
  const lastDate = new Date(sorted[sorted.length-1].date).getTime();
  const daysDiff = Math.floor((lastDate - firstDate) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.floor(daysDiff / (client.purchases.length - 1)));
}

function calculateSpendTrend(client) {
  if (!client.purchases || client.purchases.length < 2) return 0;
  const sorted = [...client.purchases].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
  const secondHalf = sorted.slice(Math.floor(sorted.length / 2));
  
  const sumFirst = firstHalf.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) / (firstHalf.length || 1);
  const sumSecond = secondHalf.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) / (secondHalf.length || 1);
  
  if (sumFirst === 0) return 1;
  return (sumSecond - sumFirst) / sumFirst; // -1 to 1+
}

export function calculateChurnScore(client) {
  let score = 0;
  if (!client.purchases || client.purchases.length < 2) return 0; // Not enough data for true churn analysis

  const daysSince = getDaysSinceLastPurchase(client);
  const avgFrequency = getAvgPurchaseFrequency(client);
  
  // Factor 1: Recencia relativa a su patrón
  if (avgFrequency > 0) {
    if (daysSince > avgFrequency * 2) score += 40;
    else if (daysSince > avgFrequency * 1.5) score += 20;
  }
  
  // Factor 2: Tendencia de gasto
  const spendTrend = calculateSpendTrend(client);
  if (spendTrend < -0.3) score += 25;
  
  // Factor 3: Sensibilidad a precio
  if (client.segmentTags?.includes('sensible_precio')) score += 15;
  
  // Factor 4: Inactividad absoluta
  if (daysSince > 120) score += 20;
  
  return Math.min(100, score);
}
