// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {SutrartStorage} from "./libraries/SutrartStorage.sol";

contract SutrartInit {
    function init(address protocolTreasury) external {
        SutrartStorage.initialize(protocolTreasury);
    }
}
