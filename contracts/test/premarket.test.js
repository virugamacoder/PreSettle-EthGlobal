const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

// Tests for PremarketMarket (contracts/PreMarket.sol).
describe("PremarketMarket", function () {
  const PLATFORM_FEE_BPS = 50; // 0.5%
  const E18 = 10n ** 18n;
  const WINDOW = 300; // delivery window, seconds
  const STATUS = { Open: 0, Delivered: 1, Defaulted: 2, Cancelled: 3, Voided: 5 };

  async function deploy() {
    const [owner, seller, alice, bob, stranger] = await ethers.getSigners();
    const usdc = await ethers.deployContract("TestToken", ["Mock USDC", "USDC"]);
    const eurc = await ethers.deployContract("TestToken", ["Mock EURC", "EURC"]);
    const real = await ethers.deployContract("TestToken", ["XYZ Token", "XYZ"]);
    const other = await ethers.deployContract("TestToken", ["Other", "OTH"]);
    const market = await ethers.deployContract("PremarketMarket", [owner.address, PLATFORM_FEE_BPS, usdc.target, eurc.target]);

    for (const user of [seller, alice, bob, stranger]) {
      for (const t of [usdc, eurc, other]) {
        await t.mint(user.address, 1_000_000n * E18);
        await t.connect(user).approve(market.target, ethers.MaxUint256);
      }
    }
    await real.mint(seller.address, 1_000_000n * E18);
    await real.connect(seller).approve(market.target, ethers.MaxUint256);

    const tge = (await time.latest()) + 3600;
    await market.connect(owner).createMarket("XYZ", tge, WINDOW);
    return { market, usdc, eurc, real, other, owner, seller, alice, bob, stranger, tge };
  }

  // Seller offers 100 XYZ at 2 USDC each (collateral 200 USDC).
  const TOKENS = 100n * E18;
  const PRICE = 2n * E18;
  const collateralFor = (amount) => (amount * PRICE + E18 - 1n) / E18;

  async function withOffer() {
    const ctx = await loadFixture(deploy);
    await ctx.market.connect(ctx.seller).createOffer(0n, ctx.usdc.target, TOKENS, PRICE);
    return { ...ctx, offerId: 1n };
  }

  // Alice buys 30, Bob buys 50 before TGE.
  async function withSales() {
    const ctx = await withOffer();
    await ctx.market.connect(ctx.alice).buy(1n, 30n * E18);
    await ctx.market.connect(ctx.bob).buy(1n, 50n * E18);
    return ctx;
  }

  describe("markets", function () {
    it("owner creates markets with a future TGE; views return them", async function () {
      const { market, owner, stranger, tge } = await loadFixture(deploy);
      expect(await market.marketCount()).to.equal(1n);
      const m = await market.getMarket(0n);
      expect(m.symbol).to.equal("XYZ");
      expect(m.tge).to.equal(BigInt(tge));
      expect(m.realToken).to.equal(ethers.ZeroAddress);
      expect(m.active).to.equal(true);
      await expect(market.connect(stranger).createMarket("ABC", tge, WINDOW)).to.be.revertedWithCustomError(market, "OwnableUnauthorizedAccount");
      await expect(market.connect(owner).createMarket("ABC", await time.latest(), WINDOW)).to.be.revertedWithCustomError(market, "InvalidTge");
      await expect(market.getMarket(9n)).to.be.revertedWithCustomError(market, "UnknownMarket");
    });

    it("TGE can only move before the first offer", async function () {
      const { market, owner, tge } = await withOffer();
      await expect(market.connect(owner).setTge(0n, tge + 100)).to.be.revertedWithCustomError(market, "MarketHasOffers");
    });

    it("the real token can only be set during the delivery window", async function () {
      const { market, owner, real, usdc, tge } = await loadFixture(deploy);
      await expect(market.connect(owner).setRealToken(0n, real.target)).to.be.revertedWithCustomError(market, "TgeNotReached");
      await time.increaseTo(tge);
      await expect(market.connect(owner).setRealToken(0n, usdc.target)).to.be.revertedWithCustomError(market, "InvalidRealToken");
      await expect(market.connect(owner).setRealToken(0n, real.target)).to.emit(market, "RealTokenSet").withArgs(0n, real.target);
      await expect(market.connect(owner).setRealToken(0n, real.target)).to.be.revertedWithCustomError(market, "RealTokenAlreadySet");
    });
  });

  describe("offers and buying", function () {
    it("createOffer locks 100% collateral, computed on-chain", async function () {
      const { market, usdc, seller } = await loadFixture(deploy);
      await expect(market.connect(seller).createOffer(0n, usdc.target, TOKENS, PRICE))
        .to.emit(market, "OfferCreated").withArgs(1n, 0n, seller.address, usdc.target, TOKENS, PRICE);
      const o = await market.getOffer(1n);
      expect(o.sellerCollateral).to.equal(collateralFor(TOKENS));
      expect(o.status).to.equal(STATUS.Open);
      expect(await usdc.balanceOf(market.target)).to.equal(collateralFor(TOKENS));
    });

    it("only USDC/EURC collateral, non-zero amounts", async function () {
      const { market, other, eurc, seller } = await loadFixture(deploy);
      await expect(market.connect(seller).createOffer(0n, other.target, TOKENS, PRICE)).to.be.revertedWithCustomError(market, "InvalidCollateralToken");
      await expect(market.connect(seller).createOffer(0n, eurc.target, 0n, PRICE)).to.be.revertedWithCustomError(market, "InvalidTokenAmount");
      await expect(market.connect(seller).createOffer(0n, eurc.target, TOKENS, 0n)).to.be.revertedWithCustomError(market, "InvalidPrice");
      await expect(market.connect(seller).createOffer(0n, eurc.target, TOKENS, PRICE)).to.emit(market, "OfferCreated");
    });

    it("buy pulls the computed payment and records the purchase", async function () {
      const { market, usdc, alice } = await withOffer();
      const before = await usdc.balanceOf(alice.address);
      await expect(market.connect(alice).buy(1n, 30n * E18))
        .to.emit(market, "Purchased").withArgs(1n, alice.address, 30n * E18, collateralFor(30n * E18));
      expect(before - (await usdc.balanceOf(alice.address))).to.equal(collateralFor(30n * E18));
      expect(await market.purchases(1n, alice.address)).to.equal(30n * E18);
      expect((await market.getOffer(1n)).sold).to.equal(30n * E18);
      expect(await market.buyerCount(1n)).to.equal(1n);
      expect(await market.buyerAt(1n, 0n)).to.equal(alice.address);
    });

    it("rejects the seller, overselling, dust first purchases and buys after TGE", async function () {
      const { market, seller, alice, bob, tge } = await withOffer();
      await expect(market.connect(seller).buy(1n, E18)).to.be.revertedWithCustomError(market, "SellerCannotBuy");
      await expect(market.connect(alice).buy(1n, TOKENS + 1n)).to.be.revertedWithCustomError(market, "Oversold");
      // a new buyer must take at least 1/50 of the offer (2 XYZ here)
      await expect(market.connect(alice).buy(1n, E18)).to.be.revertedWithCustomError(market, "BelowMinimumPurchase");
      await time.increaseTo(tge);
      await expect(market.connect(bob).buy(1n, 10n * E18)).to.be.revertedWithCustomError(market, "TgeReached");
    });
  });

  describe("settlement", function () {
    it("deliver in the window: buyers and seller are credited, platform fee taken, only once", async function () {
      const { market, usdc, real, owner, seller, alice, bob, tge } = await withSales();
      await time.increaseTo(tge);
      await market.connect(owner).setRealToken(0n, real.target);

      const sold = 80n * E18;
      const totalPaid = collateralFor(30n * E18) + collateralFor(50n * E18);
      const fee = (totalPaid * BigInt(PLATFORM_FEE_BPS)) / 10_000n;
      await expect(market.connect(seller).deliver(1n)).to.emit(market, "Delivered").withArgs(1n, sold, fee);

      expect(await market.balances(alice.address, real.target)).to.equal(30n * E18);
      expect(await market.balances(bob.address, real.target)).to.equal(50n * E18);
      expect(await market.balances(owner.address, usdc.target)).to.equal(fee);
      expect(await market.balances(seller.address, usdc.target)).to.equal(totalPaid - fee + collateralFor(sold));
      expect((await market.getOffer(1n)).status).to.equal(STATUS.Delivered);
      await expect(market.connect(seller).deliver(1n)).to.be.revertedWithCustomError(market, "OfferNotOpen");
    });

    it("deliver is rejected before TGE, without a real token, and after the window", async function () {
      const { market, real, owner, seller, tge } = await withSales();
      await expect(market.connect(seller).deliver(1n)).to.be.revertedWithCustomError(market, "TgeNotReached");
      await time.increaseTo(tge);
      await expect(market.connect(seller).deliver(1n)).to.be.revertedWithCustomError(market, "RealTokenNotSet");
      await market.connect(owner).setRealToken(0n, real.target);
      await time.increaseTo(tge + WINDOW);
      await expect(market.connect(seller).deliver(1n)).to.be.revertedWithCustomError(market, "DeliveryWindowClosed");
    });

    it("claimDefault after the window: buyers get their payment plus the sold collateral, once", async function () {
      const { market, usdc, real, owner, alice, bob, stranger, tge } = await withSales();
      await time.increaseTo(tge);
      await market.connect(owner).setRealToken(0n, real.target);
      await expect(market.connect(stranger).claimDefault(1n)).to.be.revertedWithCustomError(market, "DeliveryWindowNotClosed");
      await time.increaseTo(tge + WINDOW);
      await expect(market.connect(stranger).claimDefault(1n)).to.emit(market, "Defaulted");

      const soldCollateral = collateralFor(80n * E18);
      const a = await market.balances(alice.address, usdc.target);
      const b = await market.balances(bob.address, usdc.target);
      expect(a + b).to.equal(collateralFor(30n * E18) + collateralFor(50n * E18) + soldCollateral);
      expect(a).to.equal(collateralFor(30n * E18) + (soldCollateral * 30n) / 80n);
      expect((await market.getOffer(1n)).status).to.equal(STATUS.Defaulted);
      await expect(market.connect(stranger).claimDefault(1n)).to.be.revertedWithCustomError(market, "OfferNotOpen");
    });

    it("no real token by the end of the window voids the offer: everyone is refunded", async function () {
      const { market, usdc, seller, alice, stranger, tge } = await withSales();
      await time.increaseTo(tge + WINDOW);
      await expect(market.connect(stranger).claimDefault(1n)).to.emit(market, "OfferVoided");
      expect((await market.getOffer(1n)).status).to.equal(STATUS.Voided);
      expect(await market.balances(alice.address, usdc.target)).to.equal(collateralFor(30n * E18));
      expect(await market.balances(seller.address, usdc.target)).to.equal(collateralFor(80n * E18));
    });

    it("cancelOffer only before TGE and only when nothing is sold", async function () {
      const { market, usdc, seller, alice } = await withOffer();
      await market.connect(alice).buy(1n, 10n * E18);
      await expect(market.connect(seller).cancelOffer(1n)).to.be.revertedWithCustomError(market, "OfferHasSales");

      const ctx = await withOffer();
      await expect(ctx.market.connect(ctx.alice).cancelOffer(1n)).to.be.revertedWithCustomError(ctx.market, "NotSeller");
      await expect(ctx.market.connect(ctx.seller).cancelOffer(1n)).to.emit(ctx.market, "OfferCancelled");
      expect(await ctx.market.balances(ctx.seller.address, ctx.usdc.target)).to.equal(collateralFor(TOKENS));
      await expect(ctx.market.connect(ctx.seller).cancelOffer(1n)).to.be.revertedWithCustomError(ctx.market, "OfferNotOpen");
    });

    it("reclaimUnsold after TGE returns only the unsold collateral, once", async function () {
      const { market, usdc, seller, tge } = await withSales();
      await expect(market.connect(seller).reclaimUnsold(1n)).to.be.revertedWithCustomError(market, "TgeNotReached");
      await time.increaseTo(tge);
      await expect(market.connect(seller).reclaimUnsold(1n)).to.emit(market, "UnsoldReclaimed");
      expect(await market.balances(seller.address, usdc.target)).to.equal(collateralFor(TOKENS) - collateralFor(80n * E18));
      await expect(market.connect(seller).reclaimUnsold(1n)).to.be.revertedWithCustomError(market, "UnsoldAlreadyReclaimed");
    });

    it("solvency: after delivery, reclaim and every withdrawal the contract holds nothing", async function () {
      const { market, usdc, real, owner, seller, alice, bob, tge } = await withSales();
      await time.increaseTo(tge);
      await market.connect(owner).setRealToken(0n, real.target);
      await market.connect(seller).deliver(1n);
      await market.connect(seller).reclaimUnsold(1n);
      for (const [who, token] of [[alice, real], [bob, real], [seller, usdc], [owner, usdc]]) {
        await market.connect(who).withdraw(token.target);
      }
      expect(await usdc.balanceOf(market.target)).to.equal(0n);
      expect(await real.balanceOf(market.target)).to.equal(0n);
      await expect(market.connect(alice).withdraw(real.target)).to.be.revertedWithCustomError(market, "NothingToWithdraw");
    });
  });

  describe("admin", function () {
    it("rejects bad constructor input, high fees, native value and renouncing", async function () {
      const { market, owner, usdc } = await loadFixture(deploy);
      await expect(ethers.deployContract("PremarketMarket", [owner.address, 50, usdc.target, usdc.target])).to.be.reverted;
      await expect(market.connect(owner).setPlatformFee(101)).to.be.revertedWithCustomError(market, "PlatformFeeTooHigh");
      await expect(owner.sendTransaction({ to: market.target, value: 1n })).to.be.revertedWithCustomError(market, "NativeValueNotAccepted");
      await expect(market.connect(owner).renounceOwnership()).to.be.revertedWithCustomError(market, "OwnershipRenunciationDisabled");
    });

    it("an inactive market blocks new offers and buys", async function () {
      const { market, usdc, owner, seller } = await loadFixture(deploy);
      await market.connect(owner).setMarketActive(0n, false);
      await expect(market.connect(seller).createOffer(0n, usdc.target, TOKENS, PRICE)).to.be.revertedWithCustomError(market, "MarketInactive");
    });
  });
});
