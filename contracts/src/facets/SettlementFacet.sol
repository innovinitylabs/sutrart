// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IPariMarket} from "../interfaces/IPariMarket.sol";
import {PariPayouts} from "../libraries/PariPayouts.sol";
import {PariSettlement} from "../libraries/PariSettlement.sol";
import {PariStorage} from "../libraries/PariStorage.sol";
import {PariValidation} from "../libraries/PariValidation.sol";

contract SettlementFacet {
    function previewPayouts(uint256 listingId, uint96 marketplaceFeeBps)
        external
        view
        returns (IPariMarket.PayoutPreview memory)
    {
        PariStorage.Listing storage listing = PariStorage.layout().listings[listingId];
        require(listing.seller != address(0), "Listing does not exist");

        return
            PariPayouts.computePayoutPreview(listing.nftContract, listing.tokenId, listing.price, marketplaceFeeBps);
    }

    function buyListing(uint256 listingId, address marketplaceFeeRecipient, uint96 marketplaceFeeBps) external payable {
        PariStorage.enterNonReentrant();
        _buyListing(listingId, marketplaceFeeRecipient, marketplaceFeeBps);
        PariStorage.exitNonReentrant();
    }

    function _buyListing(uint256 listingId, address marketplaceFeeRecipient, uint96 marketplaceFeeBps) private {
        PariStorage.Layout storage ds = PariStorage.layout();
        PariStorage.Listing storage listing = ds.listings[listingId];

        require(PariValidation.isListingValid(listingId), "Listing is not valid");
        require(msg.sender != listing.seller, "Seller cannot buy own listing");
        require(msg.value == listing.price, "Incorrect ETH amount");

        listing.active = false;

        IPariMarket.PayoutPreview memory payout = PariSettlement.executeSale(
            listing.seller,
            msg.sender,
            listing.nftContract,
            listing.tokenId,
            listing.price,
            marketplaceFeeRecipient,
            marketplaceFeeBps
        );

        emit IPariMarket.ListingSold(
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
