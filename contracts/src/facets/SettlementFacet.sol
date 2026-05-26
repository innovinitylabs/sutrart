// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ISutrartMarket} from "../interfaces/ISutrartMarket.sol";
import {SutrartPayouts} from "../libraries/SutrartPayouts.sol";
import {SutrartSettlement} from "../libraries/SutrartSettlement.sol";
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

        listing.active = false;

        ISutrartMarket.PayoutPreview memory payout = SutrartSettlement.executeSale(
            listing.seller,
            msg.sender,
            listing.nftContract,
            listing.tokenId,
            listing.price,
            marketplaceFeeRecipient,
            marketplaceFeeBps
        );

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
