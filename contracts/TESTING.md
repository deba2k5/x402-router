# 🧪 PaymentRouter Integration Tests

## ✅ Test Results

**All tests passed successfully!** 🎉

```
PaymentRouter - Swap and Payment Flow Tests
  Direct Payment (No Swap)
    ✔ Should execute direct USDC payment with permit
    ✔ Should prevent replay attacks
  Swap and Payment
    ✔ Should execute USDC to DAI swap and pay merchant
    ✔ Should revert if slippage is too high
  Access Control
    ✔ Should only allow relayer to execute routes
  Emergency Functions
    ✔ Should allow owner to pause and unpause
    ✔ Should prevent execution when paused

7 passing (378ms)
```

---

## 📋 Test Coverage

### 1. Direct Payment Tests

#### ✅ Direct USDC Payment with Permit
- **What it tests**: End-to-end payment flow without token swap
- **Flow**:
  1. Payer signs EIP-2612 permit for USDC
  2. Relayer executes route with permit signature
  3. PaymentRouter pulls USDC from payer
  4. PaymentRouter transfers USDC to merchant
- **Verifications**:
  - `RouteExecuted` event emitted with correct parameters
  - Merchant receives exact payment amount
  - Payer's balance decreases correctly

#### ✅ Replay Attack Prevention
- **What it tests**: Payment IDs prevent double-spending
- **Flow**:
  1. Execute payment with specific paymentId
  2. Attempt to execute same payment again
- **Verifications**:
  - First execution succeeds
  - Second execution reverts with `PaymentAlreadyProcessed` error

---

### 2. Swap and Payment Tests

#### ✅ USDC to DAI Swap and Payment
- **What it tests**: Token swap before merchant payment
- **Flow**:
  1. Payer signs permit for 100 USDC
  2. PaymentRouter pulls USDC from payer
  3. PaymentRouter approves MockDexRouter
  4. MockDexRouter swaps 100 USDC → 99 DAI (1% slippage)
  5. PaymentRouter transfers DAI to merchant
- **Verifications**:
  - Merchant receives DAI (not USDC)
  - Correct swap amount (99 DAI)
  - Payer's USDC balance decreases
  - Event emits both tokenIn and tokenOut

#### ✅ Slippage Protection
- **What it tests**: Minimum output amount validation
- **Flow**:
  1. Set minAmountOut to 99 DAI
  2. MockDex returns only 95 DAI (high slippage)
  3. Transaction should revert
- **Verifications**:
  - Transaction reverts with `SlippageExceeded` error
  - No tokens transferred
  - Payer funds remain safe

---

### 3. Access Control Tests

#### ✅ Relayer-Only Execution
- **What it tests**: Only authorized relayer can execute routes
- **Flow**:
  1. Non-relayer (payer) attempts to execute route
  2. Transaction should revert
- **Verifications**:
  - Transaction reverts with `UnauthorizedRelayer` error
  - Only relayer address can call `executeRoute()`

---

### 4. Emergency Function Tests

#### ✅ Pause/Unpause Functionality
- **What it tests**: Owner can pause contract for emergencies
- **Flow**:
  1. Owner pauses contract
  2. Verify paused state
  3. Owner unpauses contract
  4. Verify unpaused state
- **Verifications**:
  - `paused()` returns correct state
  - Only owner can pause/unpause

#### ✅ Execution Blocked When Paused
- **What it tests**: No routes can execute when paused
- **Flow**:
  1. Owner pauses contract
  2. Relayer attempts to execute route
  3. Transaction should revert
- **Verifications**:
  - Transaction reverts when paused
  - Emergency stop mechanism works

---

## 🔧 Test Infrastructure

### Mock Contracts

#### MockDexRouter
- **Purpose**: Simulates DEX swap functionality
- **Features**:
  - Configurable swap rates
  - `setSwapRate()` to configure test scenarios
  - `swap()` function mimics real DEX behavior
- **Location**: `src/MockDexRouter.sol`

#### MockUSDC & MockDAI
- **Purpose**: ERC20 tokens with permit support
- **Features**:
  - EIP-2612 permit functionality
  - Mintable for easy test setup
  - Correct decimals (6 for USDC, 18 for DAI)
- **Location**: `src/MockUSDC.sol`, `src/MockDAI.sol`

---

## 🚀 Running the Tests

### Run All Integration Tests
```bash
npx hardhat test test/PaymentRouter.integration.test.js
```

### Run Specific Test
```bash
npx hardhat test test/PaymentRouter.integration.test.js --grep "Should execute USDC to DAI swap"
```

### Run All Tests
```bash
npx hardhat test
```

### Run with Gas Reporter
```bash
REPORT_GAS=true npx hardhat test
```

---

## 📊 Test Scenarios Covered

| Scenario | Status | Description |
|----------|--------|-------------|
| Direct Payment | ✅ | USDC payment without swap |
| Replay Protection | ✅ | Prevent double-spending |
| Token Swap | ✅ | USDC → DAI swap + payment |
| Slippage Protection | ✅ | Revert on high slippage |
| Access Control | ✅ | Relayer-only execution |
| Pause Mechanism | ✅ | Emergency stop |
| Paused Execution | ✅ | Block routes when paused |

---

## 🔍 What's NOT Tested (Requires Mainnet/Testnet)

These scenarios require actual deployed contracts and cannot be fully tested in local environment:

1. **Real DEX Integration**
   - Uniswap V2/V3 swaps
   - Actual slippage on live markets
   - Gas optimization with real routers

2. **Cross-Chain Bridging**
   - Mayan bridge integration
   - Cross-chain message passing
   - Bridge fee calculations

3. **Real Permit Signatures**
   - Wallet-signed permits (MetaMask, etc.)
   - Nonce management across sessions
   - Deadline expiration in production

4. **Gas Costs**
   - Actual gas usage on testnets
   - Optimization opportunities
   - Cost comparison vs alternatives

---

## 🎯 Next Steps for Testing

### 1. Testnet Integration Tests
- [ ] Deploy to Base Sepolia
- [ ] Test with real Uniswap router
- [ ] Test with real wallet signatures
- [ ] Measure actual gas costs

### 2. Cross-Chain Tests
- [ ] Test Mayan bridge integration
- [ ] Test cross-chain token swaps
- [ ] Test bridge fee handling

### 3. Load Testing
- [ ] Multiple concurrent payments
- [ ] High-volume scenarios
- [ ] Stress test replay protection

### 4. Security Testing
- [ ] Reentrancy attack scenarios
- [ ] Front-running protection
- [ ] Signature replay attacks

---

## 📝 Test File Structure

```
test/
├── PaymentRouter.test.js              # Basic unit tests
├── PaymentRouter.integration.test.js  # Integration tests (NEW)
└── MockERC20Permit.sol                # Mock token for testing

src/
├── PaymentRouter.sol                  # Main contract
├── MockUSDC.sol                       # Test token
├── MockDAI.sol                        # Test token
└── MockDexRouter.sol                  # Mock DEX (NEW)
```

---

## ✅ Conclusion

All core functionality of the PaymentRouter contract has been tested and verified:

- ✅ **Permit-based transfers** work correctly
- ✅ **Token swaps** execute properly
- ✅ **Slippage protection** prevents bad trades
- ✅ **Replay protection** prevents double-spending
- ✅ **Access control** restricts execution to relayer
- ✅ **Emergency controls** allow pausing

**The contract is ready for testnet deployment and real-world testing!** 🚀
