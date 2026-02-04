// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title AuctionHashSealed
 * @notice Weekly sealed-bid auction with consensus rule and heatmap buckets
 * @dev Bids are committed (hidden) during bidding phase, revealed at end
 */
contract AuctionHashSealed is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ STRUCTS ============

    struct SealedBid {
        bytes32 commitment;      // keccak256(amount, secret)
        uint8 bucket;            // Public bucket for heatmap (0-5)
        uint256 deposit;         // Amount deposited (must cover bid)
        bool revealed;           // Whether bid has been revealed
        uint256 revealedAmount;  // Actual bid amount after reveal
    }

    struct Auction {
        uint256 auctionId;
        uint256 startTime;
        uint256 revealTime;      // When bidding closes & reveal begins
        uint256 endTime;         // When reveal period ends
        uint256 jackpot;
        uint256 totalBids;
        bool finalized;
        address winner;
        uint256 winningBid;
    }

    // ============ CONSTANTS ============

    uint8 public constant NUM_BUCKETS = 6;
    
    // Bucket ranges (in HASH tokens, 18 decimals)
    uint256[6] public bucketMins = [
        0,                      // Bucket 0: 0-500
        500e18,                 // Bucket 1: 500-1000
        1000e18,                // Bucket 2: 1000-2000
        2000e18,                // Bucket 3: 2000-5000
        5000e18,                // Bucket 4: 5000-10000
        10000e18                // Bucket 5: 10000+
    ];
    
    uint256[6] public bucketMaxs = [
        500e18,
        1000e18,
        2000e18,
        5000e18,
        10000e18,
        type(uint256).max      // No upper limit for bucket 5
    ];

    // ============ STATE ============

    IERC20 public immutable hashToken;
    
    uint256 public currentAuctionId;
    uint256 public maxGapPercent = 30;           // 30% max gap
    uint256 public losersRefundPercent = 90;     // 90% refund
    uint256 public minBid = 100e18;              // 100 HASH minimum
    uint256 public biddingDuration = 6 days + 19 hours;
    uint256 public revealDuration = 5 hours;
    
    // Auction data
    mapping(uint256 => Auction) public auctions;
    
    // Bids: auctionId => bidder => SealedBid
    mapping(uint256 => mapping(address => SealedBid)) public bids;
    
    // Bucket counts for heatmap: auctionId => bucket => count
    mapping(uint256 => mapping(uint8 => uint256)) public bucketCounts;
    
    // Revealed bids sorted for winner determination
    mapping(uint256 => address[]) public revealedBidders;
    
    // Claims tracking
    mapping(uint256 => mapping(address => bool)) public claimed;
    
    // Authorized jackpot feeders (other Hash games)
    mapping(address => bool) public authorizedFeeders;

    // ============ EVENTS ============

    event AuctionStarted(uint256 indexed auctionId, uint256 revealTime, uint256 jackpot);
    event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint8 bucket);
    event BidRevealed(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event BidInvalidated(uint256 indexed auctionId, address indexed bidder, uint256 amount, uint256 gapPercent);
    event AuctionFinalized(uint256 indexed auctionId, address winner, uint256 winningBid, uint256 jackpot);
    event WinningsClaimed(uint256 indexed auctionId, address indexed winner, uint256 amount);
    event RefundClaimed(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event JackpotFed(address indexed source, uint256 amount);

    // ============ CONSTRUCTOR ============

    constructor(address _hashToken, uint256 _initialJackpot) Ownable(msg.sender) {
        hashToken = IERC20(_hashToken);
        _startNewAuction(_initialJackpot);
    }

    // ============ BIDDING ============

    /**
     * @notice Place a sealed bid
     * @param commitment keccak256(abi.encodePacked(amount, secret))
     * @param bucket The bucket index (0-5) for heatmap - must match actual bid amount
     * @param deposit Amount of HASH to deposit (must be >= actual bid)
     */
    function placeBid(bytes32 commitment, uint8 bucket, uint256 deposit) external nonReentrant {
        Auction storage auction = auctions[currentAuctionId];
        
        require(block.timestamp < auction.revealTime, "Bidding closed");
        require(bucket < NUM_BUCKETS, "Invalid bucket");
        require(deposit >= minBid, "Below minimum bid");
        require(bids[currentAuctionId][msg.sender].commitment == bytes32(0), "Already bid");
        
        // Transfer deposit
        hashToken.safeTransferFrom(msg.sender, address(this), deposit);
        
        // Store sealed bid
        bids[currentAuctionId][msg.sender] = SealedBid({
            commitment: commitment,
            bucket: bucket,
            deposit: deposit,
            revealed: false,
            revealedAmount: 0
        });
        
        // Update heatmap
        bucketCounts[currentAuctionId][bucket]++;
        auction.totalBids++;
        
        emit BidPlaced(currentAuctionId, msg.sender, bucket);
    }

    /**
     * @notice Reveal your sealed bid
     * @param amount The actual bid amount
     * @param secret The secret used in commitment
     */
    function revealBid(uint256 amount, bytes32 secret) external nonReentrant {
        Auction storage auction = auctions[currentAuctionId];
        SealedBid storage bid = bids[currentAuctionId][msg.sender];
        
        require(block.timestamp >= auction.revealTime, "Reveal not started");
        require(block.timestamp < auction.endTime, "Reveal period ended");
        require(bid.commitment != bytes32(0), "No bid found");
        require(!bid.revealed, "Already revealed");
        
        // Verify commitment
        bytes32 expectedCommitment = keccak256(abi.encodePacked(amount, secret));
        require(expectedCommitment == bid.commitment, "Invalid reveal");
        
        // Verify bucket matches
        uint8 expectedBucket = getBucket(amount);
        require(expectedBucket == bid.bucket, "Bucket mismatch");
        
        // Verify deposit covers bid
        require(bid.deposit >= amount, "Deposit insufficient");
        
        // Store revealed amount
        bid.revealed = true;
        bid.revealedAmount = amount;
        revealedBidders[currentAuctionId].push(msg.sender);
        
        emit BidRevealed(currentAuctionId, msg.sender, amount);
    }

    /**
     * @notice Finalize auction and determine winner
     * @dev Can be called by anyone after reveal period ends
     */
    function finalizeAuction() external nonReentrant {
        Auction storage auction = auctions[currentAuctionId];
        
        require(block.timestamp >= auction.endTime, "Reveal period not ended");
        require(!auction.finalized, "Already finalized");
        
        // Sort revealed bids by amount (descending)
        address[] memory bidders = revealedBidders[currentAuctionId];
        _sortBiddersByAmount(currentAuctionId, bidders);
        
        // Find valid winner using consensus rule
        address winner = address(0);
        uint256 winningBid = 0;
        
        for (uint256 i = 0; i < bidders.length; i++) {
            uint256 currentBid = bids[currentAuctionId][bidders[i]].revealedAmount;
            
            if (i == bidders.length - 1) {
                // Last bid (lowest) - automatically valid if we got here
                winner = bidders[i];
                winningBid = currentBid;
                break;
            }
            
            uint256 nextBid = bids[currentAuctionId][bidders[i + 1]].revealedAmount;
            uint256 gap = ((currentBid - nextBid) * 100) / currentBid;
            
            if (gap <= maxGapPercent) {
                // Valid winner found
                winner = bidders[i];
                winningBid = currentBid;
                break;
            } else {
                // Invalidated - emit event
                emit BidInvalidated(currentAuctionId, bidders[i], currentBid, gap);
            }
        }
        
        // Finalize
        auction.finalized = true;
        auction.winner = winner;
        auction.winningBid = winningBid;
        
        // Calculate next jackpot from losing bids
        uint256 nextJackpot = 0;
        for (uint256 i = 0; i < bidders.length; i++) {
            if (bidders[i] != winner) {
                uint256 bidAmount = bids[currentAuctionId][bidders[i]].revealedAmount;
                uint256 fee = (bidAmount * (100 - losersRefundPercent)) / 100;
                nextJackpot += fee;
            }
        }
        
        emit AuctionFinalized(currentAuctionId, winner, winningBid, auction.jackpot);
        
        // Start next auction
        _startNewAuction(nextJackpot);
    }

    // ============ CLAIMS ============

    /**
     * @notice Winner claims the jackpot
     */
    function claimWinnings(uint256 auctionId) external nonReentrant {
        Auction storage auction = auctions[auctionId];
        
        require(auction.finalized, "Not finalized");
        require(msg.sender == auction.winner, "Not winner");
        require(!claimed[auctionId][msg.sender], "Already claimed");
        
        claimed[auctionId][msg.sender] = true;
        
        // Transfer jackpot + original bid
        uint256 payout = auction.jackpot + bids[auctionId][msg.sender].revealedAmount;
        hashToken.safeTransfer(msg.sender, payout);
        
        emit WinningsClaimed(auctionId, msg.sender, payout);
    }

    /**
     * @notice Losers claim their refund (90%)
     */
    function claimRefund(uint256 auctionId) external nonReentrant {
        Auction storage auction = auctions[auctionId];
        SealedBid storage bid = bids[auctionId][msg.sender];
        
        require(auction.finalized, "Not finalized");
        require(msg.sender != auction.winner, "Winner uses claimWinnings");
        require(!claimed[auctionId][msg.sender], "Already claimed");
        require(bid.revealed, "Bid not revealed");
        
        claimed[auctionId][msg.sender] = true;
        
        // Calculate refund
        uint256 refund = (bid.revealedAmount * losersRefundPercent) / 100;
        
        // Also refund excess deposit
        uint256 excessDeposit = bid.deposit - bid.revealedAmount;
        uint256 totalRefund = refund + excessDeposit;
        
        hashToken.safeTransfer(msg.sender, totalRefund);
        
        emit RefundClaimed(auctionId, msg.sender, totalRefund);
    }

    /**
     * @notice Claim back deposit if bid was not revealed
     */
    function claimUnrevealedDeposit(uint256 auctionId) external nonReentrant {
        Auction storage auction = auctions[auctionId];
        SealedBid storage bid = bids[auctionId][msg.sender];
        
        require(auction.finalized, "Not finalized");
        require(!bid.revealed, "Bid was revealed");
        require(!claimed[auctionId][msg.sender], "Already claimed");
        require(bid.deposit > 0, "No deposit");
        
        claimed[auctionId][msg.sender] = true;
        
        // Refund 90% of deposit (10% penalty for not revealing)
        uint256 refund = (bid.deposit * losersRefundPercent) / 100;
        hashToken.safeTransfer(msg.sender, refund);
        
        // 10% goes to next jackpot
        uint256 penalty = bid.deposit - refund;
        auctions[currentAuctionId].jackpot += penalty;
        
        emit RefundClaimed(auctionId, msg.sender, refund);
    }

    // ============ JACKPOT FEEDING ============

    /**
     * @notice Receive jackpot contribution from other games
     */
    function feedJackpot(uint256 amount) external {
        require(authorizedFeeders[msg.sender], "Not authorized");
        
        hashToken.safeTransferFrom(msg.sender, address(this), amount);
        auctions[currentAuctionId].jackpot += amount;
        
        emit JackpotFed(msg.sender, amount);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get bucket for a given amount
     */
    function getBucket(uint256 amount) public view returns (uint8) {
        for (uint8 i = 0; i < NUM_BUCKETS; i++) {
            if (amount >= bucketMins[i] && amount < bucketMaxs[i]) {
                return i;
            }
        }
        return NUM_BUCKETS - 1; // Highest bucket
    }

    /**
     * @notice Get all bucket counts for current auction (for heatmap)
     */
    function getBucketCounts() external view returns (uint256[6] memory) {
        uint256[6] memory counts;
        for (uint8 i = 0; i < NUM_BUCKETS; i++) {
            counts[i] = bucketCounts[currentAuctionId][i];
        }
        return counts;
    }

    /**
     * @notice Get current auction info
     */
    function getCurrentAuction() external view returns (
        uint256 auctionId,
        uint256 revealTime,
        uint256 endTime,
        uint256 jackpot,
        uint256 totalBids,
        bool finalized
    ) {
        Auction storage a = auctions[currentAuctionId];
        return (a.auctionId, a.revealTime, a.endTime, a.jackpot, a.totalBids, a.finalized);
    }

    /**
     * @notice Check if user has bid in current auction
     */
    function hasBid(address user) external view returns (bool) {
        return bids[currentAuctionId][user].commitment != bytes32(0);
    }

    /**
     * @notice Generate commitment hash (helper for frontend)
     */
    function generateCommitment(uint256 amount, bytes32 secret) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(amount, secret));
    }

    // ============ ADMIN ============

    function setMaxGapPercent(uint256 _maxGapPercent) external onlyOwner {
        require(_maxGapPercent > 0 && _maxGapPercent <= 100, "Invalid gap");
        maxGapPercent = _maxGapPercent;
    }

    function setLosersRefundPercent(uint256 _losersRefundPercent) external onlyOwner {
        require(_losersRefundPercent > 0 && _losersRefundPercent < 100, "Invalid refund");
        losersRefundPercent = _losersRefundPercent;
    }

    function setMinBid(uint256 _minBid) external onlyOwner {
        minBid = _minBid;
    }

    function setAuthorizedFeeder(address feeder, bool authorized) external onlyOwner {
        authorizedFeeders[feeder] = authorized;
    }

    function seedJackpot(uint256 amount) external onlyOwner {
        hashToken.safeTransferFrom(msg.sender, address(this), amount);
        auctions[currentAuctionId].jackpot += amount;
    }

    // ============ INTERNAL ============

    function _startNewAuction(uint256 initialJackpot) internal {
        currentAuctionId++;
        
        uint256 revealTime = block.timestamp + biddingDuration;
        uint256 endTime = revealTime + revealDuration;
        
        auctions[currentAuctionId] = Auction({
            auctionId: currentAuctionId,
            startTime: block.timestamp,
            revealTime: revealTime,
            endTime: endTime,
            jackpot: initialJackpot,
            totalBids: 0,
            finalized: false,
            winner: address(0),
            winningBid: 0
        });
        
        emit AuctionStarted(currentAuctionId, revealTime, initialJackpot);
    }

    function _sortBiddersByAmount(uint256 auctionId, address[] memory bidders) internal view {
        // Simple bubble sort (fine for expected number of bidders)
        uint256 n = bidders.length;
        for (uint256 i = 0; i < n; i++) {
            for (uint256 j = i + 1; j < n; j++) {
                if (bids[auctionId][bidders[i]].revealedAmount < bids[auctionId][bidders[j]].revealedAmount) {
                    (bidders[i], bidders[j]) = (bidders[j], bidders[i]);
                }
            }
        }
    }
}
