// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {ERC721} from "openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import {SutrartMarket} from "../src/SutrartMarket.sol";

contract MockERC721 is ERC721 {
    constructor() ERC721("Sutrart Test NFT", "STN") {}

    function mint(address to, uint256 tokenId) external {
        _mint(to, tokenId);
    }
}

contract SutrartMarketTest is Test {
    SutrartMarket public market;
    MockERC721 public nft;

    address public seller = makeAddr("seller");
    address public buyer = makeAddr("buyer");
    address public attacker = makeAddr("attacker");

    uint256 internal constant TOKEN_ID = 1;
    uint256 internal constant PRICE = 1 ether;

    function setUp() public {
        market = new SutrartMarket();
        nft = new MockERC721();

        nft.mint(seller, TOKEN_ID);
        vm.deal(seller, 10 ether);
        vm.deal(buyer, 10 ether);
        vm.deal(attacker, 10 ether);
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
    }

    function test_cancelListing_RevertWhenNotSeller() public {
        uint256 listingId = _createListing();

        vm.expectRevert("Only seller can cancel");
        vm.prank(attacker);
        market.cancelListing(listingId);
    }

    function test_buyListing_Success() public {
        uint256 listingId = _createListing();
        uint256 sellerBalanceBefore = seller.balance;

        vm.prank(buyer);
        market.buyListing{value: PRICE}(listingId);

        (, , , , , bool active, ) = market.listings(listingId);
        assertFalse(active);
        assertEq(nft.ownerOf(TOKEN_ID), buyer);
        assertEq(seller.balance, sellerBalanceBefore + PRICE);
    }

    function test_buyListing_RevertOnDoublePurchase() public {
        uint256 listingId = _createListing();

        vm.prank(buyer);
        market.buyListing{value: PRICE}(listingId);

        vm.expectRevert("Listing is not active");
        vm.prank(attacker);
        market.buyListing{value: PRICE}(listingId);
    }

    function test_buyListing_RevertWhenInsufficientPayment() public {
        uint256 listingId = _createListing();

        vm.expectRevert("Incorrect ETH amount");
        vm.prank(buyer);
        market.buyListing{value: PRICE - 1}(listingId);
    }

    function test_buyListing_RevertWhenSellerBuysOwnListing() public {
        uint256 listingId = _createListing();

        vm.expectRevert("Seller cannot buy own listing");
        vm.prank(seller);
        market.buyListing{value: PRICE}(listingId);
    }

    function _createListing() internal returns (uint256 listingId) {
        vm.prank(seller);
        nft.approve(address(market), TOKEN_ID);

        vm.prank(seller);
        listingId = market.listNFT(address(nft), TOKEN_ID, PRICE);
    }
}
