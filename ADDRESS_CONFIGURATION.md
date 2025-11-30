# Address Configuration Guide - X402 Payment Router

## Overview

This document explains the correct addresses to use for the X402 protocol implementation and clarifies the role of each address in the payment flow.

## Key Addresses

### 1. **PaymentRouter Contract Addresses** (Merchant/Spender Address)
These are the smart contracts deployed on each network that handle the payment routing logic.

| Network | Chain ID | PaymentRouter Address |
|---------|----------|----------------------|
| Base Sepolia | 84532 | `0x12B57C8615aD34469e1388F1CEb700F8f416BC80` |
| Ethereum Sepolia | 11155111 | `0xAf83302a062bDEfC42e12d09E7Dd3e4374998F70` |
| Arbitrum Sepolia | 421614 | `0xC49568398F909aF8D40Cf27B26780e1B5Ca5996F` |
| Optimism Sepolia | 11155420 | `0xeeC4119F3B69A61744073BdaEd83421F4b29961E` |

**Role**: Used as the `spender` in EIP-2612 permit signatures. Users grant these contracts permission to transfer tokens on their behalf.

### 2. **Relayer Address** (Receives Payments)
The address that ultimately receives the payments from users.

```
0x95Cf028D5e86863570E300CAD14484Dc2068eB79
```

**Role**: The `payTo` address in the X402 payment requirements. This is the address that receives the settled payments.

### 3. **Mock Token Addresses**

#### Base Sepolia (84532)
- **MockUSDC**: `0x2b23c6e36b46cC013158Bc2869D686023FA85422` (6 decimals)
- **MockDAI**: `0x6eb198E04d9a6844F74FC099d35b292127656A3F` (18 decimals)

#### Ethereum Sepolia (11155111)
- **MockUSDC**: `0xc505D038fe2901fe624E6450887373BaA29e455F` (6 decimals)
- **MockDAI**: `0x1c7A8CA39057C856c512f45eBAADfBc276D6ad77` (18 decimals)

#### Arbitrum Sepolia (421614)
- **MockUSDC**: `0x7b926C6038a23c3E26F7f36DcBec7606BAF44434` (6 decimals)
- **MockDAI**: `0xeeC4119F3B69A61744073BdaEd83421F4b29961E` (18 decimals)

#### Optimism Sepolia (11155420)
- **MockUSDC**: `0x281Ae468d00040BCbB4685972F51f87d473420F7` (6 decimals)
- **MockDAI**: `0x7b926C6038a23c3E26F7f36DcBec7606BAF44434` (18 decimals)

## Payment Flow

```
User (Payer)
    ↓
    1. Sign Permit (approve PaymentRouter as spender)
    ↓
    2. Send to Facilitator
    ↓
    3. Facilitator calls PaymentRouter.executeRoute()
    ↓
    4. PaymentRouter transfers tokens from User to Relayer
    ↓
Relayer (Receives Payment)
```

## Checksum Validation

All addresses are **EIP-55 checksummed**. This means:
- Each address has a specific case (uppercase/lowercase) pattern based on its hash
- Viem and other Web3 libraries validate this checksum
- ❌ `0x742d35Cc6634C0532925a3b844Bc9e7595f0Ab0b` (INVALID - wrong case on last chars)
- ✅ `0x95Cf028D5e86863570E300CAD14484Dc2068eB79` (VALID - correct checksum)

## Frontend Configuration

### Image Generation Service
- **Price**: 1 USDC
- **PaymentRouter Spender**: Network-specific from table above
- **Relayer (payTo)**: `0x95Cf028D5e86863570E300CAD14484Dc2068eB79`

### Location Suggestions Service
- **Price**: 0.5 USDC
- **PaymentRouter Spender**: Network-specific from table above
- **Relayer (payTo)**: `0x95Cf028D5e86863570E300CAD14484Dc2068eB79`

## Backend Configuration

### Environment Variables
```env
MERCHANT_ADDRESS=0x95Cf028D5e86863570E300CAD14484Dc2068eB79  # Relayer address
```

### Payment Requirements Response
```javascript
{
  x402Version: 1,
  payTo: "0x95Cf028D5e86863570E300CAD14484Dc2068eB79",  // Relayer
  resource: "/api/ai/image-generation",
  maxAmountRequired: "1000000",
  supportedAssets: [
    {
      network: "base-sepolia",
      chainId: 84532,
      asset: "0x2b23c6e36b46cC013158Bc2869D686023FA85422",  // MockUSDC
      symbol: "USDC",
      decimals: 6
    }
    // ... more networks
  ]
}
```

## Common Mistakes to Avoid

1. ❌ Using the same address for both `spender` and `payTo`
   - `spender` = PaymentRouter contract (allows token transfer)
   - `payTo` = Relayer address (receives the payment)

2. ❌ Using incorrect checksum addresses
   - Always use EIP-55 checksummed addresses
   - Viem will validate and reject invalid checksums

3. ❌ Using wrong token addresses per network
   - Each network has different token deployments
   - Always cross-reference with deployment files

4. ❌ Hardcoding addresses instead of using network-specific configs
   - Use CHAIN_CONFIGS with network-specific mappings
   - Update PaymentRouter address when switching networks

## Testing Addresses

To test minting tokens to your address on testnet:

```javascript
const MockUSDC = await ethers.getContractAt(
  "MockUSDC", 
  "0x2b23c6e36b46cC013158Bc2869D686023FA85422"  // Base Sepolia
);

// Mint 10 USDC to your address
await MockUSDC.mint(userAddress, 10 * 10**6);
```

## References

- **Deployment Summary**: [COMPLETE_DEPLOYMENT.md](contracts/COMPLETE_DEPLOYMENT.md)
- **Token Addresses**: [DEPLOYMENT_SUMMARY.md](contracts/DEPLOYMENT_SUMMARY.md)
- **Contract Source**: [PaymentRouter.sol](contracts/src/PaymentRouter.sol)
- **Deployment Config**: [deployments.json](contracts/deployments/deployments.json)
