// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {DeployPariBase} from "./DeployPariBase.sol";

contract DeployBaseSepolia is DeployPariBase {
    function run() external {
        vm.startBroadcast();

        DeploymentResult memory deployment = deployPariDiamond(msg.sender);

        vm.stopBroadcast();

        logDeploymentSummary(deployment);

        writeDeploymentManifest(
            "base-sepolia",
            "../packages/shared/src/deployments/base-sepolia.json",
            deployment,
            address(0)
        );
    }
}
