# SimpleBridge Quick Reference

## Contract Deployment

### 1. Compile
```bash
cd contracts
npx hardhat compile
```

### 2. Deploy Script (contracts/scripts/deployBridge.js)

```javascript
import hre from "hardhat";

async function main() {
  const RELAYER = "0x95Cf028D5e86863570E300CAD14484Dc2068eB79";
  
  const SimpleBridge = await hre.ethers.getContractFactory("SimpleBridge");
  const bridge = await SimpleBridge.deploy(RELAYER);
  await bridge.deployed();
  
  console.log("SimpleBridge deployed to:", bridge.address);
  console.log("Relayer:", RELAYER);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

### 3. Deploy Commands
```bash
# Base Sepolia
npx hardhat run scripts/deployBridge.js --network base-sepolia

# Ethereum Sepolia
npx hardhat run scripts/deployBridge.js --network sepolia

# Arbitrum Sepolia
npx hardhat run scripts/deployBridge.js --network arbitrum-sepolia

# Optimism Sepolia
npx hardhat run scripts/deployBridge.js --network optimism-sepolia
```

## Facilitator Configuration

After deployment, update `Facilator/index.ts`:

```typescript
// Add this constant
const BRIDGE_ADDRESSES: Record<number, Address> = {
  84532: '0x...',      // Base Sepolia SimpleBridge address
  11155111: '0x...',   // Ethereum Sepolia SimpleBridge address
  421614: '0x...',     // Arbitrum Sepolia SimpleBridge address
  11155420: '0x...',   // Optimism Sepolia SimpleBridge address
};

// In bridgeViaContract function, use:
const BRIDGE_ADDRESS = BRIDGE_ADDRESSES[sourceChainId];
```

## Off-Chain Relayer Implementation

Create `Relayer/index.ts`:

```typescript
import { createPublicClient, http, createWalletClient } from 'viem';
import { baseSepolia, arbitrumSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const BRIDGE_ABI = [
  {
    name: 'completeBridge',
    type: 'function',
    inputs: [
      { name: 'bridgeId', type: 'bytes32' },
      { name: 'token', type: 'address' },
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

const RELAYER_KEY = process.env.EVM_PRIVATE_KEY;
const account = privateKeyToAccount(RELAYER_KEY as `0x${string}`);

// Listen for BridgeInitiated events on source chain
const sourceClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
});

sourceClient.watchContractEvent({
  address: BRIDGE_ADDRESS_BASE,
  abi: BRIDGE_ABI,
  eventName: 'BridgeInitiated',
  onLogs: async (logs) => {
    for (const log of logs) {
      const { bridgeId, destChainId, token, amount, to: recipient } = log.args;

      console.log(`[RELAYER] Bridge initiated: ${bridgeId.slice(0, 18)}...`);
      console.log(`  Token: ${token}`);
      console.log(`  Amount: ${amount}`);
      console.log(`  Recipient: ${recipient}`);

      // Get destination chain
      const destChain = getChainConfig(destChainId);
      
      // Complete bridge on destination
      const destClient = createWalletClient({
        account,
        chain: destChain.chain,
        transport: http(destChain.rpc),
      });

      try {
        const tx = await destClient.writeContract({
          address: BRIDGE_ADDRESSES[destChainId],
          abi: BRIDGE_ABI,
          functionName: 'completeBridge',
          args: [bridgeId, token, recipient, amount],
        });

        console.log(`[RELAYER] Bridge completed: ${tx.slice(0, 18)}...`);
      } catch (error) {
        console.error(`[RELAYER] Error completing bridge:`, error);
      }
    }
  },
});
```

## Testing Flow

### Same-Chain Test (No Bridge Needed)
1. Open: http://localhost:3000/ai/image-generation
2. Source: Base Sepolia
3. Destination: Base Sepolia (same)
4. Click "Pay & Generate"
5. Expected: Settlement in ~30 seconds

**Expected Logs:**
```
[SETTLE] No swap needed - using zero address for tokenOut
[SETTLE] Payment settled successfully
[SETTLE] TxHash: 0x...
```

### Cross-Chain Test (With Bridge)
1. Open: http://localhost:3000/ai/image-generation
2. Source: Base Sepolia
3. Destination: Arbitrum Sepolia (different)
4. Click "Pay & Generate"
5. Expected: Settlement + Bridge initiation

**Expected Logs:**
```
[SETTLE] Payment settled successfully
[SETTLE] Initiating cross-chain bridge to Arbitrum Sepolia...
[BRIDGE] Initiating contract-based bridge...
[BRIDGE] Initiating bridge on source chain...
[BRIDGE] Bridge initiated on source chain
  TX Hash: 0x...
  Status: Tokens locked on Base Sepolia
  Next: Waiting for relayer to complete on Arbitrum Sepolia
```

## Troubleshooting

### Bridge Contract Not Found
```
[BRIDGE] Bridge initiation failed (contract may not be deployed)
[BRIDGE] Simulating bridge execution with demo tx hash...
```
**Fix:** Deploy SimpleBridge to source chain, update BRIDGE_ADDRESS

### Relayer Not Authorized
```
Error: UnauthorizedRelayer
```
**Fix:** Update relayer address in SimpleBridge via setRelayer()

### Tokens Stuck in Bridge
```
// Emergency withdraw (admin only)
await bridge.emergencyWithdraw(tokenAddress, recipient);
```

## Monitoring

### Watch Bridge Events
```bash
# Listen for BridgeInitiated on Base Sepolia
cast logs --address <BRIDGE_ADDRESS> "event BridgeInitiated(...)" \
  --from-block 34386683 \
  --to-block latest \
  --rpc-url https://sepolia.base.org
```

### Check Bridge Status
```bash
# Check if bridge was processed
cast call <BRIDGE_ADDRESS> "processedBridges(bytes32)" <BRIDGE_ID> \
  --rpc-url https://sepolia.base.org
```

## Gas Estimates

| Operation | Gas | Cost (Wei) |
|-----------|-----|-----------|
| initiateBridge | ~100k | ~0.01 ETH |
| completeBridge | ~100k | ~0.01 ETH |
| **Total** | **~200k** | **~0.02 ETH** |

## Security Checklist

- [ ] SimpleBridge deployed to all 4 networks
- [ ] RELAYER address set correctly in SimpleBridge
- [ ] BRIDGE_ADDRESSES updated in Facilator/index.ts
- [ ] Off-chain relayer service running
- [ ] Test with small amounts first
- [ ] Monitor gas prices before large transfers
- [ ] Set up alerts for BridgeInitiated events
- [ ] Regular backups of bridge state

---

Ready to deploy! 🚀
