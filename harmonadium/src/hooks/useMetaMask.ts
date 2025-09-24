import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { MONAD_TESTNET_CONFIG } from '@/lib/config';
import { autoSwapManager, SwapAuthorization } from '@/lib/authorization';

interface MetaMaskAccount {
  address: string;
  balance: string;
  chainId: number;
}

interface UseMetaMaskReturn {
  account: MetaMaskAccount | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToMonadTestnet: () => Promise<void>;
  sendTransaction: (transaction: any) => Promise<string>;
  requestSwapAuthorization: () => Promise<SwapAuthorization>;
  isAuthorizedForSwaps: boolean;
  authorizationStatus: any;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function useMetaMask(): UseMetaMaskReturn {
  const [account, setAccount] = useState<MetaMaskAccount | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthorizedForSwaps, setIsAuthorizedForSwaps] = useState(false);
  const [authorizationStatus, setAuthorizationStatus] = useState(null);

  const checkConnection = useCallback(async () => {
    if (typeof window.ethereum === 'undefined') {
      setError('MetaMask is not installed');
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.listAccounts();

      if (accounts.length > 0) {
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        const balance = await provider.getBalance(address);
        const network = await provider.getNetwork();

        setAccount({
          address,
          balance: ethers.formatEther(balance),
          chainId: Number(network.chainId),
        });
        setIsConnected(true);

        // Check authorization status
        const authStatus = autoSwapManager.getAuthorizationStatus(address);
        setIsAuthorizedForSwaps(authStatus.isValid);
        setAuthorizationStatus(authStatus);
      }
    } catch (err) {
      console.error('Failed to check connection:', err);
      setError('Failed to check connection');
    }
  }, []);

  const connect = useCallback(async () => {
    if (typeof window.ethereum === 'undefined') {
      setError('MetaMask is not installed');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      await checkConnection();
    } catch (err: any) {
      console.error('Failed to connect:', err);
      setError(err.message || 'Failed to connect to MetaMask');
    } finally {
      setIsConnecting(false);
    }
  }, [checkConnection]);

  const disconnect = useCallback(() => {
    if (account) {
      autoSwapManager.clearAllAuthorizations();
    }
    setAccount(null);
    setIsConnected(false);
    setIsAuthorizedForSwaps(false);
    setAuthorizationStatus(null);
    setError(null);
    console.log('🔌 Wallet disconnected and authorizations cleared');
  }, [account]);

  const switchToMonadTestnet = useCallback(async () => {
    if (typeof window.ethereum === 'undefined') {
      setError('MetaMask is not installed');
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${MONAD_TESTNET_CONFIG.chainId.toString(16)}` }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${MONAD_TESTNET_CONFIG.chainId.toString(16)}`,
                chainName: MONAD_TESTNET_CONFIG.name,
                nativeCurrency: MONAD_TESTNET_CONFIG.nativeCurrency,
                rpcUrls: [MONAD_TESTNET_CONFIG.rpcUrl],
                blockExplorerUrls: [MONAD_TESTNET_CONFIG.blockExplorerUrl],
              },
            ],
          });
        } catch (addError: any) {
          console.error('Failed to add Monad testnet:', addError);
          setError('Failed to add Monad testnet');
        }
      } else {
        console.error('Failed to switch to Monad testnet:', switchError);
        setError('Failed to switch to Monad testnet');
      }
    }
  }, []);

  const sendTransaction = useCallback(async (transaction: any): Promise<string> => {
    if (!account) throw new Error('No account connected');

    console.log('Sending transaction:', transaction);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Ensure transaction has proper format
      const txRequest = {
        to: transaction.to,
        data: transaction.data,
        value: transaction.value || '0x0',
        gasLimit: transaction.gasLimit,
        gasPrice: transaction.gasPrice,
      };

      console.log('Transaction request:', txRequest);

      const tx = await signer.sendTransaction(txRequest);
      console.log('Transaction sent:', tx.hash);

      return tx.hash;
    } catch (error) {
      console.error('Transaction failed:', error);
      throw error;
    }
  }, [account]);

  const requestSwapAuthorization = useCallback(async (): Promise<SwapAuthorization> => {
    if (!account) throw new Error('No account connected');

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const authorization = await autoSwapManager.requestOneTimeAuthorization(account.address, provider);

      // Update authorization status
      const authStatus = autoSwapManager.getAuthorizationStatus(account.address);
      setIsAuthorizedForSwaps(authStatus.isValid);
      setAuthorizationStatus(authStatus);

      return authorization;
    } catch (error: any) {
      console.error('Authorization request failed:', error);
      throw error;
    }
  }, [account]);

  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnect();
        } else {
          checkConnection();
        }
      });

      window.ethereum.on('chainChanged', () => {
        checkConnection();
      });

      checkConnection();

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', checkConnection);
          window.ethereum.removeListener('chainChanged', checkConnection);
        }
      };
    }
  }, [checkConnection, disconnect]);

  return {
    account,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    switchToMonadTestnet,
    sendTransaction,
    requestSwapAuthorization,
    isAuthorizedForSwaps,
    authorizationStatus,
  };
}