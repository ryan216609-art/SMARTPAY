
import { JsonRpcProvider, Wallet, Contract } from "ethers";

const RPC_URL = process.env.BLOCKCHAIN_RPC_URL;
const CONTRACT_ADDRESS = process.env.SPAY_CONTRACT_ADDRESS;
const PRIVATE_KEY = process.env.BLOCKCHAIN_PRIVATE_KEY;

if (!RPC_URL || !CONTRACT_ADDRESS || !PRIVATE_KEY) {
  throw new Error(
    "Configure BLOCKCHAIN_RPC_URL, SPAY_CONTRACT_ADDRESS e BLOCKCHAIN_PRIVATE_KEY no .env."
  );
}

const provider = new JsonRpcProvider(RPC_URL);
const signer = new Wallet(PRIVATE_KEY, provider);

const SPAY_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 value) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

const spayToken = new Contract(
  CONTRACT_ADDRESS,
  SPAY_ABI,
  signer
);

export {
  provider,
  signer,
  spayToken,
  CONTRACT_ADDRESS,
  SPAY_ABI
};
