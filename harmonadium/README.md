# 🖥️ LidAngle DeFi - Revolutionary Angle-Based Trading

A revolutionary DeFi application that enables automated token swapping based on your MacBook's lid angle. Built with Next.js, MetaMask Delegation Toolkit, and 0x Protocol on Monad Testnet.

## ✨ Features

- **Angle-Driven Trading**: Control token swaps by adjusting your MacBook lid angle
- **One-Time Authorization**: Sign once using EIP-712, then all swaps happen automatically
- **Smart Debouncing**: 3-second stabilization period prevents accidental swaps
- **Real 0x API Integration**: Professional DEX aggregation with fallback for unsupported chains
- **Multi-Token Support**: Swap between MONAD, USDC, USDT, WBTC, WETH, and WSOL
- **Real-Time Monitoring**: Live angle tracking with visual feedback
- **Automatic Execution**: No manual approval needed after initial authorization
- **Connect/Disconnect**: Easy wallet management with authorization cleanup

## 🎯 Angle Mapping

| Lid Angle Range | Target Token | Token Address |
|----------------|--------------|---------------|
| 20° - 35° | USDC | `0xf817257fed379853cDe0fa4F97AB987181B1E5Ea` |
| 35° - 50° | USDT | `0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D` |
| 50° - 65° | WBTC | `0xcf5a6076cfa32686c0Df13aBaDa2b40dec133F1d` |
| 65° - 80° | WETH | `0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37` |
| 80° - 135° | WSOL | `0x5387C85A4965769f6B0Df430638a1388493486F1` |

*Note: Angles below 20° are excluded to maintain screen visibility.*

## 🚀 Quick Start

### Prerequisites

- macOS with MacBook Air M3 (or compatible model with lid angle sensor)
- Node.js 18+ and npm
- MetaMask browser extension
- Xcode command line tools (`xcode-select --install`)

### Installation

1. **Clone and setup the project:**
   ```bash
   cd harmonadium
   npm install
   npm run setup
   ```

2. **Note on Swap Implementation:**
   - **Real 0x API integration** for supported chains (Ethereum, Arbitrum, Base, Polygon, etc.)
   - **Smart fallback to mock swaps** for unsupported chains like Monad testnet
   - Mock service simulates realistic trading with proper transaction structure
   - All angle detection and one-time authorization fully functional

### Running the Application

1. **Start the WebSocket sensor server:**
   ```bash
   npm run sensor-server
   ```
   *This creates a WebSocket server on `ws://localhost:8080` that bridges the native lid angle sensor with the web app.*

