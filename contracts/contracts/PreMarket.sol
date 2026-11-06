// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/// @title Pre Settle Premarket Market
/// @notice Collateralized pre-TGE sales with pull-only settlement and token delivery.
/// @dev Non-upgradeable; uses OpenZeppelin 5.0.2 APIs. Sale quantities have 18
/// decimals; prices and collateral use the collateral token's native units.
/// Tokens must be standard, non-rebasing ERC-20s. Incoming transfer fees are
/// rejected. A blocklisted recipient cannot block settlement: only its own
/// withdrawal fails. An issuer blocking this contract can still freeze that asset.
/// Unsolicited token transfers are not credited and may create surplus balances.
contract PremarketMarket is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Market {
        string symbol;
        uint64 tge;
        uint64 deliveryWindow;
        address realToken;
        bool active;
    }

    struct Offer {
        uint256 marketId;
        address seller;
        address collateralToken;
        uint256 tokenAmount;
        uint256 pricePerToken;
        uint256 sellerCollateral;
        uint256 sold;
        uint8 status;
    }

    uint256 public constant MAX_BUYERS = 50;
    uint16 public constant MAX_PLATFORM_FEE_BPS = 100;
    uint256 public constant BPS_DENOMINATOR = 10000;
    /// @notice Real tokens need at least this many decimals so per-buyer round-up stays negligible.
    uint8 public constant MIN_REAL_TOKEN_DECIMALS = 6;
    uint256 private constant TOKEN_UNIT = 1e18;
    uint8 private constant OPEN = 0;
    uint8 private constant DELIVERED = 1;
    uint8 private constant DEFAULTED = 2;
    uint8 private constant CANCELLED = 3;
    // Status 4 is reserved for Disputed and is never assigned.
    uint8 private constant VOIDED = 5;

    address public immutable USDC;
    address public immutable EURC;
    uint16 public platformFeeBps;

    Market[] private _markets;
    uint256 private _nextOfferId = 1;
    mapping(uint256 marketId => uint8) private _realTokenDecimals;
    mapping(uint256 marketId => uint256) private _marketOfferCount;
    mapping(uint256 offerId => Offer) private _offers;
    mapping(uint256 offerId => uint16) private _offerPlatformFeeBps;
    mapping(uint256 offerId => bool) private _unsoldReclaimed;
    mapping(uint256 offerId => address[]) private _buyers;
    mapping(uint256 offerId => mapping(address buyer => uint256)) private _purchases;
    mapping(uint256 offerId => mapping(address buyer => uint256)) private _paid;
    mapping(uint256 offerId => uint256) private _totalPaid;

    /// @notice Withdrawable credits, separate from unsettled escrow.
    mapping(address account => mapping(address token => uint256)) public balances;

    error InvalidCollateralPair(address usdc, address eurc);
    error UnknownMarket(uint256 marketId);
    error UnknownOffer(uint256 offerId);
    error InvalidSymbolLength(uint256 length);
    error InvalidTge(uint64 tge, uint256 timestamp);
    error InvalidDeliveryWindow(uint64 deliveryWindow);
    error MarketHasOffers(uint256 marketId, uint256 offerCount);
    error MarketInactive(uint256 marketId);
    error TgeReached(uint256 marketId, uint64 tge);
    error TgeNotReached(uint256 marketId, uint64 tge);
    error DeliveryWindowClosed(uint256 marketId, uint256 deadline);
    error DeliveryWindowNotClosed(uint256 marketId, uint256 deadline);
    error RealTokenAlreadySet(uint256 marketId, address token);
    error InvalidRealToken(uint256 marketId, address token);
    error InvalidRealTokenDecimals(uint256 marketId, address token, uint8 decimals);
    error RealTokenNotSet(uint256 marketId);
    error InvalidCollateralToken(address token);
    error InvalidTokenAmount(uint256 amount);
    error InvalidPrice(uint256 price);
    error OfferNotOpen(uint256 offerId, uint8 status);
    error NotSeller(uint256 offerId, address caller);
    error SellerCannotBuy(uint256 offerId, address caller);
    error Oversold(uint256 offerId, uint256 requested, uint256 remaining);
    error BuyerLimitReached(uint256 offerId, uint256 limit);
    error BelowMinimumPurchase(uint256 offerId, uint256 requested, uint256 minimum);
    error NoSales(uint256 offerId);
    error OfferHasSales(uint256 offerId, uint256 sold);
    error UnsoldAlreadyReclaimed(uint256 offerId);
    error NoUnsoldCollateral(uint256 offerId);
    error InvalidBuyerIndex(uint256 offerId, uint256 index, uint256 count);
    error NothingToWithdraw(address account, address token);
    error UnexpectedTokenBalanceDelta(address token, uint256 expected);
    error PlatformFeeTooHigh(uint16 bps);
    error OwnershipRenunciationDisabled(address owner);
    error NativeValueNotAccepted(address caller, uint256 value);

    event MarketCreated(uint256 indexed marketId, string symbol, uint64 tge, uint64 deliveryWindow);
    event RealTokenSet(uint256 indexed marketId, address indexed token);
    event OfferCreated(uint256 indexed offerId, uint256 indexed marketId, address indexed seller, address collateralToken, uint256 tokenAmount, uint256 pricePerToken);
    event Purchased(uint256 indexed offerId, address indexed buyer, uint256 tokenAmount, uint256 paid);
    event Delivered(uint256 indexed offerId, uint256 sold, uint256 platformFee);
    event Defaulted(uint256 indexed offerId, uint256 sold);
    event OfferVoided(uint256 indexed offerId, uint256 sold);
    event OfferCancelled(uint256 indexed offerId);
    event UnsoldReclaimed(uint256 indexed offerId, uint256 amount);
    event Withdrawn(address indexed account, address indexed token, uint256 amount);
    event PlatformFeeUpdated(uint16 oldBps, uint16 newBps);
    event TgeUpdated(uint256 indexed marketId, uint64 oldTge, uint64 newTge);
    event MarketActiveSet(uint256 indexed marketId, bool active);

    /// @notice Sets the owner, initial fee and distinct nonzero collateral assets.
    /// @dev Arc Testnet (5042002) collateral addresses are constructor inputs,
    /// not hardcoded. The caller must supply the intended six-decimal assets.
    constructor(address initialOwner, uint16 platformFeeBps_, address usdc, address eurc)
        Ownable(initialOwner)
    {
        if (usdc == address(0) || eurc == address(0) || usdc == eurc) {
            revert InvalidCollateralPair(usdc, eurc);
        }
        USDC = usdc;
        EURC = eurc;
        _setPlatformFee(platformFeeBps_);
    }

    /// @notice Returns the number of markets; market identifiers start at zero.
    function marketCount() external view returns (uint256) {
        return _markets.length;
    }

    /// @notice Returns a market, reverting if its identifier is unknown.
    function getMarket(uint256 marketId) external view returns (Market memory) {
        return _getMarket(marketId);
    }

    /// @notice Returns an offer, reverting if its identifier is unknown.
    function getOffer(uint256 offerId) external view returns (Offer memory) {
        return _getOffer(offerId);
    }

    /// @notice Returns the buyer's cumulative 18-decimal quantity (retained after settlement).
    function purchases(uint256 offerId, address buyer) external view returns (uint256) {
        return _purchases[offerId][buyer];
    }

    /// @notice Returns cumulative collateral paid by the buyer, including per-fill rounding.
    function paid(uint256 offerId, address buyer) external view returns (uint256) {
        return _paid[offerId][buyer];
    }

    /// @notice Returns the number of distinct buyers on an existing offer.
    function buyerCount(uint256 offerId) external view returns (uint256) {
        _getOffer(offerId);
        return _buyers[offerId].length;
    }

    /// @notice Returns a buyer by its zero-based index in first-purchase order.
    function buyerAt(uint256 offerId, uint256 index) external view returns (address) {
        _getOffer(offerId);
        uint256 count = _buyers[offerId].length;
        if (index >= count) revert InvalidBuyerIndex(offerId, index, count);
        return _buyers[offerId][index];
    }

    /// @notice Creates an active market with an unset real token and future TGE.
    function createMarket(string calldata symbol, uint64 tge, uint64 deliveryWindow)
        external onlyOwner nonReentrant returns (uint256 marketId)
    {
        uint256 length = bytes(symbol).length;
        if (length == 0 || length > 32) revert InvalidSymbolLength(length);
        if (block.timestamp >= tge) revert InvalidTge(tge, block.timestamp);
        if (deliveryWindow == 0 || deliveryWindow > 365 days) {
            revert InvalidDeliveryWindow(deliveryWindow);
        }
        marketId = _markets.length;
        _markets.push(Market({
            symbol: symbol,
            tge: tge,
            deliveryWindow: deliveryWindow,
            realToken: address(0),
            active: true
        }));
        emit MarketCreated(marketId, symbol, tge, deliveryWindow);
    }

    /// @notice Sets the real token once, during the delivery window, and caches its decimals (6 to 36).
    function setRealToken(uint256 marketId, address token) external onlyOwner nonReentrant {
        Market storage market = _getMarket(marketId);
        if (market.realToken != address(0)) revert RealTokenAlreadySet(marketId, market.realToken);
        _requireDeliveryWindow(marketId, market);
        if (token.code.length == 0 || token == USDC || token == EURC) {
            revert InvalidRealToken(marketId, token);
        }
        uint8 decimals_;
        try IERC20Metadata(token).decimals() returns (uint8 value) {
            decimals_ = value;
        } catch {
            revert InvalidRealToken(marketId, token);
        }
        if (decimals_ < MIN_REAL_TOKEN_DECIMALS || decimals_ > 36) {
            revert InvalidRealTokenDecimals(marketId, token, decimals_);
        }
        market.realToken = token;
        _realTokenDecimals[marketId] = decimals_;
        emit RealTokenSet(marketId, token);
    }

    /// @notice Creates an offer as msg.sender, escrowing its full rounded-up collateral.
    /// @return offerId Monotonically increasing identifier starting at one.
    function createOffer(uint256 marketId, address collateralToken, uint256 tokenAmount, uint256 pricePerToken)
        external nonReentrant returns (uint256 offerId)
    {
        Market storage market = _getMarket(marketId);
        _requireTrading(marketId, market);
        if (collateralToken != USDC && collateralToken != EURC) {
            revert InvalidCollateralToken(collateralToken);
        }
        if (tokenAmount == 0) revert InvalidTokenAmount(tokenAmount);
        if (pricePerToken == 0) revert InvalidPrice(pricePerToken);
        uint256 collateral = Math.mulDiv(tokenAmount, pricePerToken, TOKEN_UNIT, Math.Rounding.Ceil);
        if (collateral == 0) revert InvalidTokenAmount(collateral);

        offerId = _nextOfferId++;
        _offers[offerId] = Offer({
            marketId: marketId,
            seller: msg.sender,
            collateralToken: collateralToken,
            tokenAmount: tokenAmount,
            pricePerToken: pricePerToken,
            sellerCollateral: collateral,
            sold: 0,
            status: OPEN
        });
        _offerPlatformFeeBps[offerId] = platformFeeBps;
        _marketOfferCount[marketId] += 1;
        emit OfferCreated(offerId, marketId, msg.sender, collateralToken, tokenAmount, pricePerToken);
        _pullExact(collateralToken, msg.sender, collateral);
    }

    /// @notice Buys a quantity, paying its independently rounded-up price.
    /// @dev Existing buyers may buy again even after the distinct-buyer cap is reached.
    /// A new buyer's first purchase must be at least ceil(tokenAmount / MAX_BUYERS)
    /// unless it takes the whole remainder, which keeps the buyer cap unexhaustable by dust.
    function buy(uint256 offerId, uint256 tokenAmount) external nonReentrant {
        Offer storage offer = _getOffer(offerId);
        _requireOpen(offerId, offer);
        _requireTrading(offer.marketId, _getMarket(offer.marketId));
        if (msg.sender == offer.seller) revert SellerCannotBuy(offerId, msg.sender);
        if (tokenAmount == 0) revert InvalidTokenAmount(tokenAmount);
        uint256 remaining = offer.tokenAmount - offer.sold;
        if (tokenAmount > remaining) revert Oversold(offerId, tokenAmount, remaining);
        if (_purchases[offerId][msg.sender] == 0) {
            // A new buyer must take at least 1/MAX_BUYERS of the offer (or all that is left),
            // so dust purchases from throwaway addresses can never exhaust the buyer slots.
            uint256 minimum = Math.ceilDiv(offer.tokenAmount, MAX_BUYERS);
            if (tokenAmount < minimum && tokenAmount != remaining) {
                revert BelowMinimumPurchase(offerId, tokenAmount, minimum);
            }
            if (_buyers[offerId].length >= MAX_BUYERS) revert BuyerLimitReached(offerId, MAX_BUYERS);
            _buyers[offerId].push(msg.sender);
        }
        uint256 payment = Math.mulDiv(tokenAmount, offer.pricePerToken, TOKEN_UNIT, Math.Rounding.Ceil);
        _purchases[offerId][msg.sender] += tokenAmount;
        _paid[offerId][msg.sender] += payment;
        _totalPaid[offerId] += payment;
        offer.sold += tokenAmount;
        emit Purchased(offerId, msg.sender, tokenAmount, payment);
        _pullExact(offer.collateralToken, msg.sender, payment);
    }

    /// @notice Settles the caller's sold quantity, crediting tokens, fees and seller proceeds.
    /// @dev Each buyer's aggregate quantity is converted and rounded up separately.
    /// All effects precede the single incoming transfer; a failed pull reverts them all.
    function deliver(uint256 offerId) external nonReentrant {
        Offer storage offer = _getOffer(offerId);
        _requireSeller(offerId, offer);
        _requireOpen(offerId, offer);
        if (offer.sold == 0) revert NoSales(offerId);
        Market storage market = _getMarket(offer.marketId);
        _requireDeliveryWindow(offer.marketId, market);
        if (market.realToken == address(0)) revert RealTokenNotSet(offer.marketId);

        offer.status = DELIVERED;
        uint256 realAmount;
        uint256 scale = 10 ** uint256(_realTokenDecimals[offer.marketId]);
        address[] storage buyers = _buyers[offerId];
        for (uint256 i = 0; i < buyers.length; ++i) {
            address buyer = buyers[i];
            uint256 amount = Math.mulDiv(_purchases[offerId][buyer], scale, TOKEN_UNIT, Math.Rounding.Ceil);
            realAmount += amount;
            balances[buyer][market.realToken] += amount;
        }
        uint256 total = _totalPaid[offerId];
        uint256 fee = Math.mulDiv(total, _offerPlatformFeeBps[offerId], BPS_DENOMINATOR);
        balances[owner()][offer.collateralToken] += fee;
        balances[offer.seller][offer.collateralToken] += total - fee + _soldCollateral(offer);
        emit Delivered(offerId, offer.sold, fee);
        _pullExact(market.realToken, offer.seller, realAmount);
    }

    /// @notice Settles an expired offer once; no real token means void rather than default.
    /// @dev No outbound transfers occur. The last buyer receives collateral-share dust.
    function claimDefault(uint256 offerId) external nonReentrant {
        Offer storage offer = _getOffer(offerId);
        _requireOpen(offerId, offer);
        if (offer.sold == 0) revert NoSales(offerId);
        Market storage market = _getMarket(offer.marketId);
        uint256 deadline = uint256(market.tge) + market.deliveryWindow;
        if (block.timestamp < deadline) revert DeliveryWindowNotClosed(offer.marketId, deadline);
        bool voided = market.realToken == address(0);
        offer.status = voided ? VOIDED : DEFAULTED;

        uint256 collateral = _soldCollateral(offer);
        uint256 allocated;
        address[] storage buyers = _buyers[offerId];
        for (uint256 i = 0; i < buyers.length; ++i) {
            address buyer = buyers[i];
            uint256 share;
            if (!voided) {
                share = i == buyers.length - 1
                    ? collateral - allocated
                    : Math.mulDiv(collateral, _purchases[offerId][buyer], offer.sold);
                allocated += share;
            }
            balances[buyer][offer.collateralToken] += _paid[offerId][buyer] + share;
        }
        if (voided) {
            balances[offer.seller][offer.collateralToken] += collateral;
            emit OfferVoided(offerId, offer.sold);
        } else {
            emit Defaulted(offerId, offer.sold);
        }
    }

    /// @notice Cancels an unsold pre-TGE offer, crediting all seller collateral once.
    function cancelOffer(uint256 offerId) external nonReentrant {
        Offer storage offer = _getOffer(offerId);
        _requireSeller(offerId, offer);
        _requireOpen(offerId, offer);
        Market storage market = _getMarket(offer.marketId);
        if (block.timestamp >= market.tge) revert TgeReached(offer.marketId, market.tge);
        if (offer.sold != 0) revert OfferHasSales(offerId, offer.sold);
        offer.status = CANCELLED;
        _unsoldReclaimed[offerId] = true;
        balances[offer.seller][offer.collateralToken] += offer.sellerCollateral;
        emit OfferCancelled(offerId);
    }

    /// @notice Credits unsold collateral once after TGE, independently of sold settlement.
    function reclaimUnsold(uint256 offerId) external nonReentrant {
        Offer storage offer = _getOffer(offerId);
        _requireSeller(offerId, offer);
        Market storage market = _getMarket(offer.marketId);
        if (block.timestamp < market.tge) revert TgeNotReached(offer.marketId, market.tge);
        if (offer.status == CANCELLED || _unsoldReclaimed[offerId]) revert UnsoldAlreadyReclaimed(offerId);
        uint256 amount = offer.sellerCollateral - _soldCollateral(offer);
        if (amount == 0) revert NoUnsoldCollateral(offerId);
        _unsoldReclaimed[offerId] = true;
        balances[offer.seller][offer.collateralToken] += amount;
        emit UnsoldReclaimed(offerId, amount);
    }

    /// @notice Withdraws the caller's whole credit for one token to the caller.
    /// @dev Failed transfers (including blocklisting) restore credit by reverting.
    function withdraw(address token) external nonReentrant {
        uint256 amount = balances[msg.sender][token];
        if (amount == 0) revert NothingToWithdraw(msg.sender, token);
        balances[msg.sender][token] = 0;
        emit Withdrawn(msg.sender, token, amount);
        IERC20(token).safeTransfer(msg.sender, amount);
    }

    /// @notice Updates the fee for new offers only, up to 100 basis points.
    function setPlatformFee(uint16 bps) external onlyOwner nonReentrant {
        _setPlatformFee(bps);
    }

    /// @notice Changes TGE only before the first offer and only to a future time.
    function setTge(uint256 marketId, uint64 newTge) external onlyOwner nonReentrant {
        Market storage market = _getMarket(marketId);
        uint256 count = _marketOfferCount[marketId];
        if (count != 0) revert MarketHasOffers(marketId, count);
        if (block.timestamp >= newTge) revert InvalidTge(newTge, block.timestamp);
        uint64 oldTge = market.tge;
        market.tge = newTge;
        emit TgeUpdated(marketId, oldTge, newTge);
    }

    /// @notice Enables/disables new offers and buys; existing settlement remains available.
    function setMarketActive(uint256 marketId, bool active) external onlyOwner nonReentrant {
        Market storage market = _getMarket(marketId);
        market.active = active;
        emit MarketActiveSet(marketId, active);
    }

    /// @notice Ownership cannot be renounced because the owner receives platform fees.
    function renounceOwnership() public override onlyOwner {
        revert OwnershipRenunciationDisabled(msg.sender);
    }

    /// @dev Market zero is valid; the array length defines existence.
    function _getMarket(uint256 marketId) private view returns (Market storage market) {
        if (marketId >= _markets.length) revert UnknownMarket(marketId);
        return _markets[marketId];
    }

    /// @dev Every valid offer has a nonzero seller and an identifier starting at one.
    function _getOffer(uint256 offerId) private view returns (Offer storage offer) {
        offer = _offers[offerId];
        if (offer.seller == address(0)) revert UnknownOffer(offerId);
    }

    function _requireSeller(uint256 offerId, Offer storage offer) private view {
        if (offer.seller != msg.sender) revert NotSeller(offerId, msg.sender);
    }

    function _requireOpen(uint256 offerId, Offer storage offer) private view {
        if (offer.status != OPEN) revert OfferNotOpen(offerId, offer.status);
    }

    function _requireTrading(uint256 marketId, Market storage market) private view {
        if (!market.active) revert MarketInactive(marketId);
        if (block.timestamp >= market.tge) revert TgeReached(marketId, market.tge);
    }

    function _requireDeliveryWindow(uint256 marketId, Market storage market) private view {
        if (block.timestamp < market.tge) revert TgeNotReached(marketId, market.tge);
        uint256 deadline = uint256(market.tge) + market.deliveryWindow;
        if (block.timestamp >= deadline) revert DeliveryWindowClosed(marketId, deadline);
    }

    /// @dev Independent of per-fill rounding: never exceeds full seller collateral.
    function _soldCollateral(Offer storage offer) private view returns (uint256) {
        return Math.mulDiv(offer.sold, offer.pricePerToken, TOKEN_UNIT, Math.Rounding.Ceil);
    }

    /// @dev Rejects transfers whose net receipt differs from the promised amount.
    function _pullExact(address token, address from, uint256 amount) private {
        IERC20 asset = IERC20(token);
        uint256 beforeBalance = asset.balanceOf(address(this));
        asset.safeTransferFrom(from, address(this), amount);
        uint256 afterBalance = asset.balanceOf(address(this));
        if (afterBalance < beforeBalance || afterBalance - beforeBalance != amount) {
            revert UnexpectedTokenBalanceDelta(token, amount);
        }
    }

    function _setPlatformFee(uint16 bps) private {
        if (bps > MAX_PLATFORM_FEE_BPS) revert PlatformFeeTooHigh(bps);
        uint16 oldBps = platformFeeBps;
        platformFeeBps = bps;
        emit PlatformFeeUpdated(oldBps, bps);
    }

    /// @notice Native payments are never accepted.
    receive() external payable {
        revert NativeValueNotAccepted(msg.sender, msg.value);
    }

    /// @notice Unknown calls and native payments are rejected.
    fallback() external payable {
        revert NativeValueNotAccepted(msg.sender, msg.value);
    }
}
