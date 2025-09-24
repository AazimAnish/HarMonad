import { useState, useEffect, useCallback, useRef } from 'react';
import { MetaMaskSDK } from '@metamask/sdk';
import { ethers } from 'ethers';
import { MONAD_TESTNET_CONFIG } from '@/lib/config';
import { autoSwapManager, SwapAuthorization } from '@/lib/authorization';

interface MetaMaskAccount {
  address: string;
  balance: string;
  chainId: number;
}

interface UseMetaMaskSDKReturn {
  account: MetaMaskAccount | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  switchToMonadTestnet: () => Promise<void>;
  sendTransaction: (transaction: any) => Promise<string>;
  requestSwapAuthorization: () => Promise<SwapAuthorization>;
  isAuthorizedForSwaps: boolean;
  authorizationStatus: any;
}

export function useMetaMaskSDK(): UseMetaMaskSDKReturn {
  const [account, setAccount] = useState<MetaMaskAccount | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthorizedForSwaps, setIsAuthorizedForSwaps] = useState(false);
  const [authorizationStatus, setAuthorizationStatus] = useState(null);

  const sdkRef = useRef<MetaMaskSDK | null>(null);
  const providerRef = useRef<any>(null);

  // Initialize MetaMask SDK
  useEffect(() => {
    if (typeof window !== 'undefined' && !sdkRef.current) {
      console.log('🔌 Initializing MetaMask SDK...');

      sdkRef.current = new MetaMaskSDK({
        dappMetadata: {
          name: 'LidAngle DeFi',
          url: window.location.origin,
        },
        logging: {
          developerMode: false,
        },
        checkInstallationImmediately: false,
        checkInstallationOnAllCalls: true,
      });

      providerRef.current = sdkRef.current.getProvider();

      // Set up event listeners
      if (providerRef.current) {
        providerRef.current.on('accountsChanged', handleAccountsChanged);
        providerRef.current.on('chainChanged', handleChainChanged);
        providerRef.current.on('disconnect', handleDisconnect);

        // Check if already connected
        checkConnection();
      }
    }

    return () => {
      if (providerRef.current) {
        providerRef.current.removeAllListeners();
      }
    };
  }, []);

  const handleAccountsChanged = useCallback((accounts: string[]) => {
    console.log('🔄 Accounts changed:', accounts);

    if (accounts.length === 0) {
      handleDisconnect();
    } else {
      checkConnection();
    }
  }, []);

  const handleChainChanged = useCallback((chainId: string) => {
    console.log('🔄 Chain changed:', chainId);
    checkConnection();
  }, []);

  const handleDisconnect = useCallback(() => {
    console.log('🔌 MetaMask disconnected');

    if (account) {
      autoSwapManager.clearAllAuthorizations();
    }

    setAccount(null);
    setIsConnected(false);
    setIsAuthorizedForSwaps(false);
    setAuthorizationStatus(null);
    setError(null);
  }, [account]);

  const checkConnection = useCallback(async () => {
    if (!providerRef.current) return;

    try {
      const provider = new ethers.BrowserProvider(providerRef.current);
      const accounts = await provider.listAccounts();

      if (accounts.length > 0) {
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        const balance = await provider.getBalance(address);
        const network = await provider.getNetwork();

        const accountData = {
          address,
          balance: ethers.formatEther(balance),
          chainId: Number(network.chainId),
        };

        setAccount(accountData);
        setIsConnected(true);

        // Check authorization status
        const authStatus = autoSwapManager.getAuthorizationStatus(address);
        setIsAuthorizedForSwaps(authStatus.isValid);
        setAuthorizationStatus(authStatus);

        console.log('✅ Connected to MetaMask:', address);
      }
    } catch (err: any) {
      console.error('❌ Failed to check connection:', err);
      setError(`Failed to check connection: ${err.message}`);
    }
  }, []);

  const connect = useCallback(async () => {
    if (!providerRef.current) {
      setError('MetaMask SDK not initialized');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      console.log('🚀 Requesting MetaMask connection...');

      const accounts = await providerRef.current.request({
        method: 'eth_requestAccounts',
      });

      console.log('📱 Connected accounts:', accounts);

      await checkConnection();
    } catch (err: any) {
      console.error('❌ Connection failed:', err);

      if (err.code === 4001) {
        setError('Connection rejected by user');
      } else if (err.code === -32002) {
        setError('Connection request already pending');
      } else {
        setError(`Failed to connect: ${err.message}`);
      }
    } finally {
      setIsConnecting(false);
    }
  }, [checkConnection]);

  const disconnect = useCallback(async () => {
    try {
      console.log('🔌 Manually disconnecting from MetaMask...');

      if (sdkRef.current) {
        // Terminate the SDK connection
        await sdkRef.current.terminate();

        // Reinitialize for future use
        sdkRef.current = new MetaMaskSDK({
          dappMetadata: {
            name: 'LidAngle DeFi',
            url: window.location.origin,
          },
          logging: {
            developerMode: false,
          },
          checkInstallationImmediately: false,
          checkInstallationOnAllCalls: true,
        });

        providerRef.current = sdkRef.current.getProvider();

        // Re-setup event listeners
        if (providerRef.current) {
          providerRef.current.on('accountsChanged', handleAccountsChanged);
          providerRef.current.on('chainChanged', handleChainChanged);
          providerRef.current.on('disconnect', handleDisconnect);
        }
      }

      handleDisconnect();

      console.log('✅ Successfully disconnected from MetaMask');
    } catch (error: any) {
      console.error('❌ Disconnect failed:', error);
      // Still clear local state even if disconnect fails
      handleDisconnect();
    }
  }, [handleAccountsChanged, handleChainChanged, handleDisconnect]);

  const switchToMonadTestnet = useCallback(async () => {
    if (!providerRef.current) {
      setError('MetaMask not connected');
      return;
    }

    try {
      await providerRef.current.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${MONAD_TESTNET_CONFIG.chainId.toString(16)}` }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await providerRef.current.request({
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
    if (!account || !providerRef.current) throw new Error('No account connected');

    console.log('📤 Sending transaction:', transaction);

    try {
      const provider = new ethers.BrowserProvider(providerRef.current);
      const signer = await provider.getSigner();

      const txRequest = {
        to: transaction.to,
        data: transaction.data,
        value: transaction.value || '0x0',
        gasLimit: transaction.gasLimit,
        gasPrice: transaction.gasPrice,
      };

      console.log('📝 Transaction request:', txRequest);

      const tx = await signer.sendTransaction(txRequest);
      console.log('✅ Transaction sent:', tx.hash);

      return tx.hash;
    } catch (error: any) {
      console.error('❌ Transaction failed:', error);
      throw error;
    }
  }, [account]);

  const requestSwapAuthorization = useCallback(async (): Promise<SwapAuthorization> => {
    if (!account || !providerRef.current) throw new Error('No account connected');

    try {
      const provider = new ethers.BrowserProvider(providerRef.current);
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