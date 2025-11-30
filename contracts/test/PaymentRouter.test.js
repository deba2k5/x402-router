const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PaymentRouter", function () {
    let paymentRouter;
    let owner;
    let relayer;
    let merchant;
    let payer;
    let mockToken;

    beforeEach(async function () {
        [owner, relayer, merchant, payer] = await ethers.getSigners();

        // Deploy a mock ERC20 token with permit functionality
        const MockERC20Permit = await ethers.getContractFactory("MockERC20Permit");
        mockToken = await MockERC20Permit.deploy("Mock Token", "MOCK", 18);
        await mockToken.waitForDeployment();

        // Mint tokens to payer
        await mockToken.mint(payer.address, ethers.parseEther("1000"));

        // Deploy PaymentRouter
        const PaymentRouter = await ethers.getContractFactory("PaymentRouter");
        paymentRouter = await PaymentRouter.deploy(relayer.address);
        await paymentRouter.waitForDeployment();
    });

    describe("Deployment", function () {
        it("Should set the correct relayer", async function () {
            expect(await paymentRouter.relayer()).to.equal(relayer.address);
        });

        it("Should set the correct owner", async function () {
            expect(await paymentRouter.owner()).to.equal(owner.address);
        });

        it("Should not be paused initially", async function () {
            expect(await paymentRouter.paused()).to.equal(false);
        });
    });

    describe("Access Control", function () {
        it("Should allow owner to set new relayer", async function () {
            await expect(paymentRouter.connect(owner).setRelayer(merchant.address))
                .to.emit(paymentRouter, "RelayerUpdated")
                .withArgs(relayer.address, merchant.address);

            expect(await paymentRouter.relayer()).to.equal(merchant.address);
        });

        it("Should not allow non-owner to set relayer", async function () {
            await expect(
                paymentRouter.connect(payer).setRelayer(merchant.address)
            ).to.be.reverted;
        });

        it("Should allow owner to pause", async function () {
            await paymentRouter.connect(owner).pause();
            expect(await paymentRouter.paused()).to.equal(true);
        });

        it("Should allow owner to unpause", async function () {
            await paymentRouter.connect(owner).pause();
            await paymentRouter.connect(owner).unpause();
            expect(await paymentRouter.paused()).to.equal(false);
        });
    });

    describe("Payment Processing", function () {
        it("Should track processed payments", async function () {
            const paymentId = ethers.id("payment-123");
            expect(await paymentRouter.isPaymentProcessed(paymentId)).to.equal(false);
        });

        it("Should prevent non-relayer from executing routes", async function () {
            const paymentId = ethers.id("payment-123");
            const deadline = Math.floor(Date.now() / 1000) + 3600;

            const permitData = {
                token: await mockToken.getAddress(),
                owner: payer.address,
                value: ethers.parseEther("100"),
                deadline: deadline,
                v: 27,
                r: ethers.ZeroHash,
                s: ethers.ZeroHash,
            };

            const routeParams = {
                paymentId: paymentId,
                tokenIn: await mockToken.getAddress(),
                tokenOut: ethers.ZeroAddress,
                amountIn: ethers.parseEther("100"),
                minAmountOut: ethers.parseEther("100"),
                merchant: merchant.address,
                dexRouter: ethers.ZeroAddress,
                dexCalldata: "0x",
            };

            await expect(
                paymentRouter.connect(payer).executeRoute(permitData, routeParams)
            ).to.be.revertedWithCustomError(paymentRouter, "UnauthorizedRelayer");
        });
    });

    describe("Emergency Functions", function () {
        it("Should allow owner to rescue tokens", async function () {
            // Send some tokens to the contract
            await mockToken.connect(payer).transfer(
                await paymentRouter.getAddress(),
                ethers.parseEther("100")
            );

            const contractBalance = await mockToken.balanceOf(
                await paymentRouter.getAddress()
            );
            expect(contractBalance).to.equal(ethers.parseEther("100"));

            // Rescue tokens
            await paymentRouter.connect(owner).rescueTokens(
                await mockToken.getAddress(),
                owner.address,
                ethers.parseEther("100")
            );

            const ownerBalance = await mockToken.balanceOf(owner.address);
            expect(ownerBalance).to.equal(ethers.parseEther("100"));
        });

        it("Should not allow non-owner to rescue tokens", async function () {
            await expect(
                paymentRouter.connect(payer).rescueTokens(
                    await mockToken.getAddress(),
                    payer.address,
                    ethers.parseEther("100")
                )
            ).to.be.reverted;
        });
    });
});
