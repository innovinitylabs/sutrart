// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {MockERC721} from "../src/MockERC721.sol";
import {DeployPariBase} from "./DeployPariBase.sol";

contract DeployLocal is DeployPariBase {
    function run() external {
        vm.startBroadcast();

        MockERC721 nft = new MockERC721();
        DeploymentResult memory deployment = deployPariDiamond(msg.sender);

        vm.stopBroadcast();

        logDeploymentSummary(deployment);

        writeDeploymentManifest(
            "anvil",
            "../packages/shared/src/deployments/local.json",
            deployment,
            address(nft)
        );
    }
}
