// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC721} from "openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

contract SutrartMarket is ReentrancyGuard {
    struct Listing {
        uint256 listingId;
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 price;
        bool active;
        uint256 createdAt;
    }

    uint256 public nextListingId = 1;
    mapping(uint256 listingId => Listing) public listings;

    event ListingCreated(
        uint256 indexed listingId,
        address indexed seller,
        address indexed nftContract,
        uint256 tokenId,
        uint256 price,
        uint256 createdAt
    );

    event ListingCancelled(uint256 indexed listingId, address indexed seller);

    event ListingSold(
        uint256 indexed listingId,
        address indexed seller,
        address indexed buyer,
        address nftContract,
        uint256 tokenId,
        uint256 price
    );

    function isListingValid(uint256 listingId) public view returns (bool) {
        Listing storage listing = listings[listingId];

        if (!listing.active || listing.seller == address(0)) {
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

    function listNFT(address nftContract, uint256 tokenId, uint256 price) external returns (uint256 listingId) {
        require(nftContract != address(0), "NFT contract cannot be zero");
        require(price > 0, "Price must be greater than zero");

        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Seller is not token owner");

        bool isApproved = nft.getApproved(tokenId) == address(this) || nft.isApprovedForAll(msg.sender, address(this));
        require(isApproved, "Marketplace is not approved");

        listingId = nextListingId;
        nextListingId += 1;

        listings[listingId] = Listing({
            listingId: listingId,
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            price: price,
            active: true,
            createdAt: block.timestamp
        });

        emit ListingCreated(listingId, msg.sender, nftContract, tokenId, price, block.timestamp);
    }

    function cancelListing(uint256 listingId) external {
        Listing storage listing = listings[listingId];

        require(listing.active, "Listing is not active");
        require(listing.seller == msg.sender, "Only seller can cancel");

        listing.active = false;

        emit ListingCancelled(listingId, msg.sender);
    }

    function buyListing(uint256 listingId) external payable nonReentrant {
        Listing storage listing = listings[listingId];

        require(isListingValid(listingId), "Listing is not valid");
        require(msg.sender != listing.seller, "Seller cannot buy own listing");
        require(msg.value == listing.price, "Incorrect ETH amount");

        listing.active = false;

        IERC721(listing.nftContract).safeTransferFrom(listing.seller, msg.sender, listing.tokenId);

        (bool sent, ) = payable(listing.seller).call{value: msg.value}("");
        require(sent, "ETH transfer failed");

        emit ListingSold(
            listingId,
            listing.seller,
            msg.sender,
            listing.nftContract,
            listing.tokenId,
            listing.price
        );
    }
}
