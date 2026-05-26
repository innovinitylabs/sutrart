// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {ERC721RT} from "../src/tokens/ERC721RT.sol";
import {IERC721RTFactory} from "../src/interfaces/IERC721RTFactory.sol";
import {ISutrartMarket} from "../src/interfaces/ISutrartMarket.sol";
import {DiamondTestHelper} from "./helpers/DiamondTestHelper.sol";

contract CreatorInventoryTest is DiamondTestHelper {
    IERC721RTFactory public factory;
    ISutrartMarket public market;

    address public creator = makeAddr("creator");
    address public buyer = makeAddr("buyer");
    address public royaltyReceiver = makeAddr("royaltyReceiver");

    string internal constant BASE_URI = "https://example.com/metadata/";
    string internal constant CONTRACT_URI = "https://example.com/collection.json";
    uint256 internal constant LISTING_PRICE = 1 ether;

    function setUp() public {
        SutrartDiamondDeployment memory deployment = _deploySutrartDiamond(address(this));
        factory = IERC721RTFactory(address(deployment.diamond));
        market = deployment.market;

        market.updateProtocolFee(0);
    }

    function test_inventoryDiscoversCreatorCollectionsAndOwnedTokens() public {
        address collectionA = _deployCollection("Alpha", "ALP");
        address collectionB = _deployCollection("Beta", "BTA");

        _mint(collectionA, 2);
        _mint(collectionB, 1);

        address[] memory collections = factory.getCreatorCollections(creator);
        assertEq(collections.length, 2);
        assertEq(collections[0], collectionA);
        assertEq(collections[1], collectionB);
        assertEq(ERC721RT(collectionA).balanceOf(creator), 2);
        assertEq(ERC721RT(collectionB).balanceOf(creator), 1);
    }

    function test_listingStateDetectionForActiveListing() public {
        address collection = _deployCollection("Listed", "LST");
        uint256 tokenId = _mint(collection, 1);

        _approveAndList(collection, tokenId, LISTING_PRICE);

        uint256 listingId = 1;
        (
            ,
            address seller,
            address nftContract,
            uint256 listedTokenId,
            uint256 price,
            bool active,
        ) = market.listings(listingId);

        assertEq(seller, creator);
        assertEq(nftContract, collection);
        assertEq(listedTokenId, tokenId);
        assertEq(price, LISTING_PRICE);
        assertTrue(active);
        assertTrue(market.isListingValid(listingId));
    }

    function test_cancelListingRemovesValidListingState() public {
        address collection = _deployCollection("Cancel", "CNCL");
        uint256 tokenId = _mint(collection, 1);

        _approveAndList(collection, tokenId, LISTING_PRICE);

        vm.prank(creator);
        market.cancelListing(1);

        (, , , , , bool active, ) = market.listings(1);
        assertFalse(active);
        assertFalse(market.isListingValid(1));
    }

    function test_multiCollectionCreatorListingIsolation() public {
        address collectionA = _deployCollection("One", "ONE");
        address collectionB = _deployCollection("Two", "TWO");

        uint256 tokenA = _mint(collectionA, 1);
        uint256 tokenB = _mint(collectionB, 1);

        _approveAndList(collectionA, tokenA, LISTING_PRICE);

        assertTrue(market.isListingValid(1));

        (, , address listedContract, uint256 listedTokenId, , , ) = market.listings(1);
        assertEq(listedContract, collectionA);
        assertEq(listedTokenId, tokenA);

        vm.prank(creator);
        ERC721RT(collectionB).approve(address(market), tokenB);
        vm.prank(creator);
        market.listNFT(collectionB, tokenB, LISTING_PRICE);

        assertTrue(market.isListingValid(2));
        assertEq(market.nextListingId(), 3);
    }

    function test_ownershipChangeMakesListingStale() public {
        address collection = _deployCollection("Stale", "STL");
        uint256 tokenId = _mint(collection, 1);

        _approveAndList(collection, tokenId, LISTING_PRICE);
        assertTrue(market.isListingValid(1));

        vm.prank(creator);
        ERC721RT(collection).transferFrom(creator, buyer, tokenId);

        assertFalse(market.isListingValid(1));
    }

    function test_creatorListingLifecycleFromInventoryFlow() public {
        address collection = _deployCollection("Flow", "FLOW");
        uint256 tokenId = _mint(collection, 1);

        vm.prank(creator);
        ERC721RT(collection).approve(address(market), tokenId);
        assertFalse(market.isListingValid(1));

        vm.prank(creator);
        uint256 listingId = market.listNFT(collection, tokenId, LISTING_PRICE);
        assertEq(listingId, 1);
        assertTrue(market.isListingValid(listingId));

        vm.prank(creator);
        market.cancelListing(listingId);
        assertFalse(market.isListingValid(listingId));
    }

    function _deployCollection(string memory name, string memory symbol) internal returns (address collection) {
        vm.prank(creator);
        collection = factory.createCollection(
            name, symbol, BASE_URI, CONTRACT_URI, royaltyReceiver, 500
        );
    }

    function _mint(address collection, uint256 count) internal returns (uint256 lastTokenId) {
        vm.startPrank(creator);
        for (uint256 i; i < count; i++) {
            lastTokenId = ERC721RT(collection).mint(creator);
        }
        vm.stopPrank();
    }

    function _approveAndList(address collection, uint256 tokenId, uint256 price) internal {
        vm.prank(creator);
        ERC721RT(collection).approve(address(market), tokenId);

        vm.prank(creator);
        market.listNFT(collection, tokenId, price);
    }
}
