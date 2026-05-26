// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IDiamondCut} from "../src/diamond/interfaces/IDiamondCut.sol";
import {IDiamondLoupe} from "../src/diamond/interfaces/IDiamondLoupe.sol";
import {ViewFacet} from "../src/facets/ViewFacet.sol";
import {ISutrartMarket} from "../src/interfaces/ISutrartMarket.sol";
import {MockERC721} from "../src/MockERC721.sol";
import {DiamondTestHelper} from "./helpers/DiamondTestHelper.sol";

contract SutrartDiamondTest is DiamondTestHelper {
    SutrartDiamondDeployment internal deployment;
    ISutrartMarket public market;
    IDiamondLoupe public loupe;
    MockERC721 public nft;

    address public seller = makeAddr("seller");
    address public buyer = makeAddr("buyer");
    address public treasury = makeAddr("treasury");

    uint256 internal constant TOKEN_ID = 1;
    uint256 internal constant PRICE = 1 ether;

    function setUp() public {
        deployment = _deploySutrartDiamond(address(this));
        market = deployment.market;
        loupe = deployment.loupe;
        nft = new MockERC721();

        vm.prank(seller);
        nft.mint(seller);

        vm.deal(seller, 10 ether);
        vm.deal(buyer, 10 ether);
        vm.deal(treasury, 10 ether);
    }

    function test_diamondDeploysProtocolSelectors() public view {
        assertEq(loupe.facetAddress(ISutrartMarket.listNFT.selector), deployment.listingFacet);
        assertEq(loupe.facetAddress(ISutrartMarket.buyListing.selector), deployment.settlementFacet);
        assertEq(loupe.facetAddress(ISutrartMarket.updateProtocolFee.selector), deployment.protocolConfigFacet);
        assertEq(loupe.facetAddress(ISutrartMarket.listings.selector), deployment.viewFacet);
        assertEq(market.nextListingId(), 1);
        assertEq(market.protocolFeeBps(), 50);
        assertEq(market.protocolTreasury(), address(this));
        assertEq(market.owner(), address(this));
    }

    function test_storagePersistsAcrossFacets() public {
        vm.prank(seller);
        nft.approve(address(market), TOKEN_ID);

        vm.prank(seller);
        uint256 listingId = market.listNFT(address(nft), TOKEN_ID, PRICE);

        market.updateProtocolFee(500);
        market.updateProtocolTreasury(treasury);

        ISutrartMarket.PayoutPreview memory preview = market.previewPayouts(listingId, 0);

        assertEq(preview.protocolFee, (PRICE * 500) / 10_000);
        assertEq(preview.sellerProceeds, PRICE - preview.protocolFee);
        assertEq(market.protocolTreasury(), treasury);
        assertTrue(market.isListingValid(listingId));
    }

    function test_diamondCutCanReplaceViewSelectorWithoutLosingStorage() public {
        vm.prank(seller);
        nft.approve(address(market), TOKEN_ID);

        vm.prank(seller);
        uint256 listingId = market.listNFT(address(nft), TOKEN_ID, PRICE);

        ViewFacet replacement = new ViewFacet();
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = ISutrartMarket.listings.selector;

        IDiamondCut.FacetCut[] memory cut = new IDiamondCut.FacetCut[](1);
        cut[0] = IDiamondCut.FacetCut({
            facetAddress: address(replacement), action: IDiamondCut.FacetCutAction.Replace, functionSelectors: selectors
        });

        IDiamondCut(address(deployment.diamond)).diamondCut(cut, address(0), "");

        (uint256 storedListingId, address storedSeller,,,,,) = market.listings(listingId);
        assertEq(storedListingId, listingId);
        assertEq(storedSeller, seller);
        assertEq(loupe.facetAddress(ISutrartMarket.listings.selector), address(replacement));
    }
}
