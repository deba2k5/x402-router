# SimpleBridge Off-Chain Relayer

The off-chain relayer service for the SimpleBridge cross-chain token transfer system. This service listens for `BridgeInitiated` events on source chains and completes bridge transfers by calling `completeBridge()` on destination chains.

## Features

- ✅ **Multi-chain Support**: Listens on all 4 testnet networks simultaneously
- ✅ **Event-Driven**: Automatically processes bridges when events are detected
- ✅ **Automatic Retry**: Retries failed bridges after 30 seconds
- ✅ **Status Tracking**: In-memory tracking of all pending bridges
- ✅ **Status Reports**: Periodic reports of bridge processing status
- ✅ **Graceful Shutdown**: Clean exit with final status report

## Installation

```bash
cd Relayer
bun install
```

## Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update the `.env` file with your relayer's private key:
```
EVM_PRIVATE_KEY=0x... # Private key of account with relayer role in SimpleBridge
```

The relayer must be the same address that was set as `RELAYER` when deploying SimpleBridge contracts.

## Running the Relayer

### Development Mode (with auto-reload)
```bash
bun run --watch relayer.ts
```

### Production Mode
```bash
bun run relayer.ts
```

### Using npm
If you prefer npm:
```bash
npm install -g bun
bun run relayer.ts
```

## How It Works

### Event Listening
The relayer continuously listens for `BridgeInitiated` events on all source chains:

```
Base Sepolia
    ↓ (listens for BridgeInitiated)
Ethereum Sepolia
    ↓ (listens for BridgeInitiated)
Arbitrum Sepolia
    ↓ (listens for BridgeInitiated)
Optimism Sepolia
    ↓ (listens for BridgeInitiated)
```

### Bridge Completion Flow

1. **Event Detected**: `BridgeInitiated` event observed on source chain
   ```
   Event contains:
   - bridgeId: Unique bridge identifier
   - sourceChainId: Source blockchain ID
   - destChainId: Destination blockchain ID
   - token: Token address
   - recipient: Recipient address
   - amount: Amount to transfer
   ```

2. **Track Bridge**: Bridge is added to pending queue
   ```
   Status: pending
   Timestamp: Current time
   ```

3. **Process Bridge**: Relayer calls `completeBridge()` on destination chain
   ```
   Function call:
   - bridgeId: From the event
   - token: From the event
   - recipient: From the event
   - amount: From the event
   ```

4. **Completion**: Bridge marked as completed and transaction hash recorded
   ```
   Status: completed
   TxHash: Blockchain transaction hash
   ```

5. **Error Handling**: Failed bridges automatically retry after 30 seconds
   ```
   Status: failed → processing → (retry)
   Error message logged for debugging
   ```

## Output Example

```
🚀 SimpleBridge Off-Chain Relayer Starting...

📍 Relayer Address: 0x95Cf028D5e86863570E300CAD14484Dc2068eB79

👂 Listening for BridgeInitiated on Base Sepolia...
   Bridge: 0x9777F502DdAB647A54A1552673D123bB199B4b5e

👂 Listening for BridgeInitiated on Ethereum Sepolia...
   Bridge: 0x560f65Ca2d08bF995c57726eC83f7de29F5B2C38

👂 Listening for BridgeInitiated on Arbitrum Sepolia...
   Bridge: 0x9b9a721933038D4c85F3330e8B4f8CFC5a3F31CA

👂 Listening for BridgeInitiated on Optimism Sepolia...
   Bridge: 0x404A674a52f85789a71D530af705f2f458bc5284

✅ Relayer service running
Press Ctrl+C to stop

📍 BridgeInitiated detected!
   Bridge ID: 0x1234567890ab...
   From: Base Sepolia → Arbitrum Sepolia
   Token: 0x2b23c6e36b46cC013158Bc2869D686023FA85422
   Amount: 1000000
   From: 0x123... → To: 0x456...

⚙️  Processing bridge on Arbitrum Sepolia...
   Calling completeBridge()...
   ✅ Transaction sent: 0xabcdef123456...
   🔗 Explorer: https://sepolia.arbiscan.io/tx/0xabcdef123456...
```

## Status Reports

The relayer prints a status report every 60 seconds:

```
📊 Bridge Status Report
============================================================
⏳ 0x1234567890ab... | Base Sepolia → Arbitrum Sepolia | Amount: 1000000
⚙️  0x9876543210cd... | Ethereum Sepolia → Optimism Sepolia | Processing...
✅ 0xabcdefghijkl... | Base Sepolia → Ethereum Sepolia | TX: 0xabc123...
❌ 0xmnopqrstuvwx... | Arbitrum Sepolia → Base Sepolia | Error: Insufficient gas
============================================================
Summary: 1 pending | 1 processing | 1 completed | 1 failed
```

## Deployment Addresses

The relayer is configured with the following SimpleBridge deployments:

| Network | Chain ID | Address |
|---------|----------|---------|
| Base Sepolia | 84532 | `0x9777F502DdAB647A54A1552673D123bB199B4b5e` |
| Ethereum Sepolia | 11155111 | `0x560f65Ca2d08bF995c57726eC83f7de29F5B2C38` |
| Arbitrum Sepolia | 421614 | `0x9b9a721933038D4c85F3330e8B4f8CFC5a3F31CA` |
| Optimism Sepolia | 11155420 | `0x404A674a52f85789a71D530af705f2f458bc5284` |

