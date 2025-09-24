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

// Mock swap service for testing Monad testnet until 0x supports it
export class MockSwapService {
  private apiKey: string | null = null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || null;
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  private generateMockSwapQuote(params: SwapParams): SwapQuote {
    // Simulate a simple 1:1 token swap for testing
    const mockExchangeRate = 1.0; // 1 MON = 1 Token for testing
    const sellAmountBN = ethers.parseEther('0.01'); // Use fixed amount for testing
    const buyAmountBN = ethers.parseEther((0.01 * mockExchangeRate).toString());

    return {
      sellToken: params.sellToken,
      buyToken: params.buyToken,
      sellAmount: sellAmountBN.toString(),
      buyAmount: buyAmountBN.toString(),
      to: params.buyToken, // Mock: send directly to token contract
      data: this.generateMockCallData(params.buyToken, sellAmountBN.toString()),
      value: sellAmountBN.toString(),
      gasPrice: ethers.parseUnits('20', 'gwei').toString(),
      gas: '100000',
    };
  }

  private generateMockCallData(tokenAddress: string, amount: string): string {
    // Mock ERC20 transfer call data for testing
    // transfer(address to, uint256 amount)
    const iface = new ethers.Interface([
      'function transfer(address to, uint256 amount) returns (bool)'
    ]);

    // This is a mock - in reality you'd call a DEX contract
    return iface.encodeFunctionData('transfer', [tokenAddress, amount]);
  }

  async getSwapQuote(params: SwapParams): Promise<SwapQuote> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('Mock swap quote requested:', params);

    return this.generateMockSwapQuote(params);
  }

  async getSwapPrice(params: Omit<SwapParams, 'takerAddress'>): Promise<{
    sellToken: string;
    buyToken: string;
    sellAmount: string;
    buyAmount: string;
    price: string;
  }> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const mockExchangeRate = 1.0;
    const sellAmountBN = ethers.parseEther('0.01');
    const buyAmountBN = ethers.parseEther((0.01 * mockExchangeRate).toString());

    return {
      sellToken: params.sellToken,
      buyToken: params.buyToken,
      sellAmount: sellAmountBN.toString(),
      buyAmount: buyAmountBN.toString(),
      price: mockExchangeRate.toString(),
    };
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
    // Mock: assume all testnet tokens have liquidity
    const supportedTokens = Object.values(TESTNET_TOKENS);
    return supportedTokens.includes(tokenAddress as any);
  }
}

export const mockSwapService = new MockSwapService();

export interface SwapTransaction {
  from: string;
  to: string;
  data: string;
  value: string;
  gasPrice: string;
  gasLimit: string;
}

export function createMockSwapTransaction(quote: SwapQuote, fromAddress: string): SwapTransaction {
  return {
    from: fromAddress,
    to: quote.to,
    data: quote.data,
    value: quote.value,
    gasPrice: quote.gasPrice,
    gasLimit: quote.gas,
  };
}