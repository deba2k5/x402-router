# PaymentRouter Smart Contracts

Multi-chain payment router smart contracts for the x402 protocol. Enables pay-any-chain, pay-any-token settlement with permit-based transfers, DEX swaps, and merchant settlements.

## 🌐 Supported Networks

- **Base Sepolia** (Chain ID: 84532)
- **Ethereum Sepolia** (Chain ID: 11155111)
- **Arbitrum Sepolia** (Chain ID: 421614)
- **Optimism Sepolia** (Chain ID: 11155420)

## 🪙 Deployed Test Tokens

Mock ERC20 tokens with EIP-2612 permit support for testing:

### Base Sepolia (Chain ID: 84532)
- **MockUSDC**: `0x2b23c6e36b46cC013158Bc2869D686023FA85422` (6 decimals)
- **MockDAI**: `0x6eb198E04d9a6844F74FC099d35b292127656A3F` (18 decimals)

### Ethereum Sepolia (Chain ID: 11155111)
- **MockUSDC**: `0xc505D038fe2901fe624E6450887373BaA29e455F` (6 decimals)
- **MockDAI**: `0x1c7A8CA39057C856c512f45eBAADfBc276D6ad77` (18 decimals)

### Arbitrum Sepolia (Chain ID: 421614)
- **MockUSDC**: `0x7b926C6038a23c3E26F7f36DcBec7606BAF44434` (6 decimals)
- **MockDAI**: `0xeeC4119F3B69A61744073BdaEd83421F4b29961E` (18 decimals)

### Optimism Sepolia (Chain ID: 11155420)
- **MockUSDC**: `0x281Ae468d00040BCbB4685972F51f87d473420F7` (6 decimals)
- **MockDAI**: `0x7b926C6038a23c3E26F7f36DcBec7606BAF44434` (18 decimals)

> **Note**: All tokens have 1,000,000 initial supply and support `mint()` for testing. See [TOKENS.md](TOKENS.md) for details.

## 🚀 Deployed PaymentRouter Contracts

### Base Sepolia (Chain ID: 84532)
- **PaymentRouter**: `0x12B57C8615aD34469e1388F1CEb700F8f416BC80`
- **Relayer**: `0x95Cf028D5e86863570E300CAD14484Dc2068eB79`

### Ethereum Sepolia (Chain ID: 11155111)
- **PaymentRouter**: `0xAf83302a062bDEfC42e12d09E7Dd3e4374998F70`
- **Relayer**: `0x95Cf028D5e86863570E300CAD14484Dc2068eB79`

### Arbitrum Sepolia (Chain ID: 421614)
- **PaymentRouter**: `0xC49568398F909aF8D40Cf27B26780e1B5Ca5996F`
- **Relayer**: `0x95Cf028D5e86863570E300CAD14484Dc2068eB79`

### Optimism Sepolia (Chain ID: 11155420)
- **PaymentRouter**: `0xeeC4119F3B69A61744073BdaEd83421F4b29961E`
- **Relayer**: `0x95Cf028D5e86863570E300CAD14484Dc2068eB79`

> **Note**: All contracts use the same relayer address. You can update the relayer using `setRelayer()` function.

## 📋 Features

- **Permit-based Transfers**: EIP-2612 gasless approvals
- **DEX Integration**: Generic calldata support for any DEX router (Uniswap V2/V3, etc.)
- **Security**: ReentrancyGuard, Pausable, Access Control
- **Replay Protection**: Payment ID tracking
- **Slippage Protection**: Minimum output amount validation
- **Emergency Controls**: Pause/unpause and token rescue functions

## 🏗️ Architecture

```
PaymentRouter.sol
├── executeRoute()       # Main function to execute payment routes
├── setRelayer()         # Update authorized relayer
├── pause()/unpause()    # Emergency controls
└── rescueTokens()       # Emergency token recovery
```

### Data Structures

**PermitData**: Contains EIP-2612 permit signature data
```solidity
struct PermitData {
    address token;
    address owner;
    uint256 value;
    uint256 deadline;
    uint8 v;
    bytes32 r;
    bytes32 s;
}
```

