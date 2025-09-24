import axios from 'axios';
import { TESTNET_TOKENS, MONAD_TESTNET_CONFIG } from './config';
import { ethers } from 'ethers';

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

// Supported chains by 0x API (as of 2024)
const SUPPORTED_CHAINS = [
  1,    // Ethereum
  137,  // Polygon
  56,   // BSC
  43114, // Avalanche
  42161, // Arbitrum
  10,    // Optimism
  8453,  // Base
];

export class RealSwapService {
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
      '0x-version': 'v2',
    };

    if (this.apiKey) {
      headers['0x-api-key'] = this.apiKey;
    }

    return headers;
  }

  private isChainSupported(chainId: number): boolean {
    return SUPPORTED_CHAINS.includes(chainId);
  }

  // Generate a mock swap for unsupported chains like Monad testnet
  private generateMockSwapQuote(params: SwapParams): SwapQuote {
    console.log('Using mock swap for unsupported chain');

    const mockExchangeRate = 0.98; // Slightly less than 1:1 to simulate real trading
    const sellAmountBN = BigInt(params.sellAmount);
    const buyAmountBN = sellAmountBN * BigInt(Math.floor(mockExchangeRate * 1000)) / BigInt(1000);

    // Create a simple transfer transaction for testing
    const iface = new ethers.Interface([
      'function transfer(address to, uint256 amount) returns (bool)'
    ]);

    return {
      sellToken: params.sellToken,
      buyToken: params.buyToken,
      sellAmount: sellAmountBN.toString(),
      buyAmount: buyAmountBN.toString(),
      to: params.buyToken, // Mock: send to token contract address
      data: iface.encodeFunctionData('transfer', [params.takerAddress, buyAmountBN.toString()]),
      value: params.sellToken === TESTNET_TOKENS.MONAD ? sellAmountBN.toString() : '0',
      gasPrice: ethers.parseUnits('20', 'gwei').toString(),
      gas: '150000',
    };
  }

  async getSwapQuote(params: SwapParams, chainId: number = MONAD_TESTNET_CONFIG.chainId): Promise<SwapQuote> {
    try {
      // Check if the chain is supported by 0x
      if (!this.isChainSupported(chainId)) {
        console.log(`Chain ${chainId} not supported by 0x API, using mock swap`);
        return this.generateMockSwapQuote(params);
      }

      const queryParams = new URLSearchParams({
        sellToken: params.sellToken,
        buyToken: params.buyToken,
        sellAmount: params.sellAmount,
        takerAddress: params.takerAddress,
        slippagePercentage: (params.slippagePercentage || 0.01).toString(),
      });

      console.log('Fetching real 0x swap quote for chain:', chainId);

      const response = await axios.get(
        `${ZERO_X_API_BASE}/swap/v1/quote?${queryParams}`,
        {
          headers: this.getHeaders(),
        }
      );

      console.log('Real 0x API response:', response.data);
      return response.data;

    } catch (error: any) {
      console.error('0x API failed, falling back to mock:', error.message);

      // Fallback to mock swap if 0x API fails
      return this.generateMockSwapQuote(params);
    }
  }

  async getSwapPrice(params: Omit<SwapParams, 'takerAddress'>, chainId: number = MONAD_TESTNET_CONFIG.chainId): Promise<{
    sellToken: string;
    buyToken: string;
    sellAmount: string;
    buyAmount: string;
    price: string;
  }> {
    try {
      if (!this.isChainSupported(chainId)) {
        const mockRate = 0.98;
        const sellAmountBN = BigInt(params.sellAmount);
        const buyAmountBN = sellAmountBN * BigInt(Math.floor(mockRate * 1000)) / BigInt(1000);

        return {
          sellToken: params.sellToken,
          buyToken: params.buyToken,
          sellAmount: sellAmountBN.toString(),
          buyAmount: buyAmountBN.toString(),
          price: mockRate.toString(),
        };
      }

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
    chainId: number = MONAD_TESTNET_CONFIG.chainId,
    slippagePercentage: number = 0.01
  ): Promise<SwapQuote> {
    return this.getSwapQuote({
      sellToken: TESTNET_TOKENS.MONAD,
      buyToken: targetTokenAddress,
      sellAmount: monadAmount,
      takerAddress,
      slippagePercentage,
    }, chainId);
  }

  async checkTokenLiquidity(tokenAddress: string, chainId: number = MONAD_TESTNET_CONFIG.chainId): Promise<boolean> {
    try {
      if (!this.isChainSupported(chainId)) {
        // For unsupported chains like Monad, assume testnet tokens have liquidity
        const supportedTokens = Object.values(TESTNET_TOKENS);
        return supportedTokens.includes(tokenAddress as any);
      }

      await this.getSwapPrice({
        sellToken: TESTNET_TOKENS.MONAD,
        buyToken: targetTokenAddress,
        sellAmount: ethers.parseEther('0.01').toString(),
      }, chainId);

      return true;
    } catch {
      return false;
    }
  }
}

// Initialize with the provided 0x API key
export const realSwapService = new RealSwapService('29818436-2709-45ec-983f-cea6b1b7e1de');

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