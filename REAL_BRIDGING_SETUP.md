# Real Mayan Bridge Integration - Setup Guide

## Overview

The X402 payment protocol now integrates **real Mayan Protocol** for cross-chain bridging. This guide walks you through setting up and testing the complete system.

## What Changed

1. **Real Bridge Integration**: The `bridgeViaMAYAN()` function now makes actual API calls to Mayan Protocol
2. **Test Token Minting**: Script to mint test USDC to your account
3. **Enhanced Settlement**: The `/settle` endpoint now initiates real Mayan bridge transactions
4. **Proper Error Handling**: Fallback to simulated bridges if Mayan API is unavailable

## Prerequisites

- ✅ All three services set up (Facilitator, Backend, Frontend)
- ✅ Base Sepolia testnet tokens (you'll mint these)
- ✅ Connected wallet in browser
- ✅ `.env` file with `EVM_PRIVATE_KEY`

## Step 1: Mint Test USDC Tokens

Before you can test payments, you need to mint test USDC to your account.

```bash
# Navigate to project root
cd /Users/deepakraja/EthIndia/EthIndiaVilla

# Run the mint script
# Syntax: node scripts/mintTestTokens.js <chain> <address> [amount]
node scripts/mintTestTokens.js base-sepolia 0x95Cf028D5e86863570E300CAD14484Dc2068eB79 1000
```

**Expected Output:**
```
🚀 Minting test tokens on base-sepolia
   Recipient: 0x95Cf028D5e86863570E300CAD14484Dc2068eB79
   Amount: 1000 USDC

📋 USDC Token: 0x2b23c6e36b46cC013158Bc2869D686023FA85422
💼 Minter Account: 0x95Cf028D5e86863570E300CAD14484Dc2068eB79
🌐 RPC: https://sepolia.base.org

⏳ Checking recipient balance...
   Current balance: 0 USDC
⏳ Minting tokens...
   TX Hash: 0x...
✅ Transaction confirmed in block 12345678

⏳ Checking recipient balance after mint...
   New balance: 1000 USDC
   Added: 1000 USDC

✨ Mint successful!
```

### Mint on Other Networks

```bash
# Ethereum Sepolia
node scripts/mintTestTokens.js sepolia 0x95Cf028D5e86863570E300CAD14484Dc2068eB79 1000

# Arbitrum Sepolia
node scripts/mintTestTokens.js arbitrum-sepolia 0x95Cf028D5e86863570E300CAD14484Dc2068eB79 1000

# Optimism Sepolia
node scripts/mintTestTokens.js optimism-sepolia 0x95Cf028D5e86863570E300CAD14484Dc2068eB79 1000
```

## Step 2: Start the Services

### Terminal 1: Facilitator (Real Bridge)

```bash
cd /Users/deepakraja/EthIndia/EthIndiaVilla/Facilator
bun run dev
```

**Expected Output:**
```
[dotenv@17.2.3] injecting env (0) from .env
🚀 x402 Facilitator listening at http://localhost:3000
📋 Supported networks: base-sepolia, sepolia, arbitrum-sepolia, optimism-sepolia
```

### Terminal 2: Backend

```bash
cd /Users/deepakraja/EthIndia/EthIndiaVilla/x402-backend
node server.js
```

**Expected Output:**
```
Server running on port 3001
Connected to facilitator at http://localhost:3000
```

### Terminal 3: Frontend

```bash
cd /Users/deepakraja/EthIndia/EthIndiaVilla/x402-frontend
npm run dev
```

**Expected Output:**
```
> next dev
▲ Next.js 16.0.0
- Local:        http://localhost:3000
```

## Step 3: Test Same-Chain Payment (Base → Base)

1. **Open browser**: http://localhost:3000/ai/image-generation
2. **Connect wallet** to Base Sepolia
3. **Set payment details**:
   - Source Network: Base Sepolia
   - Destination Network: Base Sepolia (same)
   - Query: "A beautiful sunset"
4. **Click "Pay & Generate"**
5. **Sign the permit** in your wallet
6. **Watch the logs**:

**Expected Facilitator Logs:**
```
[VERIFY] Payment verified: 0x3965d9591d9aa97735e069eb6e056e834dfdc2186842d7853aa60d406b495d88
  Network: Base Sepolia
  Token: USDC
  Amount: 1000000
  Merchant: 0x95Cf028D5e86863570E300CAD14484Dc2068eB79

[SETTLE] Executing route for payment: 0x3965d9591d9aa97735e069eb6e056e834dfdc2186842d7853aa60d406b495d88
[SETTLE] Demo mode: false

[SETTLE] Payment settled successfully
  TxHash: 0x1234567890abcdef...
  Network: Base Sepolia
```

## Step 4: Test Cross-Chain Payment (Base → Arbitrum)

1. **Open browser**: http://localhost:3000/ai/image-generation
2. **Connect wallet** to Base Sepolia
3. **Set payment details**:
   - Source Network: Base Sepolia
   - Destination Network: Arbitrum Sepolia (different!)
   - Query: "A dragon in the clouds"
4. **Click "Pay & Generate"**
5. **Sign the permit** in your wallet
6. **Watch the logs** for bridge initialization

**Expected Facilitator Logs:**

```
[VERIFY] Payment verified: 0x... 
  Network: Base Sepolia
  Token: USDC
  Amount: 1000000

[SETTLE] Executing route for payment: 0x...
[SETTLE] Demo mode: false

[SETTLE] Payment settled successfully
  TxHash: 0x...
  Network: Base Sepolia

[SETTLE] Initiating cross-chain bridge to Arbitrum Sepolia...

[BRIDGE] Initiating Mayan cross-chain bridge...
  Source Chain ID: 84532
  Destination Chain ID: 421614
  Token: 0x2b23c6e36b46cC013158Bc2869D686023FA85422
  Amount: 1000000
  Recipient: 0x95Cf028D5e86863570E300CAD14484Dc2068eB79

[BRIDGE] Chain mapping: base (84532) -> arbitrum (421614)

[BRIDGE] Requesting bridge quote from Mayan API...
[BRIDGE] Quote obtained:
  Swap ID: swap_abc123def456...
  Amount Out: 1000000
  Route steps: 3
    1. Lock on source (Mayan)
    2. Relay to destination (Mayan)
    3. Unlock on destination (Mayan)

[BRIDGE] Executing bridge swap via Mayan...
[BRIDGE] Bridge swap initiated successfully!
  Bridge TX Hash: 0x...
  Status: pending
  Swap ID: swap_abc123def456...

[SETTLE] Bridge initiated successfully: 0x...
```

## Understanding the Bridge Flow

### Same-Chain Payment
```
User Account
    ↓ (signs permit)
Payment Router (Base Sepolia)
    ↓ (transfers USDC)
Merchant Account (Base Sepolia)
    ✅ Complete
```

### Cross-Chain Payment
```
User Account (Base Sepolia)
    ↓ (signs permit)
Payment Router (Base Sepolia)
    ↓ (transfers USDC)
Mayan Bridge (Base → Arbitrum)
    ↓ (locks on source, relays, unlocks on dest)
Merchant Account (Arbitrum Sepolia)
    ✅ Complete
```

## Mayan Bridge API Integration

The system calls the real Mayan Protocol API:

### 1. Quote Request
```http
GET https://api.mayan.finance/v3/quote
  ?sourceChain=base
  &destChain=arbitrum
  &token=0x2b23c6e36b46cC013158Bc2869D686023FA85422
  &amount=1000000
  &slippageBps=100
```

### 2. Swap Execution
```http
POST https://api.mayan.finance/v3/swap
{
  "swapId": "swap_abc123...",
  "userAddress": "0x95Cf028D5e86863570E300CAD14484Dc2068eB79",
  "recipientAddress": "0x95Cf028D5e86863570E300CAD14484Dc2068eB79",
  "slippageBps": 100
}
```

### 3. Status Check
```http
GET https://api.mayan.finance/v3/swap/swap_abc123...
```

## Supported Networks

| Source | Destination | Status |
|--------|-------------|--------|
| Base Sepolia | Base Sepolia | ✅ Same-chain (no bridge) |
| Base Sepolia | Ethereum Sepolia | ✅ Cross-chain (Mayan) |
| Base Sepolia | Arbitrum Sepolia | ✅ Cross-chain (Mayan) |
| Base Sepolia | Optimism Sepolia | ✅ Cross-chain (Mayan) |
| Ethereum Sepolia | Any | ✅ Supported |
| Arbitrum Sepolia | Any | ✅ Supported |
| Optimism Sepolia | Any | ✅ Supported |

## Testing All Combinations

```bash
# Test same-chain on each network
# Base → Base (no bridge needed)
# Sepolia → Sepolia (no bridge needed)
# Arbitrum → Arbitrum (no bridge needed)
# Optimism → Optimism (no bridge needed)

# Test cross-chain (all trigger Mayan)
# Base → Sepolia
# Base → Arbitrum
# Base → Optimism
# Sepolia → Base
# Sepolia → Arbitrum
# Sepolia → Optimism
# Arbitrum → Base
# Arbitrum → Sepolia
# Arbitrum → Optimism
# Optimism → Base
# Optimism → Sepolia
# Optimism → Arbitrum

# Total: 16 payment combinations (4 same-chain + 12 cross-chain)
```

## Production Deployment

When ready for production:

1. **Update environment variables**:
   ```env
   EVM_PRIVATE_KEY=<your-mainnet-key>
   BASE_SEPOLIA_RPC=https://mainnet-rpc.base.org
   # Update all RPC endpoints for production networks
   ```

2. **Deploy smart contracts** to production networks:
   ```bash
   cd contracts
   npm run deploy:mainnet
   ```

3. **Update Mayan API endpoint**:
   - Current: `https://api.mayan.finance/v3` (testnet)
   - For mainnet: Use production Mayan endpoint (consult Mayan docs)

4. **Set production merchant address** in frontend config

5. **Test with small amounts** before going live

## Troubleshooting

### "Permit deadline expired"
- The permit signature is only valid for 1 hour
- If testing takes longer, re-sign the permit
- Solution: Increase deadline in frontend if needed

### "Payment settlement failed: ContractFunctionExecutionError"
- The user account doesn't have enough USDC tokens
- Solution: Run `node scripts/mintTestTokens.js base-sepolia <your-address> 1000`

### "Mayan quote API unavailable"
- Mayan API might be temporarily down
- The system falls back to simulated bridge with same amount out
- Check Mayan status: https://status.mayan.finance

### Bridge shows "pending" but never completes
- Bridges take 2-5 minutes typically
- Check Mayan status dashboard for bridge status
- You can poll Mayan's `/swap/<swapId>` endpoint for status

### "Unsupported chain combination"
- You're trying to bridge between chains not in the chain mapping
- Check CHAIN_CONFIGS in facilitator for supported networks
- Ensure source and destination chains are both supported

## File Structure

```
Facilator/
  ├── index.ts           # Main facilitator with bridgeViaMAYAN()
  ├── mayan.ts          # Mayan Protocol SDK (optional helper)
  └── .env              # Configuration with RPC endpoints

scripts/
  └── mintTestTokens.js # Mint test USDC to account

x402-frontend/
  └── app/ai/
      └── image-generation/page.tsx  # Payment UI with network selectors
```

## Next Steps

1. ✅ Mint test tokens
2. ✅ Start all three services
3. ✅ Test same-chain payment
4. ✅ Test cross-chain payment
5. ✅ Verify bridge in logs
6. Deploy to production when ready

## Support

- **Mayan Docs**: https://docs.mayan.finance
- **Mayan Status**: https://status.mayan.finance
- **X402 Spec**: https://httpwg.org/specs/rfc9110.html#status.402

---

Happy bridging! 🌉