Update these in `relayer.ts` if addresses change.

## Relayer Requirements

The relayer account must:

1. ✅ Be set as the relayer in SimpleBridge contracts
   ```solidity
   await bridge.setRelayer(relayerAddress)
   ```

2. ✅ Have enough native tokens for gas fees
   - ~0.002 ETH per bridge completion
   - ~0.001 ETH per network (for status checks)

3. ✅ Have network access to all RPC endpoints

4. ✅ Be authorized by SimpleBridge contracts to call `completeBridge()`

## Monitoring

### Watch Bridge Events in Real-Time
```bash
# Listen for BridgeInitiated on Base Sepolia
cast logs --address 0x9777F502DdAB647A54A1552673D123bB199B4b5e \
  "event BridgeInitiated(indexed bytes32,indexed uint256,indexed uint256)" \
  --rpc-url https://sepolia.base.org \
  --poll-interval 5
```

### Check Bridge Status
```bash
# Check if a bridge was processed
cast call 0x9777F502DdAB647A54A1552673D123bB199B4b5e \
  "processedBridges(bytes32)" 0x... \
  --rpc-url https://sepolia.base.org
```

### View Transaction Details
```bash
# Check relayer's transaction history
cast tx 0x... --rpc-url https://sepolia.arbiscan.io
```

## Troubleshooting

### Error: "Cannot find module 'viem'"
**Fix**: Install dependencies
```bash
bun install
```

### Error: "Unknown destination chain"
**Cause**: Bridge trying to complete on unsupported chain  
**Fix**: Check that SimpleBridge is deployed on destination chain

### Error: "SimpleB ridge not deployed on destination"
**Cause**: Bridge address not set in BRIDGE_ADDRESSES  
**Fix**: Deploy SimpleBridge or update address mapping

### Relayer keeps retrying but never succeeds
**Cause**: 
1. Relayer account not authorized in SimpleBridge
2. Relayer account has insufficient gas
3. Token approval issue

**Fix**: 
- Verify relayer address in SimpleBridge contract
- Check native token balance
- Ensure token is approved for SimpleBridge

### Bridges not being detected
**Cause**: RPC endpoint unreachable or stalled  
**Fix**: Check RPC URLs in .env file

## Production Deployment

When moving to production:

1. **Use a separate relayer wallet**
   - Generate new private key
   - Fund with minimal amount needed for gas

2. **Use a database instead of in-memory tracking**
   - Store pending bridges in PostgreSQL/MongoDB
   - Persist state across restarts
   - Track retry attempts

3. **Add proper logging**
   - Use Winston or Bunyan for structured logs
   - Send logs to centralized logging service
   - Alert on repeated failures

4. **Set up monitoring**
   - Monitor gas prices and adjust fees
   - Alert when relayer is low on funds
   - Track bridge completion time SLA

5. **Implement rate limiting**
   - Limit bridges processed per block
   - Prevent mempool spam
   - Batch completions when possible

6. **Deploy as a service**
   - Use PM2 or systemd for auto-restart
   - Set up health check endpoint
   - Configure alerting for crashes

## Example: Using with PM2

```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'simplebridge-relayer',
      script: 'relayer.ts',
      interpreter: 'bun',
      watch: false,
      env: {
        NODE_ENV: 'production'
      },
      error_file: 'logs/err.log',
      out_file: 'logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
EOF

# Start relayer
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# View logs
pm2 logs simplebridge-relayer
```

## Architecture

```
┌─────────────────────────────────────────┐
│     SimpleBridge Off-Chain Relayer      │
└──────────────┬──────────────────────────┘
               │
       ┌───────┼───────┐
       │       │       │
       ▼       ▼       ▼
    ┌──────┬──────┬──────┬──────┐
    │ Base │ Eth  │ Arb  │ Opt  │
    │ Sept │ Sept │ Sept │ Sept │
    └──────┴──────┴──────┴──────┘
       │        │        │        │
       ▼        ▼        ▼        ▼
    [Listen for BridgeInitiated events]
       │        │        │        │
       ▼        ▼        ▼        ▼
    [Track pending bridges in memory]
       │        │        │        │
       ▼        ▼        ▼        ▼
    [Process bridges when ready]
       │        │        │        │
       ▼        ▼        ▼        ▼
    [Call completeBridge() on dest chain]
       │        │        │        │
       ▼        ▼        ▼        ▼
    [Mark as completed + record tx hash]
```

## Security Considerations

⚠️ **Important**: The relayer account must be secured like a hot wallet:

- ✅ Use a dedicated key for relayer (not the deployer key)
- ✅ Limit relayer to only what's needed (completeBridge calls)
- ✅ Monitor for unauthorized access
- ✅ Rotate keys regularly
- ✅ Use HSM (Hardware Security Module) in production
- ✅ Implement rate limiting on bridge sizes
- ✅ Set maximum gas price limits

## License

MIT

---

**Status**: Ready for production  
**Last Updated**: 2025-11-30  
**Relayer Account**: 0x95Cf028D5e86863570E300CAD14484Dc2068eB79
