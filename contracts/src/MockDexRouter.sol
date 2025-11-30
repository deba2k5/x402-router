// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MockDexRouter
 * @notice Mock DEX router for testing swap functionality
 */
contract MockDexRouter {
    
    // Mapping to store swap rates: tokenIn => tokenOut => amountOut
    mapping(address => mapping(address => uint256)) public swapRates;
    
    /**
     * @notice Set the swap rate for testing
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountOut Amount of output tokens to return
     */
    function setSwapRate(
        address tokenIn,
        address tokenOut,
        uint256 amountOut
    ) external {
        swapRates[tokenIn][tokenOut] = amountOut;
    }
    
    /**
     * @notice Mock swap function that simulates a DEX swap
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountIn Amount of input tokens
     * @param minAmountOut Minimum amount of output tokens (not used in mock)
     */
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) external returns (uint256 amountOut) {
        // Get the configured swap rate
        amountOut = swapRates[tokenIn][tokenOut];
        require(amountOut > 0, "Swap rate not configured");
        
        // Pull input tokens from caller
        require(
            IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn),
            "Transfer in failed"
        );
        
        // Send output tokens to caller
        require(
            IERC20(tokenOut).transfer(msg.sender, amountOut),
            "Transfer out failed"
        );
        
        return amountOut;
    }
    
    /**
     * @notice Get the expected output amount for a swap
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @return amountOut Expected output amount
     */
    function getAmountOut(
        address tokenIn,
        address tokenOut,
        uint256 /* amountIn */
    ) external view returns (uint256 amountOut) {
        return swapRates[tokenIn][tokenOut];
    }
}