**RouteParams**: Contains routing information
```solidity
struct RouteParams {
    bytes32 paymentId;
    address tokenIn;
    address tokenOut;
    uint256 amountIn;
    uint256 minAmountOut;
    address merchant;
    address dexRouter;
    bytes dexCalldata;
}
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `PRIVATE_KEY`: Deployer wallet private key
- `RELAYER_ADDRESS`: Address authorized to execute routes
- RPC URLs for each network
- Block explorer API keys for verification

### 3. Compile Contracts

```bash
npm run compile
```

### 4. Deploy to Networks

Deploy to a specific network:
```bash
npm run deploy:base        # Deploy to Base Sepolia
npm run deploy:sepolia     # Deploy to Ethereum Sepolia
npm run deploy:arbitrum    # Deploy to Arbitrum Sepolia
npm run deploy:optimism    # Deploy to Optimism Sepolia
```

Deploy to all networks:
```bash
npm run deploy:all
```

### 5. Verify Contracts

After deployment, verify on block explorers:

```bash
# Example for Base Sepolia
npx hardhat verify --network baseSepolia <CONTRACT_ADDRESS> "<RELAYER_ADDRESS>"
```

Or use the npm scripts:
```bash
npm run verify:base -- <CONTRACT_ADDRESS> "<RELAYER_ADDRESS>"
```

## 📁 Project Structure

```
contracts/
├── PaymentRouter.sol          # Main router contract
├── hardhat.config.js          # Hardhat configuration
├── package.json               # Dependencies and scripts
├── .env.example               # Environment variables template
├── scripts/
│   └── deploy.js              # Deployment script
├── test/                      # Test files (to be added)
└── deployments/               # Deployment addresses (auto-generated)
    ├── deployments.json       # Master deployment file
    ├── baseSepolia.json       # Base Sepolia deployment
    ├── sepolia.json           # Ethereum Sepolia deployment
    ├── arbitrumSepolia.json   # Arbitrum Sepolia deployment
    └── optimismSepolia.json   # Optimism Sepolia deployment
```

## 🔧 Contract Functions

### Main Functions

#### `executeRoute(PermitData calldata permit, RouteParams calldata route)`
Executes a payment route with the following steps:
1. Validates payment hasn't been processed
2. Executes permit for gasless approval
3. Pulls tokens from payer
4. Executes DEX swap if needed
5. Validates slippage protection
6. Transfers final tokens to merchant
7. Emits `RouteExecuted` event

**Access**: Only relayer
**Modifiers**: `nonReentrant`, `whenNotPaused`, `onlyRelayer`

### Admin Functions

#### `setRelayer(address _newRelayer)`
Updates the authorized relayer address.

**Access**: Only owner

#### `pause()` / `unpause()`
Emergency pause/unpause functionality.

**Access**: Only owner

#### `rescueTokens(address token, address to, uint256 amount)`
Emergency function to rescue stuck tokens.

**Access**: Only owner

### View Functions

#### `isPaymentProcessed(bytes32 paymentId) returns (bool)`
Checks if a payment has been processed.

## 🔐 Security Features

1. **ReentrancyGuard**: Prevents reentrancy attacks
2. **Pausable**: Emergency stop mechanism
3. **Access Control**: Only authorized relayer can execute routes
4. **Replay Protection**: Payment IDs tracked to prevent double-spending
5. **Slippage Protection**: Minimum output amount validation
6. **Deadline Validation**: Permit deadline checks

## 🧪 Testing

```bash
npm test
```

## 📊 Gas Optimization

The contract is optimized with:
- Solidity 0.8.20 with optimizer enabled (200 runs)
- Efficient storage patterns
- Minimal external calls

## 🔗 Integration Example

### Backend Facilitator Integration

```javascript
const { ethers } = require("ethers");

// Load deployment addresses
const deployments = require("./deployments/deployments.json");

// Get contract instance
const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);
const router = new ethers.Contract(
  deployments.baseSepolia.contractAddress,
  ROUTER_ABI,
  signer
);

// Execute route
const tx = await router.executeRoute(permitData, routeParams);
const receipt = await tx.wait();
```

## 📝 Deployment Addresses

After deployment, addresses are saved in `deployments/deployments.json`:

```json
{
  "baseSepolia": {
    "contractAddress": "0x...",
    "chainId": 84532,
    "deployer": "0x...",
    "relayer": "0x..."
  },
  ...
}
```

## 🛠️ Troubleshooting

### Common Issues

**Issue**: "Insufficient funds for deployment"
- **Solution**: Ensure deployer wallet has enough testnet ETH

**Issue**: "Invalid permit signature"
- **Solution**: Verify permit parameters match EIP-2612 specification

**Issue**: "Swap failed"
- **Solution**: Check DEX router address and calldata encoding

### Getting Testnet ETH

- **Base Sepolia**: [Base Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
- **Ethereum Sepolia**: [Sepolia Faucet](https://sepoliafaucet.com/)
- **Arbitrum Sepolia**: [Arbitrum Faucet](https://faucet.quicknode.com/arbitrum/sepolia)
- **Optimism Sepolia**: [Optimism Faucet](https://app.optimism.io/faucet)

## 📚 Additional Resources

- [EIP-2612: Permit Extension](https://eips.ethereum.org/EIPS/eip-2612)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [x402 Protocol Specification](https://github.com/your-repo/x402-spec)

## 📄 License

MIT
