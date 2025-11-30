// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PaymentRouter
 * @notice Multi-chain payment router for x402 protocol
 * @dev Supports permit-based transfers, DEX swaps, and merchant settlements
 * Deploy to: Base, Sepolia, Arbitrum, Optimism testnets
 */
contract PaymentRouter is ReentrancyGuard, Pausable, Ownable {
    
    // ============ State Variables ============
    
    /// @notice Authorized relayer address that can execute routes
    address public relayer;
    
    // ============ Structs ============
    
    /**
     * @notice Permit data for EIP-2612 gasless approvals
     * @param token The token address to permit
     * @param owner The token owner granting permission
     * @param value The amount to permit
     * @param deadline The permit expiration timestamp
     * @param v ECDSA signature parameter
     * @param r ECDSA signature parameter
     * @param s ECDSA signature parameter
     */
    struct PermitData {
        address token;
        address owner;
        uint256 value;
        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }
    
    /**
     * @notice Route parameters for payment execution
     * @param paymentId Unique identifier for this payment
     * @param tokenIn Input token address
     * @param tokenOut Output token address (address(0) if no swap)
     * @param amountIn Amount of input tokens
     * @param minAmountOut Minimum output tokens (slippage protection)
     * @param merchant Merchant's payout address
     * @param dexRouter DEX router address (address(0) if no swap)
     * @param dexCalldata Encoded DEX swap calldata
     */
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
    
    // ============ Events ============
    
    /**
     * @notice Emitted when a route is successfully executed
     * @param paymentId Unique payment identifier
     * @param payer Address of the payer
     * @param merchant Address of the merchant
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountIn Amount of input tokens
     * @param amountOut Amount of output tokens sent to merchant
     */
    event RouteExecuted(
        bytes32 indexed paymentId,
        address indexed payer,
        address indexed merchant,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );
    
    /**
     * @notice Emitted when relayer address is updated
     * @param oldRelayer Previous relayer address
     * @param newRelayer New relayer address
     */
    event RelayerUpdated(address indexed oldRelayer, address indexed newRelayer);
    
    // ============ Errors ============
    
    error UnauthorizedRelayer();
    error InvalidAmount();
    error SlippageExceeded();
    error SwapFailed();
    error TransferFailed();
    error InvalidPermit();
    error DeadlineExpired();
    
    // ============ Modifiers ============
    
    /**
     * @notice Restricts function access to authorized relayer only
     */
    modifier onlyRelayer() {
        if (msg.sender != relayer) revert UnauthorizedRelayer();
        _;
    }
    
    // ============ Constructor ============
    
    /**
     * @notice Initialize the PaymentRouter contract
     * @param _relayer Initial relayer address
     */
    constructor(address _relayer) Ownable(msg.sender) {
        relayer = _relayer;
        emit RelayerUpdated(address(0), _relayer);
    }
    
    // ============ Main Functions ============
    
    /**
     * @notice Execute a payment route with permit-based transfer
     * @param permit Permit data for gasless token approval
     * @param route Route parameters for payment execution
     * @dev Only callable by authorized relayer when contract is not paused
     */
    function executeRoute(
        PermitData calldata permit,
        RouteParams calldata route
    ) external nonReentrant whenNotPaused onlyRelayer {
        // 1. Validate amounts
        if (route.amountIn == 0 || route.minAmountOut == 0) {
            revert InvalidAmount();
        }
        
        // 2. Validate permit deadline
        if (block.timestamp > permit.deadline) {
            revert DeadlineExpired();
        }
        
        // 3. Execute permit to approve token transfer
        _executePermit(permit);
        
        // 4. Pull tokens from payer
        bool success = IERC20(route.tokenIn).transferFrom(
            permit.owner,
            address(this),
            route.amountIn
        );
        if (!success) revert TransferFailed();
        
        uint256 amountOut;
        
        // 5. Execute swap if needed (tokenOut != address(0) and dexRouter provided)
        if (route.tokenOut != address(0) && route.dexRouter != address(0)) {
            amountOut = _executeSwap(route);
        } else {
            // No swap needed, direct transfer
            amountOut = route.amountIn;
        }
        
        // 6. Validate slippage protection
        if (amountOut < route.minAmountOut) {
            revert SlippageExceeded();
        }
        
        // 7. Transfer final tokens to merchant
        address finalToken = route.tokenOut != address(0) ? route.tokenOut : route.tokenIn;
        success = IERC20(finalToken).transfer(route.merchant, amountOut);
        if (!success) revert TransferFailed();
        
        // 8. Emit event for backend confirmation
        emit RouteExecuted(
            route.paymentId,
            permit.owner,
            route.merchant,
            route.tokenIn,
            route.tokenOut,
            route.amountIn,
            amountOut
        );
    }
    
    // ============ Internal Functions ============
    
    /**
     * @notice Execute EIP-2612 permit for gasless approval
     * @param permit Permit data containing signature
     */
    function _executePermit(PermitData calldata permit) internal {
        try IERC20Permit(permit.token).permit(
            permit.owner,
            address(this),
            permit.value,
            permit.deadline,
            permit.v,
            permit.r,
            permit.s
        ) {
            // Permit successful
        } catch {
            revert InvalidPermit();
        }
    }
    
    /**
     * @notice Execute DEX swap using provided calldata
     * @param route Route parameters containing DEX details
     * @return amountOut Amount of output tokens received
     */
    function _executeSwap(RouteParams calldata route) internal returns (uint256 amountOut) {
        // Approve DEX router to spend tokenIn
        IERC20(route.tokenIn).approve(route.dexRouter, route.amountIn);
        
        // Get balance before swap
        uint256 balanceBefore = IERC20(route.tokenOut).balanceOf(address(this));
        
        // Execute swap via low-level call
        (bool success, ) = route.dexRouter.call(route.dexCalldata);
        if (!success) revert SwapFailed();
        
        // Calculate amount received
        uint256 balanceAfter = IERC20(route.tokenOut).balanceOf(address(this));
        amountOut = balanceAfter - balanceBefore;
        
        // Reset approval to 0 for security
        IERC20(route.tokenIn).approve(route.dexRouter, 0);
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Update the authorized relayer address
     * @param _newRelayer New relayer address
     */
    function setRelayer(address _newRelayer) external onlyOwner {
        address oldRelayer = relayer;
        relayer = _newRelayer;
        emit RelayerUpdated(oldRelayer, _newRelayer);
    }
    
    /**
     * @notice Pause the contract (emergency stop)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @notice Emergency function to rescue stuck tokens
     * @param token Token address to rescue
     * @param to Destination address
     * @param amount Amount to rescue
     */
    function rescueTokens(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        bool success = IERC20(token).transfer(to, amount);
        if (!success) revert TransferFailed();
    }
    

}
