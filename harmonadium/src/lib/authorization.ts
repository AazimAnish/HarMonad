import { ethers } from 'ethers';
import { MONAD_TESTNET_CONFIG, TESTNET_TOKENS } from './config';

// EIP-712 domain and types for one-time swap authorization
const DOMAIN = {
  name: 'LidAngle DeFi',
  version: '1',
  chainId: MONAD_TESTNET_CONFIG.chainId,
  verifyingContract: '0x0000000000000000000000000000000000000000', // Placeholder for demo
};

const TYPES = {
  SwapAuthorization: [
    { name: 'user', type: 'address' },
    { name: 'sellToken', type: 'address' },
    { name: 'maxAmount', type: 'uint256' },
    { name: 'validUntil', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
  ],
};

export interface SwapAuthorization {
  user: string;
  sellToken: string;
  maxAmount: string;
  validUntil: number;
  nonce: number;
  signature?: string;
}

export class AutoSwapManager {
  private authorizations: Map<string, SwapAuthorization> = new Map();
  private isEnabled: boolean = false;
  private maxSwapAmount: string = ethers.parseEther('0.1').toString(); // Max 0.1 MON per swap

  private initialized = false;

  constructor() {
    // Don't load during constructor to avoid SSR issues
  }

  private ensureInitialized() {
    if (!this.initialized && typeof window !== 'undefined') {
      this.loadAuthorizationsFromStorage();
      this.initialized = true;
    }
  }

  private saveAuthorizationsToStorage() {
    if (typeof window === 'undefined') return;

    try {
      const authData = Array.from(this.authorizations.entries());
      localStorage.setItem('lidangle_swap_auth', JSON.stringify({
        authorizations: authData,
        isEnabled: this.isEnabled,
        maxSwapAmount: this.maxSwapAmount,
      }));
    } catch (error) {
      console.error('Failed to save authorizations:', error);
    }
  }

  private loadAuthorizationsFromStorage() {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('lidangle_swap_auth');
      if (stored) {
        const { authorizations, isEnabled, maxSwapAmount } = JSON.parse(stored);
        this.authorizations = new Map(authorizations || []);
        this.isEnabled = isEnabled || false;
        this.maxSwapAmount = maxSwapAmount || ethers.parseEther('0.1').toString();
      }
    } catch (error) {
      console.error('Failed to load authorizations:', error);
    }
  }

  async requestOneTimeAuthorization(
    userAddress: string,
    provider: ethers.BrowserProvider
  ): Promise<SwapAuthorization> {
    this.ensureInitialized();
    const signer = await provider.getSigner();
    const nonce = Date.now();
    const validUntil = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours

    const authorization: SwapAuthorization = {
      user: userAddress,
      sellToken: TESTNET_TOKENS.MONAD,
      maxAmount: this.maxSwapAmount,
      validUntil,
      nonce,
    };

    try {
      console.log('Requesting one-time swap authorization...');

      // Use EIP-712 typed data signing
      const signature = await signer.signTypedData(DOMAIN, TYPES, authorization);

      authorization.signature = signature;

      // Store the authorization
      this.authorizations.set(userAddress, authorization);
      this.isEnabled = true;
      this.saveAuthorizationsToStorage();

      console.log('✅ One-time authorization granted!', authorization);
      return authorization;

    } catch (error: any) {
      console.error('❌ Authorization failed:', error);
      throw new Error(`Failed to get authorization: ${error.message}`);
    }
  }

  isAuthorized(userAddress: string): boolean {
    this.ensureInitialized();
    const auth = this.authorizations.get(userAddress);
    if (!auth || !auth.signature || !this.isEnabled) {
      return false;
    }

    // Check if authorization is still valid
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime > auth.validUntil) {
      console.log('Authorization expired');
      this.revokeAuthorization(userAddress);
      return false;
    }

    return true;
  }

  revokeAuthorization(userAddress: string) {
    this.authorizations.delete(userAddress);
    this.isEnabled = false;
    this.saveAuthorizationsToStorage();
    console.log('🔒 Authorization revoked for', userAddress);
  }

  getAuthorization(userAddress: string): SwapAuthorization | null {
    return this.authorizations.get(userAddress) || null;
  }

  isAutoSwapEnabled(): boolean {
    this.ensureInitialized();
    return this.isEnabled;
  }

  setMaxSwapAmount(amount: string) {
    this.maxSwapAmount = amount;
    this.saveAuthorizationsToStorage();
  }

  getMaxSwapAmount(): string {
    return this.maxSwapAmount;
  }

  // Verify the signature (for additional security)
  async verifyAuthorization(auth: SwapAuthorization): Promise<boolean> {
    try {
      if (!auth.signature) return false;

      const recoveredAddress = ethers.verifyTypedData(
        DOMAIN,
        TYPES,
        {
          user: auth.user,
          sellToken: auth.sellToken,
          maxAmount: auth.maxAmount,
          validUntil: auth.validUntil,
          nonce: auth.nonce,
        },
        auth.signature
      );

      return recoveredAddress.toLowerCase() === auth.user.toLowerCase();
    } catch (error) {
      console.error('Failed to verify authorization:', error);
      return false;
    }
  }

  // Clear all authorizations (for disconnect)
  clearAllAuthorizations() {
    this.authorizations.clear();
    this.isEnabled = false;
    this.saveAuthorizationsToStorage();
    console.log('🧹 All authorizations cleared');
  }

  // Get authorization status for UI
  getAuthorizationStatus(userAddress: string) {
    this.ensureInitialized();
    const auth = this.getAuthorization(userAddress);
    const isValid = this.isAuthorized(userAddress);

    return {
      hasAuthorization: !!auth,
      isValid,
      isEnabled: this.isEnabled,
      validUntil: auth?.validUntil || 0,
      maxAmount: this.maxSwapAmount,
    };
  }
}

// Create a direct export that uses lazy initialization
export const autoSwapManager = new AutoSwapManager();