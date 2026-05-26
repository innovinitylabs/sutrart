// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {IDiamondCut} from "../src/diamond/interfaces/IDiamondCut.sol";
import {IDiamondLoupe} from "../src/diamond/interfaces/IDiamondLoupe.sol";
import {Diamond} from "../src/diamond/Diamond.sol";
import {DiamondCutFacet} from "../src/diamond/facets/DiamondCutFacet.sol";
import {DiamondLoupeFacet} from "../src/diamond/facets/DiamondLoupeFacet.sol";
import {OwnershipFacet} from "../src/diamond/facets/OwnershipFacet.sol";
import {ListingFacet} from "../src/facets/ListingFacet.sol";
import {ProtocolConfigFacet} from "../src/facets/ProtocolConfigFacet.sol";
import {SettlementFacet} from "../src/facets/SettlementFacet.sol";
import {ViewFacet} from "../src/facets/ViewFacet.sol";
import {ERC721RTFactoryFacet} from "../src/facets/ERC721RTFactoryFacet.sol";
import {IERC721RTFactory} from "../src/interfaces/IERC721RTFactory.sol";
import {ISutrartMarket} from "../src/interfaces/ISutrartMarket.sol";
import {MockERC721} from "../src/MockERC721.sol";
import {SutrartInit} from "../src/SutrartInit.sol";

contract DeployLocal is Script {
    function run() external {
        vm.startBroadcast();

        MockERC721 nft = new MockERC721();
        Diamond market = _deploySutrartDiamond(msg.sender);

        vm.stopBroadcast();

        string memory obj = "deployment";
        vm.serializeUint(obj, "chainId", block.chainid);
        vm.serializeAddress(obj, "MockERC721", address(nft));
        string memory json = vm.serializeAddress(obj, "SutrartMarket", address(market));

        vm.writeJson(json, "../packages/shared/src/deployments/local.json");
    }

    function _deploySutrartDiamond(address owner) internal returns (Diamond diamond) {
        DiamondCutFacet diamondCutFacet = new DiamondCutFacet();
        diamond = new Diamond(owner, address(diamondCutFacet));

        DiamondLoupeFacet diamondLoupeFacet = new DiamondLoupeFacet();
        OwnershipFacet ownershipFacet = new OwnershipFacet();
        ListingFacet listingFacet = new ListingFacet();
        SettlementFacet settlementFacet = new SettlementFacet();
        ProtocolConfigFacet protocolConfigFacet = new ProtocolConfigFacet();
        ViewFacet viewFacet = new ViewFacet();
        ERC721RTFactoryFacet erc721rtFactoryFacet = new ERC721RTFactoryFacet();
        SutrartInit init = new SutrartInit();

        IDiamondCut.FacetCut[] memory cut = new IDiamondCut.FacetCut[](7);
        cut[0] = _facetCut(address(diamondLoupeFacet), _diamondLoupeSelectors());
        cut[1] = _facetCut(address(ownershipFacet), _ownershipSelectors());
        cut[2] = _facetCut(address(listingFacet), _listingSelectors());
        cut[3] = _facetCut(address(settlementFacet), _settlementSelectors());
        cut[4] = _facetCut(address(protocolConfigFacet), _protocolConfigSelectors());
        cut[5] = _facetCut(address(viewFacet), _viewSelectors());
        cut[6] = _facetCut(address(erc721rtFactoryFacet), _erc721rtFactorySelectors());

        bytes memory initCalldata = abi.encodeWithSelector(SutrartInit.init.selector, owner);
        IDiamondCut(address(diamond)).diamondCut(cut, address(init), initCalldata);
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
        selectors[0] = ISutrartMarket.listNFT.selector;
        selectors[1] = ISutrartMarket.cancelListing.selector;
        selectors[2] = ISutrartMarket.isListingValid.selector;
    }

    function _settlementSelectors() internal pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](2);
        selectors[0] = ISutrartMarket.buyListing.selector;
        selectors[1] = ISutrartMarket.previewPayouts.selector;
    }

    function _protocolConfigSelectors() internal pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](2);
        selectors[0] = ISutrartMarket.updateProtocolFee.selector;
        selectors[1] = ISutrartMarket.updateProtocolTreasury.selector;
    }

    function _viewSelectors() internal pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](6);
        selectors[0] = ISutrartMarket.listings.selector;
        selectors[1] = ISutrartMarket.nextListingId.selector;
        selectors[2] = ISutrartMarket.protocolFeeBps.selector;
        selectors[3] = ISutrartMarket.protocolTreasury.selector;
        selectors[4] = ISutrartMarket.MAX_PROTOCOL_FEE_BPS.selector;
        selectors[5] = ISutrartMarket.MAX_MARKETPLACE_FEE_BPS.selector;
    }

    function _erc721rtFactorySelectors() internal pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](3);
        selectors[0] = IERC721RTFactory.createCollection.selector;
        selectors[1] = IERC721RTFactory.getCreatorCollections.selector;
        selectors[2] = IERC721RTFactory.getCollectionCreator.selector;
    }
}
