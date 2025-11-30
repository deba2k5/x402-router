// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/**
 * @title MockDAI
 * @notice Mock DAI token with permit functionality for testing
 * @dev EIP-2612 compliant for gasless approvals
 */
contract MockDAI is ERC20, ERC20Permit {
    
    /**
     * @notice Initialize MockDAI with 18 decimals (like real DAI)
     */
    constructor() ERC20("Mock DAI", "mDAI") ERC20Permit("Mock DAI") {
        // Mint initial supply to deployer for testing
        _mint(msg.sender, 1_000_000 * 10**18); // 1 million DAI
    }

    /**
     * @notice Returns 18 decimals (same as real DAI)
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }

    /**
     * @notice Mint tokens to any address (for testing only)
     * @param to Address to mint tokens to
     * @param amount Amount to mint (in base units)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @notice Burn tokens from caller (for testing)
     * @param amount Amount to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
