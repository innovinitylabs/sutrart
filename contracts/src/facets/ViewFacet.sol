// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {PariStorage} from "../libraries/PariStorage.sol";

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
        PariStorage.Listing storage listing = PariStorage.layout().listings[listingId];
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
        return PariStorage.layout().nextListingId;
    }

    function protocolFeeBps() external view returns (uint96) {
        return PariStorage.layout().protocolFeeBps;
    }

    function protocolTreasury() external view returns (address) {
        return PariStorage.layout().protocolTreasury;
    }

    function MAX_PROTOCOL_FEE_BPS() external pure returns (uint96) {
        return PariStorage.MAX_PROTOCOL_FEE_BPS;
    }

    function MAX_MARKETPLACE_FEE_BPS() external pure returns (uint96) {
        return PariStorage.MAX_MARKETPLACE_FEE_BPS;
    }
}
