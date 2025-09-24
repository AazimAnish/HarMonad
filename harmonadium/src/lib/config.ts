export const MONAD_TESTNET_CONFIG = {
  chainId: 10143,
  name: 'Monad Testnet',
  rpcUrl: 'https://testnet-rpc.monad.xyz',
  blockExplorerUrl: 'https://testnet.monadexplorer.com',
  nativeCurrency: {
    name: 'MON',
    symbol: 'MON',
    decimals: 18,
  },
} as const;

export const TESTNET_TOKENS = {
  MONAD: '0x0000000000000000000000000000000000000000',
  USDC: '0xf817257fed379853cDe0fa4F97AB987181B1E5Ea',
  USDT: '0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D',
  WBTC: '0xcf5a6076cfa32686c0Df13aBaDa2b40dec133F1d',
  WETH: '0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37',
  WSOL: '0x5387C85A4965769f6B0Df430638a1388493486F1',
} as const;

export const ANGLE_TO_TOKEN_MAPPING = {
  '20-35': { token: 'USDC', address: TESTNET_TOKENS.USDC, name: 'USD Coin', symbol: 'USDC' },
  '35-50': { token: 'USDT', address: TESTNET_TOKENS.USDT, name: 'Tether USD', symbol: 'USDT' },
  '50-65': { token: 'WBTC', address: TESTNET_TOKENS.WBTC, name: 'Wrapped Bitcoin', symbol: 'WBTC' },
  '65-80': { token: 'WETH', address: TESTNET_TOKENS.WETH, name: 'Wrapped Ethereum', symbol: 'WETH' },
  '80-135': { token: 'WSOL', address: TESTNET_TOKENS.WSOL, name: 'Wrapped Solana', symbol: 'WSOL' },
} as const;

export const MIN_VISIBLE_ANGLE = 20;
export const MAX_OPENING_ANGLE = 135;
export const DEBOUNCE_TIME_MS = 3000;

export function getTargetTokenForAngle(angle: number) {
  if (angle < MIN_VISIBLE_ANGLE) return null;

  if (angle >= 20 && angle < 35) return ANGLE_TO_TOKEN_MAPPING['20-35'];
  if (angle >= 35 && angle < 50) return ANGLE_TO_TOKEN_MAPPING['35-50'];
  if (angle >= 50 && angle < 65) return ANGLE_TO_TOKEN_MAPPING['50-65'];
  if (angle >= 65 && angle < 80) return ANGLE_TO_TOKEN_MAPPING['65-80'];
  if (angle >= 80 && angle <= MAX_OPENING_ANGLE) return ANGLE_TO_TOKEN_MAPPING['80-135'];

  return null;
}

export function getAngleRangeForToken(tokenSymbol: string) {
  for (const [range, token] of Object.entries(ANGLE_TO_TOKEN_MAPPING)) {
    if (token.symbol === tokenSymbol) {
      const [min, max] = range.split('-').map(Number);
      return { min, max, range };
    }
  }
  return null;
}