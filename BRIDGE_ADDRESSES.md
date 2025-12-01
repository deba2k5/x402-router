# SimpleBridge Deployed Addresses

## Contract Addresses

```typescript
// Facilator/index.ts BRIDGE_ADDRESSES constant
const BRIDGE_ADDRESSES: Record<number, Address> = {
  84532: "0x9777F502DdAB647A54A1552673D123bB199B4b5e",      // Base Sepolia
  11155111: "0x560f65Ca2d08bF995c57726eC83f7de29F5B2C38",   // Ethereum Sepolia
  421614: "0x9b9a721933038D4c85F3330e8B4f8CFC5a3F31CA",    // Arbitrum Sepolia
  11155420: "0x404A674a52f85789a71D530af705f2f458bc5284",  // Optimism Sepolia
};
```

## Network Details

### Base Sepolia
- **Chain ID**: 84532
- **SimpleBridge**: `0x9777F502DdAB647A54A1552673D123bB199B4b5e`
- **Relayer**: `0x95Cf028D5e86863570E300CAD14484Dc2068eB79`
- **RPC**: https://sepolia.base.org
- **Explorer**: https://sepolia.basescan.org
- **View Contract**: https://sepolia.basescan.org/address/0x9777F502DdAB647A54A1552673D123bB199B4b5e

### Ethereum Sepolia
- **Chain ID**: 11155111
- **SimpleBridge**: `0x560f65Ca2d08bF995c57726eC83f7de29F5B2C38`
- **Relayer**: `0x95Cf028D5e86863570E300CAD14484Dc2068eB79`
- **RPC**: https://rpc.sepolia.org
- **Explorer**: https://sepolia.etherscan.io
- **View Contract**: https://sepolia.etherscan.io/address/0x560f65Ca2d08bF995c57726eC83f7de29F5B2C38

### Arbitrum Sepolia
- **Chain ID**: 421614
- **SimpleBridge**: `0x9b9a721933038D4c85F3330e8B4f8CFC5a3F31CA`
- **Relayer**: `0x95Cf028D5e86863570E300CAD14484Dc2068eB79`
- **RPC**: https://sepolia-rollup.arbitrum.io/rpc
- **Explorer**: https://sepolia.arbiscan.io
- **View Contract**: https://sepolia.arbiscan.io/address/0x9b9a721933038D4c85F3330e8B4f8CFC5a3F31CA

### Optimism Sepolia
- **Chain ID**: 11155420
- **SimpleBridge**: `0x404A674a52f85789a71D530af705f2f458bc5284`
- **Relayer**: `0x95Cf028D5e86863570E300CAD14484Dc2068eB79`
- **RPC**: https://sepolia.optimism.io
- **Explorer**: https://sepolia-optimism.etherscan.io
- **View Contract**: https://sepolia-optimism.etherscan.io/address/0x404A674a52f85789a71D530af705f2f458bc5284

## Relayer Configuration

The same relayer address is configured on all SimpleBridge instances:

```
0x95Cf028D5e86863570E300CAD14484Dc2068eB79
```

This relayer account will:
1. Listen for `BridgeInitiated` events on source chains
2. Call `completeBridge()` on destination chains
3. Complete the cross-chain token transfer

## Token Addresses

### USDC (Test)

| Network | Address |
|---------|---------|
| Base Sepolia | 0x2b23c6e36b46cC013158Bc2869D686023FA85422 |
| Ethereum Sepolia | 0xc505D038fe2901fe624E6450887373BaA29e455F |
| Arbitrum Sepolia | 0x7b926C6038a23c3E26F7f36DcBec7606BAF44434 |
| Optimism Sepolia | 0x281Ae468d00040BCbB4685972F51f87d473420F7 |

## PaymentRouter Addresses

| Network | Address |
|---------|---------|
| Base Sepolia | 0xC858560Ac08048258e57a1c6C47dAf682fC25F62 |
| Ethereum Sepolia | 0x0E8b303b5245f7ba924Aadf5828226c7d35e3e13 |
| Arbitrum Sepolia | 0x404A674a52f85789a71D530af705f2f458bc5284 |
| Optimism Sepolia | 0xC49568398F909aF8D40Cf27B26780e1B5Ca5996F |

## Deployment Timestamps

| Network | Timestamp | Block |
|---------|-----------|-------|
| Base Sepolia | 2025-11-30T23:21:10Z | - |
| Ethereum Sepolia | 2025-11-30T23:21:37Z | - |
| Arbitrum Sepolia | 2025-11-30T23:21:49Z | - |
| Optimism Sepolia | 2025-11-30T23:22:07Z | - |

## How to Use

### In Code

```typescript
// Bridge address for source chain
const sourceChainId = 84532; // Base Sepolia
const bridgeAddress = BRIDGE_ADDRESSES[sourceChainId];

// Call SimpleBridge
const tx = await client.writeContract({
  address: bridgeAddress,
  abi: SIMPLE_BRIDGE_ABI,
  functionName: "initiateBridge",
  args: [bridgeId, destChainId, tokenAddress, amount, recipient],
});
```

### In Terminal

```bash
# Check if SimpleBridge is deployed on Base Sepolia
cast code 0x9777F502DdAB647A54A1552673D123bB199B4b5e \
  --rpc-url https://sepolia.base.org

# Call initiateBridge
cast send 0x9777F502DdAB647A54A1552673D123bB199B4b5e \
  "initiateBridge(bytes32,uint256,address,uint256,address)" \
  <bridgeId> <destChainId> <tokenAddress> <amount> <recipient> \
  --private-key $PRIVATE_KEY \
  --rpc-url https://sepolia.base.org

# Call completeBridge (relayer only)
cast send 0x9b9a721933038D4c85F3330e8B4f8CFC5a3F31CA \
  "completeBridge(bytes32,address,address,uint256)" \
  <bridgeId> <tokenAddress> <recipient> <amount> \
  --private-key $RELAYER_PRIVATE_KEY \
  --rpc-url https://sepolia-rollup.arbitrum.io/rpc
```

## Verification

All contracts have been verified on their respective blockchain explorers:

- ✅ Base Sepolia - https://sepolia.basescan.org/address/0x9777F502DdAB647A54A1552673D123bB199B4b5e
- ✅ Ethereum Sepolia - https://sepolia.etherscan.io/address/0x560f65Ca2d08bF995c57726eC83f7de29F5B2C38
- ✅ Arbitrum Sepolia - https://sepolia.arbiscan.io/address/0x9b9a721933038D4c85F3330e8B4f8CFC5a3F31CA
- ✅ Optimism Sepolia - https://sepolia-optimism.etherscan.io/address/0x404A674a52f85789a71D530af705f2f458bc5284

## Integration Checklist

- ✅ SimpleBridge compiled
- ✅ Deployed to all 4 networks
- ✅ Relayer configured on all contracts
- ✅ Facilitator updated with BRIDGE_ADDRESSES
- ✅ SIMPLE_BRIDGE_ABI added to Facilitator
- ✅ bridgeViaContract() using real addresses
- ⏳ Off-chain relayer service (TODO)

---

Generated: 2025-11-30
Status: ✅ Production Ready (awaiting relayer)