2. **Start the Next.js development server:**
   ```bash
   npm run dev
   ```
   *Open [http://localhost:3000](http://localhost:3000) in your browser.*

3. **Connect MetaMask:**
   - Install MetaMask if not already installed
   - Connect your wallet in the application
   - The app will automatically prompt to add/switch to Monad Testnet

4. **Get testnet tokens:**
   - Visit a Monad testnet faucet to get MON tokens
   - Ensure you have sufficient balance for swaps and gas fees

## 🎮 How to Use

1. **Initial Setup:**
   - Open the application in your browser (`http://localhost:3001`)
   - Click "Connect MetaMask" to connect your wallet
   - Switch to Monad Testnet (prompted automatically)
   - Click "Authorize Automatic Swaps" for one-time EIP-712 signature

2. **Automatic Trading:**
   - Adjust your MacBook lid to your desired angle (20-135°)
   - Watch the real-time angle display show target token
   - Wait 3 seconds for angle stabilization
   - **Swap executes automatically** - no manual approval needed!
   - Monitor transactions in the swap history

3. **Key Features:**
   - **One-time authorization** - sign once, trade automatically
   - **Connect/Disconnect** button for easy wallet management
   - **Real-time angle tracking** with visual progress
   - **Automatic swap execution** based on stable angles
   - **Transaction history** with success/failure indicators

## 🛠️ Technical Architecture

### Components

- **LidAngleSensor Integration**: Native macOS app communicating via WebSocket
- **React Hooks**: Custom hooks for sensor data, debouncing, and MetaMask integration
- **0x Protocol Integration**: Professional DEX aggregation for optimal swap rates
- **MetaMask Delegation**: Advanced wallet features with one-time signing
- **Monad Testnet**: High-performance blockchain with EVM compatibility

### Key Files

```
harmonadium/
├── src/
│   ├── components/
│   │   ├── AngleSensorDisplay.tsx    # Real-time angle monitoring UI
│   │   └── SwapInterface.tsx         # MetaMask integration and swap execution
│   ├── hooks/
│   │   ├── useDebounce.ts           # Angle stabilization logic
│   │   ├── useLidAngleSensor.ts     # WebSocket communication with sensor
│   │   └── useMetaMask.ts           # Wallet connection and transaction handling
│   ├── lib/
│   │   ├── config.ts                # Token addresses and angle mappings
│   │   └── swap.ts                  # 0x Protocol integration
│   └── server/
│       ├── lid-angle-server.js      # WebSocket bridge server
│       └── build-sensor-bridge.m    # Native sensor bridge compilation
```

## 🔧 Configuration

### Environment Variables (Optional)

Create a `.env.local` file:
```env
NEXT_PUBLIC_0X_API_KEY=your_0x_api_key_here
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:8080
```

### Network Configuration

The app is pre-configured for Monad Testnet:
- **Chain ID**: 10143
- **RPC URL**: `https://testnet-rpc.monad.xyz`
- **Explorer**: `https://testnet.monadexplorer.com`

## 🚨 Troubleshooting

### Common Issues

1. **Sensor Not Working:**
   ```bash
   # Check if your MacBook model is supported
   # Ensure WebSocket server is running
   npm run sensor-server
   ```

2. **MetaMask Connection Issues:**
   - Ensure MetaMask is unlocked
   - Check network configuration
   - Clear browser cache if needed

3. **Swap Failures:**
   - Verify sufficient MON balance for swaps and gas
   - Check 0x API availability
   - Ensure target token has liquidity

4. **Build Issues:**
   ```bash
   # Install Xcode command line tools
   xcode-select --install

   # Rebuild sensor bridge
   npm run build-sensor-bridge
   ```

### Debug Mode

Enable verbose logging:
```bash
DEBUG=* npm run sensor-server
```

## 🎯 Supported Devices

- **Confirmed Working**: MacBook Air M3 (2024)
- **Likely Working**: MacBook Pro M3/M4 series
- **Not Working**: M1 MacBook Air/Pro (known limitation)
- **Untested**: Intel-based MacBooks

## 🔐 Security Considerations

- **Private Keys**: Never commit private keys or mnemonics
- **API Keys**: Use environment variables for sensitive data
- **Testnet Only**: This application is designed for Monad testnet
- **Smart Contracts**: All swaps go through audited 0x Protocol contracts

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## 🙏 Acknowledgments

- [LidAngleSensor](https://github.com/samhenrigold/LidAngleSensor) by Sam Gold
- [0x Protocol](https://0x.org) for DEX aggregation
- [MetaMask Delegation Toolkit](https://docs.metamask.io/delegation-toolkit)
- [Monad Blockchain](https://monad.xyz) for high-performance EVM
- [shadcn/ui](https://ui.shadcn.com) for beautiful React components

## 🔗 Links

- **Monad Testnet Explorer**: https://testnet.monadexplorer.com
- **0x API Documentation**: https://0x.org/docs
- **MetaMask Delegation Docs**: https://docs.metamask.io/delegation-toolkit
- **Original LidAngleSensor**: https://github.com/samhenrigold/LidAngleSensor

---

**Warning**: This is experimental software for educational and testing purposes. Use at your own risk and only on testnets.