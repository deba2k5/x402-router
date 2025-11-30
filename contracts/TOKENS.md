# Mock Test Tokens - Deployment Guide

## Overview

Created two EIP-2612 compliant mock tokens for testing the PaymentRouter:

### MockUSDC (mUSDC)
- **Decimals**: 6 (same as real USDC)
- **Initial Supply**: 1,000,000 mUSDC
- **Features**: EIP-2612 permit, mintable, burnable

### MockDAI (mDAI)
- **Decimals**: 18 (same as real DAI)
- **Initial Supply**: 1,000,000 mDAI
- **Features**: EIP-2612 permit, mintable, burnable

---

## Token Standards Explained

### ✅ EIP-2612 (What We're Using)

Your PaymentRouter uses **EIP-2612** which provides:
- `permit(owner, spender, value, deadline, v, r, s)` function
- Gasless token approvals via signatures
- Widely supported (USDC, DAI, most modern tokens)

### ℹ️ EIP-3009 (Alternative)

**EIP-3009** is an alternative standard that provides:
- `transferWithAuthorization()` function
- More flexible but less common
- Mainly used by Circle's USDC

**Your current contract uses EIP-2612**, which is perfect for most use cases!

---

## Deployment Commands

### Deploy to All Testnets

```bash
npm run deploy:tokens:all
```

This will deploy both MockUSDC and MockDAI to:
- Base Sepolia
- Ethereum Sepolia
- Arbitrum Sepolia
- Optimism Sepolia

### Deploy to Specific Network

```bash
npm run deploy:tokens:base        # Base Sepolia
npm run deploy:tokens:sepolia     # Ethereum Sepolia
npm run deploy:tokens:arbitrum    # Arbitrum Sepolia
npm run deploy:tokens:optimism    # Optimism Sepolia
```

---

## After Deployment

### Token Addresses

Deployment addresses will be saved to:
- `deployments/tokens.json` - Master file with all networks
- `deployments/{network}-tokens.json` - Network-specific files

Example structure:
```json
{
  "baseSepolia": {
    "tokens": {
      "MockUSDC": {
        "address": "0x...",
        "decimals": 6,
        "symbol": "mUSDC"
      },
      "MockDAI": {
        "address": "0x...",
        "decimals": 18,
        "symbol": "mDAI"
      }
    }
  }
}
```

---

## Using the Tokens

### Mint More Tokens (For Testing)

```javascript
// Using ethers.js
const MockUSDC = await ethers.getContractAt("MockUSDC", usdcAddress);

// Mint 1000 USDC to an address
await MockUSDC.mint(userAddress, 1000 * 10**6);

// Mint 1000 DAI to an address
const MockDAI = await ethers.getContractAt("MockDAI", daiAddress);
await MockDAI.mint(userAddress, ethers.parseEther("1000"));
```

### Test Permit Functionality

```javascript
// Example: Create a permit signature
const domain = {
  name: await token.name(),
  version: "1",
  chainId: await ethers.provider.getNetwork().then(n => n.chainId),
  verifyingContract: await token.getAddress()
};

const types = {
  Permit: [
    { name: "owner", type: "address" },
    { name: "spender", type: "address" },
    { name: "value", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" }
  ]
};

const value = {
  owner: ownerAddress,
  spender: spenderAddress,
  value: amount,
  nonce: await token.nonces(ownerAddress),
  deadline: deadline
};

const signature = await owner.signTypedData(domain, types, value);
const { v, r, s } = ethers.Signature.from(signature);

// Now use this signature in PaymentRouter
```

---

## Integration with PaymentRouter

### Example Payment Flow

```javascript
// 1. User has MockUSDC
// 2. User signs permit for PaymentRouter
// 3. Backend calls PaymentRouter.executeRoute()

const permitData = {
  token: mockUSDCAddress,
  owner: userAddress,
  value: ethers.parseUnits("100", 6), // 100 USDC
  deadline: Math.floor(Date.now() / 1000) + 3600,
  v: signature.v,
  r: signature.r,
  s: signature.s
};

const routeParams = {
  paymentId: ethers.id("payment-123"),
  tokenIn: mockUSDCAddress,
  tokenOut: ethers.ZeroAddress, // No swap
  amountIn: ethers.parseUnits("100", 6),
  minAmountOut: ethers.parseUnits("100", 6),
  merchant: merchantAddress,
  dexRouter: ethers.ZeroAddress,
  dexCalldata: "0x"
};

await paymentRouter.executeRoute(permitData, routeParams);
```

---

## Verification

After deployment, verify contracts on block explorers:

```bash
# MockUSDC
npx hardhat verify --network baseSepolia <USDC_ADDRESS>

# MockDAI
npx hardhat verify --network baseSepolia <DAI_ADDRESS>
```

---

## Token Features

### Public Functions

Both tokens support:

```solidity
// Standard ERC20
function transfer(address to, uint256 amount) external returns (bool)
function approve(address spender, uint256 amount) external returns (bool)
function transferFrom(address from, address to, uint256 amount) external returns (bool)

// EIP-2612 Permit
function permit(
    address owner,
    address spender,
    uint256 value,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
) external

// Testing helpers
function mint(address to, uint256 amount) external
function burn(uint256 amount) external
```

---

## Next Steps

1. ✅ Deploy tokens to all testnets
2. ✅ Save token addresses
3. ✅ Mint tokens to test wallets
4. ✅ Test permit functionality
5. ✅ Integrate with PaymentRouter
6. ✅ Test end-to-end payment flow

---

## Summary

- ✅ **MockUSDC**: 6 decimals, EIP-2612 compliant
- ✅ **MockDAI**: 18 decimals, EIP-2612 compliant
- ✅ Both support permit for gasless approvals
- ✅ Mintable for easy testing
- ✅ Ready to deploy to all testnets
