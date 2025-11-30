# 🌉 Swap and Bridge Configuration

## Testnet Contract Addresses

### Uniswap V3 Routers

| Network | SwapRouter02 | UniversalRouter |
|---------|--------------|-----------------|
| **Base Sepolia** | `0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4` | `0x050E797f3625EC8785265e1d9BDd4799b97528A1` |
| **Ethereum Sepolia** | `0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E` | `0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD` |
| **Arbitrum Sepolia** | `0x101F443B4d1b059569D643917553c771E1b9663E` | `0x4A7b5Da61326A6379179b40d00F57E5bbDC962c2` |
| **Optimism Sepolia** | `0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4` | `0xCb1355ff08Ab38bBCE60111F1bb2B784bE25D7e8` |

### Mayan Protocol (Cross-Chain Bridge)

| Network | Forwarder Contract |
|---------|-------------------|
| **All EVM Chains** | `0x337685fdaB40D39bd02028545a4FfA7D287cC3E2` |

> **Note**: Mayan uses the same Forwarder contract address across all EVM chains (Base, Arbitrum, Optimism, Ethereum, etc.)

---

## Integration Approach

### Option 1: Two-Step Process (Recommended for Testing)

**Step 1: Swap on Source Chain**
- Use PaymentRouter with Uniswap on Base
- USDC → DAI on Base Sepolia
- Transfer DAI to merchant on Base

**Step 2: Bridge Separately**
- Use Mayan SDK directly
- Bridge DAI from Base → Arbitrum
- Requires separate transaction

**Pros:**
- Easier to test and debug
- Clear separation of concerns
- Can verify each step independently

**Cons:**
- Two transactions required
- User needs to approve twice
- Higher gas costs

---

### Option 2: Single Transaction (Full x402 Flow)

**Combined Swap + Bridge**
- PaymentRouter calls Uniswap for swap
- PaymentRouter calls Mayan for bridge
- All in one transaction

**Challenges:**
- Complex calldata encoding
- Mayan requires specific parameters
- Harder to debug
- May need contract modifications

**Pros:**
- True x402 experience
- Single user approval
- Lower total gas (one transaction)

---

## Recommended Implementation Path

### Phase 1: Test Swap Only ✅
```
USDC (Base) → DAI (Base) → Merchant (Base)
```
- Use Uniswap V3 SwapRouter02
- Test on Base Sepolia
- Verify swap works correctly

### Phase 2: Test Bridge Only
```
USDC (Base) → USDC (Arbitrum) → Merchant (Arbitrum)
```
- Use Mayan SDK
- Test cross-chain transfer
- Verify bridge works correctly

### Phase 3: Combine Swap + Bridge
```
USDC (Base) → DAI (Base) → DAI (Arbitrum) → Merchant (Arbitrum)
```
- Combine both flows
- Full end-to-end test
- Complete x402 functionality

---

## Current Limitations

### Mayan Integration Challenges

1. **SDK vs Direct Contract**
   - Mayan SDK is designed for frontend use
   - Direct contract calls require specific encoding
   - May need to use Mayan API for quote + params

2. **Cross-Chain Verification**
   - Bridge transactions take time (minutes)
   - Need to monitor destination chain
   - Requires event listeners or polling

3. **Testnet Liquidity**
   - Testnets may have limited liquidity
   - Swaps might fail or have high slippage
   - Bridge might not have all token pairs

---

## Next Steps

For your hackathon demo, I recommend:

### Quick Win: Swap Only (Today)
- Implement Uniswap swap on Base
- Show USDC → DAI conversion
- Demonstrate PaymentRouter working with real DEX

### Future: Full Bridge (Post-Hackathon)
- Integrate Mayan SDK properly
- Build backend service for cross-chain monitoring
- Handle bridge completion verification

Would you like me to:
1. **Implement Uniswap swap first** (simpler, works today)
2. **Try Mayan bridge integration** (complex, may need more time)
3. **Create a mock bridge demo** (shows the concept without real bridge)

Let me know which approach you prefer! 🚀
