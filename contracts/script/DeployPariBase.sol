// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {IDiamondCut} from "../src/diamond/interfaces/IDiamondCut.sol";
import {IDiamondLoupe} from "../src/diamond/interfaces/IDiamondLoupe.sol";
import {Diamond} from "../src/diamond/Diamond.sol";
import {DiamondCutFacet} from "../src/diamond/facets/DiamondCutFacet.sol";
import {DiamondLoupeFacet} from "../src/diamond/facets/DiamondLoupeFacet.sol";
import {OwnershipFacet} from "../src/diamond/facets/OwnershipFacet.sol";
import {ListingFacet} from "../src/facets/ListingFacet.sol";
import {ProtocolConfigFacet} from "../src/facets/ProtocolConfigFacet.sol";
import {SettlementFacet} from "../src/facets/SettlementFacet.sol";
import {SignedListingFacet} from "../src/facets/SignedListingFacet.sol";
import {ViewFacet} from "../src/facets/ViewFacet.sol";
import {ERC721RTFactoryFacet} from "../src/facets/ERC721RTFactoryFacet.sol";
import {IERC721RTFactory} from "../src/interfaces/IERC721RTFactory.sol";
import {IPariMarket} from "../src/interfaces/IPariMarket.sol";
import {PariInit} from "../src/PariInit.sol";

abstract contract DeployPariBase is Script {
    string internal constant PROTOCOL_VERSION = "v0.1-alpha";
    struct DeploymentFacets {
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

    struct DeploymentResult {
        Diamond diamond;
        DeploymentFacets facets;
    }

    function deployPariDiamond(address owner) internal returns (DeploymentResult memory result) {
        DiamondCutFacet diamondCutFacet = new DiamondCutFacet();
        result.diamond = new Diamond(owner, address(diamondCutFacet));
        result.facets.diamondCutFacet = address(diamondCutFacet);

        DiamondLoupeFacet diamondLoupeFacet = new DiamondLoupeFacet();
        OwnershipFacet ownershipFacet = new OwnershipFacet();
        ListingFacet listingFacet = new ListingFacet();
        SettlementFacet settlementFacet = new SettlementFacet();
        SignedListingFacet signedListingFacet = new SignedListingFacet();
        ProtocolConfigFacet protocolConfigFacet = new ProtocolConfigFacet();
        ViewFacet viewFacet = new ViewFacet();
        ERC721RTFactoryFacet erc721rtFactoryFacet = new ERC721RTFactoryFacet();
        PariInit init = new PariInit();

        result.facets.diamondLoupeFacet = address(diamondLoupeFacet);
        result.facets.ownershipFacet = address(ownershipFacet);
        result.facets.listingFacet = address(listingFacet);
        result.facets.settlementFacet = address(settlementFacet);
        result.facets.signedListingFacet = address(signedListingFacet);
        result.facets.protocolConfigFacet = address(protocolConfigFacet);
        result.facets.viewFacet = address(viewFacet);
        result.facets.erc721rtFactoryFacet = address(erc721rtFactoryFacet);

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
        IDiamondCut(address(result.diamond)).diamondCut(cut, address(init), initCalldata);

        assertDeploymentSanity(result);
    }

    function assertDeploymentSanity(DeploymentResult memory deployment) internal view {
        IDiamondLoupe loupe = IDiamondLoupe(address(deployment.diamond));
        address[] memory facetAddresses = loupe.facetAddresses();
        require(facetAddresses.length >= 8, "DeployPariBase: expected at least 8 facets");

        require(deployment.facets.signedListingFacet != address(0), "DeployPariBase: signed listing facet missing");
        require(deployment.facets.listingFacet != address(0), "DeployPariBase: listing facet missing");
        require(deployment.facets.settlementFacet != address(0), "DeployPariBase: settlement facet missing");
        require(deployment.facets.erc721rtFactoryFacet != address(0), "DeployPariBase: factory facet missing");

        bytes32 domainSeparator = IPariMarket(address(deployment.diamond)).domainSeparator();
        require(domainSeparator != bytes32(0), "DeployPariBase: domain separator unset");
    }

    function logDeploymentSummary(DeploymentResult memory deployment) internal view {
        console2.log("PARI deployment sanity checks passed");
        console2.log("Protocol version:", PROTOCOL_VERSION);
        console2.log("Chain ID:", block.chainid);
        console2.log("Diamond:", address(deployment.diamond));
        console2.log("SignedListingFacet:", deployment.facets.signedListingFacet);
        console2.log("ERC721RTFactoryFacet:", deployment.facets.erc721rtFactoryFacet);
    }

    function writeDeploymentManifest(
        string memory chainName,
        string memory outputPath,
        DeploymentResult memory deployment,
        address mockNft
    ) internal {
        string memory gitCommit = vm.envOr("GIT_COMMIT", string("unknown"));

        string memory root = "deployment";
        vm.serializeUint(root, "chainId", block.chainid);
        vm.serializeString(root, "chainName", chainName);
        vm.serializeString(root, "protocolVersion", PROTOCOL_VERSION);
        vm.serializeString(root, "gitCommit", gitCommit);
        vm.serializeUint(root, "deployedAt", block.timestamp);
        vm.serializeAddress(root, "PariMarket", address(deployment.diamond));

        if (mockNft != address(0)) {
            vm.serializeAddress(root, "MockERC721", mockNft);
        }

        string memory facets = "facets";
        vm.serializeAddress(facets, "DiamondCutFacet", deployment.facets.diamondCutFacet);
        vm.serializeAddress(facets, "DiamondLoupeFacet", deployment.facets.diamondLoupeFacet);
        vm.serializeAddress(facets, "OwnershipFacet", deployment.facets.ownershipFacet);
        vm.serializeAddress(facets, "ListingFacet", deployment.facets.listingFacet);
        vm.serializeAddress(facets, "SettlementFacet", deployment.facets.settlementFacet);
        vm.serializeAddress(facets, "SignedListingFacet", deployment.facets.signedListingFacet);
        vm.serializeAddress(facets, "ProtocolConfigFacet", deployment.facets.protocolConfigFacet);
        vm.serializeAddress(facets, "ViewFacet", deployment.facets.viewFacet);
        string memory facetsJson = vm.serializeAddress(
            facets, "ERC721RTFactoryFacet", deployment.facets.erc721rtFactoryFacet
        );

        vm.serializeString(root, "facets", facetsJson);
        string memory json = vm.serializeAddress(root, "PariMarket", address(deployment.diamond));

        vm.writeJson(json, outputPath);
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
