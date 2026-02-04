// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/AuctionHash.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock HASH Token
contract MockHashToken is ERC20 {
    constructor() ERC20("HASH Token", "HASH") {
        _mint(msg.sender, 1_000_000_000 * 10**18);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract AuctionHashTest is Test {
    AuctionHash public auction;
    MockHashToken public hashToken;
    
    address public owner = address(1);
    address public alice = address(2);
    address public bob = address(3);
    address public charlie = address(4);
    address public dave = address(5);
    address public eve = address(6);

    uint256 constant INITIAL_JACKPOT = 10_000 * 10**18;
    uint256 constant PLAYER_BALANCE = 10_000 * 10**18;

    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy mock token
        hashToken = new MockHashToken();
        
        // Deploy auction contract with initial jackpot
        auction = new AuctionHash(address(hashToken), INITIAL_JACKPOT);
        
        // Fund players
        hashToken.transfer(alice, PLAYER_BALANCE);
        hashToken.transfer(bob, PLAYER_BALANCE);
        hashToken.transfer(charlie, PLAYER_BALANCE);
        hashToken.transfer(dave, PLAYER_BALANCE);
        hashToken.transfer(eve, PLAYER_BALANCE);
        
        // Fund contract for initial jackpot
        hashToken.transfer(address(auction), INITIAL_JACKPOT);
        
        vm.stopPrank();
        
        // Approve tokens for each player
        _approveAll();
    }

    function _approveAll() internal {
        vm.prank(alice);
        hashToken.approve(address(auction), type(uint256).max);
        vm.prank(bob);
        hashToken.approve(address(auction), type(uint256).max);
        vm.prank(charlie);
        hashToken.approve(address(auction), type(uint256).max);
        vm.prank(dave);
        hashToken.approve(address(auction), type(uint256).max);
        vm.prank(eve);
        hashToken.approve(address(auction), type(uint256).max);
    }

    // ============ BASIC FUNCTIONALITY TESTS ============

    function test_InitialState() public view {
        assertEq(auction.currentAuctionId(), 1);
        assertEq(auction.maxGapPercent(), 30);
        assertEq(auction.losersRefundPercent(), 90);
        assertEq(address(auction.hashToken()), address(hashToken));
    }

    function test_PlaceBid() public {
        uint256 bidAmount = 100 * 10**18;
        
        vm.prank(alice);
        auction.bid(bidAmount);
        
        assertEq(auction.bids(1, alice), bidAmount);
    }

    function test_IncreaseBid() public {
        uint256 initialBid = 100 * 10**18;
        uint256 newBid = 200 * 10**18;
        
        vm.startPrank(alice);
        auction.bid(initialBid);
        auction.bid(newBid);
        vm.stopPrank();
        
        assertEq(auction.bids(1, alice), newBid);
    }

    function test_RevertOnDecreaseBid() public {
        uint256 initialBid = 200 * 10**18;
        uint256 lowerBid = 100 * 10**18;
        
        vm.startPrank(alice);
        auction.bid(initialBid);
        
        vm.expectRevert(AuctionHash.BidTooLow.selector);
        auction.bid(lowerBid);
        vm.stopPrank();
    }

    function test_RevertOnBidBelowMin() public {
        uint256 tooLow = 0.5 * 10**18; // Below 1 HASH min
        
        vm.prank(alice);
        vm.expectRevert(AuctionHash.BidTooLow.selector);
        auction.bid(tooLow);
    }

    // ============ CONSENSUS RULE TESTS ============

    function test_ValidWinner_GapWithin30Percent() public {
        // Alice: 100, Bob: 75 → gap = 25% (valid)
        vm.prank(alice);
        auction.bid(100 * 10**18);
        
        vm.prank(bob);
        auction.bid(75 * 10**18);
        
        // Fast forward past auction end
        vm.warp(block.timestamp + 8 days);
        
        auction.reveal();
        
        (,,,,,, address winner,) = auction.getCurrentAuction();
        assertEq(winner, alice); // Alice should win
    }

    function test_InvalidTopBid_GapOver30Percent() public {
        // Alice: 100, Bob: 65 → gap = 35% (invalid, Alice gets invalidated)
        // Bob: 65, Charlie: 60 → gap = 7.7% (valid, Bob wins)
        vm.prank(alice);
        auction.bid(100 * 10**18);
        
        vm.prank(bob);
        auction.bid(65 * 10**18);
        
        vm.prank(charlie);
        auction.bid(60 * 10**18);
        
        // Fast forward past auction end
        vm.warp(block.timestamp + 8 days);
        
        auction.reveal();
        
        (,,,,,, address winner,) = auction.getCurrentAuction();
        assertEq(winner, bob); // Bob should win, not Alice
        assertTrue(auction.invalidated(1, alice)); // Alice invalidated
        assertFalse(auction.invalidated(1, bob)); // Bob not invalidated
    }

    function test_CascadeToThirdBidder() public {
        // Alice: 200, Bob: 120, Charlie: 85, Dave: 80
        // Alice vs Bob: gap = 40% (invalid)
        // Bob vs Charlie: gap = 29.2% (valid) → Bob wins
        vm.prank(alice);
        auction.bid(200 * 10**18);
        
        vm.prank(bob);
        auction.bid(120 * 10**18);
        
        vm.prank(charlie);
        auction.bid(85 * 10**18);
        
        vm.prank(dave);
        auction.bid(80 * 10**18);
        
        vm.warp(block.timestamp + 8 days);
        auction.reveal();
        
        (,,,,,, address winner,) = auction.getCurrentAuction();
        assertEq(winner, bob);
        assertTrue(auction.invalidated(1, alice));
    }

    function test_AllInvalidatedExceptLast() public {
        // Alice: 100, Bob: 50, Charlie: 20
        // All gaps > 30%, last bidder (Charlie) wins by default
        vm.prank(alice);
        auction.bid(100 * 10**18);
        
        vm.prank(bob);
        auction.bid(50 * 10**18);
        
        vm.prank(charlie);
        auction.bid(20 * 10**18);
        
        vm.warp(block.timestamp + 8 days);
        auction.reveal();
        
        (,,,,,, address winner,) = auction.getCurrentAuction();
        assertEq(winner, charlie); // Last bidder wins
        assertTrue(auction.invalidated(1, alice));
        assertTrue(auction.invalidated(1, bob));
    }

    function test_SingleBidderWins() public {
        // Only one bidder → automatic winner
        vm.prank(alice);
        auction.bid(100 * 10**18);
        
        vm.warp(block.timestamp + 8 days);
        auction.reveal();
        
        (,,,,,, address winner,) = auction.getCurrentAuction();
        assertEq(winner, alice);
    }

    function test_NoBidsJackpotRollsOver() public {
        // No bids → jackpot rolls to next auction
        vm.warp(block.timestamp + 8 days);
        auction.reveal();
        
        // Check new auction has the rolled-over jackpot
        assertEq(auction.currentAuctionId(), 2);
        (,,, uint256 newJackpot,,,, ) = auction.getCurrentAuction();
        assertEq(newJackpot, INITIAL_JACKPOT);
    }

    // ============ PAYOUT TESTS ============

    function test_WinnerGetsJackpotPlusBid() public {
        uint256 bidAmount = 100 * 10**18;
        
        vm.prank(alice);
        auction.bid(bidAmount);
        
        vm.warp(block.timestamp + 8 days);
        auction.reveal();
        
        uint256 balanceBefore = hashToken.balanceOf(alice);
        
        vm.prank(alice);
        auction.claimWinnings(1);
        
        uint256 balanceAfter = hashToken.balanceOf(alice);
        
        // Winner should get bid back + jackpot
        assertEq(balanceAfter - balanceBefore, bidAmount + INITIAL_JACKPOT);
    }

    function test_LoserGets90PercentRefund() public {
        vm.prank(alice);
        auction.bid(100 * 10**18);
        
        vm.prank(bob);
        auction.bid(90 * 10**18); // Loser
        
        vm.warp(block.timestamp + 8 days);
        auction.reveal();
        
        uint256 balanceBefore = hashToken.balanceOf(bob);
        
        vm.prank(bob);
        auction.claimRefund(1);
        
        uint256 balanceAfter = hashToken.balanceOf(bob);
        
        // Loser should get 90% back
        uint256 expectedRefund = (90 * 10**18 * 90) / 100;
        assertEq(balanceAfter - balanceBefore, expectedRefund);
    }

    function test_InvalidatedBidderGets90PercentRefund() public {
        // Alice gets invalidated but still gets 90% refund
        vm.prank(alice);
        auction.bid(100 * 10**18);
        
        vm.prank(bob);
        auction.bid(65 * 10**18);
        
        vm.prank(charlie);
        auction.bid(60 * 10**18);
        
        vm.warp(block.timestamp + 8 days);
        auction.reveal();
        
        assertTrue(auction.invalidated(1, alice));
        
        uint256 balanceBefore = hashToken.balanceOf(alice);
        
        vm.prank(alice);
        auction.claimRefund(1);
        
        uint256 balanceAfter = hashToken.balanceOf(alice);
        
        uint256 expectedRefund = (100 * 10**18 * 90) / 100;
        assertEq(balanceAfter - balanceBefore, expectedRefund);
    }

    function test_10PercentGoesToNextJackpot() public {
        // Alice wins, Bob loses 100 HASH
        // 10% of Bob's bid (10 HASH) goes to next jackpot
        vm.prank(alice);
        auction.bid(100 * 10**18);
        
        vm.prank(bob);
        auction.bid(90 * 10**18);
        
        vm.warp(block.timestamp + 8 days);
        auction.reveal();
        
        // Next auction should have 10% of loser bids
        (,,, uint256 newJackpot,,,, ) = auction.getCurrentAuction();
        uint256 expectedContribution = (90 * 10**18 * 10) / 100;
        assertEq(newJackpot, expectedContribution);
    }

    // ============ CROSS-FEED TESTS ============

    function test_FeedJackpotFromOwner() public {
        uint256 feedAmount = 1000 * 10**18;
        
        vm.startPrank(owner);
        hashToken.approve(address(auction), feedAmount);
        auction.feedJackpot(feedAmount);
        vm.stopPrank();
        
        assertEq(auction.pendingJackpot(), feedAmount);
    }

    function test_FeedJackpotFromAuthorizedFeeder() public {
        address otherGame = address(100);
        
        // Authorize feeder
        vm.prank(owner);
        auction.setAuthorizedFeeder(otherGame, true);
        
        // Fund the other game
        vm.prank(owner);
        hashToken.transfer(otherGame, 5000 * 10**18);
        
        // Feed jackpot
        uint256 feedAmount = 500 * 10**18;
        vm.startPrank(otherGame);
        hashToken.approve(address(auction), feedAmount);
        auction.feedJackpot(feedAmount);
        vm.stopPrank();
        
        assertEq(auction.pendingJackpot(), feedAmount);
    }

    function test_RevertUnauthorizedFeed() public {
        address unauthorized = address(100);
        
        vm.prank(owner);
        hashToken.transfer(unauthorized, 1000 * 10**18);
        
        vm.startPrank(unauthorized);
        hashToken.approve(address(auction), 500 * 10**18);
        
        vm.expectRevert(AuctionHash.NotAuthorizedFeeder.selector);
        auction.feedJackpot(500 * 10**18);
        vm.stopPrank();
    }

    // ============ SAFE ZONE CALCULATOR TESTS ============

    function test_SafeZoneCalculation() public {
        // Top bid is 100 HASH
        vm.prank(alice);
        auction.bid(100 * 10**18);
        
        // Check safe zone for a new bid
        (bool isValid, uint256 minSafe, uint256 maxSafe) = auction.calculateSafeZone(120 * 10**18);
        
        // 120 vs 100 → gap = 16.67% (valid)
        assertTrue(isValid);
        
        // Max safe = 100 / 0.7 ≈ 142.86 HASH
        assertGt(maxSafe, 140 * 10**18);
        assertLt(maxSafe, 145 * 10**18);
    }

    function test_SafeZoneIndicatesDanger() public {
        vm.prank(alice);
        auction.bid(100 * 10**18);
        
        // Check if 200 HASH would be dangerous
        (bool isValid,,) = auction.calculateSafeZone(200 * 10**18);
        
        // 200 vs 100 → gap = 50% (invalid)
        assertFalse(isValid);
    }

    // ============ PARAMETER ADJUSTMENT TESTS ============

    function test_AdjustMaxGapPercent() public {
        vm.prank(owner);
        auction.setMaxGapPercent(50);
        
        assertEq(auction.maxGapPercent(), 50);
    }

    function test_AdjustRefundPercent() public {
        vm.prank(owner);
        auction.setLosersRefundPercent(95);
        
        assertEq(auction.losersRefundPercent(), 95);
    }

    function test_OnlyOwnerCanAdjustParams() public {
        vm.prank(alice);
        vm.expectRevert();
        auction.setMaxGapPercent(50);
    }

    // ============ TIMING TESTS ============

    function test_CannotBidAfterAuctionEnds() public {
        vm.warp(block.timestamp + 8 days);
        
        vm.prank(alice);
        vm.expectRevert(AuctionHash.AuctionNotActive.selector);
        auction.bid(100 * 10**18);
    }

    function test_CannotRevealBeforeEnd() public {
        vm.prank(alice);
        auction.bid(100 * 10**18);
        
        vm.expectRevert(AuctionHash.AuctionNotEnded.selector);
        auction.reveal();
    }

    function test_CannotRevealTwice() public {
        vm.prank(alice);
        auction.bid(100 * 10**18);
        
        vm.warp(block.timestamp + 8 days);
        auction.reveal();
        
        vm.expectRevert(AuctionHash.AuctionAlreadyRevealed.selector);
        auction.reveal();
    }

    // ============ CLAIM TESTS ============

    function test_CannotClaimTwice() public {
        vm.prank(alice);
        auction.bid(100 * 10**18);
        
        vm.warp(block.timestamp + 8 days);
        auction.reveal();
        
        vm.startPrank(alice);
        auction.claimWinnings(1);
        
        vm.expectRevert(AuctionHash.AlreadyClaimed.selector);
        auction.claimWinnings(1);
        vm.stopPrank();
    }

    function test_LoserCannotClaimWinnings() public {
        vm.prank(alice);
        auction.bid(100 * 10**18);
        
        vm.prank(bob);
        auction.bid(90 * 10**18);
        
        vm.warp(block.timestamp + 8 days);
        auction.reveal();
        
        vm.prank(bob);
        vm.expectRevert(AuctionHash.NotWinner.selector);
        auction.claimWinnings(1);
    }

    function test_WinnerCannotClaimRefund() public {
        vm.prank(alice);
        auction.bid(100 * 10**18);
        
        vm.warp(block.timestamp + 8 days);
        auction.reveal();
        
        vm.prank(alice);
        vm.expectRevert(AuctionHash.NotWinner.selector);
        auction.claimRefund(1);
    }

    // ============ CHAINLINK AUTOMATION TESTS ============

    function test_CheckUpkeepReturnsTrueWhenReady() public {
        vm.prank(alice);
        auction.bid(100 * 10**18);
        
        (bool upkeepNeeded,) = auction.checkUpkeep("");
        assertFalse(upkeepNeeded); // Not yet
        
        vm.warp(block.timestamp + 8 days);
        
        (upkeepNeeded,) = auction.checkUpkeep("");
        assertTrue(upkeepNeeded); // Now it's ready
    }

    function test_PerformUpkeepReveals() public {
        vm.prank(alice);
        auction.bid(100 * 10**18);
        
        vm.warp(block.timestamp + 8 days);
        
        auction.performUpkeep("");
        
        (,,,,,bool revealed,,) = auction.getCurrentAuction();
        // Note: After reveal, a new auction starts, so we check old auction
        (,,,,,bool oldRevealed,,) = auction.auctions(1);
        assertTrue(oldRevealed);
    }

    // ============ EDGE CASE TESTS ============

    function test_ExactlyAt30PercentGapIsValid() public {
        // Alice: 100, Bob: 70 → gap = exactly 30%
        vm.prank(alice);
        auction.bid(100 * 10**18);
        
        vm.prank(bob);
        auction.bid(70 * 10**18);
        
        vm.warp(block.timestamp + 8 days);
        auction.reveal();
        
        (,,,,,, address winner,) = auction.getCurrentAuction();
        assertEq(winner, alice); // Alice should win (30% is the limit, not exceeded)
    }

    function test_ManyBiddersWithComplexCascade() public {
        // Complex scenario with 5 bidders
        // Alice: 1000, Bob: 500, Charlie: 400, Dave: 350, Eve: 340
        // Alice vs Bob: 50% gap (invalid)
        // Bob vs Charlie: 20% gap (valid) → Bob wins
        
        vm.prank(alice);
        auction.bid(1000 * 10**18);
        
        vm.prank(bob);
        auction.bid(500 * 10**18);
        
        vm.prank(charlie);
        auction.bid(400 * 10**18);
        
        vm.prank(dave);
        auction.bid(350 * 10**18);
        
        vm.prank(eve);
        auction.bid(340 * 10**18);
        
        vm.warp(block.timestamp + 8 days);
        auction.reveal();
        
        (,,,,,, address winner,) = auction.getCurrentAuction();
        assertEq(winner, bob);
        
        assertTrue(auction.invalidated(1, alice));
        assertFalse(auction.invalidated(1, bob));
        assertFalse(auction.invalidated(1, charlie));
    }

    // ============ HISTORY TESTS ============

    function test_AuctionHistoryTracking() public {
        // Complete first auction
        vm.prank(alice);
        auction.bid(100 * 10**18);
        
        vm.warp(block.timestamp + 8 days);
        auction.reveal();
        
        // Get history
        (uint256[] memory ids, address[] memory winners, uint256[] memory winningBids, uint256[] memory jackpots) 
            = auction.getAuctionHistory(1, 1);
        
        assertEq(ids.length, 1);
        assertEq(ids[0], 1);
        assertEq(winners[0], alice);
        assertEq(winningBids[0], 100 * 10**18);
        assertEq(jackpots[0], INITIAL_JACKPOT);
    }

    function test_HasPendingClaimReturnsCorrectData() public {
        vm.prank(alice);
        auction.bid(100 * 10**18);
        
        vm.prank(bob);
        auction.bid(90 * 10**18);
        
        vm.warp(block.timestamp + 8 days);
        auction.reveal();
        
        // Check winner's pending claim
        (bool hasClaim, bool isWinner, uint256 amount) = auction.hasPendingClaim(1, alice);
        assertTrue(hasClaim);
        assertTrue(isWinner);
        assertEq(amount, 100 * 10**18 + INITIAL_JACKPOT);
        
        // Check loser's pending claim
        (hasClaim, isWinner, amount) = auction.hasPendingClaim(1, bob);
        assertTrue(hasClaim);
        assertFalse(isWinner);
        assertEq(amount, (90 * 10**18 * 90) / 100);
    }
}
