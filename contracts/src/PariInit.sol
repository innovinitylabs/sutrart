// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {PariStorage} from "./libraries/PariStorage.sol";

contract PariInit {
    function init(address protocolTreasury) external {
        PariStorage.initialize(protocolTreasury);
    }
}
