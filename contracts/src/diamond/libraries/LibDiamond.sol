// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IDiamondCut} from "../interfaces/IDiamondCut.sol";

library LibDiamond {
    bytes32 internal constant DIAMOND_STORAGE_POSITION = keccak256("diamond.standard.diamond.storage");

    struct FacetAddressAndPosition {
        address facetAddress;
        uint256 functionSelectorPosition;
    }

    struct FacetFunctionSelectors {
        bytes4[] functionSelectors;
        uint256 facetAddressPosition;
    }

    struct DiamondStorage {
        mapping(bytes4 selector => FacetAddressAndPosition) selectorToFacetAndPosition;
        mapping(address facet => FacetFunctionSelectors) facetFunctionSelectors;
        address[] facetAddresses;
        mapping(bytes4 interfaceId => bool) supportedInterfaces;
        address contractOwner;
    }

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    function diamondStorage() internal pure returns (DiamondStorage storage ds) {
        bytes32 position = DIAMOND_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }

    function setContractOwner(address newOwner) internal {
        DiamondStorage storage ds = diamondStorage();
        address previousOwner = ds.contractOwner;
        ds.contractOwner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function contractOwner() internal view returns (address) {
        return diamondStorage().contractOwner;
    }

    function enforceIsContractOwner() internal view {
        require(msg.sender == diamondStorage().contractOwner, "LibDiamond: Must be contract owner");
    }

    function diamondCut(IDiamondCut.FacetCut[] memory diamondCut_, address init, bytes memory data) internal {
        for (uint256 facetIndex; facetIndex < diamondCut_.length; facetIndex++) {
            IDiamondCut.FacetCutAction action = diamondCut_[facetIndex].action;
            if (action == IDiamondCut.FacetCutAction.Add) {
                addFunctions(diamondCut_[facetIndex].facetAddress, diamondCut_[facetIndex].functionSelectors);
            } else if (action == IDiamondCut.FacetCutAction.Replace) {
                replaceFunctions(diamondCut_[facetIndex].facetAddress, diamondCut_[facetIndex].functionSelectors);
            } else if (action == IDiamondCut.FacetCutAction.Remove) {
                removeFunctions(diamondCut_[facetIndex].facetAddress, diamondCut_[facetIndex].functionSelectors);
            } else {
                revert("LibDiamond: Incorrect FacetCutAction");
            }
        }
        emit IDiamondCut.DiamondCut(diamondCut_, init, data);
        initializeDiamondCut(init, data);
    }

    function addFunctions(address facetAddress, bytes4[] memory functionSelectors) internal {
        require(functionSelectors.length > 0, "LibDiamond: No selectors in facet");
        DiamondStorage storage ds = diamondStorage();
        require(facetAddress != address(0), "LibDiamond: Add facet can't be address(0)");
        uint256 selectorPosition = ds.facetFunctionSelectors[facetAddress].functionSelectors.length;
        if (selectorPosition == 0) {
            addFacet(ds, facetAddress);
        }
        for (uint256 selectorIndex; selectorIndex < functionSelectors.length; selectorIndex++) {
            bytes4 selector = functionSelectors[selectorIndex];
            address oldFacetAddress = ds.selectorToFacetAndPosition[selector].facetAddress;
            require(oldFacetAddress == address(0), "LibDiamond: Can't add function that already exists");
            addFunction(ds, selector, selectorPosition, facetAddress);
            selectorPosition++;
        }
    }

    function replaceFunctions(address facetAddress, bytes4[] memory functionSelectors) internal {
        require(functionSelectors.length > 0, "LibDiamond: No selectors in facet");
        DiamondStorage storage ds = diamondStorage();
        require(facetAddress != address(0), "LibDiamond: Replace facet can't be address(0)");
        uint256 selectorPosition = ds.facetFunctionSelectors[facetAddress].functionSelectors.length;
        if (selectorPosition == 0) {
            addFacet(ds, facetAddress);
        }
        for (uint256 selectorIndex; selectorIndex < functionSelectors.length; selectorIndex++) {
            bytes4 selector = functionSelectors[selectorIndex];
            address oldFacetAddress = ds.selectorToFacetAndPosition[selector].facetAddress;
            require(oldFacetAddress != facetAddress, "LibDiamond: Can't replace function with same function");
            removeFunction(ds, oldFacetAddress, selector);
            addFunction(ds, selector, selectorPosition, facetAddress);
            selectorPosition++;
        }
    }

    function removeFunctions(address facetAddress, bytes4[] memory functionSelectors) internal {
        require(functionSelectors.length > 0, "LibDiamond: No selectors in facet");
        DiamondStorage storage ds = diamondStorage();
        require(facetAddress == address(0), "LibDiamond: Remove facet address must be address(0)");
        for (uint256 selectorIndex; selectorIndex < functionSelectors.length; selectorIndex++) {
            bytes4 selector = functionSelectors[selectorIndex];
            address oldFacetAddress = ds.selectorToFacetAndPosition[selector].facetAddress;
            removeFunction(ds, oldFacetAddress, selector);
        }
    }

    function addFacet(DiamondStorage storage ds, address facetAddress) internal {
        enforceHasContractCode(facetAddress, "LibDiamond: New facet has no code");
        ds.facetFunctionSelectors[facetAddress].facetAddressPosition = ds.facetAddresses.length;
        ds.facetAddresses.push(facetAddress);
    }

    function addFunction(DiamondStorage storage ds, bytes4 selector, uint256 selectorPosition, address facetAddress)
        internal
    {
        ds.selectorToFacetAndPosition[selector].functionSelectorPosition = selectorPosition;
        ds.facetFunctionSelectors[facetAddress].functionSelectors.push(selector);
        ds.selectorToFacetAndPosition[selector].facetAddress = facetAddress;
    }

    function removeFunction(DiamondStorage storage ds, address facetAddress, bytes4 selector) internal {
        require(facetAddress != address(0), "LibDiamond: Can't remove function that doesn't exist");
        require(facetAddress != address(this), "LibDiamond: Can't remove immutable function");

        uint256 selectorPosition = ds.selectorToFacetAndPosition[selector].functionSelectorPosition;
        uint256 lastSelectorPosition = ds.facetFunctionSelectors[facetAddress].functionSelectors.length - 1;

        if (selectorPosition != lastSelectorPosition) {
            bytes4 lastSelector = ds.facetFunctionSelectors[facetAddress].functionSelectors[lastSelectorPosition];
            ds.facetFunctionSelectors[facetAddress].functionSelectors[selectorPosition] = lastSelector;
            ds.selectorToFacetAndPosition[lastSelector].functionSelectorPosition = selectorPosition;
        }

        ds.facetFunctionSelectors[facetAddress].functionSelectors.pop();
        delete ds.selectorToFacetAndPosition[selector];

        if (lastSelectorPosition == 0) {
            uint256 lastFacetAddressPosition = ds.facetAddresses.length - 1;
            uint256 facetAddressPosition = ds.facetFunctionSelectors[facetAddress].facetAddressPosition;

            if (facetAddressPosition != lastFacetAddressPosition) {
                address lastFacetAddress = ds.facetAddresses[lastFacetAddressPosition];
                ds.facetAddresses[facetAddressPosition] = lastFacetAddress;
                ds.facetFunctionSelectors[lastFacetAddress].facetAddressPosition = facetAddressPosition;
            }

            ds.facetAddresses.pop();
            delete ds.facetFunctionSelectors[facetAddress].facetAddressPosition;
        }
    }

    function initializeDiamondCut(address init, bytes memory data) internal {
        if (init == address(0)) {
            require(data.length == 0, "LibDiamond: init is address(0) but data is not empty");
            return;
        }

        enforceHasContractCode(init, "LibDiamond: init address has no code");
        (bool success, bytes memory error) = init.delegatecall(data);
        if (!success) {
            if (error.length > 0) {
                assembly {
                    let returndata_size := mload(error)
                    revert(add(32, error), returndata_size)
                }
            }
            revert("LibDiamond: init function reverted");
        }
    }

    function enforceHasContractCode(address contractAddress, string memory errorMessage) internal view {
        uint256 contractSize;
        assembly {
            contractSize := extcodesize(contractAddress)
        }
        require(contractSize > 0, errorMessage);
    }
}
