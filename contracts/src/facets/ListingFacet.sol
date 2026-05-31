// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC721} from "openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";
import {IPariMarket} from "../interfaces/IPariMarket.sol";
import {PariStorage} from "../libraries/PariStorage.sol";
import {PariValidation} from "../libraries/PariValidation.sol";

contract ListingFacet {
    function isListingValid(uint256 listingId) external view returns (bool) {
        return PariValidation.isListingValid(listingId);
    }

    function listNFT(address nftContract, uint256 tokenId, uint256 price) external returns (uint256 listingId) {
        require(nftContract != address(0), "NFT contract cannot be zero");
        require(price > 0, "Price must be greater than zero");

        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Seller is not token owner");

        bool isApproved = nft.getApproved(tokenId) == address(this) || nft.isApprovedForAll(msg.sender, address(this));
        require(isApproved, "Marketplace is not approved");

        PariStorage.Layout storage ds = PariStorage.layout();
        listingId = ds.nextListingId;
        ds.nextListingId += 1;

        ds.listings[listingId] = PariStorage.Listing({
            listingId: listingId,
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            price: price,
            active: true,
            createdAt: block.timestamp
        });

        emit IPariMarket.ListingCreated(listingId, msg.sender, nftContract, tokenId, price, block.timestamp);
    }

    function cancelListing(uint256 listingId) external {
        PariStorage.Listing storage listing = PariStorage.layout().listings[listingId];

        require(listing.active, "Listing is not active");
        require(listing.seller == msg.sender, "Only seller can cancel");

        listing.active = false;

        emit IPariMarket.ListingCancelled(listingId, msg.sender);
    }
}
