// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {DeployPariBase} from "./DeployPariBase.sol";

contract DeploySepolia is DeployPariBase {
    function run() external {
        vm.startBroadcast();

        DeploymentResult memory deployment = deployPariDiamond(msg.sender);

        vm.stopBroadcast();

        logDeploymentSummary(deployment);

        writeDeploymentManifest(
            "sepolia",
            "../packages/shared/src/deployments/sepolia.json",
            deployment,
            address(0)
        );
    }
}
