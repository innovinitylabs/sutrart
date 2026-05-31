// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {IERC2981} from "openzeppelin-contracts/contracts/interfaces/IERC2981.sol";
import {IERC165} from "openzeppelin-contracts/contracts/utils/introspection/IERC165.sol";
import {ERC721RT} from "../src/tokens/ERC721RT.sol";

contract ERC721RTTest is Test {
    ERC721RT public collection;

    address public creator = makeAddr("creator");
    address public collector = makeAddr("collector");
    address public royaltyReceiver = makeAddr("royaltyReceiver");
    address public attacker = makeAddr("attacker");

    string internal constant NAME = "PARI Collection";
    string internal constant SYMBOL = "SRT";
    string internal constant BASE_URI = "https://example.com/metadata/";
    string internal constant CONTRACT_URI = "https://example.com/collection.json";
    uint96 internal constant ROYALTY_BPS = 500;

    function setUp() public {
        collection = new ERC721RT(NAME, SYMBOL, creator, BASE_URI, CONTRACT_URI, royaltyReceiver, ROYALTY_BPS);
    }

    function test_constructor_assignsOwnerAndMetadata() public view {
        assertEq(collection.owner(), creator);
        assertEq(collection.name(), NAME);
        assertEq(collection.symbol(), SYMBOL);
        assertEq(collection.contractURI(), CONTRACT_URI);
        assertEq(collection.nextTokenId(), 1);
    }

    function test_mint_assignsTokenToRecipient() public {
        vm.prank(creator);
        uint256 tokenId = collection.mint(collector);

        assertEq(tokenId, 1);
        assertEq(collection.ownerOf(tokenId), collector);
        assertEq(collection.nextTokenId(), 2);
    }

    function test_tokenURI_returnsBaseUriPlusTokenId() public {
        vm.prank(creator);
        uint256 tokenId = collection.mint(collector);

        assertEq(collection.tokenURI(tokenId), string(abi.encodePacked(BASE_URI, "1")));
    }

    function test_setBaseURI_updatesTokenURI() public {
        vm.prank(creator);
        uint256 tokenId = collection.mint(collector);

        vm.prank(creator);
        collection.setBaseURI("https://new.example.com/");

        assertEq(collection.tokenURI(tokenId), "https://new.example.com/1");
    }

    function test_setContractURI_updatesCollectionMetadata() public {
        vm.prank(creator);
        collection.setContractURI("https://new.example.com/collection.json");

        assertEq(collection.contractURI(), "https://new.example.com/collection.json");
    }

    function test_setDefaultRoyalty_updatesRoyaltyInfo() public {
        address newReceiver = makeAddr("newReceiver");

        vm.prank(creator);
        collection.setDefaultRoyalty(newReceiver, 1_000);

        (address receiver, uint256 amount) = collection.royaltyInfo(1, 1 ether);
        assertEq(receiver, newReceiver);
        assertEq(amount, 0.1 ether);
    }

    function test_supportsERC721AndERC2981() public view {
        assertTrue(collection.supportsInterface(type(IERC165).interfaceId));
        assertTrue(collection.supportsInterface(type(IERC2981).interfaceId));
    }

    function test_mint_revertsWhenNotOwner() public {
        vm.expectRevert();
        vm.prank(attacker);
        collection.mint(collector);
    }

    function test_setBaseURI_revertsWhenNotOwner() public {
        vm.expectRevert();
        vm.prank(attacker);
        collection.setBaseURI("https://evil.example.com/");
    }

    function test_setContractURI_revertsWhenNotOwner() public {
        vm.expectRevert();
        vm.prank(attacker);
        collection.setContractURI("https://evil.example.com/collection.json");
    }

    function test_setDefaultRoyalty_revertsWhenNotOwner() public {
        vm.expectRevert();
        vm.prank(attacker);
        collection.setDefaultRoyalty(attacker, 100);
    }
}
