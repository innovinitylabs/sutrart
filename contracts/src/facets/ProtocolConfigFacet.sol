// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {LibDiamond} from "../diamond/libraries/LibDiamond.sol";
import {IPariMarket} from "../interfaces/IPariMarket.sol";
import {PariStorage} from "../libraries/PariStorage.sol";

contract ProtocolConfigFacet {
    function updateProtocolFee(uint96 bps) external {
        LibDiamond.enforceIsContractOwner();
        require(bps <= PariStorage.MAX_PROTOCOL_FEE_BPS, "Protocol fee too high");
        PariStorage.layout().protocolFeeBps = bps;
        emit IPariMarket.ProtocolFeeUpdated(bps);
    }

    function updateProtocolTreasury(address treasury) external {
        LibDiamond.enforceIsContractOwner();
        require(treasury != address(0), "Protocol treasury is zero");
        PariStorage.layout().protocolTreasury = treasury;
        emit IPariMarket.ProtocolTreasuryUpdated(treasury);
    }
}
