import axios from 'axios';
import { TESTNET_TOKENS, MONAD_TESTNET_CONFIG } from './config';

interface SwapQuote {
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  buyAmount: string;
  to: string;
  data: string;
  value: string;
  gasPrice: string;
  gas: string;
}

interface SwapParams {
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  takerAddress: string;
  slippagePercentage?: number;
}

const ZERO_X_API_BASE = 'https://api.0x.org';

export class SwapService {
  private apiKey: string | null = null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || null;
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['0x-api-key'] = this.apiKey;
    }

    return headers;
  }

  async getSwapQuote(params: SwapParams): Promise<SwapQuote> {
    try {
      const queryParams = new URLSearchParams({
        sellToken: params.sellToken,
        buyToken: params.buyToken,
        sellAmount: params.sellAmount,
        takerAddress: params.takerAddress,
        slippagePercentage: (params.slippagePercentage || 0.01).toString(),
      });

      const response = await axios.get(
        `${ZERO_X_API_BASE}/swap/v1/quote?${queryParams}`,
        {
          headers: this.getHeaders(),
        }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to get swap quote:', error);
      throw new Error('Failed to get swap quote');
    }
  }

  async getSwapPrice(params: Omit<SwapParams, 'takerAddress'>): Promise<{
    sellToken: string;
    buyToken: string;
    sellAmount: string;
    buyAmount: string;
    price: string;
  }> {
    try {
      const queryParams = new URLSearchParams({
        sellToken: params.sellToken,
        buyToken: params.buyToken,
        sellAmount: params.sellAmount,
        slippagePercentage: (params.slippagePercentage || 0.01).toString(),
      });

      const response = await axios.get(
        `${ZERO_X_API_BASE}/swap/v1/price?${queryParams}`,
        {
          headers: this.getHeaders(),
        }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to get swap price:', error);
      throw new Error('Failed to get swap price');
    }
  }

  async swapMonadToToken(
    targetTokenAddress: string,
    monadAmount: string,
    takerAddress: string,
    slippagePercentage: number = 0.01
  ): Promise<SwapQuote> {
    return this.getSwapQuote({
      sellToken: TESTNET_TOKENS.MONAD,
      buyToken: targetTokenAddress,
      sellAmount: monadAmount,
      takerAddress,
      slippagePercentage,
    });
  }

  async getMonadToTokenPrice(
    targetTokenAddress: string,
    monadAmount: string,
    slippagePercentage: number = 0.01
  ): Promise<{
    sellToken: string;
    buyToken: string;
    sellAmount: string;
    buyAmount: string;
    price: string;
  }> {
    return this.getSwapPrice({
      sellToken: TESTNET_TOKENS.MONAD,
      buyToken: targetTokenAddress,
      sellAmount: monadAmount,
      slippagePercentage,
    });
  }

  async checkTokenLiquidity(tokenAddress: string): Promise<boolean> {
    try {
      await this.getSwapPrice({
        sellToken: TESTNET_TOKENS.MONAD,
        buyToken: tokenAddress,
        sellAmount: '1000000000000000000',
      });
      return true;
    } catch {
      return false;
    }
  }
}

export const swapService = new SwapService();

export interface SwapTransaction {
  from: string;
  to: string;
  data: string;
  value: string;
  gasPrice: string;
  gasLimit: string;
}

export function createSwapTransaction(quote: SwapQuote, fromAddress: string): SwapTransaction {
  return {
    from: fromAddress,
    to: quote.to,
    data: quote.data,
    value: quote.value,
    gasPrice: quote.gasPrice,
    gasLimit: quote.gas,
  };
}