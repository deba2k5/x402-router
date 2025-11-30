const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("PaymentRouter - Swap and Payment Flow Tests", function () {
    let paymentRouter;
    let mockUSDC;
    let mockDAI;
    let mockDexRouter;
    let owner;
    let relayer;
    let merchant;
    let payer;

    beforeEach(async function () {
        [owner, relayer, merchant, payer] = await ethers.getSigners();

        // Deploy mock tokens
        const MockUSDC = await ethers.getContractFactory("MockUSDC");
        mockUSDC = await MockUSDC.deploy();
        await mockUSDC.waitForDeployment();

        const MockDAI = await ethers.getContractFactory("MockDAI");
        mockDAI = await MockDAI.deploy();
        await mockDAI.waitForDeployment();

        // Deploy mock DEX router
        const MockDexRouter = await ethers.getContractFactory("MockDexRouter");
        mockDexRouter = await MockDexRouter.deploy();
        await mockDexRouter.waitForDeployment();

        // Deploy PaymentRouter
        const PaymentRouter = await ethers.getContractFactory("PaymentRouter");
        paymentRouter = await PaymentRouter.deploy(relayer.address);
        await paymentRouter.waitForDeployment();

        // Mint tokens to payer
        await mockUSDC.mint(payer.address, ethers.parseUnits("10000", 6)); // 10,000 USDC
        await mockDAI.mint(payer.address, ethers.parseEther("10000")); // 10,000 DAI

        // Fund mock DEX with DAI for swaps
        await mockDAI.mint(await mockDexRouter.getAddress(), ethers.parseEther("100000"));
    });

    describe("Direct Payment (No Swap)", function () {
        it("Should execute direct USDC payment with permit", async function () {
            const amount = ethers.parseUnits("100", 6); // 100 USDC
            const deadline = (await time.latest()) + 3600;

            // Create permit signature
            const domain = {
                name: await mockUSDC.name(),
                version: "1",
                chainId: (await ethers.provider.getNetwork()).chainId,
                verifyingContract: await mockUSDC.getAddress(),
            };

            const types = {
                Permit: [
                    { name: "owner", type: "address" },
                    { name: "spender", type: "address" },
                    { name: "value", type: "uint256" },
                    { name: "nonce", type: "uint256" },
                    { name: "deadline", type: "uint256" },
                ],
            };

            const value = {
                owner: payer.address,
                spender: await paymentRouter.getAddress(),
                value: amount,
                nonce: await mockUSDC.nonces(payer.address),
                deadline: deadline,
            };

            const signature = await payer.signTypedData(domain, types, value);
            const sig = ethers.Signature.from(signature);

            const permitData = {
                token: await mockUSDC.getAddress(),
                owner: payer.address,
                value: amount,
                deadline: deadline,
                v: sig.v,
                r: sig.r,
                s: sig.s,
            };

            const paymentId = ethers.id("payment-001");
            const routeParams = {
                paymentId: paymentId,
                tokenIn: await mockUSDC.getAddress(),
                tokenOut: ethers.ZeroAddress, // No swap
                amountIn: amount,
                minAmountOut: amount,
                merchant: merchant.address,
                dexRouter: ethers.ZeroAddress,
                dexCalldata: "0x",
            };

            // Execute route
            await expect(
                paymentRouter.connect(relayer).executeRoute(permitData, routeParams)
            )
                .to.emit(paymentRouter, "RouteExecuted")
                .withArgs(
                    paymentId,
                    payer.address,
                    merchant.address,
                    await mockUSDC.getAddress(),
                    ethers.ZeroAddress,
                    amount,
                    amount
                );

            // Verify balances
            expect(await mockUSDC.balanceOf(merchant.address)).to.equal(amount);
            expect(await mockUSDC.balanceOf(payer.address)).to.equal(
                ethers.parseUnits("9900", 6)
            );
        });

        it("Should prevent replay attacks", async function () {
            const amount = ethers.parseUnits("100", 6);
            const deadline = (await time.latest()) + 3600;

            const domain = {
                name: await mockUSDC.name(),
                version: "1",
                chainId: (await ethers.provider.getNetwork()).chainId,
                verifyingContract: await mockUSDC.getAddress(),
            };

            const types = {
                Permit: [
                    { name: "owner", type: "address" },
                    { name: "spender", type: "address" },
                    { name: "value", type: "uint256" },
                    { name: "nonce", type: "uint256" },
                    { name: "deadline", type: "uint256" },
                ],
            };

            const value = {
                owner: payer.address,
                spender: await paymentRouter.getAddress(),
                value: amount,
                nonce: await mockUSDC.nonces(payer.address),
                deadline: deadline,
            };

            const signature = await payer.signTypedData(domain, types, value);
            const sig = ethers.Signature.from(signature);

            const permitData = {
                token: await mockUSDC.getAddress(),
                owner: payer.address,
                value: amount,
                deadline: deadline,
                v: sig.v,
                r: sig.r,
                s: sig.s,
            };

            const paymentId = ethers.id("payment-replay-test");
            const routeParams = {
                paymentId: paymentId,
                tokenIn: await mockUSDC.getAddress(),
                tokenOut: ethers.ZeroAddress,
                amountIn: amount,
                minAmountOut: amount,
                merchant: merchant.address,
                dexRouter: ethers.ZeroAddress,
                dexCalldata: "0x",
            };

            // First execution should succeed
            await paymentRouter.connect(relayer).executeRoute(permitData, routeParams);

            // Second execution with same paymentId should fail
            await expect(
                paymentRouter.connect(relayer).executeRoute(permitData, routeParams)
            ).to.be.revertedWithCustomError(paymentRouter, "PaymentAlreadyProcessed");
        });
    });

    describe("Swap and Payment", function () {
        it("Should execute USDC to DAI swap and pay merchant", async function () {
            const amountIn = ethers.parseUnits("100", 6); // 100 USDC
            const expectedAmountOut = ethers.parseEther("99"); // 99 DAI (1% slippage)
            const deadline = (await time.latest()) + 3600;

            // Set up mock DEX to return 99 DAI for 100 USDC
            await mockDexRouter.setSwapRate(
                await mockUSDC.getAddress(),
                await mockDAI.getAddress(),
                expectedAmountOut
            );

            // Create permit signature
            const domain = {
                name: await mockUSDC.name(),
                version: "1",
                chainId: (await ethers.provider.getNetwork()).chainId,
                verifyingContract: await mockUSDC.getAddress(),
            };

            const types = {
                Permit: [
                    { name: "owner", type: "address" },
                    { name: "spender", type: "address" },
                    { name: "value", type: "uint256" },
                    { name: "nonce", type: "uint256" },
                    { name: "deadline", type: "uint256" },
                ],
            };

            const value = {
                owner: payer.address,
                spender: await paymentRouter.getAddress(),
                value: amountIn,
                nonce: await mockUSDC.nonces(payer.address),
                deadline: deadline,
            };

            const signature = await payer.signTypedData(domain, types, value);
            const sig = ethers.Signature.from(signature);

            const permitData = {
                token: await mockUSDC.getAddress(),
                owner: payer.address,
                value: amountIn,
                deadline: deadline,
                v: sig.v,
                r: sig.r,
                s: sig.s,
            };

            // Encode swap calldata
            const swapCalldata = mockDexRouter.interface.encodeFunctionData("swap", [
                await mockUSDC.getAddress(),
                await mockDAI.getAddress(),
                amountIn,
                expectedAmountOut,
            ]);

            const paymentId = ethers.id("payment-swap-001");
            const routeParams = {
                paymentId: paymentId,
                tokenIn: await mockUSDC.getAddress(),
                tokenOut: await mockDAI.getAddress(),
                amountIn: amountIn,
                minAmountOut: expectedAmountOut,
                merchant: merchant.address,
                dexRouter: await mockDexRouter.getAddress(),
                dexCalldata: swapCalldata,
            };

            // Execute route with swap
            await expect(
                paymentRouter.connect(relayer).executeRoute(permitData, routeParams)
            )
                .to.emit(paymentRouter, "RouteExecuted")
                .withArgs(
                    paymentId,
                    payer.address,
                    merchant.address,
                    await mockUSDC.getAddress(),
                    await mockDAI.getAddress(),
                    amountIn,
                    expectedAmountOut
                );

            // Verify merchant received DAI
            expect(await mockDAI.balanceOf(merchant.address)).to.equal(
                expectedAmountOut
            );

            // Verify payer's USDC was spent
            expect(await mockUSDC.balanceOf(payer.address)).to.equal(
                ethers.parseUnits("9900", 6)
            );
        });

        it("Should revert if slippage is too high", async function () {
            const amountIn = ethers.parseUnits("100", 6);
            const actualAmountOut = ethers.parseEther("95"); // Only 95 DAI
            const minAmountOut = ethers.parseEther("99"); // Expecting 99 DAI
            const deadline = (await time.latest()) + 3600;

            // Set up mock DEX to return less than expected
            await mockDexRouter.setSwapRate(
                await mockUSDC.getAddress(),
                await mockDAI.getAddress(),
                actualAmountOut
            );

            const domain = {
                name: await mockUSDC.name(),
                version: "1",
                chainId: (await ethers.provider.getNetwork()).chainId,
                verifyingContract: await mockUSDC.getAddress(),
            };

            const types = {
                Permit: [
                    { name: "owner", type: "address" },
                    { name: "spender", type: "address" },
                    { name: "value", type: "uint256" },
                    { name: "nonce", type: "uint256" },
                    { name: "deadline", type: "uint256" },
                ],
            };

            const value = {
                owner: payer.address,
                spender: await paymentRouter.getAddress(),
                value: amountIn,
                nonce: await mockUSDC.nonces(payer.address),
                deadline: deadline,
            };

            const signature = await payer.signTypedData(domain, types, value);
            const sig = ethers.Signature.from(signature);

            const permitData = {
                token: await mockUSDC.getAddress(),
                owner: payer.address,
                value: amountIn,
                deadline: deadline,
                v: sig.v,
                r: sig.r,
                s: sig.s,
            };

            const swapCalldata = mockDexRouter.interface.encodeFunctionData("swap", [
                await mockUSDC.getAddress(),
                await mockDAI.getAddress(),
                amountIn,
                actualAmountOut,
            ]);

            const paymentId = ethers.id("payment-slippage-test");
            const routeParams = {
                paymentId: paymentId,
                tokenIn: await mockUSDC.getAddress(),
                tokenOut: await mockDAI.getAddress(),
                amountIn: amountIn,
                minAmountOut: minAmountOut, // Higher than actual
                merchant: merchant.address,
                dexRouter: await mockDexRouter.getAddress(),
                dexCalldata: swapCalldata,
            };

            await expect(
                paymentRouter.connect(relayer).executeRoute(permitData, routeParams)
            ).to.be.revertedWithCustomError(paymentRouter, "SlippageExceeded");
        });
    });

    describe("Access Control", function () {
        it("Should only allow relayer to execute routes", async function () {
            const amount = ethers.parseUnits("100", 6);
            const deadline = (await time.latest()) + 3600;

            const permitData = {
                token: await mockUSDC.getAddress(),
                owner: payer.address,
                value: amount,
                deadline: deadline,
                v: 27,
                r: ethers.ZeroHash,
                s: ethers.ZeroHash,
            };

            const paymentId = ethers.id("payment-access-test");
            const routeParams = {
                paymentId: paymentId,
                tokenIn: await mockUSDC.getAddress(),
                tokenOut: ethers.ZeroAddress,
                amountIn: amount,
                minAmountOut: amount,
                merchant: merchant.address,
                dexRouter: ethers.ZeroAddress,
                dexCalldata: "0x",
            };

            // Non-relayer should not be able to execute
            await expect(
                paymentRouter.connect(payer).executeRoute(permitData, routeParams)
            ).to.be.revertedWithCustomError(paymentRouter, "UnauthorizedRelayer");
        });
    });

    describe("Emergency Functions", function () {
        it("Should allow owner to pause and unpause", async function () {
            await paymentRouter.connect(owner).pause();
            expect(await paymentRouter.paused()).to.equal(true);

            await paymentRouter.connect(owner).unpause();
            expect(await paymentRouter.paused()).to.equal(false);
        });

        it("Should prevent execution when paused", async function () {
            await paymentRouter.connect(owner).pause();

            const amount = ethers.parseUnits("100", 6);
            const deadline = (await time.latest()) + 3600;

            const permitData = {
                token: await mockUSDC.getAddress(),
                owner: payer.address,
                value: amount,
                deadline: deadline,
                v: 27,
                r: ethers.ZeroHash,
                s: ethers.ZeroHash,
            };

            const paymentId = ethers.id("payment-paused-test");
            const routeParams = {
                paymentId: paymentId,
                tokenIn: await mockUSDC.getAddress(),
                tokenOut: ethers.ZeroAddress,
                amountIn: amount,
                minAmountOut: amount,
                merchant: merchant.address,
                dexRouter: ethers.ZeroAddress,
                dexCalldata: "0x",
            };

            await expect(
                paymentRouter.connect(relayer).executeRoute(permitData, routeParams)
            ).to.be.reverted;
        });
    });
});
