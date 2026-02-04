// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

/**
 * @title AuctionHash
 * @notice Weekly auction game with consensus-based winner determination
 * @dev Highest bid wins UNLESS gap with 2nd bid > maxGapPercent (default 30%)
 *      Invalid bids cascade until valid winner found
 *      90% refund to losers/invalidated, 10% to next jackpot
 */
contract AuctionHash is Ownable, ReentrancyGuard, AutomationCompatibleInterface {
    using SafeERC20 for IERC20;

    // ============ Structs ============

    struct Bid {
        address bidder;
        uint256 amount;
        uint256 timestamp;
        bool claimed;
        bool invalidated;
    }

    struct Auction {
        uint256 startTime;
        uint256 endTime;
        uint256 jackpot;
        address winner;
        uint256 winningBid;
        bool revealed;
        uint256 totalBids;
        uint256 revealBlockHash;  // For provable fairness
    }

    // ============ State Variables ============

    IERC20 public immutable hashToken;
    
    // Current auction ID
    uint256 public currentAuctionId;
    
    // Auction data
    mapping(uint256 => Auction) public auctions;
    
    // Bids: auctionId => bidder => amount (highest bid per player)
    mapping(uint256 => mapping(address => uint256)) public bids;
    
    // List of bidders per auction (for iteration)
    mapping(uint256 => address[]) public bidders;
    mapping(uint256 => mapping(address => bool)) private hasBid;
    
    // Bid invalidation status: auctionId => bidder => invalidated
    mapping(uint256 => mapping(address => bool)) public invalidated;
    
    // Claim status: auctionId => bidder => claimed
    mapping(uint256 => mapping(address => bool)) public claimed;

    // ============ Parameters (Adjustable) ============

    uint256 public maxGapPercent = 30;       // Max gap between top & 2nd bid (30%)
    uint256 public losersRefundPercent = 90; // Refund to losers (90%)
    uint256 public minBid = 1e18;            // Minimum bid (1 HASH)
    uint256 public auctionDuration = 7 days; // 1 week
    uint8 public revealDay = 0;              // Sunday (0 = Sunday, 6 = Saturday)
    uint8 public revealHour = 20;            // 20:00 UTC

    // Jackpot accumulator for next auction
    uint256 public pendingJackpot;

    // Cross-feed sources (authorized game contracts)
    mapping(address => bool) public authorizedFeeders;

    // ============ Events ============

    event AuctionStarted(uint256 indexed auctionId, uint256 startTime, uint256 endTime, uint256 initialJackpot);
    event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount, uint256 previousBid);
    event BidInvalidated(uint256 indexed auctionId, address indexed bidder, uint256 amount, uint256 gapPercent);
    event WinnerDetermined(uint256 indexed auctionId, address indexed winner, uint256 winningBid, uint256 jackpot);
    event AuctionRevealedNoWinner(uint256 indexed auctionId, uint256 jackpotRollover);
    event RefundClaimed(uint256 indexed auctionId, address indexed bidder, uint256 amount, bool wasInvalidated);
    event WinningsClaimed(uint256 indexed auctionId, address indexed winner, uint256 amount);
    event JackpotFed(address indexed source, uint256 amount);
    event ParameterUpdated(string paramName, uint256 oldValue, uint256 newValue);
    event FeederAuthorized(address indexed feeder, bool authorized);

    // ============ Errors ============

    error AuctionNotActive();
    error AuctionNotEnded();
    error AuctionAlreadyRevealed();
    error BidTooLow();
    error AlreadyClaimed();
    error NotWinner();
    error NothingToClaim();
    error InvalidParameter();
    error NotAuthorizedFeeder();
    error TransferFailed();

    // ============ Constructor ============

    constructor(address _hashToken, uint256 _initialJackpot) Ownable(msg.sender) {
        hashToken = IERC20(_hashToken);
        pendingJackpot = _initialJackpot;
        
        // Start first auction
        _startNewAuction();
    }

    // ============ Core Functions ============

    /**
     * @notice Place a bid in the current auction
     * @param amount Amount of HASH tokens to bid
     */
    function bid(uint256 amount) external nonReentrant {
        Auction storage auction = auctions[currentAuctionId];
        
        if (block.timestamp < auction.startTime || block.timestamp >= auction.endTime) {
            revert AuctionNotActive();
        }
        
        if (amount < minBid) {
            revert BidTooLow();
        }

        uint256 previousBid = bids[currentAuctionId][msg.sender];
        
        // If updating bid, only charge the difference
        uint256 additionalAmount = amount > previousBid ? amount - previousBid : 0;
        
        if (amount <= previousBid) {
            revert BidTooLow(); // Can only increase bids
        }

        // Transfer additional tokens
        if (additionalAmount > 0) {
            hashToken.safeTransferFrom(msg.sender, address(this), additionalAmount);
        }

        // Record bid
        bids[currentAuctionId][msg.sender] = amount;
        
        // Track bidder for iteration (only add once)
        if (!hasBid[currentAuctionId][msg.sender]) {
            bidders[currentAuctionId].push(msg.sender);
            hasBid[currentAuctionId][msg.sender] = true;
            auction.totalBids++;
        }

        emit BidPlaced(currentAuctionId, msg.sender, amount, previousBid);
    }

    /**
     * @notice Reveal the auction and determine the winner
     * @dev Uses consensus rule: top bid invalid if gap > maxGapPercent with 2nd
     *      Cascades through bids until valid winner found
     */
    function reveal() external nonReentrant {
        Auction storage auction = auctions[currentAuctionId];
        
        if (block.timestamp < auction.endTime) {
            revert AuctionNotEnded();
        }
        
        if (auction.revealed) {
            revert AuctionAlreadyRevealed();
        }

        auction.revealed = true;
        auction.revealBlockHash = uint256(blockhash(block.number - 1));

        // Get sorted bids
        (address[] memory sortedBidders, uint256[] memory sortedAmounts) = _getSortedBids(currentAuctionId);
        
        uint256 numBids = sortedBidders.length;
        
        if (numBids == 0) {
            // No bids - jackpot rolls over
            pendingJackpot += auction.jackpot;
            emit AuctionRevealedNoWinner(currentAuctionId, auction.jackpot);
            _startNewAuction();
            return;
        }

        if (numBids == 1) {
            // Only one bidder - they win automatically
            auction.winner = sortedBidders[0];
            auction.winningBid = sortedAmounts[0];
            
            emit WinnerDetermined(currentAuctionId, auction.winner, auction.winningBid, auction.jackpot);
            _processLosersAndStartNew(currentAuctionId);
            return;
        }

        // Cascade through bids applying consensus rule
        address winner = address(0);
        uint256 winningBid = 0;

        for (uint256 i = 0; i < numBids - 1; i++) {
            uint256 topBid = sortedAmounts[i];
            uint256 secondBid = sortedAmounts[i + 1];
            
            // Calculate gap percentage: ((top - second) / top) * 100
            uint256 gap = ((topBid - secondBid) * 100) / topBid;
            
            if (gap <= maxGapPercent) {
                // Valid winner found!
                winner = sortedBidders[i];
                winningBid = topBid;
                
                // Mark all higher bids (already checked) as invalidated
                for (uint256 j = 0; j < i; j++) {
                    invalidated[currentAuctionId][sortedBidders[j]] = true;
                    
                    // Calculate gap for event
                    uint256 invalidGap = ((sortedAmounts[j] - sortedAmounts[j + 1]) * 100) / sortedAmounts[j];
                    emit BidInvalidated(currentAuctionId, sortedBidders[j], sortedAmounts[j], invalidGap);
                }
                
                break;
            } else {
                // This bid would be invalidated, continue cascade
                emit BidInvalidated(currentAuctionId, sortedBidders[i], sortedAmounts[i], gap);
            }
        }

        if (winner == address(0)) {
            // Edge case: all bids invalidated except last
            // Last bidder wins by default (they're the "closest to consensus")
            winner = sortedBidders[numBids - 1];
            winningBid = sortedAmounts[numBids - 1];
            
            // Mark all others as invalidated
            for (uint256 i = 0; i < numBids - 1; i++) {
                invalidated[currentAuctionId][sortedBidders[i]] = true;
            }
        }

        auction.winner = winner;
        auction.winningBid = winningBid;

        emit WinnerDetermined(currentAuctionId, winner, winningBid, auction.jackpot);
        
        _processLosersAndStartNew(currentAuctionId);
    }

    /**
     * @notice Claim winnings (for the winner)
     */
    function claimWinnings(uint256 auctionId) external nonReentrant {
        Auction storage auction = auctions[auctionId];
        
        if (!auction.revealed) {
            revert AuctionNotEnded();
        }
        
        if (msg.sender != auction.winner) {
            revert NotWinner();
        }
        
        if (claimed[auctionId][msg.sender]) {
            revert AlreadyClaimed();
        }

        claimed[auctionId][msg.sender] = true;
        
        // Winner gets:
        // 1. Their bid back (already in contract)
        // 2. The jackpot
        uint256 bidAmount = bids[auctionId][msg.sender];
        uint256 totalPayout = bidAmount + auction.jackpot;
        
        hashToken.safeTransfer(msg.sender, totalPayout);

        emit WinningsClaimed(auctionId, msg.sender, totalPayout);
    }

    /**
     * @notice Claim refund (for losers and invalidated bids)
     */
    function claimRefund(uint256 auctionId) external nonReentrant {
        Auction storage auction = auctions[auctionId];
        
        if (!auction.revealed) {
            revert AuctionNotEnded();
        }
        
        if (msg.sender == auction.winner) {
            revert NotWinner(); // Use claimWinnings instead
        }
        
        if (claimed[auctionId][msg.sender]) {
            revert AlreadyClaimed();
        }
        
        uint256 bidAmount = bids[auctionId][msg.sender];
        if (bidAmount == 0) {
            revert NothingToClaim();
        }

        claimed[auctionId][msg.sender] = true;
        
        // Refund 90% of bid
        uint256 refund = (bidAmount * losersRefundPercent) / 100;
        
        hashToken.safeTransfer(msg.sender, refund);

        emit RefundClaimed(auctionId, msg.sender, refund, invalidated[auctionId][msg.sender]);
    }

    /**
     * @notice Feed jackpot from other games (cross-feed)
     * @param amount Amount to add to jackpot
     */
    function feedJackpot(uint256 amount) external {
        if (!authorizedFeeders[msg.sender] && msg.sender != owner()) {
            revert NotAuthorizedFeeder();
        }
        
        hashToken.safeTransferFrom(msg.sender, address(this), amount);
        pendingJackpot += amount;
        
        emit JackpotFed(msg.sender, amount);
    }

    /**
     * @notice Seed jackpot directly (owner only, for initial seeding)
     */
    function seedJackpot(uint256 amount) external onlyOwner {
        hashToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // Add to current auction's jackpot if active
        Auction storage auction = auctions[currentAuctionId];
        if (!auction.revealed && block.timestamp < auction.endTime) {
            auction.jackpot += amount;
        } else {
            pendingJackpot += amount;
        }
        
        emit JackpotFed(msg.sender, amount);
    }

    // ============ Chainlink Automation ============

    /**
     * @notice Check if reveal should be triggered
     */
    function checkUpkeep(bytes calldata) external view override returns (bool upkeepNeeded, bytes memory performData) {
        Auction storage auction = auctions[currentAuctionId];
        upkeepNeeded = !auction.revealed && block.timestamp >= auction.endTime;
        performData = "";
    }

    /**
     * @notice Perform the reveal (called by Chainlink Automation)
     */
    function performUpkeep(bytes calldata) external override {
        Auction storage auction = auctions[currentAuctionId];
        if (!auction.revealed && block.timestamp >= auction.endTime) {
            this.reveal();
        }
    }

    // ============ View Functions ============

    /**
     * @notice Get current auction details
     */
    function getCurrentAuction() external view returns (
        uint256 auctionId,
        uint256 startTime,
        uint256 endTime,
        uint256 jackpot,
        uint256 totalBids,
        bool revealed,
        address winner,
        uint256 winningBid
    ) {
        Auction storage auction = auctions[currentAuctionId];
        return (
            currentAuctionId,
            auction.startTime,
            auction.endTime,
            auction.jackpot,
            auction.totalBids,
            auction.revealed,
            auction.winner,
            auction.winningBid
        );
    }

    /**
     * @notice Get all bids for an auction
     */
    function getAuctionBids(uint256 auctionId) external view returns (
        address[] memory bidderList,
        uint256[] memory amounts
    ) {
        uint256 count = bidders[auctionId].length;
        bidderList = new address[](count);
        amounts = new uint256[](count);
        
        for (uint256 i = 0; i < count; i++) {
            bidderList[i] = bidders[auctionId][i];
            amounts[i] = bids[auctionId][bidderList[i]];
        }
        
        return (bidderList, amounts);
    }

    /**
     * @notice Get sorted bids (descending by amount)
     */
    function getSortedBids(uint256 auctionId) external view returns (
        address[] memory sortedBidders,
        uint256[] memory sortedAmounts
    ) {
        return _getSortedBids(auctionId);
    }

    /**
     * @notice Calculate if a hypothetical bid would be in the "safe zone"
     * @param amount The bid amount to check
     * @return isValid Whether this bid would be valid given current bids
     * @return minSafeAmount Minimum amount to be valid (if top bid exists)
     * @return maxSafeAmount Maximum amount before becoming invalid
     */
    function calculateSafeZone(uint256 amount) external view returns (
        bool isValid,
        uint256 minSafeAmount,
        uint256 maxSafeAmount
    ) {
        (address[] memory sortedBidders, uint256[] memory sortedAmounts) = _getSortedBids(currentAuctionId);
        
        if (sortedBidders.length == 0) {
            // No bids yet - any amount is valid
            return (true, minBid, type(uint256).max);
        }
        
        uint256 topBid = sortedAmounts[0];
        
        // To be valid as top bid: amount must be within 30% of current top
        // gap = (amount - topBid) / amount <= 30%
        // amount - topBid <= 0.3 * amount
        // 0.7 * amount <= topBid
        // amount <= topBid / 0.7
        maxSafeAmount = (topBid * 100) / (100 - maxGapPercent);
        
        // To not get invalidated by someone below: your bid must be within 30% of you
        // For now, min is the current top bid (to actually be competitive)
        minSafeAmount = topBid;
        
        // Check if the proposed amount is valid
        if (amount > topBid) {
            uint256 gap = ((amount - topBid) * 100) / amount;
            isValid = gap <= maxGapPercent;
        } else {
            // Below current top - need to check if it would cause cascade
            isValid = true; // Simplified - full analysis would require more
        }
        
        return (isValid, minSafeAmount, maxSafeAmount);
    }

    /**
     * @notice Check if a user has a pending claim
     */
    function hasPendingClaim(uint256 auctionId, address user) external view returns (
        bool hasClaim,
        bool isWinner,
        uint256 claimAmount
    ) {
        Auction storage auction = auctions[auctionId];
        
        if (!auction.revealed || claimed[auctionId][user]) {
            return (false, false, 0);
        }
        
        uint256 bidAmount = bids[auctionId][user];
        if (bidAmount == 0) {
            return (false, false, 0);
        }
        
        if (user == auction.winner) {
            return (true, true, bidAmount + auction.jackpot);
        } else {
            uint256 refund = (bidAmount * losersRefundPercent) / 100;
            return (true, false, refund);
        }
    }

    /**
     * @notice Get auction history
     */
    function getAuctionHistory(uint256 fromId, uint256 count) external view returns (
        uint256[] memory auctionIds,
        address[] memory winners,
        uint256[] memory winningBids,
        uint256[] memory jackpots
    ) {
        uint256 start = fromId == 0 ? (currentAuctionId > count ? currentAuctionId - count : 1) : fromId;
        uint256 end = start + count > currentAuctionId ? currentAuctionId : start + count;
        uint256 len = end - start + 1;
        
        auctionIds = new uint256[](len);
        winners = new address[](len);
        winningBids = new uint256[](len);
        jackpots = new uint256[](len);
        
        for (uint256 i = 0; i < len; i++) {
            uint256 id = start + i;
            auctionIds[i] = id;
            winners[i] = auctions[id].winner;
            winningBids[i] = auctions[id].winningBid;
            jackpots[i] = auctions[id].jackpot;
        }
        
        return (auctionIds, winners, winningBids, jackpots);
    }

    // ============ Admin Functions ============

    function setMaxGapPercent(uint256 _maxGapPercent) external onlyOwner {
        if (_maxGapPercent == 0 || _maxGapPercent > 100) revert InvalidParameter();
        emit ParameterUpdated("maxGapPercent", maxGapPercent, _maxGapPercent);
        maxGapPercent = _maxGapPercent;
    }

    function setLosersRefundPercent(uint256 _losersRefundPercent) external onlyOwner {
        if (_losersRefundPercent > 100) revert InvalidParameter();
        emit ParameterUpdated("losersRefundPercent", losersRefundPercent, _losersRefundPercent);
        losersRefundPercent = _losersRefundPercent;
    }

    function setMinBid(uint256 _minBid) external onlyOwner {
        emit ParameterUpdated("minBid", minBid, _minBid);
        minBid = _minBid;
    }

    function setAuctionDuration(uint256 _auctionDuration) external onlyOwner {
        if (_auctionDuration == 0) revert InvalidParameter();
        emit ParameterUpdated("auctionDuration", auctionDuration, _auctionDuration);
        auctionDuration = _auctionDuration;
    }

    function setRevealTime(uint8 _revealDay, uint8 _revealHour) external onlyOwner {
        if (_revealDay > 6 || _revealHour > 23) revert InvalidParameter();
        revealDay = _revealDay;
        revealHour = _revealHour;
    }

    function setAuthorizedFeeder(address feeder, bool authorized) external onlyOwner {
        authorizedFeeders[feeder] = authorized;
        emit FeederAuthorized(feeder, authorized);
    }

    // ============ Internal Functions ============

    function _startNewAuction() internal {
        currentAuctionId++;
        
        uint256 startTime = block.timestamp;
        uint256 endTime = _calculateNextRevealTime();
        
        auctions[currentAuctionId] = Auction({
            startTime: startTime,
            endTime: endTime,
            jackpot: pendingJackpot,
            winner: address(0),
            winningBid: 0,
            revealed: false,
            totalBids: 0,
            revealBlockHash: 0
        });
        
        emit AuctionStarted(currentAuctionId, startTime, endTime, pendingJackpot);
        
        pendingJackpot = 0;
    }

    function _calculateNextRevealTime() internal view returns (uint256) {
        // Calculate next Sunday 20:00 UTC (or configured day/time)
        uint256 timestamp = block.timestamp;
        
        // Get current day of week (0 = Thursday for epoch, need adjustment)
        // Epoch (Jan 1, 1970) was a Thursday, so we add 4 days offset
        uint256 dayOfWeek = ((timestamp / 1 days) + 4) % 7;
        
        // Calculate days until target day
        uint256 daysUntilTarget = (revealDay >= dayOfWeek) 
            ? revealDay - dayOfWeek 
            : 7 - dayOfWeek + revealDay;
        
        // If it's the target day but past reveal hour, go to next week
        uint256 currentHour = (timestamp % 1 days) / 1 hours;
        if (daysUntilTarget == 0 && currentHour >= revealHour) {
            daysUntilTarget = 7;
        }
        
        // Calculate exact reveal timestamp
        uint256 startOfToday = timestamp - (timestamp % 1 days);
        uint256 revealTime = startOfToday + (daysUntilTarget * 1 days) + (revealHour * 1 hours);
        
        return revealTime;
    }

    function _processLosersAndStartNew(uint256 auctionId) internal {
        Auction storage auction = auctions[auctionId];
        
        // Calculate 10% of all non-winner bids for next jackpot
        uint256 toNextJackpot = 0;
        
        for (uint256 i = 0; i < bidders[auctionId].length; i++) {
            address bidder = bidders[auctionId][i];
            if (bidder != auction.winner) {
                uint256 bidAmount = bids[auctionId][bidder];
                // 10% goes to next jackpot
                toNextJackpot += (bidAmount * (100 - losersRefundPercent)) / 100;
            }
        }
        
        pendingJackpot = toNextJackpot;
        
        // Start new auction
        _startNewAuction();
    }

    function _getSortedBids(uint256 auctionId) internal view returns (
        address[] memory sortedBidders,
        uint256[] memory sortedAmounts
    ) {
        uint256 count = bidders[auctionId].length;
        
        if (count == 0) {
            return (new address[](0), new uint256[](0));
        }
        
        // Copy arrays
        sortedBidders = new address[](count);
        sortedAmounts = new uint256[](count);
        
        for (uint256 i = 0; i < count; i++) {
            sortedBidders[i] = bidders[auctionId][i];
            sortedAmounts[i] = bids[auctionId][sortedBidders[i]];
        }
        
        // Sort descending by amount (simple bubble sort - ok for small arrays)
        for (uint256 i = 0; i < count - 1; i++) {
            for (uint256 j = 0; j < count - i - 1; j++) {
                if (sortedAmounts[j] < sortedAmounts[j + 1]) {
                    // Swap amounts
                    uint256 tempAmount = sortedAmounts[j];
                    sortedAmounts[j] = sortedAmounts[j + 1];
                    sortedAmounts[j + 1] = tempAmount;
                    
                    // Swap addresses
                    address tempAddr = sortedBidders[j];
                    sortedBidders[j] = sortedBidders[j + 1];
                    sortedBidders[j + 1] = tempAddr;
                }
            }
        }
        
        return (sortedBidders, sortedAmounts);
    }

    // ============ Emergency Functions ============

    /**
     * @notice Emergency withdraw (owner only, for stuck funds)
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            payable(owner()).transfer(amount);
        } else {
            IERC20(token).safeTransfer(owner(), amount);
        }
    }
}
