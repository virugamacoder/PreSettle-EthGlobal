// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/// @title Pre Settle OTC Market
/// @notice Escrows maker tokens and credits proceeds, fees and refunds for withdrawal.
/// @dev Non-upgradeable. Amounts use each token's native units. Tokens must be
/// standard, non-rebasing ERC-20s; incoming transfer fees are rejected by balance delta.
/// Token pairs are caller-selected, including Arc Testnet USDC and EURC.
/// Known risk: escrow and credits are pooled at this address, so if a token issuer
/// (for example USDC) blocklists the market address, transfers of that token out of
/// the market revert for everyone until the issuer lifts the block.
contract OTCMarket is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct CreateParams {
        address offerToken;
        uint256 offerAmount;
        address wantToken;
        uint256 wantAmount;
        bool partialAllowed;
        uint64 deadline;
        address privateTaker;
        address broker;
        uint16 brokerFeeBps;
    }

    struct Order {
        address maker;
        address offerToken;
        uint256 offerAmount;
        address wantToken;
        uint256 wantAmount;
        uint256 filledOffer;
        bool partialAllowed;
        uint64 deadline;
        address privateTaker;
        address broker;
        uint16 brokerFeeBps;
        bool cancelled;
    }

    uint16 public constant MAX_PLATFORM_FEE_BPS = 100;
    uint16 public constant MAX_BROKER_FEE_BPS = 200;
    uint256 public constant BPS_DENOMINATOR = 10000;

    uint16 public platformFeeBps;
    uint256 public nextOrderId = 1;
    mapping(uint256 orderId => Order) private _orders;
    /// @dev Platform fee rate locked in when each order is created, so later
    /// fee changes never affect orders that are already escrowed.
    mapping(uint256 orderId => uint16) private _orderPlatformFeeBps;
    /// @notice Withdrawable credit; order escrow is accounted for separately.
    mapping(address account => mapping(address token => uint256)) public balances;

    error InvalidTokenPair(address offerToken, address wantToken);
    error InvalidOrderAmounts(uint256 offerAmount, uint256 wantAmount);
    error InvalidFillAmount(uint256 requested, uint256 remaining);
    error InvalidDeadline(uint64 deadline);
    error PlatformFeeTooHigh(uint16 bps);
    error BrokerFeeTooHigh(uint16 bps);
    error UnknownOrder(uint256 orderId);
    error OrderClosed(uint256 orderId);
    error OrderDeadlineReached(uint64 deadline);
    error OrderNotExpired(uint64 deadline);
    error UnauthorizedTaker(address taker);
    error MakerCannotFill();
    error PartialFillNotAllowed();
    error NotMaker(address caller);
    error NothingToWithdraw(address account, address token);
    error UnexpectedTokenBalanceDelta(address token, uint256 expected);
    error OwnershipRenunciationDisabled();
    error NativeValueNotAccepted();

    event OrderCreated(uint256 indexed orderId, address indexed maker, address offerToken, address wantToken, uint256 offerAmount, uint256 wantAmount, uint64 deadline, address broker, address privateTaker);
    event OrderFilled(uint256 indexed orderId, address indexed taker, uint256 offerAmount, uint256 wantAmount);
    event OrderCancelled(uint256 indexed orderId);
    event OrderExpired(uint256 indexed orderId);
    event Withdrawn(address indexed account, address indexed token, uint256 amount);
    event FeeSplit(uint256 indexed orderId, uint256 platformFee, uint256 brokerFee, uint256 makerShare);
    event PlatformFeeUpdated(uint16 oldBps, uint16 newBps);

    /// @notice Sets the initial fee recipient/owner and platform fee (at most 1%).
    constructor(address initialOwner, uint16 platformFeeBps_) Ownable(initialOwner) {
        _setPlatformFee(platformFeeBps_);
    }

    /// @notice Creates an order with the caller as maker and escrows the full offer.
    /// @return orderId Monotonically increasing identifier starting at one.
    function createOrder(CreateParams calldata p) external nonReentrant returns (uint256 orderId) {
        if (p.offerToken == address(0) || p.wantToken == address(0) || p.offerToken == p.wantToken) {
            revert InvalidTokenPair(p.offerToken, p.wantToken);
        }
        if (p.offerAmount == 0 || p.wantAmount == 0) revert InvalidOrderAmounts(p.offerAmount, p.wantAmount);
        if (p.deadline <= block.timestamp) revert InvalidDeadline(p.deadline);
        if (p.brokerFeeBps > MAX_BROKER_FEE_BPS) revert BrokerFeeTooHigh(p.brokerFeeBps);

        orderId = nextOrderId++;
        _orderPlatformFeeBps[orderId] = platformFeeBps;
        _orders[orderId] = Order({
            maker: msg.sender,
            offerToken: p.offerToken,
            offerAmount: p.offerAmount,
            wantToken: p.wantToken,
            wantAmount: p.wantAmount,
            filledOffer: 0,
            partialAllowed: p.partialAllowed,
            deadline: p.deadline,
            privateTaker: p.privateTaker,
            broker: p.broker,
            brokerFeeBps: p.broker == address(0) ? 0 : p.brokerFeeBps,
            cancelled: false
        });

        emit OrderCreated(orderId, msg.sender, p.offerToken, p.wantToken, p.offerAmount, p.wantAmount, p.deadline, p.broker, p.privateTaker);
        _pullExact(p.offerToken, msg.sender, p.offerAmount);
    }

    /// @notice Returns the complete order, reverting for an unknown identifier.
    function getOrder(uint256 orderId) external view returns (Order memory) {
        return _getOrder(orderId);
    }

    /// @notice Buys offerAmount units, paying the proportional price rounded up.
    /// @dev Each fill rounds independently. The platform fee rate is the one
    /// locked in at order creation; the fee is credited to the current owner.
    /// Earlier credits remain with their original recipients.
    function fill(uint256 orderId, uint256 offerAmount) external nonReentrant {
        Order storage order = _getOrder(orderId);
        if (order.cancelled || order.filledOffer == order.offerAmount) revert OrderClosed(orderId);
        if (block.timestamp >= order.deadline) revert OrderDeadlineReached(order.deadline);
        if (order.privateTaker != address(0) && order.privateTaker != msg.sender) revert UnauthorizedTaker(msg.sender);
        if (order.maker == msg.sender) revert MakerCannotFill();
        uint256 remaining = order.offerAmount - order.filledOffer;
        if (offerAmount == 0 || offerAmount > remaining) revert InvalidFillAmount(offerAmount, remaining);
        if (!order.partialAllowed && offerAmount != order.offerAmount) revert PartialFillNotAllowed();

        uint256 pay = Math.mulDiv(offerAmount, order.wantAmount, order.offerAmount, Math.Rounding.Ceil);
        uint256 platformFee = Math.mulDiv(pay, _orderPlatformFeeBps[orderId], BPS_DENOMINATOR);
        uint256 brokerFee = order.broker == address(0)
            ? 0
            : Math.mulDiv(pay, order.brokerFeeBps, BPS_DENOMINATOR);
        uint256 makerShare = pay - platformFee - brokerFee;

        order.filledOffer += offerAmount;
        balances[owner()][order.wantToken] += platformFee;
        if (brokerFee != 0) balances[order.broker][order.wantToken] += brokerFee;
        balances[order.maker][order.wantToken] += makerShare;

        emit OrderFilled(orderId, msg.sender, offerAmount, pay);
        emit FeeSplit(orderId, platformFee, brokerFee, makerShare);

        _pullExact(order.wantToken, msg.sender, pay);
        IERC20(order.offerToken).safeTransfer(msg.sender, offerAmount);
    }

    /// @notice Cancels the caller's order and credits its unfilled escrow.
    function cancel(uint256 orderId) external nonReentrant {
        Order storage order = _getOrder(orderId);
        if (order.maker != msg.sender) revert NotMaker(msg.sender);
        _closeAndCredit(orderId, order);
        emit OrderCancelled(orderId);
    }

    /// @notice Permissionlessly closes an expired order and credits the maker.
    function expire(uint256 orderId) external nonReentrant {
        Order storage order = _getOrder(orderId);
        if (block.timestamp < order.deadline) revert OrderNotExpired(order.deadline);
        _closeAndCredit(orderId, order);
        emit OrderExpired(orderId);
    }

    /// @notice Withdraws the caller's entire credit for token to the caller.
    /// @dev A failed transfer restores the credit by reverting the transaction.
    function withdraw(address token) external nonReentrant {
        uint256 amount = balances[msg.sender][token];
        if (amount == 0) revert NothingToWithdraw(msg.sender, token);
        balances[msg.sender][token] = 0;
        emit Withdrawn(msg.sender, token, amount);
        IERC20(token).safeTransfer(msg.sender, amount);
    }

    /// @notice Updates the platform fee for orders created afterwards, capped at 100 bps.
    function setPlatformFee(uint16 bps) external onlyOwner {
        _setPlatformFee(bps);
    }

    /// @notice Ownership cannot be renounced because the owner receives fees.
    function renounceOwnership() public override onlyOwner {
        revert OwnershipRenunciationDisabled();
    }

    /// @dev Valid order ids always have a nonzero maker.
    function _getOrder(uint256 orderId) private view returns (Order storage order) {
        order = _orders[orderId];
        if (order.maker == address(0)) revert UnknownOrder(orderId);
    }

    /// @dev Both cancellation paths share the same single-use terminal flag.
    function _closeAndCredit(uint256 orderId, Order storage order) private {
        uint256 remaining = order.offerAmount - order.filledOffer;
        if (order.cancelled || remaining == 0) revert OrderClosed(orderId);
        order.cancelled = true;
        balances[order.maker][order.offerToken] += remaining;
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
        revert NativeValueNotAccepted();
    }

    /// @notice Unknown calls and native payments are rejected.
    fallback() external payable {
        revert NativeValueNotAccepted();
    }
}
