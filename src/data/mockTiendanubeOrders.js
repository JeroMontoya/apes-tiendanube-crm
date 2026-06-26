/**
 * mockTiendanubeOrders.js
 * -----------------------
 * Simulated Tiendanube API order responses for APES CRM.
 *
 * OVERLAP MAP (4 orders that share phone/DNI with historic clients):
 *   TN-003  ↔ HC-004  Valentina Gómez  (phone match, email was @noinformado.com → real email here)
 *   TN-008  ↔ HC-006  Camila Díaz      (phone match, email was onli@gmail.com → real email here)
 *   TN-014  ↔ HC-011  Emiliano Castro  (DNI match,  email was @noinformado.com → real email here)
 *   TN-019  ↔ HC-017  Diego Navarro    (phone match, converts abandoned → regular)
 */

const mockTiendanubeOrders = [
  // ── 1 ─────────────────────────────────────────────────────────────
  {
    id: 50001,
    number: 1001,
    state: 'closed',
    customer: {
      id: 90001,
      name: 'Alejandro Vega',
      email: 'avega.bsas@gmail.com',
      phone: '+54 11 6789-0123',
      identification: '25.678.901',
    },
    total: '45000.00',
    currency: 'ARS',
    created_at: '2024-06-10T14:30:00-03:00',
    products: [
      { name: 'Hoodie APES Urban', price: '45000.00', quantity: 1 },
    ],
  },
  // ── 2 ─────────────────────────────────────────────────────────────
  {
    id: 50002,
    number: 1002,
    state: 'closed',
    customer: {
      id: 90002,
      name: 'Brenda Quiroga',
      email: 'brenda.quiroga@hotmail.com',
      phone: '+54 351 890-1234',
      identification: '34.567.890',
    },
    total: '85000.00',
    currency: 'ARS',
    created_at: '2024-07-22T11:15:00-03:00',
    products: [
      { name: 'Campera APES Premium', price: '85000.00', quantity: 1 },
    ],
  },
  // ── 3 — OVERLAP HC-004 Valentina Gómez (phone match) ──────────────
  {
    id: 50003,
    number: 1003,
    state: 'closed',
    customer: {
      id: 90003,
      name: 'Valentina Gómez',
      email: 'valentina.gomez.real@gmail.com', // real email — replaces @noinformado
      phone: '+54 341 456-7890',               // same phone as HC-004
      identification: '33.456.789',
    },
    total: '45000.00',
    currency: 'ARS',
    created_at: '2025-05-18T09:45:00-03:00',
    products: [
      { name: 'Buzo APES Street', price: '45000.00', quantity: 1 },
    ],
  },
  // ── 4 ─────────────────────────────────────────────────────────────
  {
    id: 50004,
    number: 1004,
    state: 'open',
    customer: {
      id: 90004,
      name: 'Lucas Méndez',
      email: 'lucas.mendez@gmail.com',
      phone: '+54 261 456-7891',
      identification: '29.012.345',
    },
    total: '65000.00',
    currency: 'ARS',
    created_at: '2025-01-15T16:00:00-03:00',
    products: [
      { name: 'Jean APES Slim', price: '65000.00', quantity: 1 },
    ],
  },
  // ── 5 ─────────────────────────────────────────────────────────────
  {
    id: 50005,
    number: 1005,
    state: 'closed',
    customer: {
      id: 90005,
      name: 'Milagros Acosta',
      email: 'mili.acosta@yahoo.com.ar',
      phone: '+54 381 234-5678',
      identification: '36.789.012',
    },
    total: '25000.00',
    currency: 'ARS',
    created_at: '2024-08-05T10:30:00-03:00',
    products: [
      { name: 'Remera APES Classic', price: '25000.00', quantity: 1 },
    ],
  },
  // ── 6 ─────────────────────────────────────────────────────────────
  {
    id: 50006,
    number: 1006,
    state: 'closed',
    customer: {
      id: 90006,
      name: 'Fernando Paz',
      email: 'ferpaz@gmail.com',
      phone: '+54 387 567-8901',
      identification: '28.901.234',
    },
    total: '130000.00',
    currency: 'ARS',
    created_at: '2024-09-12T13:20:00-03:00',
    products: [
      { name: 'Campera APES Premium', price: '85000.00', quantity: 1 },
      { name: 'Hoodie APES Urban', price: '45000.00', quantity: 1 },
    ],
  },
  // ── 7 ─────────────────────────────────────────────────────────────
  {
    id: 50007,
    number: 1007,
    state: 'cancelled',
    customer: {
      id: 90007,
      name: 'Paula Ibáñez',
      email: 'paulaibanez@hotmail.com',
      phone: '+54 342 678-9012',
      identification: '31.234.567',
    },
    total: '45000.00',
    currency: 'ARS',
    created_at: '2024-10-01T08:00:00-03:00',
    products: [
      { name: 'Hoodie APES Urban', price: '45000.00', quantity: 1 },
    ],
  },
  // ── 8 — OVERLAP HC-006 Camila Díaz (phone match) ──────────────────
  {
    id: 50008,
    number: 1008,
    state: 'closed',
    customer: {
      id: 90008,
      name: 'Camila Díaz',
      email: 'camila.diaz.real@gmail.com', // real email — replaces onli@gmail.com
      phone: '+54 221 678-9012',            // same phone as HC-006
      identification: '36.234.567',
    },
    total: '85000.00',
    currency: 'ARS',
    created_at: '2025-06-01T17:10:00-03:00',
    products: [
      { name: 'Campera APES Premium', price: '85000.00', quantity: 1 },
    ],
  },
  // ── 9 ─────────────────────────────────────────────────────────────
  {
    id: 50009,
    number: 1009,
    state: 'closed',
    customer: {
      id: 90009,
      name: 'Matías Ledesma',
      email: 'matias.ledesma@gmail.com',
      phone: '+54 299 234-5678',
      identification: '33.012.345',
    },
    total: '40000.00',
    currency: 'ARS',
    created_at: '2024-11-18T12:45:00-03:00',
    products: [
      { name: 'Pantalón APES Cargo', price: '40000.00', quantity: 1 },
    ],
  },
  // ── 10 ────────────────────────────────────────────────────────────
  {
    id: 50010,
    number: 1010,
    state: 'closed',
    customer: {
      id: 90010,
      name: 'Rocío Domínguez',
      email: 'rocio.dom@live.com',
      phone: '+54 11 7890-1234',
      identification: '37.890.123',
    },
    total: '18000.00',
    currency: 'ARS',
    created_at: '2025-02-03T15:30:00-03:00',
    products: [
      { name: 'Gorra APES Logo', price: '18000.00', quantity: 1 },
    ],
  },
  // ── 11 ────────────────────────────────────────────────────────────
  {
    id: 50011,
    number: 1011,
    state: 'closed',
    customer: {
      id: 90011,
      name: 'Ignacio Fuentes',
      email: 'nacho.fuentes@gmail.com',
      phone: '+54 351 345-6789',
      identification: '30.345.678',
    },
    total: '110000.00',
    currency: 'ARS',
    created_at: '2024-12-25T20:00:00-03:00',
    products: [
      { name: 'Jean APES Slim', price: '65000.00', quantity: 1 },
      { name: 'Hoodie APES Urban', price: '45000.00', quantity: 1 },
    ],
  },
  // ── 12 ────────────────────────────────────────────────────────────
  {
    id: 50012,
    number: 1012,
    state: 'open',
    customer: {
      id: 90012,
      name: 'Candela Bustos',
      email: 'candela.bustos@outlook.com',
      phone: '+54 223 456-7890',
      identification: '39.567.890',
    },
    total: '30000.00',
    currency: 'ARS',
    created_at: '2025-03-08T10:15:00-03:00',
    products: [
      { name: 'Bermuda APES Summer', price: '30000.00', quantity: 1 },
    ],
  },
  // ── 13 ────────────────────────────────────────────────────────────
  {
    id: 50013,
    number: 1013,
    state: 'closed',
    customer: {
      id: 90013,
      name: 'Joaquín Morales',
      email: 'jmorales@gmail.com',
      phone: '+54 341 789-0123',
      identification: '26.456.789',
    },
    total: '25000.00',
    currency: 'ARS',
    created_at: '2025-04-15T14:00:00-03:00',
    products: [
      { name: 'Remera APES Classic', price: '25000.00', quantity: 1 },
    ],
  },
  // ── 14 — OVERLAP HC-011 Emiliano Castro (DNI match) ───────────────
  {
    id: 50014,
    number: 1014,
    state: 'closed',
    customer: {
      id: 90014,
      name: 'Emiliano Castro',
      email: 'emiliano.castro.real@gmail.com', // real email — replaces @noinformado
      phone: '+54 299 999-8888',                // different phone
      identification: '38.012.345',             // same DNI as HC-011
    },
    total: '25000.00',
    currency: 'ARS',
    created_at: '2025-06-10T09:00:00-03:00',
    products: [
      { name: 'Remera APES Classic', price: '25000.00', quantity: 1 },
    ],
  },
  // ── 15 ────────────────────────────────────────────────────────────
  {
    id: 50015,
    number: 1015,
    state: 'closed',
    customer: {
      id: 90015,
      name: 'Martina Sánchez',
      email: 'martina.sanchez@gmail.com',
      phone: '+54 261 890-1234',
      identification: '35.234.567',
    },
    total: '65000.00',
    currency: 'ARS',
    created_at: '2024-10-30T11:45:00-03:00',
    products: [
      { name: 'Jean APES Slim', price: '65000.00', quantity: 1 },
    ],
  },
  // ── 16 ────────────────────────────────────────────────────────────
  {
    id: 50016,
    number: 1016,
    state: 'cancelled',
    customer: {
      id: 90016,
      name: 'Ezequiel Romero',
      email: 'ezeromero@yahoo.com',
      phone: '+54 381 567-8902',
      identification: '40.678.901',
    },
    total: '72000.00',
    currency: 'ARS',
    created_at: '2025-01-28T16:30:00-03:00',
    products: [
      { name: 'Campera APES Premium', price: '72000.00', quantity: 1 },
    ],
  },
  // ── 17 ────────────────────────────────────────────────────────────
  {
    id: 50017,
    number: 1017,
    state: 'closed',
    customer: {
      id: 90017,
      name: 'Delfina Gutiérrez',
      email: 'delfina.gut@gmail.com',
      phone: '+54 342 890-1234',
      identification: '38.901.234',
    },
    total: '70000.00',
    currency: 'ARS',
    created_at: '2025-03-20T13:00:00-03:00',
    products: [
      { name: 'Hoodie APES Urban', price: '45000.00', quantity: 1 },
      { name: 'Remera APES Classic', price: '25000.00', quantity: 1 },
    ],
  },
  // ── 18 ────────────────────────────────────────────────────────────
  {
    id: 50018,
    number: 1018,
    state: 'closed',
    customer: {
      id: 90018,
      name: 'Lautaro Benítez',
      email: 'lautaro.benitez@hotmail.com',
      phone: '+54 387 678-9012',
      identification: '27.012.345',
    },
    total: '85000.00',
    currency: 'ARS',
    created_at: '2024-11-05T18:20:00-03:00',
    products: [
      { name: 'Campera APES Premium', price: '85000.00', quantity: 1 },
    ],
  },
  // ── 19 — OVERLAP HC-017 Diego Navarro (phone match, was abandoned) ─
  {
    id: 50019,
    number: 1019,
    state: 'closed',
    customer: {
      id: 90019,
      name: 'Diego Navarro',
      email: 'diego.navarro@gmail.com',
      phone: '+54 11 2345-6789', // same phone as HC-017
      identification: '41.234.567',
    },
    total: '45000.00',
    currency: 'ARS',
    created_at: '2025-06-15T12:00:00-03:00',
    products: [
      { name: 'Hoodie APES Urban', price: '45000.00', quantity: 1 },
    ],
  },
  // ── 20 ────────────────────────────────────────────────────────────
  {
    id: 50020,
    number: 1020,
    state: 'open',
    customer: {
      id: 90020,
      name: 'Bianca Figueroa',
      email: 'bianca.fig@gmail.com',
      phone: '+54 11 8901-2345',
      identification: '36.123.890',
    },
    total: '90000.00',
    currency: 'ARS',
    created_at: '2025-05-22T09:30:00-03:00',
    products: [
      { name: 'Jean APES Slim', price: '65000.00', quantity: 1 },
      { name: 'Remera APES Classic', price: '25000.00', quantity: 1 },
    ],
  },
  // ── 21 ────────────────────────────────────────────────────────────
  {
    id: 50021,
    number: 1021,
    state: 'closed',
    customer: {
      id: 90021,
      name: 'Thiago Villalba',
      email: 'thiago.villalba@gmail.com',
      phone: '+54 299 345-6780',
      identification: '41.890.123',
    },
    total: '45000.00',
    currency: 'ARS',
    created_at: '2025-04-28T15:45:00-03:00',
    products: [
      { name: 'Buzo APES Street', price: '45000.00', quantity: 1 },
    ],
  },
  // ── 22 ────────────────────────────────────────────────────────────
  {
    id: 50022,
    number: 1022,
    state: 'closed',
    customer: {
      id: 90022,
      name: 'Abril Campos',
      email: 'abril.campos@outlook.com',
      phone: '+54 221 234-5670',
      identification: '39.234.567',
    },
    total: '110000.00',
    currency: 'ARS',
    created_at: '2025-06-02T11:00:00-03:00',
    products: [
      { name: 'Campera APES Premium', price: '72000.00', quantity: 1 },
      { name: 'Gorra APES Logo', price: '18000.00', quantity: 1 },
      { name: 'Remera APES Classic', price: '20000.00', quantity: 1 },
    ],
  },
];

export default mockTiendanubeOrders;
