// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC721} from "openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";
import {ISutrartMarket} from "../interfaces/ISutrartMarket.sol";
import {SutrartPayouts} from "../libraries/SutrartPayouts.sol";
import {SutrartStorage} from "../libraries/SutrartStorage.sol";
import {SutrartValidation} from "../libraries/SutrartValidation.sol";

contract SettlementFacet {
    function previewPayouts(uint256 listingId, uint96 marketplaceFeeBps)
        external
        view
        returns (ISutrartMarket.PayoutPreview memory)
    {
        SutrartStorage.Listing storage listing = SutrartStorage.layout().listings[listingId];
        require(listing.seller != address(0), "Listing does not exist");

        return
            SutrartPayouts.computePayoutPreview(listing.nftContract, listing.tokenId, listing.price, marketplaceFeeBps);
    }

    function buyListing(uint256 listingId, address marketplaceFeeRecipient, uint96 marketplaceFeeBps) external payable {
        SutrartStorage.enterNonReentrant();
        _buyListing(listingId, marketplaceFeeRecipient, marketplaceFeeBps);
        SutrartStorage.exitNonReentrant();
    }

    function _buyListing(uint256 listingId, address marketplaceFeeRecipient, uint96 marketplaceFeeBps) private {
        SutrartStorage.Layout storage ds = SutrartStorage.layout();
        SutrartStorage.Listing storage listing = ds.listings[listingId];

        require(SutrartValidation.isListingValid(listingId), "Listing is not valid");
        require(msg.sender != listing.seller, "Seller cannot buy own listing");
        require(msg.value == listing.price, "Incorrect ETH amount");

        ISutrartMarket.PayoutPreview memory payout =
            SutrartPayouts.computePayoutPreview(listing.nftContract, listing.tokenId, listing.price, marketplaceFeeBps);

        if (payout.marketplaceFee > 0) {
            require(marketplaceFeeRecipient != address(0), "Marketplace fee recipient is zero");
        }

        listing.active = false;

        IERC721(listing.nftContract).safeTransferFrom(listing.seller, msg.sender, listing.tokenId);

        if (payout.protocolFee > 0) {
            require(ds.protocolTreasury != address(0), "Protocol treasury not set");
            (bool sentProtocolFee,) = payable(ds.protocolTreasury).call{value: payout.protocolFee}("");
            require(sentProtocolFee, "Protocol fee transfer failed");
        }

        if (payout.marketplaceFee > 0) {
            (bool sentMarketplaceFee,) = payable(marketplaceFeeRecipient).call{value: payout.marketplaceFee}("");
            require(sentMarketplaceFee, "Marketplace fee transfer failed");
        }

        uint256 royaltyPaid = SutrartPayouts.royaltyPayoutAmount(payout.royaltyAmount, payout.royaltyRecipient);
        if (royaltyPaid > 0) {
            (bool sentRoyalty,) = payable(payout.royaltyRecipient).call{value: royaltyPaid}("");
            require(sentRoyalty, "Royalty transfer failed");
        }

        (bool sentSeller,) = payable(listing.seller).call{value: payout.sellerProceeds}("");
        require(sentSeller, "ETH transfer failed");

        emit ISutrartMarket.ListingSold(
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
}
