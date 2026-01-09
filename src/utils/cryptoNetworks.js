/**
 * Constantes para redes de criptomonedas
 * Incluye las redes mas populares con sus colores e iconos
 */

// Definicion de redes soportadas
export const CRYPTO_NETWORKS = {
  bitcoin: {
    id: 'bitcoin',
    name: 'Bitcoin',
    symbol: 'BTC',
    color: '#F7931A',
    icon: 'pi pi-bitcoin',
    addressPrefix: ['1', '3', 'bc1'],
    description: 'La criptomoneda original'
  },
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    symbol: 'ETH',
    color: '#627EEA',
    icon: 'pi pi-ethereum',
    addressPrefix: ['0x'],
    description: 'Smart contracts y tokens ERC-20'
  },
  solana: {
    id: 'solana',
    name: 'Solana',
    symbol: 'SOL',
    color: '#9945FF',
    icon: 'pi pi-bolt',
    addressPrefix: [],
    description: 'Blockchain de alta velocidad'
  },
  polygon: {
    id: 'polygon',
    name: 'Polygon',
    symbol: 'MATIC',
    color: '#8247E5',
    icon: 'pi pi-sitemap',
    addressPrefix: ['0x'],
    description: 'Layer 2 de Ethereum'
  },
  bnb: {
    id: 'bnb',
    name: 'BNB Smart Chain',
    symbol: 'BNB',
    color: '#F3BA2F',
    icon: 'pi pi-money-bill',
    addressPrefix: ['0x', 'bnb'],
    description: 'Binance Smart Chain'
  },
  cardano: {
    id: 'cardano',
    name: 'Cardano',
    symbol: 'ADA',
    color: '#0033AD',
    icon: 'pi pi-box',
    addressPrefix: ['addr'],
    description: 'Proof of Stake avanzado'
  },
  avalanche: {
    id: 'avalanche',
    name: 'Avalanche',
    symbol: 'AVAX',
    color: '#E84142',
    icon: 'pi pi-chart-pie',
    addressPrefix: ['0x', 'X-', 'P-', 'C-'],
    description: 'Plataforma de subnets'
  },
  cosmos: {
    id: 'cosmos',
    name: 'Cosmos',
    symbol: 'ATOM',
    color: '#2E3148',
    icon: 'pi pi-globe',
    addressPrefix: ['cosmos'],
    description: 'Internet de blockchains (IBC)'
  },
  polkadot: {
    id: 'polkadot',
    name: 'Polkadot',
    symbol: 'DOT',
    color: '#E6007A',
    icon: 'pi pi-share-alt',
    addressPrefix: ['1'],
    description: 'Parachains interoperables'
  },
  arbitrum: {
    id: 'arbitrum',
    name: 'Arbitrum',
    symbol: 'ARB',
    color: '#28A0F0',
    icon: 'pi pi-arrow-right-arrow-left',
    addressPrefix: ['0x'],
    description: 'Layer 2 de Ethereum (Optimistic Rollup)'
  },
  xrp: {
    id: 'xrp',
    name: 'XRP Ledger',
    symbol: 'XRP',
    color: '#23292F',
    icon: 'pi pi-sync',
    addressPrefix: ['r'],
    description: 'Pagos rapidos (Ripple)'
  },
  tron: {
    id: 'tron',
    name: 'Tron',
    symbol: 'TRX',
    color: '#FF0013',
    icon: 'pi pi-play',
    addressPrefix: ['T'],
    description: 'DApps y entretenimiento'
  },
  other: {
    id: 'other',
    name: 'Otra red',
    symbol: '',
    color: '#6B7280',
    icon: 'pi pi-question-circle',
    addressPrefix: [],
    description: 'Red personalizada'
  }
};

// Array ordenado para dropdowns
export const CRYPTO_NETWORKS_LIST = [
  CRYPTO_NETWORKS.bitcoin,
  CRYPTO_NETWORKS.ethereum,
  CRYPTO_NETWORKS.solana,
  CRYPTO_NETWORKS.polygon,
  CRYPTO_NETWORKS.bnb,
  CRYPTO_NETWORKS.cardano,
  CRYPTO_NETWORKS.avalanche,
  CRYPTO_NETWORKS.cosmos,
  CRYPTO_NETWORKS.polkadot,
  CRYPTO_NETWORKS.arbitrum,
  CRYPTO_NETWORKS.xrp,
  CRYPTO_NETWORKS.tron,
  CRYPTO_NETWORKS.other
];

// Opciones para dropdown de PrimeReact
export const CRYPTO_NETWORK_OPTIONS = CRYPTO_NETWORKS_LIST.map(network => ({
  label: network.name + (network.symbol ? ' (' + network.symbol + ')' : ''),
  value: network.id,
  color: network.color,
  icon: network.icon
}));

/**
 * Obtiene la informacion de una red por su ID
 * @param {string} networkId
 * @returns {object|null}
 */
export const getNetworkById = (networkId) => {
  return CRYPTO_NETWORKS[networkId] || null;
};

/**
 * Obtiene el color de una red
 * @param {string} networkId
 * @returns {string}
 */
export const getNetworkColor = (networkId) => {
  return CRYPTO_NETWORKS[networkId]?.color || '#6B7280';
};

/**
 * Obtiene el icono de una red
 * @param {string} networkId
 * @returns {string}
 */
export const getNetworkIcon = (networkId) => {
  return CRYPTO_NETWORKS[networkId]?.icon || 'pi pi-question-circle';
};
