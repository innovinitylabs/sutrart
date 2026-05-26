// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IDiamondCut} from "../interfaces/IDiamondCut.sol";
import {LibDiamond} from "../libraries/LibDiamond.sol";

contract DiamondCutFacet is IDiamondCut {
    function diamondCut(FacetCut[] calldata diamondCut_, address init, bytes calldata data) external override {
        LibDiamond.enforceIsContractOwner();
        LibDiamond.diamondCut(diamondCut_, init, data);
    }
}
