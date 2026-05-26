// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC721} from "openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";
import {ISutrartMarket} from "../interfaces/ISutrartMarket.sol";
import {SutrartStorage} from "../libraries/SutrartStorage.sol";
import {SutrartValidation} from "../libraries/SutrartValidation.sol";

contract ListingFacet {
    function isListingValid(uint256 listingId) external view returns (bool) {
        return SutrartValidation.isListingValid(listingId);
    }

    function listNFT(address nftContract, uint256 tokenId, uint256 price) external returns (uint256 listingId) {
        require(nftContract != address(0), "NFT contract cannot be zero");
        require(price > 0, "Price must be greater than zero");

        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Seller is not token owner");

        bool isApproved = nft.getApproved(tokenId) == address(this) || nft.isApprovedForAll(msg.sender, address(this));
        require(isApproved, "Marketplace is not approved");

        SutrartStorage.Layout storage ds = SutrartStorage.layout();
        listingId = ds.nextListingId;
        ds.nextListingId += 1;

        ds.listings[listingId] = SutrartStorage.Listing({
            listingId: listingId,
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            price: price,
            active: true,
            createdAt: block.timestamp
        });

        emit ISutrartMarket.ListingCreated(listingId, msg.sender, nftContract, tokenId, price, block.timestamp);
    }

    function cancelListing(uint256 listingId) external {
        SutrartStorage.Listing storage listing = SutrartStorage.layout().listings[listingId];

        require(listing.active, "Listing is not active");
        require(listing.seller == msg.sender, "Only seller can cancel");

        listing.active = false;

        emit ISutrartMarket.ListingCancelled(listingId, msg.sender);
    }
}
