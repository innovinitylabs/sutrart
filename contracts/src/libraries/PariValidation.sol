// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC721} from "openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";
import {LibPariEIP712} from "./LibPariEIP712.sol";
import {PariStorage} from "./PariStorage.sol";

library PariValidation {
    function isListingValid(uint256 listingId) internal view returns (bool) {
        PariStorage.Layout storage ds = PariStorage.layout();
        PariStorage.Listing storage listing = ds.listings[listingId];

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

    function isSignedListingValid(PariStorage.SignedListing memory listing) internal view returns (bool) {
        PariStorage.Layout storage ds = PariStorage.layout();

        if (listing.seller == address(0) || listing.price == 0) {
            return false;
        }

        if (listing.expiry != 0 && block.timestamp > listing.expiry) {
            return false;
        }

        if (listing.nonce < ds.signedListingMinNonce[listing.seller]) {
            return false;
        }

        bytes32 structHash = LibPariEIP712.hashSignedListing(
            listing.seller, listing.nftContract, listing.tokenId, listing.price, listing.expiry, listing.nonce
        );

        if (ds.filledSignedListings[structHash]) {
            return false;
        }

        IERC721 nft = IERC721(listing.nftContract);

        if (nft.ownerOf(listing.tokenId) != listing.seller) {
            return false;
        }

        bool isApproved = nft.getApproved(listing.tokenId) == address(this)
            || nft.isApprovedForAll(listing.seller, address(this));

        return isApproved;
    }
}
