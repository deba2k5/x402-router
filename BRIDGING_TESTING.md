# 🚀 Quick Start - Testing Cross-Chain Bridging

## Prerequisites

✅ All services running:
- Frontend: `npm run dev` (localhost:3000)
- Backend: `node server.js` (localhost:3001)
- Facilitator: `bun run dev` (localhost:3000)

## Testing Steps

### 1. Same-Chain Payment (Baseline Test)

**Goal**: Verify payment works without bridging

1. Open `http://localhost:3000/ai/image-generation`
2. Connect your wallet to **Base Sepolia**
3. **Payment Network**: Select "Base Sepolia"
4. **Settle On**: Select "Base Sepolia" (same)
5. ✅ Notice: NO "Cross-chain" message appears
6. Enter image description: "A blue cat"
7. Click "Pay 1 USDC & Generate"
8. Sign permit when prompted
9. Watch logs:
   ```
   ✓ Starting X402 Payment Flow
   ✓ Network: Base Sepolia
   ✓ Verifying payment with facilitator...
   ✓ Payment settled! TX: 0x...
   ```

### 2. Cross-Chain Payment (Bridging Test)

**Goal**: Verify cross-chain payment with bridge

1. Open `http://localhost:3000/ai/image-generation`
2. Connect your wallet to **Base Sepolia**
3. **Payment Network**: Select "Base Sepolia"
4. **Settle On**: Select "Arbitrum Sepolia" (different!)
5. ✅ Notice: "✨ Cross-chain payment enabled - will be bridged via Mayan Protocol"
6. Enter image description: "A sunset over mountains"
7. Click "Pay 1 USDC & Generate"
8. Sign permit when prompted
9. Watch logs:
   ```
   ✓ Starting X402 Payment Flow
   ✓ Network: Base Sepolia
   ✓ Cross-chain payment: Base Sepolia → Arbitrum Sepolia
   ✓ Verifying payment with facilitator...
   ✓ Payment settled! TX: 0x...
   ✓ Cross-chain bridge initiated: 0x...
   ```

### 3. All Chain Combinations

Test payments between all networks:

```
Base → Sepolia
Base → Arbitrum
Base → Optimism
Sepolia → Base
Sepolia → Arbitrum
Sepolia → Optimism
Arbitrum → Base
Arbitrum → Sepolia
Arbitrum → Optimism
Optimism → Base
Optimism → Sepolia
Optimism → Arbitrum
```

## Expected Behavior

### Demo Mode (Current)
- ✅ All payments succeed
- ✅ Fake tx hashes generated
- ✅ Bridge initiates but doesn't require real contracts
- ✅ Perfect for testing UI and flow

### Console Logs Should Show

**Same-Chain:**
```
[X402] Payment payload received: { ... }
[SETTLE] Executing route for payment: 0x...
[SETTLE] Payment settled successfully
[SETTLE] Network: Base Sepolia
```

**Cross-Chain:**
```
[X402] Payment payload received: { ... }
[SETTLE] Executing route for payment: 0x...
[SETTLE] Cross-chain payment detected
[SETTLE] Initiating cross-chain bridge to Arbitrum Sepolia...
[BRIDGE] Initiating mayan bridge...
[BRIDGE] Source Chain: 84532, Destination Chain: 421614
[BRIDGE] Bridge initiated successfully: 0x...
[SETTLE] Payment settled successfully
```

## Page-by-Page Testing

### Image Generation Page
- `http://localhost:3000/ai/image-generation`
- Tests cross-chain payment with destination selector
- Generates AI image after payment

### Location Suggestions Page
- `http://localhost:3000/ai/location-suggestions`
- Tests cross-chain payment (0.5 USDC)
- Generates location suggestions after payment

### Payment Page
- `http://localhost:3000/payment`
- Manual payment testing
- Adjustable amounts and chains
- Direct facilitator API calls

## UI Indicators

### Network Selector Appearance
```
Select Payment Network: [Base Sepolia ▼]
Settle On (Destination Chain): [Base Sepolia ▼]
```

### Cross-Chain Indicator
When source ≠ destination:
```
✨ Cross-chain payment enabled - will be bridged via Mayan Protocol
```

### Payment Flow Logs
```
⏳ Starting X402 Payment Flow
✓ Network: Base Sepolia
⏳ Switching network...
✓ Switched to Base Sepolia
⏳ Requesting signature...
✓ Signature obtained
⏳ Verifying payment with facilitator...
✓ Payment verified
✓ Payment settled! TX: 0x123...
```

## Debugging

### Check Facilitator Logs

In terminal running facilitator:
```bash
[X402] Payment received
[SETTLE] Executing route
[SETTLE] Cross-chain payment detected
[BRIDGE] Initiating mayan bridge
```

### Check Backend Logs

In terminal running backend:
```bash
[X402] Payment payload received:
[X402] Verifying payment with facilitator...
[X402] Payment verified
[X402] Settling payment...
```

### Browser Console

Open DevTools (F12) to see:
- Permit signature
- Payment payload
- Network requests
- Bridge transaction hashes

## Common Issues

### Issue: "Unsupported token"
- **Cause**: Token not in facilitator config for that chain
- **Fix**: Verify token addresses in `Facilator/index.ts` CHAIN_CONFIGS

### Issue: "Network mismatch"
- **Cause**: Selected network doesn't match chain ID
- **Fix**: Verify chainId in `CHAIN_CONFIGS` matches selected network

### Issue: "Bridge not initiating"
- **Cause**: `bridgeRequired` flag not set properly
- **Fix**: Check if source ≠ destination chain selected

### Issue: No logs appearing
- **Cause**: Services not running or not in demo mode
- **Fix**: Check all three services are running and no EVM_PRIVATE_KEY is set

## Success Checklist

### Same-Chain Payment
- [ ] Network selector shows correct chains
- [ ] No cross-chain message appears
- [ ] Permit signature requested
- [ ] Payment settles on same chain
- [ ] Service/AI generates result
- [ ] Logs show successful settlement

### Cross-Chain Payment
- [ ] Destination chain selector appears
- [ ] Different source and destination selectable
- [ ] "Cross-chain" message shows when chains differ
- [ ] Permit signature requested on source chain
- [ ] Payment settles on source chain
- [ ] Bridge initiates to destination
- [ ] Logs show both settlement and bridge
- [ ] Service/AI generates result

## Next Steps

After testing in demo mode:

1. **Production Bridge Integration**
   - Install real Mayan SDK
   - Add production API keys
   - Test on testnet with real bridge

2. **Contract Deployment**
   - Deploy PaymentRouter to all networks
   - Configure Mayan bridge parameters
   - Set gas limits and timeouts

3. **Monitor & Optimize**
   - Track bridge success rates
   - Optimize for gas efficiency
   - Add backup bridge providers

## Support

For issues or questions:
1. Check facilitator logs first
2. Verify all services are running
3. Review `BRIDGING_INTEGRATION.md`
4. Check network configuration in each file
5. Verify token addresses match deployments

---

**Happy testing! 🎉**
