// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {MockERC721} from "../src/MockERC721.sol";
import {MockERC721Royalty} from "../src/MockERC721Royalty.sol";
import {IPariMarket} from "../src/interfaces/IPariMarket.sol";
import {DiamondTestHelper} from "./helpers/DiamondTestHelper.sol";

contract SignedListingTest is DiamondTestHelper {
    IPariMarket public market;
    MockERC721 public nft;

    uint256 internal sellerKey = 0xA11CE;
    address internal seller;
    address internal buyer = makeAddr("buyer");
    address internal marketplace = makeAddr("marketplace");

    uint256 internal constant TOKEN_ID = 1;
    uint256 internal constant PRICE = 1 ether;
    uint256 internal constant NONCE = 0;

    function setUp() public {
        seller = vm.addr(sellerKey);
        market = _deployPariDiamond(address(this)).market;
        nft = new MockERC721();

        vm.prank(seller);
        nft.mint(seller);

        vm.deal(seller, 10 ether);
        vm.deal(buyer, 10 ether);
        vm.deal(marketplace, 10 ether);
    }

    function test_domainSeparator_UsesDiamondAddress() public view {
        bytes32 separator = market.domainSeparator();
        bytes32 expected = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("PARI")),
                keccak256(bytes("1")),
                block.chainid,
                address(market)
            )
        );
        assertEq(separator, expected);
    }

    function test_buySignedListing_Success() public {
        market.updateProtocolFee(0);

        IPariMarket.SignedListing memory listing = _buildListing(block.timestamp + 1 days);
        bytes memory signature = _signListing(listing);

        uint256 sellerBalanceBefore = seller.balance;

        vm.prank(buyer);
        market.buySignedListing{value: PRICE}(listing, signature, address(0), 0);

        assertEq(nft.ownerOf(TOKEN_ID), buyer);
        assertEq(seller.balance, sellerBalanceBefore + PRICE);
        assertTrue(market.filledSignedListings(market.hashSignedListing(listing)));
        assertFalse(market.isSignedListingValid(listing));
    }

    function test_buySignedListing_RevertWhenInvalidSignature() public {
        IPariMarket.SignedListing memory listing = _buildListing(block.timestamp + 1 days);
        bytes memory signature = _signListing(listing);

        listing.price = 2 ether;

        vm.expectRevert("Invalid signature");
        vm.prank(buyer);
        market.buySignedListing{value: 2 ether}(listing, signature, address(0), 0);
    }

    function test_buySignedListing_RevertWhenExpired() public {
        IPariMarket.SignedListing memory listing = _buildListing(block.timestamp + 1 hours);
        bytes memory signature = _signListing(listing);

        vm.warp(block.timestamp + 2 hours);

        vm.expectRevert("Signed listing is not valid");
        vm.prank(buyer);
        market.buySignedListing{value: PRICE}(listing, signature, address(0), 0);
    }

    function test_buySignedListing_RevertWhenNonceInvalidated() public {
        IPariMarket.SignedListing memory listing = _buildListing(block.timestamp + 1 days);
        bytes memory signature = _signListing(listing);

        vm.prank(seller);
        market.incrementSignedListingNonce();

        vm.expectRevert("Signed listing is not valid");
        vm.prank(buyer);
        market.buySignedListing{value: PRICE}(listing, signature, address(0), 0);
    }

    function test_buySignedListing_RevertWhenAlreadyFilled() public {
        market.updateProtocolFee(0);

        IPariMarket.SignedListing memory listing = _buildListing(block.timestamp + 1 days);
        bytes memory signature = _signListing(listing);

        vm.prank(buyer);
        market.buySignedListing{value: PRICE}(listing, signature, address(0), 0);

        vm.deal(buyer, 10 ether);
        address secondBuyer = makeAddr("secondBuyer");
        vm.deal(secondBuyer, 10 ether);

        vm.expectRevert("Signed listing is not valid");
        vm.prank(secondBuyer);
        market.buySignedListing{value: PRICE}(listing, signature, address(0), 0);
    }

    function test_buySignedListing_RevertWhenSellerBuysOwnListing() public {
        IPariMarket.SignedListing memory listing = _buildListing(block.timestamp + 1 days);
        bytes memory signature = _signListing(listing);

        vm.expectRevert("Seller cannot buy own listing");
        vm.prank(seller);
        market.buySignedListing{value: PRICE}(listing, signature, address(0), 0);
    }

    function test_buySignedListing_RevertWhenNotApproved() public {
        IPariMarket.SignedListing memory listing = _buildListing(block.timestamp + 1 days);
        bytes memory signature = _signListing(listing);

        vm.prank(seller);
        nft.approve(address(0), TOKEN_ID);

        vm.expectRevert("Signed listing is not valid");
        vm.prank(buyer);
        market.buySignedListing{value: PRICE}(listing, signature, address(0), 0);
    }

    function test_previewSignedPayouts_MatchesOnchainPreview() public {
        market.updateProtocolFee(0);

        uint256 listingId = _createOnchainListing();
        IPariMarket.SignedListing memory listing = _buildListing(block.timestamp + 1 days);

        IPariMarket.PayoutPreview memory onchainPreview = market.previewPayouts(listingId, 250);
        IPariMarket.PayoutPreview memory signedPreview = market.previewSignedPayouts(listing, 250);

        assertEq(signedPreview.grossPrice, onchainPreview.grossPrice);
        assertEq(signedPreview.protocolFee, onchainPreview.protocolFee);
        assertEq(signedPreview.marketplaceFee, onchainPreview.marketplaceFee);
        assertEq(signedPreview.royaltyAmount, onchainPreview.royaltyAmount);
        assertEq(signedPreview.royaltyRecipient, onchainPreview.royaltyRecipient);
        assertEq(signedPreview.sellerProceeds, onchainPreview.sellerProceeds);
    }

    function test_buySignedListing_WithRoyaltiesAndFees() public {
        address treasury = makeAddr("treasury");
        MockERC721Royalty royaltyNft = new MockERC721Royalty();
        address royaltyRecipient = makeAddr("royaltyRecipient");

        vm.prank(seller);
        uint256 royaltyTokenId = royaltyNft.mint(seller);
        royaltyNft.setDefaultRoyalty(royaltyRecipient, 500);

        vm.prank(seller);
        royaltyNft.approve(address(market), royaltyTokenId);

        market.updateProtocolFee(50);
        market.updateProtocolTreasury(treasury);

        IPariMarket.SignedListing memory listing = IPariMarket.SignedListing({
            seller: seller,
            nftContract: address(royaltyNft),
            tokenId: royaltyTokenId,
            price: PRICE,
            expiry: block.timestamp + 1 days,
            nonce: NONCE
        });
        bytes memory signature = _signListing(listing);

        uint256 protocolFee = (PRICE * 50) / 10_000;
        uint256 marketplaceFee = (PRICE * 100) / 10_000;
        uint256 royaltyAmount = (PRICE * 500) / 10_000;
        uint256 sellerProceeds = PRICE - protocolFee - marketplaceFee - royaltyAmount;
        uint256 sellerBalanceBefore = seller.balance;
        uint256 marketplaceBalanceBefore = marketplace.balance;
        uint256 royaltyBalanceBefore = royaltyRecipient.balance;

        vm.prank(buyer);
        market.buySignedListing{value: PRICE}(listing, signature, marketplace, 100);

        assertEq(royaltyNft.ownerOf(royaltyTokenId), buyer);
        assertEq(treasury.balance, protocolFee);
        assertEq(marketplace.balance, marketplaceBalanceBefore + marketplaceFee);
        assertEq(royaltyRecipient.balance, royaltyBalanceBefore + royaltyAmount);
        assertEq(seller.balance, sellerBalanceBefore + sellerProceeds);
    }

    function test_onchainAndSignedListings_Coexist() public {
        market.updateProtocolFee(0);

        uint256 onchainListingId = _createOnchainListing();

        IPariMarket.SignedListing memory signedListing = IPariMarket.SignedListing({
            seller: seller,
            nftContract: address(nft),
            tokenId: TOKEN_ID + 1,
            price: PRICE,
            expiry: block.timestamp + 1 days,
            nonce: NONCE
        });

        vm.prank(seller);
        nft.mint(seller);

        vm.prank(seller);
        nft.approve(address(market), TOKEN_ID + 1);

        bytes memory signature = _signListing(signedListing);

        assertTrue(market.isListingValid(onchainListingId));

        vm.prank(buyer);
        market.buySignedListing{value: PRICE}(signedListing, signature, address(0), 0);

        assertEq(nft.ownerOf(TOKEN_ID + 1), buyer);
        assertTrue(market.isListingValid(onchainListingId));
    }

    function _buildListing(uint256 expiry) internal view returns (IPariMarket.SignedListing memory) {
        return IPariMarket.SignedListing({
            seller: seller,
            nftContract: address(nft),
            tokenId: TOKEN_ID,
            price: PRICE,
            expiry: expiry,
            nonce: NONCE
        });
    }

    function _signListing(IPariMarket.SignedListing memory listing) internal returns (bytes memory) {
        vm.prank(seller);
        nft.approve(address(market), listing.tokenId);

        bytes32 structHash = market.hashSignedListing(listing);
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", market.domainSeparator(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(sellerKey, digest);
        return abi.encodePacked(r, s, v);
    }

    function _createOnchainListing() internal returns (uint256 listingId) {
        vm.prank(seller);
        nft.approve(address(market), TOKEN_ID);

        vm.prank(seller);
        listingId = market.listNFT(address(nft), TOKEN_ID, PRICE);
    }
}
