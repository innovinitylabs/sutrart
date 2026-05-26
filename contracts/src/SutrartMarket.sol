// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC721} from "openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";
import {IERC2981} from "openzeppelin-contracts/contracts/interfaces/IERC2981.sol";
import {IERC165} from "openzeppelin-contracts/contracts/utils/introspection/IERC165.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";

contract SutrartMarket is ReentrancyGuard, Ownable {
    constructor() Ownable(msg.sender) {
        protocolTreasury = msg.sender;
    }

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

    uint256 public nextListingId = 1;
    mapping(uint256 listingId => Listing) public listings;

    uint96 public constant MAX_PROTOCOL_FEE_BPS = 1000; // 10%
    uint96 public constant MAX_MARKETPLACE_FEE_BPS = 2500; // 25%

    uint96 public protocolFeeBps = 50; // 0.5% default
    address public protocolTreasury;

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

    function updateProtocolFee(uint96 bps) external onlyOwner {
        require(bps <= MAX_PROTOCOL_FEE_BPS, "Protocol fee too high");
        protocolFeeBps = bps;
        emit ProtocolFeeUpdated(bps);
    }

    function updateProtocolTreasury(address treasury) external onlyOwner {
        require(treasury != address(0), "Protocol treasury is zero");
        protocolTreasury = treasury;
        emit ProtocolTreasuryUpdated(treasury);
    }

    function previewPayouts(uint256 listingId, uint96 marketplaceFeeBps)
        public
        view
        returns (PayoutPreview memory)
    {
        Listing storage listing = listings[listingId];
        require(listing.seller != address(0), "Listing does not exist");

        return _computePayoutPreview(
            listing.nftContract, listing.tokenId, listing.price, marketplaceFeeBps
        );
    }

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

    function buyListing(
        uint256 listingId,
        address marketplaceFeeRecipient,
        uint96 marketplaceFeeBps
    ) external payable nonReentrant {
        Listing storage listing = listings[listingId];

        require(isListingValid(listingId), "Listing is not valid");
        require(msg.sender != listing.seller, "Seller cannot buy own listing");
        require(msg.value == listing.price, "Incorrect ETH amount");

        PayoutPreview memory payout = _computePayoutPreview(
            listing.nftContract, listing.tokenId, listing.price, marketplaceFeeBps
        );

        if (payout.marketplaceFee > 0) {
            require(marketplaceFeeRecipient != address(0), "Marketplace fee recipient is zero");
        }

        listing.active = false;

        IERC721(listing.nftContract).safeTransferFrom(listing.seller, msg.sender, listing.tokenId);

        if (payout.protocolFee > 0) {
            require(protocolTreasury != address(0), "Protocol treasury not set");
            (bool sentProtocolFee,) = payable(protocolTreasury).call{value: payout.protocolFee}("");
            require(sentProtocolFee, "Protocol fee transfer failed");
        }

        if (payout.marketplaceFee > 0) {
            (bool sentMarketplaceFee,) = payable(marketplaceFeeRecipient).call{value: payout.marketplaceFee}("");
            require(sentMarketplaceFee, "Marketplace fee transfer failed");
        }

        uint256 royaltyPaid = _royaltyPayoutAmount(payout.royaltyAmount, payout.royaltyRecipient);
        if (royaltyPaid > 0) {
            (bool sentRoyalty,) = payable(payout.royaltyRecipient).call{value: royaltyPaid}("");
            require(sentRoyalty, "Royalty transfer failed");
        }

        (bool sentSeller,) = payable(listing.seller).call{value: payout.sellerProceeds}("");
        require(sentSeller, "ETH transfer failed");

        emit ListingSold(
            listingId,
            listing.seller,
            msg.sender,
            listing.nftContract,
            listing.tokenId,
            listing.price,
            payout.protocolFee,
            payout.marketplaceFee,
            payout.sellerProceeds
        );
    }

    function _computePayoutPreview(
        address nftContract,
        uint256 tokenId,
        uint256 grossPrice,
        uint96 marketplaceFeeBps
    ) internal view returns (PayoutPreview memory preview) {
        preview.grossPrice = grossPrice;
        preview.protocolFee = (grossPrice * uint256(protocolFeeBps)) / 10_000;
        require(marketplaceFeeBps <= MAX_MARKETPLACE_FEE_BPS, "Marketplace fee too high");
        preview.marketplaceFee = (grossPrice * uint256(marketplaceFeeBps)) / 10_000;

        uint256 remainingAfterFees = grossPrice - preview.protocolFee - preview.marketplaceFee;

        (preview.royaltyRecipient, preview.royaltyAmount) = _lookupRoyalty(nftContract, tokenId, grossPrice);
        require(preview.royaltyAmount <= remainingAfterFees, "Royalty exceeds seller proceeds");

        uint256 royaltyPaid = _royaltyPayoutAmount(preview.royaltyAmount, preview.royaltyRecipient);
        preview.sellerProceeds = remainingAfterFees - royaltyPaid;
    }

    function _lookupRoyalty(address nftContract, uint256 tokenId, uint256 salePrice)
        internal
        view
        returns (address royaltyRecipient, uint256 royaltyAmount)
    {
        if (!_supportsERC2981(nftContract)) {
            return (address(0), 0);
        }

        (royaltyRecipient, royaltyAmount) = IERC2981(nftContract).royaltyInfo(tokenId, salePrice);
    }

    function _royaltyPayoutAmount(uint256 royaltyAmount, address royaltyRecipient)
        internal
        pure
        returns (uint256)
    {
        if (royaltyAmount == 0 || royaltyRecipient == address(0)) {
            return 0;
        }

        return royaltyAmount;
    }

    function _supportsERC2981(address nftContract) internal view returns (bool) {
        if (nftContract.code.length == 0) {
            return false;
        }

        try IERC165(nftContract).supportsInterface(type(IERC2981).interfaceId) returns (bool supported) {
            return supported;
        } catch {
            return false;
        }
    }
}
