const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

// Tests for OTCMarket (contracts/OpenMarket.sol).
describe("OTCMarket", function () {
  const PLATFORM_FEE_BPS = 50; // 0.5%
  const E18 = 10n ** 18n;

  async function deploy() {
    const [owner, maker, taker, broker, stranger] = await ethers.getSigners();
    const xyz = await ethers.deployContract("TestToken", ["XYZ Token", "XYZ"]);
    const usdc = await ethers.deployContract("TestToken", ["Mock USDC", "USDC"]);
    const market = await ethers.deployContract("OTCMarket", [owner.address, PLATFORM_FEE_BPS]);

    for (const user of [maker, taker, stranger]) {
      await xyz.mint(user.address, 1_000_000n * E18);
      await usdc.mint(user.address, 1_000_000n * E18);
      await xyz.connect(user).approve(market.target, ethers.MaxUint256);
      await usdc.connect(user).approve(market.target, ethers.MaxUint256);
    }
    return { market, xyz, usdc, owner, maker, taker, broker, stranger };
  }

  // Maker sells `offerAmount` XYZ for `wantAmount` USDC in total.
  async function params(xyz, usdc, overrides = {}) {
    return {
      offerToken: xyz.target,
      offerAmount: 1000n * E18,
      wantToken: usdc.target,
      wantAmount: 500n * E18,
      partialAllowed: true,
      deadline: BigInt((await time.latest()) + 3600),
      privateTaker: ethers.ZeroAddress,
      broker: ethers.ZeroAddress,
      brokerFeeBps: 0,
      ...overrides,
    };
  }

  async function withOrder(overrides = {}) {
    const ctx = await loadFixture(deploy);
    const p = await params(ctx.xyz, ctx.usdc, overrides);
    await ctx.market.connect(ctx.maker).createOrder(p);
    return { ...ctx, p, orderId: 1n };
  }

  describe("createOrder", function () {
    it("escrows the offer, emits OrderCreated with id 1 and stores the order", async function () {
      const { market, xyz, usdc, maker } = await loadFixture(deploy);
      const p = await params(xyz, usdc);
      await expect(market.connect(maker).createOrder(p))
        .to.emit(market, "OrderCreated")
        .withArgs(1n, maker.address, xyz.target, usdc.target, p.offerAmount, p.wantAmount, p.deadline, ethers.ZeroAddress, ethers.ZeroAddress);

      expect(await xyz.balanceOf(market.target)).to.equal(p.offerAmount);
      const o = await market.getOrder(1n);
      expect(o.maker).to.equal(maker.address);
      expect(o.filledOffer).to.equal(0n);
      expect(o.cancelled).to.equal(false);
      expect(await market.nextOrderId()).to.equal(2n);
    });

    it("rejects invalid input", async function () {
      const { market, xyz, usdc, maker } = await loadFixture(deploy);
      await expect(market.connect(maker).createOrder(await params(xyz, usdc, { wantToken: xyz.target })))
        .to.be.revertedWithCustomError(market, "InvalidTokenPair");
      await expect(market.connect(maker).createOrder(await params(xyz, usdc, { offerAmount: 0n })))
        .to.be.revertedWithCustomError(market, "InvalidOrderAmounts");
      await expect(market.connect(maker).createOrder(await params(xyz, usdc, { deadline: BigInt(await time.latest()) })))
        .to.be.revertedWithCustomError(market, "InvalidDeadline");
      await expect(market.connect(maker).createOrder(await params(xyz, usdc, { broker: maker.address, brokerFeeBps: 201 })))
        .to.be.revertedWithCustomError(market, "BrokerFeeTooHigh");
    });

    it("forces the broker fee to 0 when there is no broker", async function () {
      const { market } = await withOrder({ brokerFeeBps: 150 });
      expect((await market.getOrder(1n)).brokerFeeBps).to.equal(0);
    });

    it("reverts getOrder for an unknown id", async function () {
      const { market } = await loadFixture(deploy);
      await expect(market.getOrder(42n)).to.be.revertedWithCustomError(market, "UnknownOrder");
    });
  });

  describe("fill", function () {
    it("full fill: taker pays the price, gets the offer, fees and maker share are credited", async function () {
      const { market, xyz, usdc, owner, maker, taker, p, orderId } = await withOrder();
      const fee = (p.wantAmount * BigInt(PLATFORM_FEE_BPS)) / 10_000n;

      await expect(market.connect(taker).fill(orderId, p.offerAmount))
        .to.emit(market, "OrderFilled").withArgs(orderId, taker.address, p.offerAmount, p.wantAmount)
        .and.to.emit(market, "FeeSplit").withArgs(orderId, fee, 0n, p.wantAmount - fee);

      expect(await xyz.balanceOf(taker.address)).to.equal(1_000_000n * E18 + p.offerAmount);
      expect(await market.balances(owner.address, usdc.target)).to.equal(fee);
      expect(await market.balances(maker.address, usdc.target)).to.equal(p.wantAmount - fee);
      expect((await market.getOrder(orderId)).filledOffer).to.equal(p.offerAmount);
    });

    it("partial fills: each pays its price rounded up, and over-filling reverts", async function () {
      const { market, usdc, taker } = await withOrder({ offerAmount: 3n, wantAmount: 10n });
      const before = await usdc.balanceOf(taker.address);
      await market.connect(taker).fill(1n, 1n); // ceil(10/3) = 4
      expect(before - (await usdc.balanceOf(taker.address))).to.equal(4n);
      await expect(market.connect(taker).fill(1n, 3n))
        .to.be.revertedWithCustomError(market, "InvalidFillAmount").withArgs(3n, 2n);
      await market.connect(taker).fill(1n, 2n); // ceil(20/3) = 7
      expect(before - (await usdc.balanceOf(taker.address))).to.equal(11n);
      await expect(market.connect(taker).fill(1n, 1n)).to.be.revertedWithCustomError(market, "OrderClosed");
    });

    it("the taker can never pay less than the computed price", async function () {
      const { market, usdc, taker, p } = await withOrder();
      const half = p.offerAmount / 2n;
      const before = await usdc.balanceOf(taker.address);
      await market.connect(taker).fill(1n, half);
      expect(before - (await usdc.balanceOf(taker.address))).to.equal(p.wantAmount / 2n);
    });

    it("an all-or-nothing order rejects partial fills", async function () {
      const { market, taker, p } = await withOrder({ partialAllowed: false });
      await expect(market.connect(taker).fill(1n, p.offerAmount / 2n))
        .to.be.revertedWithCustomError(market, "PartialFillNotAllowed");
      await expect(market.connect(taker).fill(1n, p.offerAmount)).to.emit(market, "OrderFilled");
    });

    it("rejects fills at or after the deadline", async function () {
      const { market, taker, p } = await withOrder();
      await time.increaseTo(p.deadline);
      await expect(market.connect(taker).fill(1n, 1n)).to.be.revertedWithCustomError(market, "OrderDeadlineReached");
    });

    it("enforces the private taker and stops the maker filling their own order", async function () {
      const { market, maker, taker, stranger } = await withOrder();
      await expect(market.connect(maker).fill(1n, 1n)).to.be.revertedWithCustomError(market, "MakerCannotFill");

      const ctx = await withOrder({ privateTaker: taker.address });
      await expect(ctx.market.connect(stranger).fill(1n, 1n)).to.be.revertedWithCustomError(ctx.market, "UnauthorizedTaker");
      await expect(ctx.market.connect(taker).fill(1n, 1n)).to.emit(ctx.market, "OrderFilled");
    });

    it("splits platform fee, broker fee and maker share that add up exactly", async function () {
      const { market, usdc, owner, maker, taker, broker, p } = await withOrder({ broker: (await ethers.getSigners())[3].address, brokerFeeBps: 150 });
      await market.connect(taker).fill(1n, p.offerAmount);
      const platform = await market.balances(owner.address, usdc.target);
      const brokerCut = await market.balances(broker.address, usdc.target);
      const makerCut = await market.balances(maker.address, usdc.target);
      expect(platform).to.equal((p.wantAmount * 50n) / 10_000n);
      expect(brokerCut).to.equal((p.wantAmount * 150n) / 10_000n);
      expect(platform + brokerCut + makerCut).to.equal(p.wantAmount);
    });

    it("uses the platform fee locked in when the order was created", async function () {
      const { market, usdc, owner, taker, p } = await withOrder();
      await market.connect(owner).setPlatformFee(100);
      await market.connect(taker).fill(1n, p.offerAmount);
      expect(await market.balances(owner.address, usdc.target)).to.equal((p.wantAmount * 50n) / 10_000n);
    });
  });

  describe("cancel and expire", function () {
    it("cancel credits the unfilled amount to the maker, only once, only by the maker", async function () {
      const { market, xyz, maker, taker, stranger, p } = await withOrder();
      await market.connect(taker).fill(1n, p.offerAmount / 4n);
      await expect(market.connect(stranger).cancel(1n)).to.be.revertedWithCustomError(market, "NotMaker");
      await expect(market.connect(maker).cancel(1n)).to.emit(market, "OrderCancelled").withArgs(1n);
      expect(await market.balances(maker.address, xyz.target)).to.equal((p.offerAmount * 3n) / 4n);
      expect((await market.getOrder(1n)).cancelled).to.equal(true);
      await expect(market.connect(maker).cancel(1n)).to.be.revertedWithCustomError(market, "OrderClosed");
      await expect(market.connect(taker).fill(1n, 1n)).to.be.revertedWithCustomError(market, "OrderClosed");
    });

    it("expire: anyone, only after the deadline, sets cancelled and refunds the maker", async function () {
      const { market, xyz, maker, stranger, p } = await withOrder();
      await expect(market.connect(stranger).expire(1n)).to.be.revertedWithCustomError(market, "OrderNotExpired");
      await time.increaseTo(p.deadline);
      await expect(market.connect(stranger).expire(1n)).to.emit(market, "OrderExpired").withArgs(1n);
      expect((await market.getOrder(1n)).cancelled).to.equal(true);
      expect(await market.balances(maker.address, xyz.target)).to.equal(p.offerAmount);
      expect(await market.balances(stranger.address, xyz.target)).to.equal(0n);
      await expect(market.connect(stranger).expire(1n)).to.be.revertedWithCustomError(market, "OrderClosed");
    });

    it("a fully filled order cannot be expired", async function () {
      const { market, taker, stranger, p } = await withOrder();
      await market.connect(taker).fill(1n, p.offerAmount);
      await time.increaseTo(p.deadline);
      await expect(market.connect(stranger).expire(1n)).to.be.revertedWithCustomError(market, "OrderClosed");
    });
  });

  describe("withdraw and admin", function () {
    it("withdraw pays the whole credit once", async function () {
      const { market, xyz, maker } = await withOrder();
      await market.connect(maker).cancel(1n);
      const before = await xyz.balanceOf(maker.address);
      await expect(market.connect(maker).withdraw(xyz.target)).to.emit(market, "Withdrawn");
      expect((await xyz.balanceOf(maker.address)) - before).to.equal(1000n * E18);
      expect(await market.balances(maker.address, xyz.target)).to.equal(0n);
      await expect(market.connect(maker).withdraw(xyz.target)).to.be.revertedWithCustomError(market, "NothingToWithdraw");
    });

    it("the contract keeps nothing after every party withdraws", async function () {
      const { market, xyz, usdc, owner, maker, taker, p } = await withOrder();
      await market.connect(taker).fill(1n, p.offerAmount / 2n);
      await market.connect(maker).cancel(1n);
      await market.connect(maker).withdraw(xyz.target);
      await market.connect(maker).withdraw(usdc.target);
      await market.connect(owner).withdraw(usdc.target);
      expect(await xyz.balanceOf(market.target)).to.equal(0n);
      expect(await usdc.balanceOf(market.target)).to.equal(0n);
    });

    it("platform fee: owner only, capped at 100 bps", async function () {
      const { market, owner, stranger } = await loadFixture(deploy);
      await expect(market.connect(stranger).setPlatformFee(10)).to.be.revertedWithCustomError(market, "OwnableUnauthorizedAccount");
      await expect(market.connect(owner).setPlatformFee(101)).to.be.revertedWithCustomError(market, "PlatformFeeTooHigh");
      await expect(market.connect(owner).setPlatformFee(100)).to.emit(market, "PlatformFeeUpdated").withArgs(50, 100);
      await expect(ethers.deployContract("OTCMarket", [owner.address, 101])).to.be.reverted;
    });

    it("rejects native value and ownership renunciation", async function () {
      const { market, owner } = await loadFixture(deploy);
      await expect(owner.sendTransaction({ to: market.target, value: 1n })).to.be.revertedWithCustomError(market, "NativeValueNotAccepted");
      await expect(market.connect(owner).renounceOwnership()).to.be.revertedWithCustomError(market, "OwnershipRenunciationDisabled");
    });
  });
});
