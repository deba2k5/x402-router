# 🚀 Getting Started with Cross-Chain Payments

## System Overview

The X402 payment protocol now includes **full cross-chain payment support**. This system consists of three main services:

```
Frontend (Next.js)
     ↓
Backend (Express)
     ↓
Facilitator (Bun)
     ↓
Smart Contracts & Mayan Bridge
```

## Prerequisites

Before starting, ensure you have:

- ✅ Node.js 18+ installed
- ✅ Bun runtime installed (`npm install -g bun`)
- ✅ Foundry (for smart contracts) - optional
- ✅ A Web3 wallet connected (WalletConnect or similar)

## Installation

### 1. Install Frontend Dependencies

```bash
cd x402-frontend
npm install
```

### 2. Install Backend Dependencies

```bash
cd x402-backend
npm install
```

### 3. Install Facilitator Dependencies

```bash
cd Facilator
bun install
```

### 4. Smart Contract Dependencies (Optional)

```bash
cd contracts
npm install
```

## Environment Configuration

### Frontend - No Changes Needed
Frontend automatically detects services at:
- Facilitator: `http://localhost:3000`
- Backend: `http://localhost:3001`

### Backend - `.env` (Optional)

```env
# Server Configuration
PORT=3001
FACILITATOR_URL=http://localhost:3000

# Merchant
MERCHANT_ADDRESS=0x95Cf028D5e86863570E300CAD14484Dc2068eB79
```

### Facilitator - `.env` (Optional)

```env
# RPC Endpoints (use defaults or set custom)
BASE_SEPOLIA_RPC=https://sepolia.base.org
SEPOLIA_RPC=https://rpc.sepolia.org
ARBITRUM_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc
OPTIMISM_SEPOLIA_RPC=https://sepolia.optimism.io

# Demo Mode (leave unset for demo)
# EVM_PRIVATE_KEY=0x...

# Mayan Bridge (for future production)
# MAYAN_API_KEY=your_key
# MAYAN_API_URL=https://api.mayan.finance/v1
```

## Starting the Services

### Terminal 1: Start Facilitator

```bash
cd Facilator
bun run dev
```

Output should show:
```
✓ Facilitator running at port 3000
✓ Demo mode enabled
✓ Ready for /verify and /settle
```

### Terminal 2: Start Backend

```bash
cd x402-backend
node server.js
```

Output should show:
```
✓ Backend running on port 3001
✓ CORS enabled
✓ Connected to facilitator at http://localhost:3000
```

### Terminal 3: Start Frontend

```bash
cd x402-frontend
npm run dev
```

Output should show:
```
▲ Next.js 16.0.0
✓ Local: http://localhost:3000
```

## Verify Services Are Running

### Check Facilitator

```bash
curl http://localhost:3000/supported
```

Should return list of supported networks.

### Check Backend

```bash
curl http://localhost:3001/health
```

Should return health status.

### Check Frontend

Open `http://localhost:3000` in browser - should load the Next.js app.

## Testing Cross-Chain Payments

### Quick Test (Image Generation)

1. **Open Frontend**
   ```
   http://localhost:3000/ai/image-generation
   ```

2. **Connect Wallet**
   - Click "Connect Wallet" in header
   - Select Base Sepolia network
   - Confirm connection

3. **Select Networks**
   - **Payment Network**: Base Sepolia
   - **Settle On**: Arbitrum Sepolia (different!)
   - Notice: "✨ Cross-chain payment enabled" message

4. **Enter Image Description**
   - Example: "A sunset over mountains"

5. **Pay and Generate**
   - Click "Pay 1 USDC & Generate"
   - Sign permit when prompted
   - Watch payment logs

6. **Expected Result**
   - Payment settles on Base
   - Bridge initiates to Arbitrum
   - Image is generated after payment
   - Both settlement and bridge tx hashes shown

### Other Test Pages

**Location Suggestions** (0.5 USDC):
```
http://localhost:3000/ai/location-suggestions
```

**Manual Payment Testing** (custom amounts):
```
http://localhost:3000/payment
```

## Understanding the Logs

### Frontend Logs (Browser Console & UI)

```
⏳ Starting X402 Payment Flow
ℹ Network: Base Sepolia
ℹ Cross-chain payment: Base Sepolia → Arbitrum Sepolia
⏳ Requesting signature...
✓ Signature obtained
⏳ Verifying payment with facilitator...
✓ Payment verified
✓ Payment settled! TX: 0x123...
```

