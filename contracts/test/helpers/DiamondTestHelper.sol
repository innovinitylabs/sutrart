// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {IDiamondCut} from "../../src/diamond/interfaces/IDiamondCut.sol";
import {IDiamondLoupe} from "../../src/diamond/interfaces/IDiamondLoupe.sol";
import {Diamond} from "../../src/diamond/Diamond.sol";
import {DiamondCutFacet} from "../../src/diamond/facets/DiamondCutFacet.sol";
import {DiamondLoupeFacet} from "../../src/diamond/facets/DiamondLoupeFacet.sol";
import {OwnershipFacet} from "../../src/diamond/facets/OwnershipFacet.sol";
import {ListingFacet} from "../../src/facets/ListingFacet.sol";
import {ProtocolConfigFacet} from "../../src/facets/ProtocolConfigFacet.sol";
import {SettlementFacet} from "../../src/facets/SettlementFacet.sol";
import {SignedListingFacet} from "../../src/facets/SignedListingFacet.sol";
import {ERC721RTFactoryFacet} from "../../src/facets/ERC721RTFactoryFacet.sol";
import {ViewFacet} from "../../src/facets/ViewFacet.sol";
import {IERC721RTFactory} from "../../src/interfaces/IERC721RTFactory.sol";
import {IPariMarket} from "../../src/interfaces/IPariMarket.sol";
import {PariInit} from "../../src/PariInit.sol";

abstract contract DiamondTestHelper is Test {
    struct PariDiamondDeployment {
        Diamond diamond;
        IPariMarket market;
        IDiamondLoupe loupe;
        address diamondCutFacet;
        address diamondLoupeFacet;
        address ownershipFacet;
        address listingFacet;
        address settlementFacet;
        address signedListingFacet;
        address protocolConfigFacet;
        address viewFacet;
        address erc721rtFactoryFacet;
    }

    function _deployPariDiamond(address owner) internal returns (PariDiamondDeployment memory deployment) {
        DiamondCutFacet diamondCutFacet = new DiamondCutFacet();
        deployment.diamond = new Diamond(owner, address(diamondCutFacet));
        deployment.diamondCutFacet = address(diamondCutFacet);

        DiamondLoupeFacet diamondLoupeFacet = new DiamondLoupeFacet();
        OwnershipFacet ownershipFacet = new OwnershipFacet();
        ListingFacet listingFacet = new ListingFacet();
        SettlementFacet settlementFacet = new SettlementFacet();
        SignedListingFacet signedListingFacet = new SignedListingFacet();
        ProtocolConfigFacet protocolConfigFacet = new ProtocolConfigFacet();
        ViewFacet viewFacet = new ViewFacet();
        ERC721RTFactoryFacet erc721rtFactoryFacet = new ERC721RTFactoryFacet();
        PariInit init = new PariInit();

        deployment.diamondLoupeFacet = address(diamondLoupeFacet);
        deployment.ownershipFacet = address(ownershipFacet);
        deployment.listingFacet = address(listingFacet);
        deployment.settlementFacet = address(settlementFacet);
        deployment.signedListingFacet = address(signedListingFacet);
        deployment.protocolConfigFacet = address(protocolConfigFacet);
        deployment.viewFacet = address(viewFacet);
        deployment.erc721rtFactoryFacet = address(erc721rtFactoryFacet);

        IDiamondCut.FacetCut[] memory cut = new IDiamondCut.FacetCut[](8);
        cut[0] = _facetCut(address(diamondLoupeFacet), _diamondLoupeSelectors());
        cut[1] = _facetCut(address(ownershipFacet), _ownershipSelectors());
        cut[2] = _facetCut(address(listingFacet), _listingSelectors());
        cut[3] = _facetCut(address(settlementFacet), _settlementSelectors());
        cut[4] = _facetCut(address(signedListingFacet), _signedListingSelectors());
        cut[5] = _facetCut(address(protocolConfigFacet), _protocolConfigSelectors());
        cut[6] = _facetCut(address(viewFacet), _viewSelectors());
        cut[7] = _facetCut(address(erc721rtFactoryFacet), _erc721rtFactorySelectors());

        bytes memory initCalldata = abi.encodeWithSelector(PariInit.init.selector, owner);
        IDiamondCut(address(deployment.diamond)).diamondCut(cut, address(init), initCalldata);

        deployment.market = IPariMarket(address(deployment.diamond));
        deployment.loupe = IDiamondLoupe(address(deployment.diamond));
    }

    function _facetCut(address facet, bytes4[] memory selectors) internal pure returns (IDiamondCut.FacetCut memory) {
        return IDiamondCut.FacetCut({
            facetAddress: facet, action: IDiamondCut.FacetCutAction.Add, functionSelectors: selectors
        });
    }

    function _diamondLoupeSelectors() internal pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](5);
        selectors[0] = IDiamondLoupe.facets.selector;
        selectors[1] = IDiamondLoupe.facetFunctionSelectors.selector;
        selectors[2] = IDiamondLoupe.facetAddresses.selector;
        selectors[3] = IDiamondLoupe.facetAddress.selector;
        selectors[4] = IDiamondLoupe.supportsInterface.selector;
    }

    function _ownershipSelectors() internal pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](3);
        selectors[0] = OwnershipFacet.owner.selector;
        selectors[1] = OwnershipFacet.transferOwnership.selector;
        selectors[2] = OwnershipFacet.renounceOwnership.selector;
    }

    function _listingSelectors() internal pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](3);
        selectors[0] = IPariMarket.listNFT.selector;
        selectors[1] = IPariMarket.cancelListing.selector;
        selectors[2] = IPariMarket.isListingValid.selector;
    }

    function _settlementSelectors() internal pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](2);
        selectors[0] = IPariMarket.buyListing.selector;
        selectors[1] = IPariMarket.previewPayouts.selector;
    }

    function _signedListingSelectors() internal pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](8);
        selectors[0] = IPariMarket.buySignedListing.selector;
        selectors[1] = IPariMarket.previewSignedPayouts.selector;
        selectors[2] = IPariMarket.incrementSignedListingNonce.selector;
        selectors[3] = IPariMarket.signedListingMinNonce.selector;
        selectors[4] = IPariMarket.filledSignedListings.selector;
        selectors[5] = IPariMarket.isSignedListingValid.selector;
        selectors[6] = IPariMarket.domainSeparator.selector;
        selectors[7] = IPariMarket.hashSignedListing.selector;
    }

    function _protocolConfigSelectors() internal pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](2);
        selectors[0] = IPariMarket.updateProtocolFee.selector;
        selectors[1] = IPariMarket.updateProtocolTreasury.selector;
    }

    function _viewSelectors() internal pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](6);
        selectors[0] = IPariMarket.listings.selector;
        selectors[1] = IPariMarket.nextListingId.selector;
        selectors[2] = IPariMarket.protocolFeeBps.selector;
        selectors[3] = IPariMarket.protocolTreasury.selector;
        selectors[4] = IPariMarket.MAX_PROTOCOL_FEE_BPS.selector;
        selectors[5] = IPariMarket.MAX_MARKETPLACE_FEE_BPS.selector;
    }

    function _erc721rtFactorySelectors() internal pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](3);
        selectors[0] = IERC721RTFactory.createCollection.selector;
        selectors[1] = IERC721RTFactory.getCreatorCollections.selector;
        selectors[2] = IERC721RTFactory.getCollectionCreator.selector;
    }
}
