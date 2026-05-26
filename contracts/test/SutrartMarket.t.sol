// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {MockERC721} from "../src/MockERC721.sol";
import {SutrartMarket} from "../src/SutrartMarket.sol";

contract SutrartMarketTest is Test {
    SutrartMarket public market;
    MockERC721 public nft;

    address public seller = makeAddr("seller");
    address public buyer = makeAddr("buyer");
    address public attacker = makeAddr("attacker");
    address public marketplace = makeAddr("marketplace");

    uint256 internal constant TOKEN_ID = 1;
    uint256 internal constant PRICE = 1 ether;

    function setUp() public {
        market = new SutrartMarket();
        nft = new MockERC721();

        vm.prank(seller);
        nft.mint(seller);

        vm.deal(seller, 10 ether);
        vm.deal(buyer, 10 ether);
        vm.deal(attacker, 10 ether);
        vm.deal(marketplace, 10 ether);
    }

    function test_listNFT_Success() public {
        vm.prank(seller);
        nft.approve(address(market), TOKEN_ID);

        vm.prank(seller);
        uint256 listingId = market.listNFT(address(nft), TOKEN_ID, PRICE);

        (
            uint256 storedListingId,
            address storedSeller,
            address storedNft,
            uint256 storedTokenId,
            uint256 storedPrice,
            bool active,
            uint256 createdAt
        ) = market.listings(listingId);

        assertEq(storedListingId, listingId);
        assertEq(storedSeller, seller);
        assertEq(storedNft, address(nft));
        assertEq(storedTokenId, TOKEN_ID);
        assertEq(storedPrice, PRICE);
        assertTrue(active);
        assertEq(createdAt, block.timestamp);
        assertTrue(market.isListingValid(listingId));
    }

    function test_listNFT_RevertWhenCallerNotOwner() public {
        vm.prank(seller);
        nft.approve(address(market), TOKEN_ID);

        vm.expectRevert("Seller is not token owner");
        vm.prank(attacker);
        market.listNFT(address(nft), TOKEN_ID, PRICE);
    }

    function test_cancelListing_Success() public {
        uint256 listingId = _createListing();

        vm.prank(seller);
        market.cancelListing(listingId);

        (, , , , , bool active, ) = market.listings(listingId);
        assertFalse(active);
        assertFalse(market.isListingValid(listingId));
    }

    function test_cancelListing_RevertWhenNotSeller() public {
        uint256 listingId = _createListing();

        vm.expectRevert("Only seller can cancel");
        vm.prank(attacker);
        market.cancelListing(listingId);
    }

    function test_buyListing_Success() public {
        market.updateProtocolFee(0);

        uint256 listingId = _createListing();
        uint256 sellerBalanceBefore = seller.balance;

        vm.prank(buyer);
        market.buyListing{value: PRICE}(listingId, address(0), 0);

        (, , , , , bool active, ) = market.listings(listingId);
        assertFalse(active);
        assertEq(nft.ownerOf(TOKEN_ID), buyer);
        assertEq(seller.balance, sellerBalanceBefore + PRICE);
        assertFalse(market.isListingValid(listingId));
    }

    function test_buyListing_RevertOnDoublePurchase() public {
        market.updateProtocolFee(0);

        uint256 listingId = _createListing();

        vm.prank(buyer);
        market.buyListing{value: PRICE}(listingId, address(0), 0);

        vm.expectRevert("Listing is not valid");
        vm.prank(attacker);
        market.buyListing{value: PRICE}(listingId, address(0), 0);
    }

    function test_buyListing_RevertWhenInsufficientPayment() public {
        uint256 listingId = _createListing();

        vm.expectRevert("Incorrect ETH amount");
        vm.prank(buyer);
        market.buyListing{value: PRICE - 1}(listingId, address(0), 0);
    }

    function test_buyListing_RevertWhenSellerBuysOwnListing() public {
        uint256 listingId = _createListing();

        vm.expectRevert("Seller cannot buy own listing");
        vm.prank(seller);
        market.buyListing{value: PRICE}(listingId, address(0), 0);
    }

    function test_isListingValid_RevertWhenApprovalRevoked() public {
        uint256 listingId = _createListing();
        assertTrue(market.isListingValid(listingId));

        vm.prank(seller);
        nft.approve(address(0), TOKEN_ID);

        assertFalse(market.isListingValid(listingId));

        vm.expectRevert("Listing is not valid");
        vm.prank(buyer);
        market.buyListing{value: PRICE}(listingId, address(0), 0);
    }

    function test_isListingValid_RevertWhenOwnershipChanges() public {
        uint256 listingId = _createListing();
        assertTrue(market.isListingValid(listingId));

        vm.prank(seller);
        nft.transferFrom(seller, attacker, TOKEN_ID);

        assertFalse(market.isListingValid(listingId));

        vm.expectRevert("Listing is not valid");
        vm.prank(buyer);
        market.buyListing{value: PRICE}(listingId, address(0), 0);
    }

    function test_buyListing_routesProtocolFeeToTreasury() public {
        uint96 bps = 1_000; // 10%
        market.updateProtocolFee(bps);
        market.updateProtocolTreasury(attacker);

        uint256 listingId = _createListing();
        uint256 sellerBalanceBefore = seller.balance;
        uint256 treasuryBalanceBefore = attacker.balance;

        vm.prank(buyer);
        market.buyListing{value: PRICE}(listingId, address(0), 0);

        uint256 fee = (PRICE * uint256(bps)) / 10_000;
        assertEq(seller.balance, sellerBalanceBefore + PRICE - fee);
        assertEq(attacker.balance, treasuryBalanceBefore + fee);
    }

    function test_updateProtocolFee_revertsWhenBpsTooHigh() public {
        vm.expectRevert("Protocol fee too high");
        market.updateProtocolFee(1_001);
    }

    function test_updateProtocolTreasury_revertsWhenTreasuryIsZero() public {
        vm.expectRevert("Protocol treasury is zero");
        market.updateProtocolTreasury(address(0));
    }

    function test_buyListing_routesMarketplaceFeeToRecipient() public {
        market.updateProtocolFee(0);
        market.updateProtocolTreasury(attacker);

        uint256 listingId = _createListing();
        uint256 sellerBalanceBefore = seller.balance;
        uint256 marketplaceBalanceBefore = marketplace.balance;

        uint96 marketplaceBps = 1_000; // 10%
        uint256 marketplaceFee = (PRICE * uint256(marketplaceBps)) / 10_000;

        vm.prank(buyer);
        market.buyListing{value: PRICE}(listingId, marketplace, marketplaceBps);

        assertEq(seller.balance, sellerBalanceBefore + PRICE - marketplaceFee);
        assertEq(marketplace.balance, marketplaceBalanceBefore + marketplaceFee);
    }

    function test_buyListing_routesProtocolAndMarketplaceFees() public {
        uint96 protocolBps = 500; // 5%
        uint96 marketplaceBps = 2_000; // 20%

        market.updateProtocolFee(protocolBps);
        market.updateProtocolTreasury(attacker);

        uint256 listingId = _createListing();
        uint256 sellerBalanceBefore = seller.balance;
        uint256 treasuryBalanceBefore = attacker.balance;
        uint256 marketplaceBalanceBefore = marketplace.balance;

        uint256 protocolFee = (PRICE * uint256(protocolBps)) / 10_000;
        uint256 marketplaceFee = (PRICE * uint256(marketplaceBps)) / 10_000;
        uint256 sellerProceeds = PRICE - protocolFee - marketplaceFee;

        vm.prank(buyer);
        market.buyListing{value: PRICE}(listingId, marketplace, marketplaceBps);

        assertEq(seller.balance, sellerBalanceBefore + sellerProceeds);
        assertEq(attacker.balance, treasuryBalanceBefore + protocolFee);
        assertEq(marketplace.balance, marketplaceBalanceBefore + marketplaceFee);
    }

    function test_buyListing_revertsWhenMarketplaceFeeAboveCap() public {
        uint256 listingId = _createListing();

        vm.expectRevert("Marketplace fee too high");
        vm.prank(buyer);
        market.buyListing{value: PRICE}(listingId, marketplace, 2_501);
    }

    function test_buyListing_allowsZeroMarketplaceFee() public {
        market.updateProtocolFee(0);

        uint256 listingId = _createListing();

        vm.prank(buyer);
        market.buyListing{value: PRICE}(listingId, address(0), 0);

        assertEq(nft.ownerOf(TOKEN_ID), buyer);
    }

    function test_buyListing_revertsWhenMarketplaceFeeRecipientIsZero() public {
        uint256 listingId = _createListing();

        vm.expectRevert("Marketplace fee recipient is zero");
        vm.prank(buyer);
        market.buyListing{value: PRICE}(listingId, address(0), 1);
    }

    function test_updateProtocolFee_ownerOnly() public {
        vm.prank(attacker);
        vm.expectRevert();
        market.updateProtocolFee(0);
    }

    function test_updateProtocolTreasury_ownerOnly() public {
        vm.prank(attacker);
        vm.expectRevert();
        market.updateProtocolTreasury(attacker);
    }

    function _createListing() internal returns (uint256 listingId) {
        vm.prank(seller);
        nft.approve(address(market), TOKEN_ID);

        vm.prank(seller);
        listingId = market.listNFT(address(nft), TOKEN_ID, PRICE);
    }
}