### Backend Logs (Terminal)

```
[X402] Payment payload received: { network: 'base-sepolia', ... }
[X402] Verifying payment with facilitator...
[X402] Payment verified
[X402] Settling payment...
```

### Facilitator Logs (Terminal)

```
[VERIFY] Payment verified: 0x123...
[SETTLE] Executing route for payment: 0x123...
[SETTLE] Cross-chain payment detected
[SETTLE] Initiating cross-chain bridge to Arbitrum Sepolia...
[BRIDGE] Source Chain: 84532, Destination Chain: 421614
[BRIDGE] Bridge initiated successfully: 0xabc...
[SETTLE] Payment settled successfully
```

## Troubleshooting

### Services Won't Start

**Problem**: Port already in use
```bash
# Find process on port
lsof -i :3000
lsof -i :3001

# Kill process
kill -9 <PID>
```

**Problem**: Module not found
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Payments Not Working

**Check 1**: All three services running
```bash
curl http://localhost:3000/verify
curl http://localhost:3001/health
# Frontend should load in browser
```

**Check 2**: Wallet connected to correct network
- Open DevTools (F12)
- Check connected network matches selected payment network

**Check 3**: Check facilitator logs
- Look for [VERIFY] and [SETTLE] messages
- Check for error messages

### Bridge Not Initiating

**Check**:
1. Different source and destination selected
2. "Cross-chain" message appears in UI
3. Facilitator logs show "Cross-chain payment detected"
4. Bridge function is called

## Documentation

### Core Documentation
- **`BRIDGING_INTEGRATION.md`** - Complete architecture & API
- **`BRIDGING_TESTING.md`** - Testing guide & scenarios
- **`CHANGES_SUMMARY.md`** - Summary of all changes

### Original Documentation
- **`README.md`** - Project overview
- **`QUICKSTART.md`** - Original quick start
- **`AI_PROJECT_README.md`** - AI services details

### Contract Documentation
- **`contracts/README.md`** - Smart contract details
- **`contracts/TESTING.md`** - Contract testing
- **`contracts/DEPLOYMENT_SUMMARY.md`** - Deployment info

## Next Steps for Production

### 1. Get Mayan API Key
- Visit https://mayan.finance
- Request API access
- Add key to `.env`

### 2. Update Bridge Function
In `Facilator/index.ts`, replace the mock `bridgeViaMAYAN()` with real implementation:

```typescript
const bridgeViaMAYAN = async (...) => {
  // Replace demo code with actual Mayan SDK calls
  const response = await axios.post(
    "https://api.mayan.finance/v1/bridge",
    { sourceChain, destinationChain, token, amount, recipient }
  );
  return { success: true, bridgeTxHash: response.data.txHash };
};
```

### 3. Deploy Smart Contracts
```bash
cd contracts
npx hardhat run scripts/deploy.js --network base-sepolia
# Repeat for other networks
```

### 4. Update Contract Addresses
- Update PaymentRouter addresses in all files
- Update token addresses if needed
- Test with real contracts

### 5. Set Production RPC Endpoints
Update `.env` files with production RPC endpoints instead of public ones.

### 6. Enable Real Settlement
Set `EVM_PRIVATE_KEY` in Facilitator `.env` to enable real contract execution.

## Common Commands

```bash
# Start all services (from root directory)
# Terminal 1
cd Facilator && bun run dev

# Terminal 2
cd x402-backend && node server.js

# Terminal 3
cd x402-frontend && npm run dev

# Stop all services
# Press Ctrl+C in each terminal

# Clean and reinstall
rm -rf node_modules package-lock.json
npm install

# View logs
# Check browser console (F12)
# Check terminal output
```

## Support Resources

1. **View Logs**: Check all three terminals for error messages
2. **Check Docs**: Review `BRIDGING_TESTING.md` for scenarios
3. **Inspect Network**: Use browser DevTools to see API calls
4. **Review Code**: Check implementation in source files

## Success Indicators

✅ **All services running** - All three terminals show no errors
✅ **Wallet connected** - Header shows connected address
✅ **Payment pages load** - Can navigate to payment pages
✅ **Cross-chain selector works** - Can select different chains
✅ **Payments settle** - See "Payment settled!" messages in logs
✅ **Bridge initiates** - See "Bridge initiated" in facilitator logs

---

**You're all set! Ready to test cross-chain payments. 🎉**

Start with same-chain payments to verify basic flow, then test cross-chain payments between different networks.
