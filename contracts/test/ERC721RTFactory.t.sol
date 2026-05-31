// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IDiamondLoupe} from "../src/diamond/interfaces/IDiamondLoupe.sol";
import {ERC721RT} from "../src/tokens/ERC721RT.sol";
import {IERC721RTFactory} from "../src/interfaces/IERC721RTFactory.sol";
import {IPariMarket} from "../src/interfaces/IPariMarket.sol";
import {DiamondTestHelper} from "./helpers/DiamondTestHelper.sol";

contract ERC721RTFactoryTest is DiamondTestHelper {
    IERC721RTFactory public factory;
    IPariMarket public market;
    IDiamondLoupe public loupe;

    address public creator = makeAddr("creator");
    address public otherCreator = makeAddr("otherCreator");
    address public royaltyReceiver = makeAddr("royaltyReceiver");

    string internal constant NAME = "Creator Collection";
    string internal constant SYMBOL = "CC";
    string internal constant BASE_URI = "https://example.com/metadata/";
    string internal constant CONTRACT_URI = "https://example.com/collection.json";

    function setUp() public {
        PariDiamondDeployment memory deployment = _deployPariDiamond(address(this));
        factory = IERC721RTFactory(address(deployment.diamond));
        market = deployment.market;
        loupe = deployment.loupe;
    }

    function test_factoryFacetIsRegistered() public view {
        assertEq(loupe.facetAddress(IERC721RTFactory.createCollection.selector), _expectedFactoryFacetAddress());
    }

    function test_createCollection_assignsCreatorOwnership() public {
        vm.prank(creator);
        address collection = factory.createCollection(NAME, SYMBOL, BASE_URI, CONTRACT_URI, royaltyReceiver, 500);

        assertEq(ERC721RT(collection).owner(), creator);
        assertEq(ERC721RT(collection).name(), NAME);
        assertEq(ERC721RT(collection).symbol(), SYMBOL);
        assertEq(ERC721RT(collection).contractURI(), CONTRACT_URI);
    }

    function test_createCollection_registersCreatorMappings() public {
        vm.prank(creator);
        address first = factory.createCollection(NAME, SYMBOL, BASE_URI, CONTRACT_URI, royaltyReceiver, 500);

        vm.prank(creator);
        address second = factory.createCollection("Second", "SCND", BASE_URI, CONTRACT_URI, royaltyReceiver, 250);

        address[] memory collections = factory.getCreatorCollections(creator);
        assertEq(collections.length, 2);
        assertEq(collections[0], first);
        assertEq(collections[1], second);
        assertEq(factory.getCollectionCreator(first), creator);
        assertEq(factory.getCollectionCreator(second), creator);
    }

    function test_createCollection_isDeterministicWithCreate2() public {
        bytes32 salt = keccak256(abi.encode(creator, NAME, SYMBOL, uint256(0)));
        bytes memory initCode = abi.encodePacked(
            type(ERC721RT).creationCode,
            abi.encode(NAME, SYMBOL, creator, BASE_URI, CONTRACT_URI, royaltyReceiver, uint96(500))
        );
        address predicted = vm.computeCreate2Address(salt, keccak256(initCode), address(factory));

        vm.prank(creator);
        address collection = factory.createCollection(NAME, SYMBOL, BASE_URI, CONTRACT_URI, royaltyReceiver, 500);

        assertEq(collection, predicted);
    }

    function test_createCollection_emitsCollectionCreated() public {
        bytes32 salt = keccak256(abi.encode(creator, NAME, SYMBOL, uint256(0)));
        bytes memory initCode = abi.encodePacked(
            type(ERC721RT).creationCode,
            abi.encode(NAME, SYMBOL, creator, BASE_URI, CONTRACT_URI, royaltyReceiver, uint96(500))
        );
        address predicted = vm.computeCreate2Address(salt, keccak256(initCode), address(factory));

        vm.expectEmit(true, true, false, true);
        emit IERC721RTFactory.CollectionCreated(creator, predicted, NAME, SYMBOL, royaltyReceiver, 500);

        vm.prank(creator);
        factory.createCollection(NAME, SYMBOL, BASE_URI, CONTRACT_URI, royaltyReceiver, 500);
    }

    function test_createCollection_revertsWhenRoyaltyTooHigh() public {
        vm.expectRevert("Royalty BPS too high");
        vm.prank(creator);
        factory.createCollection(NAME, SYMBOL, BASE_URI, CONTRACT_URI, royaltyReceiver, 10_001);
    }

    function test_creatorCanMintFromDeployedCollection() public {
        vm.prank(creator);
        address collectionAddress = factory.createCollection(NAME, SYMBOL, BASE_URI, CONTRACT_URI, royaltyReceiver, 500);

        ERC721RT collection = ERC721RT(collectionAddress);

        vm.prank(creator);
        uint256 tokenId = collection.mint(creator);

        assertEq(collection.ownerOf(tokenId), creator);
        assertEq(collection.tokenURI(tokenId), string(abi.encodePacked(BASE_URI, "1")));

        (address receiver, uint256 amount) = collection.royaltyInfo(tokenId, 1 ether);
        assertEq(receiver, royaltyReceiver);
        assertEq(amount, 0.05 ether);
    }

    function test_registryIsIsolatedPerCreator() public {
        vm.prank(creator);
        address creatorCollection = factory.createCollection(NAME, SYMBOL, BASE_URI, CONTRACT_URI, royaltyReceiver, 500);

        vm.prank(otherCreator);
        address otherCollection = factory.createCollection("Other", "OTH", BASE_URI, CONTRACT_URI, royaltyReceiver, 250);

        assertEq(factory.getCreatorCollections(creator).length, 1);
        assertEq(factory.getCreatorCollections(otherCreator).length, 1);
        assertEq(factory.getCollectionCreator(creatorCollection), creator);
        assertEq(factory.getCollectionCreator(otherCollection), otherCreator);
    }

    function test_registryPersistsWithMarketplaceStorage() public {
        vm.prank(creator);
        address collection = factory.createCollection(NAME, SYMBOL, BASE_URI, CONTRACT_URI, royaltyReceiver, 500);

        assertEq(market.nextListingId(), 1);
        assertEq(market.protocolFeeBps(), 50);
        assertEq(factory.getCollectionCreator(collection), creator);
    }

    function _expectedFactoryFacetAddress() internal view returns (address) {
        return loupe.facetAddress(IERC721RTFactory.getCreatorCollections.selector);
    }
}
