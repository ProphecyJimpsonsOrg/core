"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initToken = initToken;
exports.mintTokens = mintTokens;
const anchor = __importStar(require("@coral-xyz/anchor"));
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
// Constants for Metaplex Metadata Program
const METADATA_SEED = "metadata";
const TOKEN_METADATA_PROGRAM_ID = new web3_js_1.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
const MINT_SEED = "mint";
// Metadata for the token
const metadata = {
    name: "Prophecy Jimpsons Token",
    symbol: "PJT",
    uri: "https://example.com/metadata.json",
    decimals: 9,
};
// Helper function to create a PublicKey using a seed
function findPDA(seed, programId) {
    return __awaiter(this, void 0, void 0, function* () {
        const [pda] = yield web3_js_1.PublicKey.findProgramAddress([Buffer.from(seed)], programId);
        return pda;
    });
}
// Initialize the token mint account
function initToken(program, wallet) {
    return __awaiter(this, void 0, void 0, function* () {
        const mintPDA = yield findPDA(MINT_SEED, program.programId);
        const metadataAccount = anchor.web3.Keypair.generate();
        const mintInfo = yield program.provider.connection.getAccountInfo(mintPDA);
        if (mintInfo) {
            console.log("Mint account already initialized.");
            return; // Skip initialization if already done
        }
        console.log("Mint not found. Attempting to initialize.");
        yield program.methods
            .initToken(metadata)
            .accounts({
            metadata: metadataAccount.publicKey,
            mint: mintPDA,
            payer: wallet.payer.publicKey,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            systemProgram: web3_js_1.SystemProgram.programId,
            tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
            tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        })
            .signers([metadataAccount])
            .rpc();
        console.log(`Token mint created successfully with mint account: ${mintPDA.toString()}`);
    });
}
// Mint tokens to the associated account
function mintTokens(program, wallet, quantity) {
    return __awaiter(this, void 0, void 0, function* () {
        const mintPDA = yield findPDA(MINT_SEED, program.programId);
        const associatedTokenAccount = yield web3_js_1.PublicKey.findProgramAddress([
            wallet.publicKey.toBuffer(),
            spl_token_1.TOKEN_PROGRAM_ID.toBuffer(),
            mintPDA.toBuffer(),
        ], spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID);
        const tokenAccountInfo = yield program.provider.connection.getAccountInfo(associatedTokenAccount[0]);
        if (!tokenAccountInfo) {
            console.log("Token account does not exist. Minting new tokens...");
        }
        else {
            console.log("Token account already exists.");
        }
        yield program.methods
            .mintTokens(new anchor.BN(quantity * 10 ** metadata.decimals))
            .accounts({
            mint: mintPDA,
            destination: associatedTokenAccount[0],
            payer: wallet.payer.publicKey,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            systemProgram: web3_js_1.SystemProgram.programId,
            tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
            associatedTokenProgram: spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID,
        })
            .rpc();
        console.log(`${quantity} tokens minted to: ${associatedTokenAccount[0].toString()}`);
    });
}
// Main function to initialize and mint tokens
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const provider = anchor.AnchorProvider.env();
        anchor.setProvider(provider);
        const wallet = provider.wallet;
        const programId = new web3_js_1.PublicKey("2TzHByPErwibykALEpSEkCGAD5Zct78vy1w6vS7U4isz");
        const idl = yield anchor.Program.fetchIdl(programId, provider);
        if (!idl) {
            throw new Error("IDL not found");
        }
        const program = new anchor.Program(idl, programId, provider);
        try {
            console.log("Initializing token...");
            yield initToken(program, wallet);
            console.log("Minting tokens...");
            yield mintTokens(program, wallet, 1000000);
        }
        catch (error) {
            console.error("Error:", error);
        }
    });
}
// Run the main function
main().catch(console.error);
