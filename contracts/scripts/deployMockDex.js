const hre = require("hardhat");

async function main() {
    console.log("Deploying MockDexRouter to", hre.network.name);

    const MockDexRouter = await hre.ethers.getContractFactory("MockDexRouter");
    const mockDexRouter = await MockDexRouter.deploy();

    await mockDexRouter.waitForDeployment();

    const address = await mockDexRouter.getAddress();
    console.log("✅ MockDexRouter deployed to:", address);

    // Verify if possible
    if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
        console.log("Waiting for confirmations...");
        await mockDexRouter.deploymentTransaction().wait(5);

        console.log("Verifying...");
        try {
            await hre.run("verify:verify", {
                address: address,
                constructorArguments: [],
            });
        } catch (e) {
            console.log("Verification failed:", e.message);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
