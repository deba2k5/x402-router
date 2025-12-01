const hre = require("hardhat");

async function main() {
    const network = hre.network.name;
    console.log("Funding MockDexRouter on", network);

    if (network !== "baseSepolia") {
        console.log("Skipping funding on non-Base network");
        return;
    }

    // Addresses
    const MOCK_DEX_ADDRESS = "0x3351F07aF05108C102b3a8a24b61B26737c14D4a";
    const MOCK_USDC_ADDRESS = "0x2b23c6e36b46cC013158Bc2869D686023FA85422";

    const mockUSDC = await hre.ethers.getContractAt("MockUSDC", MOCK_USDC_ADDRESS);

    // Mint 1000 USDC to MockDexRouter
    console.log("Minting 1000 USDC to MockDexRouter...");
    const tx = await mockUSDC.mint(MOCK_DEX_ADDRESS, hre.ethers.parseUnits("1000", 6));
    await tx.wait();
    console.log("✅ Minted!");

    // Check balance
    const balance = await mockUSDC.balanceOf(MOCK_DEX_ADDRESS);
    console.log("MockDexRouter USDC Balance:", hre.ethers.formatUnits(balance, 6));
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
