// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {LibDiamond} from "../diamond/libraries/LibDiamond.sol";
import {ISutrartMarket} from "../interfaces/ISutrartMarket.sol";
import {SutrartStorage} from "../libraries/SutrartStorage.sol";

contract ProtocolConfigFacet {
    function updateProtocolFee(uint96 bps) external {
        LibDiamond.enforceIsContractOwner();
        require(bps <= SutrartStorage.MAX_PROTOCOL_FEE_BPS, "Protocol fee too high");
        SutrartStorage.layout().protocolFeeBps = bps;
        emit ISutrartMarket.ProtocolFeeUpdated(bps);
    }

    function updateProtocolTreasury(address treasury) external {
        LibDiamond.enforceIsContractOwner();
        require(treasury != address(0), "Protocol treasury is zero");
        SutrartStorage.layout().protocolTreasury = treasury;
        emit ISutrartMarket.ProtocolTreasuryUpdated(treasury);
    }
}
