// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {MockERC721Royalty} from "../src/MockERC721Royalty.sol";
import {ISutrartMarket} from "../src/interfaces/ISutrartMarket.sol";
import {DiamondTestHelper} from "./helpers/DiamondTestHelper.sol";

contract SutrartMarketRoyaltyTest is DiamondTestHelper {
    ISutrartMarket public market;
    MockERC721Royalty public nft;

    address public seller = makeAddr("seller");
    address public buyer = makeAddr("buyer");
    address public royaltyReceiver = makeAddr("royaltyReceiver");
    address public marketplace = makeAddr("marketplace");
    address public treasury = makeAddr("treasury");

    uint256 internal constant TOKEN_ID = 1;
    uint256 internal constant PRICE = 1 ether;

    function setUp() public {
        market = _deploySutrartDiamond(address(this)).market;
        nft = new MockERC721Royalty();

        vm.prank(seller);
        nft.mint(seller);

        vm.deal(seller, 10 ether);
        vm.deal(buyer, 10 ether);
        vm.deal(royaltyReceiver, 1 ether);
        vm.deal(marketplace, 1 ether);
        vm.deal(treasury, 1 ether);
    }

    function test_buyListing_routesRoyaltyToRecipient() public {
        market.updateProtocolFee(0);
        nft.setDefaultRoyalty(royaltyReceiver, 500); // 5%

        uint256 listingId = _createListing();
        uint256 royaltyAmount = (PRICE * 500) / 10_000;

        uint256 sellerBalanceBefore = seller.balance;
        uint256 royaltyBalanceBefore = royaltyReceiver.balance;

        vm.prank(buyer);
        market.buyListing{value: PRICE}(listingId, address(0), 0);

        assertEq(royaltyReceiver.balance, royaltyBalanceBefore + royaltyAmount);
        assertEq(seller.balance, sellerBalanceBefore + PRICE - royaltyAmount);
        assertEq(nft.ownerOf(TOKEN_ID), buyer);
    }

    function test_buyListing_routesAllFeesIncludingRoyalty() public {
        market.updateProtocolFee(500); // 5%
        market.updateProtocolTreasury(treasury);
        nft.setDefaultRoyalty(royaltyReceiver, 1_000); // 10%

        uint256 listingId = _createListing();

        uint256 protocolFee = (PRICE * 500) / 10_000;
        uint256 marketplaceFee = (PRICE * 1_000) / 10_000;
        uint256 royaltyAmount = (PRICE * 1_000) / 10_000;
        uint256 sellerProceeds = PRICE - protocolFee - marketplaceFee - royaltyAmount;

        uint256 sellerBalanceBefore = seller.balance;
        uint256 treasuryBalanceBefore = treasury.balance;
        uint256 marketplaceBalanceBefore = marketplace.balance;
        uint256 royaltyBalanceBefore = royaltyReceiver.balance;

        vm.prank(buyer);
        market.buyListing{value: PRICE}(listingId, marketplace, 1_000);

        assertEq(treasury.balance, treasuryBalanceBefore + protocolFee);
        assertEq(marketplace.balance, marketplaceBalanceBefore + marketplaceFee);
        assertEq(royaltyReceiver.balance, royaltyBalanceBefore + royaltyAmount);
        assertEq(seller.balance, sellerBalanceBefore + sellerProceeds);
    }

    function test_buyListing_zeroRoyalty() public {
        market.updateProtocolFee(0);
        nft.setDefaultRoyalty(royaltyReceiver, 0);

        uint256 listingId = _createListing();
        uint256 sellerBalanceBefore = seller.balance;

        vm.prank(buyer);
        market.buyListing{value: PRICE}(listingId, address(0), 0);

        assertEq(seller.balance, sellerBalanceBefore + PRICE);
    }

    function test_buyListing_zeroRoyaltyRecipient() public {
        market.updateProtocolFee(0);
        nft.setRawDefaultRoyalty(address(0), 500);

        uint256 listingId = _createListing();
        uint256 sellerBalanceBefore = seller.balance;

        vm.prank(buyer);
        market.buyListing{value: PRICE}(listingId, address(0), 0);

        assertEq(seller.balance, sellerBalanceBefore + PRICE);
    }

    function test_buyListing_revertsWhenRoyaltyTooLarge() public {
        market.updateProtocolFee(500); // 5%
        market.updateProtocolTreasury(treasury);
        nft.setDefaultRoyalty(royaltyReceiver, 9_600); // 96%

        uint256 listingId = _createListing();

        vm.expectRevert("Royalty exceeds seller proceeds");
        vm.prank(buyer);
        market.buyListing{value: PRICE}(listingId, marketplace, 1_000);
    }

    function test_previewPayouts_matchesSettlement() public {
        market.updateProtocolFee(500);
        market.updateProtocolTreasury(treasury);
        nft.setDefaultRoyalty(royaltyReceiver, 1_000);

        uint256 listingId = _createListing();
        uint96 marketplaceBps = 1_000;

        ISutrartMarket.PayoutPreview memory preview = market.previewPayouts(listingId, marketplaceBps);

        uint256 sellerBalanceBefore = seller.balance;
        uint256 treasuryBalanceBefore = treasury.balance;
        uint256 marketplaceBalanceBefore = marketplace.balance;
        uint256 royaltyBalanceBefore = royaltyReceiver.balance;

        vm.prank(buyer);
        market.buyListing{value: PRICE}(listingId, marketplace, marketplaceBps);

        assertEq(treasury.balance, treasuryBalanceBefore + preview.protocolFee);
        assertEq(marketplace.balance, marketplaceBalanceBefore + preview.marketplaceFee);
        assertEq(royaltyReceiver.balance, royaltyBalanceBefore + preview.royaltyAmount);
        assertEq(seller.balance, sellerBalanceBefore + preview.sellerProceeds);
        assertEq(preview.grossPrice, PRICE);
        assertEq(preview.royaltyRecipient, royaltyReceiver);
    }

    function test_previewPayouts_revertsWhenMarketplaceFeeTooHigh() public {
        uint256 listingId = _createListing();

        vm.expectRevert("Marketplace fee too high");
        market.previewPayouts(listingId, 2_501);
    }

    function test_previewPayouts_nonRoyaltyCollection() public {
        market.updateProtocolFee(50);

        uint256 listingId = _createListing();
        ISutrartMarket.PayoutPreview memory preview = market.previewPayouts(listingId, 0);

        assertEq(preview.royaltyAmount, 0);
        assertEq(preview.royaltyRecipient, address(0));
        assertEq(preview.protocolFee, (PRICE * 50) / 10_000);
        assertEq(preview.sellerProceeds, PRICE - preview.protocolFee);
    }

    function test_buyListing_staleListingStillFails() public {
        market.updateProtocolFee(0);
        nft.setDefaultRoyalty(royaltyReceiver, 500);

        uint256 listingId = _createListing();

        vm.prank(seller);
        nft.approve(address(0), TOKEN_ID);

        vm.expectRevert("Listing is not valid");
        vm.prank(buyer);
        market.buyListing{value: PRICE}(listingId, address(0), 0);
    }

    function _createListing() internal returns (uint256 listingId) {
        vm.prank(seller);
        nft.approve(address(market), TOKEN_ID);

        vm.prank(seller);
        listingId = market.listNFT(address(nft), TOKEN_ID, PRICE);
    }
}
