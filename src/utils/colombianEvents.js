// ─── Colombian Commercial Events Generator ─────────────────────────────────────
// Extracted to a shared utility so both EventCalendar and NotificationCenter can use it.

const getNthDayOfMonth = (year, month, dayOfWeek, n) => {
  let date = new Date(year, month, 1);
  let count = 0;
  while (date.getMonth() === month) {
    if (date.getDay() === dayOfWeek) {
      count++;
      if (count === n) return new Date(date);
    }
    date.setDate(date.getDate() + 1);
  }
  return new Date(date);
};

const getLastDayOfMonth = (year, month, dayOfWeek) => {
  let date = new Date(year, month + 1, 0);
  while (date.getMonth() === month) {
    if (date.getDay() === dayOfWeek) return new Date(date);
    date.setDate(date.getDate() - 1);
  }
  return new Date(date);
};

export function getColombianEvents(year) {
  const diaDeLaMadre = getNthDayOfMonth(year, 4, 0, 2);
  const diaDelPadre = getNthDayOfMonth(year, 5, 0, 3);
  const amorYAmistad = getNthDayOfMonth(year, 8, 6, 3);
  const diaDelNino = getLastDayOfMonth(year, 3, 6);

  const thanksgiving = getNthDayOfMonth(year, 10, 4, 4);
  const realBlackFriday = new Date(thanksgiving);
  realBlackFriday.setDate(realBlackFriday.getDate() + 1);
  const cyberMonday = new Date(realBlackFriday);
  cyberMonday.setDate(cyberMonday.getDate() + 3);

  const formatDate = (date) => date.toISOString().split('T')[0];

  return [
    { id: `co-mujer-${year}`, title: 'Día de la Mujer', category: 'HOLIDAY', startDate: `${year}-03-08`, endDate: `${year}-03-08`, description: 'Temporada alta. Ideal para campañas enfocadas en mujeres.', emoji: '💜' },
    { id: `co-nino-${year}`, title: 'Día de la Niñez', category: 'HOLIDAY', startDate: formatDate(diaDelNino), endDate: formatDate(diaDelNino), description: 'Último sábado de abril.', emoji: '🧒' },
    { id: `co-madre-${year}`, title: 'Día de la Madre', category: 'HOLIDAY', startDate: formatDate(diaDeLaMadre), endDate: formatDate(diaDeLaMadre), description: 'Segundo domingo de mayo. Segunda fecha comercial más importante del año.', emoji: '💐' },
    { id: `co-padre-${year}`, title: 'Día del Padre', category: 'HOLIDAY', startDate: formatDate(diaDelPadre), endDate: formatDate(diaDelPadre), description: 'Tercer domingo de junio.', emoji: '👔' },
    { id: `co-primas1-${year}`, title: 'Temporada de Primas (Mitad de año)', category: 'PROMO', startDate: `${year}-06-15`, endDate: `${year}-06-30`, description: 'Pago de primas legales en Colombia. Mayor poder adquisitivo.', emoji: '💰' },
    { id: `co-amor-${year}`, title: 'Amor y Amistad', category: 'HOLIDAY', startDate: formatDate(amorYAmistad), endDate: formatDate(amorYAmistad), description: 'Tercer sábado de septiembre. Gran volumen de regalos.', emoji: '💕' },
    { id: `co-halloween-${year}`, title: 'Halloween', category: 'HOLIDAY', startDate: `${year}-10-31`, endDate: `${year}-10-31`, description: 'Temporada de disfraces y dulces.', emoji: '🎃' },
    { id: `co-bf-${year}`, title: 'Black Friday', category: 'CAMPAIGN', startDate: formatDate(realBlackFriday), endDate: formatDate(realBlackFriday), description: 'El evento global de descuentos más importante.', emoji: '🏷️' },
    { id: `co-cm-${year}`, title: 'Cyber Lunes', category: 'CAMPAIGN', startDate: formatDate(cyberMonday), endDate: formatDate(cyberMonday), description: 'Día de descuentos enfocado 100% online.', emoji: '💻' },
    { id: `co-primas2-${year}`, title: 'Temporada de Primas (Fin de año)', category: 'PROMO', startDate: `${year}-12-01`, endDate: `${year}-12-20`, description: 'Pago de primas navideñas.', emoji: '🎁' },
    { id: `co-navidad-${year}`, title: 'Navidad', category: 'HOLIDAY', startDate: `${year}-12-24`, endDate: `${year}-12-25`, description: 'Pico máximo de ventas del año. Las campañas deben iniciar desde Noviembre.', emoji: '🎄' },
    { id: `co-anionuevo-${year}`, title: 'Año Nuevo', category: 'HOLIDAY', startDate: `${year}-01-01`, endDate: `${year}-01-01`, description: 'Inicio de año. Campañas de metas y propósitos.', emoji: '🎆' },
    { id: `co-sanvalentin-${year}`, title: 'San Valentín', category: 'HOLIDAY', startDate: `${year}-02-14`, endDate: `${year}-02-14`, description: 'Día del amor. Ideal para regalos y experiencias.', emoji: '❤️' },
  ];
}

/**
 * Returns upcoming events within `daysAhead` days from today.
 */
export function getUpcomingEvents(daysAhead = 30) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = today.getFullYear();
  const allEvents = [...getColombianEvents(year), ...getColombianEvents(year + 1)];
  
  return allEvents
    .map(ev => {
      const start = new Date(ev.startDate + 'T00:00:00');
      const diffMs = start.getTime() - today.getTime();
      const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return { ...ev, daysUntil };
    })
    .filter(ev => ev.daysUntil >= 0 && ev.daysUntil <= daysAhead)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}
