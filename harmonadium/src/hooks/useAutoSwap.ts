import { useState, useEffect, useCallback } from 'react';
import { realSwapService, createSwapTransaction } from '@/lib/realSwap';
import { autoSwapManager } from '@/lib/authorization';
import { getTargetTokenForAngle, MIN_VISIBLE_ANGLE } from '@/lib/config';
import { ethers } from 'ethers';

interface SwapExecutionResult {
  success: boolean;
  txHash?: string;
  error?: string;
  timestamp: number;
  angle: number;
  token: string;
}

interface UseAutoSwapReturn {
  isEnabled: boolean;
  lastSwap: SwapExecutionResult | null;
  swapHistory: SwapExecutionResult[];
  executeSwap: (angle: number, userAddress: string, sendTransaction: (tx: any) => Promise<string>) => Promise<SwapExecutionResult>;
}

export function useAutoSwap(): UseAutoSwapReturn {
  const [isEnabled, setIsEnabled] = useState(false);
  const [lastSwap, setLastSwap] = useState<SwapExecutionResult | null>(null);
  const [swapHistory, setSwapHistory] = useState<SwapExecutionResult[]>([]);

  // Load swap history from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('lidangle_swap_history');
      if (stored) {
        setSwapHistory(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load swap history:', error);
    }
  }, []);

  // Save swap history to localStorage
  const saveSwapHistory = useCallback((history: SwapExecutionResult[]) => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('lidangle_swap_history', JSON.stringify(history.slice(0, 50))); // Keep last 50
    } catch (error) {
      console.error('Failed to save swap history:', error);
    }
  }, []);

  // Update enabled state based on authorization
  useEffect(() => {
    const checkEnabled = () => {
      setIsEnabled(autoSwapManager.isAutoSwapEnabled());
    };

    checkEnabled();

    // Check every 5 seconds in case authorization expires
    const interval = setInterval(checkEnabled, 5000);
    return () => clearInterval(interval);
  }, []);

  const executeSwap = useCallback(async (
    angle: number,
    userAddress: string,
    sendTransaction: (tx: any) => Promise<string>
  ): Promise<SwapExecutionResult> => {
    const timestamp = Date.now();

    try {
      console.log(`🔄 Executing auto-swap for angle ${angle}°`);

      // Validate authorization
      if (!autoSwapManager.isAuthorized(userAddress)) {
        throw new Error('Not authorized for automatic swaps');
      }

      // Validate angle and get target token
      if (angle < MIN_VISIBLE_ANGLE) {
        throw new Error(`Angle too low: ${angle}° (minimum: ${MIN_VISIBLE_ANGLE}°)`);
      }

      const targetToken = getTargetTokenForAngle(angle);
      if (!targetToken) {
        throw new Error(`No token mapped for angle: ${angle}°`);
      }

      console.log(`🎯 Target token: ${targetToken.symbol} for angle ${angle}°`);

      // Get swap amount from authorization
      const maxAmount = autoSwapManager.getMaxSwapAmount();
      const swapAmount = ethers.parseEther('0.01').toString(); // Use 0.01 MON per swap

      if (BigInt(swapAmount) > BigInt(maxAmount)) {
        throw new Error(`Swap amount exceeds authorized limit: ${swapAmount} > ${maxAmount}`);
      }

      // Get swap quote from 0x API (or fallback to mock)
      console.log('🔍 Getting swap quote...');
      const quote = await realSwapService.swapMonadToToken(
        targetToken.address,
        swapAmount,
        userAddress,
        10143, // Monad testnet chain ID
        0.01   // 1% slippage
      );

      console.log('💱 Received swap quote:', {
        sellAmount: quote.sellAmount,
        buyAmount: quote.buyAmount,
        to: quote.to,
      });

      // Create transaction
      const transaction = createSwapTransaction(quote, userAddress);

      console.log('📝 Created transaction:', {
        to: transaction.to,
        value: transaction.value,
        gasLimit: transaction.gasLimit,
      });

      // Execute transaction
      console.log('⚡ Executing transaction...');
      const txHash = await sendTransaction(transaction);

      console.log(`✅ Swap completed! TX: ${txHash}`);

      const result: SwapExecutionResult = {
        success: true,
        txHash,
        timestamp,
        angle,
        token: targetToken.symbol,
      };

      setLastSwap(result);
      setSwapHistory(prev => {
        const newHistory = [result, ...prev];
        saveSwapHistory(newHistory);
        return newHistory;
      });

      return result;

    } catch (error: any) {
      console.error('❌ Auto-swap failed:', error);

      const result: SwapExecutionResult = {
        success: false,
        error: error.message,
        timestamp,
        angle,
        token: 'Unknown',
      };

      setLastSwap(result);
      setSwapHistory(prev => {
        const newHistory = [result, ...prev];
        saveSwapHistory(newHistory);
        return newHistory;
      });

      return result;
    }
  }, [saveSwapHistory]);

  return {
    isEnabled,
    lastSwap,
    swapHistory,
    executeSwap,
  };
}