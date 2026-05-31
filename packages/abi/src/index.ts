import { pariMarketAbi } from "./generated/pariMarketAbi";
import { mockErc721Abi } from "./generated/mockErc721Abi";
import { erc721rtAbi } from "./generated/erc721rtAbi";
import { erc721rtFactoryAbi } from "./generated/erc721rtFactoryAbi";

export { pariMarketAbi, mockErc721Abi, erc721rtAbi, erc721rtFactoryAbi };

export const abis = {
  PariMarket: pariMarketAbi,
  MockERC721: mockErc721Abi,
  ERC721RT: erc721rtAbi,
  ERC721RTFactory: erc721rtFactoryAbi,
} as const;
