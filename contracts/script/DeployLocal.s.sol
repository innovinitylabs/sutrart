// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {MockERC721} from "../src/MockERC721.sol";
import {SutrartMarket} from "../src/SutrartMarket.sol";

contract DeployLocal is Script {
    function run() external {
        vm.startBroadcast();

        MockERC721 nft = new MockERC721();
        SutrartMarket market = new SutrartMarket();

        vm.stopBroadcast();

        string memory obj = "deployment";
        vm.serializeUint(obj, "chainId", block.chainid);
        vm.serializeAddress(obj, "MockERC721", address(nft));
        string memory json = vm.serializeAddress(obj, "SutrartMarket", address(market));

        vm.writeJson(json, "../packages/shared/src/deployments/local.json");
    }
}
