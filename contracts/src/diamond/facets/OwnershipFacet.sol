// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC173} from "../interfaces/IERC173.sol";
import {LibDiamond} from "../libraries/LibDiamond.sol";

contract OwnershipFacet is IERC173 {
    function owner() external view override returns (address owner_) {
        owner_ = LibDiamond.contractOwner();
    }

    function transferOwnership(address newOwner) external override {
        LibDiamond.enforceIsContractOwner();
        require(newOwner != address(0), "OwnershipFacet: new owner is zero");
        LibDiamond.setContractOwner(newOwner);
    }

    function renounceOwnership() external {
        LibDiamond.enforceIsContractOwner();
        LibDiamond.setContractOwner(address(0));
    }
}
