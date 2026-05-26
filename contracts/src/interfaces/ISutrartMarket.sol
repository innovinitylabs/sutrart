// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ISutrartMarket {
    struct Listing {
        uint256 listingId;
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 price;
        bool active;
        uint256 createdAt;
    }

    struct PayoutPreview {
        uint256 grossPrice;
        uint256 protocolFee;
        uint256 marketplaceFee;
        uint256 royaltyAmount;
        address royaltyRecipient;
        uint256 sellerProceeds;
    }

    struct SignedListing {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 price;
        uint256 expiry;
        uint256 nonce;
    }

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
        uint256 price,
        uint256 protocolFeePaid,
        uint256 marketplaceFeePaid,
        uint256 sellerProceeds
    );

    event ProtocolFeeUpdated(uint96 protocolFeeBps);
    event ProtocolTreasuryUpdated(address protocolTreasury);

    event SignedListingFilled(
        bytes32 indexed digest,
        address indexed seller,
        address indexed buyer,
        address nftContract,
        uint256 tokenId,
        uint256 price,
        uint256 protocolFeePaid,
        uint256 marketplaceFeePaid,
        uint256 sellerProceeds
    );

    event SignedListingNonceIncremented(address indexed seller, uint256 newMinNonce);

    function listNFT(address nftContract, uint256 tokenId, uint256 price) external returns (uint256 listingId);
    function cancelListing(uint256 listingId) external;
    function isListingValid(uint256 listingId) external view returns (bool);
    function buyListing(uint256 listingId, address marketplaceFeeRecipient, uint96 marketplaceFeeBps) external payable;
    function previewPayouts(uint256 listingId, uint96 marketplaceFeeBps) external view returns (PayoutPreview memory);
    function previewSignedPayouts(SignedListing memory listing, uint96 marketplaceFeeBps)
        external
        view
        returns (PayoutPreview memory);
    function buySignedListing(
        SignedListing memory listing,
        bytes calldata signature,
        address marketplaceFeeRecipient,
        uint96 marketplaceFeeBps
    ) external payable;
    function incrementSignedListingNonce() external;
    function signedListingMinNonce(address seller) external view returns (uint256);
    function filledSignedListings(bytes32 digest) external view returns (bool);
    function isSignedListingValid(SignedListing memory listing) external view returns (bool);
    function domainSeparator() external view returns (bytes32);
    function hashSignedListing(SignedListing memory listing) external pure returns (bytes32);
    function updateProtocolFee(uint96 bps) external;
    function updateProtocolTreasury(address treasury) external;
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
        );
    function nextListingId() external view returns (uint256);
    function protocolFeeBps() external view returns (uint96);
    function protocolTreasury() external view returns (address);
    function MAX_PROTOCOL_FEE_BPS() external pure returns (uint96);
    function MAX_MARKETPLACE_FEE_BPS() external pure returns (uint96);
    function owner() external view returns (address);
    function transferOwnership(address newOwner) external;
    function renounceOwnership() external;
}
