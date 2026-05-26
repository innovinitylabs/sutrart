// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

library SutrartStorage {
    bytes32 internal constant STORAGE_POSITION = keccak256("sutrart.protocol.storage.v1");

    uint96 internal constant MAX_PROTOCOL_FEE_BPS = 1000;
    uint96 internal constant MAX_MARKETPLACE_FEE_BPS = 2500;
    uint256 internal constant REENTRANCY_NOT_ENTERED = 1;
    uint256 internal constant REENTRANCY_ENTERED = 2;

    struct Listing {
        uint256 listingId;
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 price;
        bool active;
        uint256 createdAt;
    }

    struct Layout {
        mapping(uint256 listingId => Listing) listings;
        uint256 nextListingId;
        uint96 protocolFeeBps;
        address protocolTreasury;
        uint256 reentrancyStatus;
        bool initialized;
    }

    function layout() internal pure returns (Layout storage ds) {
        bytes32 position = STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }

    function initialize(address treasury) internal {
        Layout storage ds = layout();
        require(!ds.initialized, "SutrartStorage: already initialized");
        require(treasury != address(0), "Protocol treasury is zero");
        ds.nextListingId = 1;
        ds.protocolFeeBps = 50;
        ds.protocolTreasury = treasury;
        ds.reentrancyStatus = REENTRANCY_NOT_ENTERED;
        ds.initialized = true;
    }

    function enterNonReentrant() internal {
        Layout storage ds = layout();
        require(ds.reentrancyStatus != REENTRANCY_ENTERED, "ReentrancyGuard: reentrant call");
        ds.reentrancyStatus = REENTRANCY_ENTERED;
    }

    function exitNonReentrant() internal {
        layout().reentrancyStatus = REENTRANCY_NOT_ENTERED;
    }
}
