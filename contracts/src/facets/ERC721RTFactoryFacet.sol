// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721RT} from "../tokens/ERC721RT.sol";
import {IERC721RTFactory} from "../interfaces/IERC721RTFactory.sol";
import {PariStorage} from "../libraries/PariStorage.sol";

contract ERC721RTFactoryFacet is IERC721RTFactory {
    function createCollection(
        string calldata name,
        string calldata symbol,
        string calldata baseURI,
        string calldata contractURI,
        address royaltyRecipient,
        uint96 royaltyBps
    ) external returns (address collection) {
        require(bytes(name).length > 0, "Name required");
        require(bytes(symbol).length > 0, "Symbol required");
        require(royaltyBps <= 10_000, "Royalty BPS too high");

        PariStorage.Layout storage ds = PariStorage.layout();
        bytes32 salt = keccak256(abi.encode(msg.sender, name, symbol, ds.creatorCollections[msg.sender].length));

        collection = address(
            new ERC721RT{salt: salt}(name, symbol, msg.sender, baseURI, contractURI, royaltyRecipient, royaltyBps)
        );

        ds.creatorCollections[msg.sender].push(collection);
        ds.collectionCreator[collection] = msg.sender;

        emit CollectionCreated(msg.sender, collection, name, symbol, royaltyRecipient, royaltyBps);
    }

    function getCreatorCollections(address creator) external view returns (address[] memory) {
        return PariStorage.layout().creatorCollections[creator];
    }

    function getCollectionCreator(address collection) external view returns (address) {
        return PariStorage.layout().collectionCreator[collection];
    }
}
