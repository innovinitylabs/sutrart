// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {DeploySutrartBase} from "./DeploySutrartBase.sol";

contract DeploySepolia is DeploySutrartBase {
    function run() external {
        vm.startBroadcast();

        DeploymentResult memory deployment = deploySutrartDiamond(msg.sender);

        vm.stopBroadcast();

        writeDeploymentManifest(
            "sepolia",
            "../packages/shared/src/deployments/sepolia.json",
            deployment,
            address(0)
        );
    }
}
