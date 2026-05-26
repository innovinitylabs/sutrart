// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC721} from "openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";
import {SutrartStorage} from "./SutrartStorage.sol";

library SutrartValidation {
    function isListingValid(uint256 listingId) internal view returns (bool) {
        SutrartStorage.Layout storage ds = SutrartStorage.layout();
        SutrartStorage.Listing storage listing = ds.listings[listingId];

        if (!listing.active || listing.seller == address(0)) {
            return false;
        }

        IERC721 nft = IERC721(listing.nftContract);

        if (nft.ownerOf(listing.tokenId) != listing.seller) {
            return false;
        }

        bool isApproved =
            nft.getApproved(listing.tokenId) == address(this) || nft.isApprovedForAll(listing.seller, address(this));

        return isApproved;
    }
}
