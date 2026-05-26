// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {SutrartStorage} from "../libraries/SutrartStorage.sol";

contract ViewFacet {
    function listings(uint256 listingId)
        external
        view
        returns (
            uint256 storedListingId,
            address seller,
            address nftContract,
            uint256 tokenId,
            uint256 price,
            bool active,
            uint256 createdAt
        )
    {
        SutrartStorage.Listing storage listing = SutrartStorage.layout().listings[listingId];
        return (
            listing.listingId,
            listing.seller,
            listing.nftContract,
            listing.tokenId,
            listing.price,
            listing.active,
            listing.createdAt
        );
    }

    function nextListingId() external view returns (uint256) {
        return SutrartStorage.layout().nextListingId;
    }

    function protocolFeeBps() external view returns (uint96) {
        return SutrartStorage.layout().protocolFeeBps;
    }

    function protocolTreasury() external view returns (address) {
        return SutrartStorage.layout().protocolTreasury;
    }

    function MAX_PROTOCOL_FEE_BPS() external pure returns (uint96) {
        return SutrartStorage.MAX_PROTOCOL_FEE_BPS;
    }

    function MAX_MARKETPLACE_FEE_BPS() external pure returns (uint96) {
        return SutrartStorage.MAX_MARKETPLACE_FEE_BPS;
    }
}
