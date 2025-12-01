// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SimpleBridge
 * @notice Simple cross-chain bridge for transferring tokens between networks
 * @dev Allows relayers to transfer tokens on behalf of users
 */
contract SimpleBridge is ReentrancyGuard, Pausable, Ownable {
    
    // ============ State Variables ============
    
    /// @notice Authorized relayer address that can execute bridge transfers
    address public relayer;
    
    /// @notice Mapping to track processed bridge transfers (prevent replay)
    mapping(bytes32 => bool) public processedBridges;
    
    // ============ Events ============
    
    /**
     * @notice Emitted when tokens are locked for bridge transfer
     * @param bridgeId Unique identifier for this bridge transfer
     * @param sourceChainId Chain ID where tokens are locked
     * @param destChainId Chain ID where tokens will be unlocked
     * @param token Token address being bridged
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount being bridged
     */
    event BridgeInitiated(
        bytes32 indexed bridgeId,
        uint256 indexed sourceChainId,
        uint256 indexed destChainId,
        address token,
        address from,
        address to,
        uint256 amount
    );

    /**
     * @notice Emitted when tokens are released on destination chain
     * @param bridgeId Bridge transfer identifier
     * @param token Token address
     * @param recipient Recipient address
     * @param amount Amount released
     */
    event BridgeCompleted(
        bytes32 indexed bridgeId,
        address indexed token,
        address indexed recipient,
        uint256 amount
    );

    /**
     * @notice Emitted when relayer is updated
     * @param oldRelayer Previous relayer
     * @param newRelayer New relayer
     */
    event RelayerUpdated(address indexed oldRelayer, address indexed newRelayer);

    // ============ Errors ============
    
    error UnauthorizedRelayer();
    error InvalidAmount();
    error TransferFailed();
    error BridgeAlreadyProcessed();
    error InvalidChainIds();

    // ============ Modifiers ============

    modifier onlyRelayer() {
        if (msg.sender != relayer) revert UnauthorizedRelayer();
        _;
    }

    // ============ Constructor ============

    constructor(address _relayer) Ownable(msg.sender) {
        relayer = _relayer;
        emit RelayerUpdated(address(0), _relayer);
    }

    // ============ Bridge Functions ============

    /**
     * @notice Initiate a bridge transfer - lock tokens on source chain
     * @param bridgeId Unique identifier for this bridge
     * @param destChainId Destination chain ID
     * @param token Token to bridge
     * @param amount Amount to bridge
     * @param recipient Recipient address on destination chain
     */
    function initiateBridge(
        bytes32 bridgeId,
        uint256 destChainId,
        address token,
        uint256 amount,
        address recipient
    ) external nonReentrant whenNotPaused {
        if (amount == 0) revert InvalidAmount();
        if (recipient == address(0)) revert InvalidAmount();

        // In real implementation, would check that destChainId is valid
        // For now, just ensure it's different from source
        uint256 sourceChainId = block.chainid;
        if (sourceChainId == destChainId) revert InvalidChainIds();

        // Lock tokens from user
        bool success = IERC20(token).transferFrom(msg.sender, address(this), amount);
        if (!success) revert TransferFailed();

        emit BridgeInitiated(
            bridgeId,
            sourceChainId,
            destChainId,
            token,
            msg.sender,
            recipient,
            amount
        );
    }

    /**
     * @notice Complete a bridge transfer - release tokens on destination chain
     * @param bridgeId Bridge identifier
     * @param token Token address on this chain
     * @param recipient Recipient address
     * @param amount Amount to release
     * @dev Only relayer can call this (signed by relayer off-chain)
     */
    function completeBridge(
        bytes32 bridgeId,
        address token,
        address recipient,
        uint256 amount
    ) external onlyRelayer nonReentrant {
        if (amount == 0) revert InvalidAmount();
        if (processedBridges[bridgeId]) revert BridgeAlreadyProcessed();
        if (recipient == address(0)) revert InvalidAmount();

        // Mark as processed
        processedBridges[bridgeId] = true;

        // Release tokens to recipient
        bool success = IERC20(token).transfer(recipient, amount);
        if (!success) revert TransferFailed();

        emit BridgeCompleted(bridgeId, token, recipient, amount);
    }

    // ============ Admin Functions ============

    /**
     * @notice Update the relayer address
     * @param _newRelayer New relayer address
     */
    function setRelayer(address _newRelayer) external onlyOwner {
        require(_newRelayer != address(0));
        address oldRelayer = relayer;
        relayer = _newRelayer;
        emit RelayerUpdated(oldRelayer, _newRelayer);
    }

    /**
     * @notice Emergency withdraw of stuck tokens
     * @param token Token to withdraw
     * @param recipient Address to send tokens to
     */
    function emergencyWithdraw(address token, address recipient) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(recipient, balance);
        }
    }

    /**
     * @notice Pause/unpause bridge
     */
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
