import * as anchor from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Connection, Keypair } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import BN from 'bn.js';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Constants
const METADATA_SEED = "metadata";
const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

const PROGRAM_ID = new PublicKey("EjNJTD8WJDkXqVhrPqEKHnbU1j6kQDJ2Lt4CoutTW9Cs");

// Metadata for the token
const metadata = {
  name: "Prophecy Jimpsons Token",
  symbol: "PJT",
  uri: "https://example.com/metadata.json",
  decimals: 9,
};

const MINT_SEED = `mint2`;

// Helper function to create a PublicKey using a seed
async function findPDA(seed: string, programId: PublicKey) {
  const [pda] = await PublicKey.findProgramAddress([Buffer.from(seed)], programId);
  return pda;
}

// Function to load keypair from file
function loadKeypair(filePath: string): Keypair {
  const secretKey = new Uint8Array(JSON.parse(fs.readFileSync(filePath, 'utf8')));
  return Keypair.fromSecretKey(secretKey);
}

// Initialize the token mint account
async function initToken(program: anchor.Program, wallet: anchor.Wallet) {
  const mintPDA = await findPDA(MINT_SEED, program.programId);
  const metadataAccount = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mintPDA.toBuffer()],
    TOKEN_METADATA_PROGRAM_ID
  )[0];
  
  console.log("Mint PDA:", mintPDA.toString());
  console.log("Metadata Account:", metadataAccount.toString());
  console.log("Payer (Wallet):", wallet.publicKey.toString());
  console.log("Program ID:", program.programId.toString());
  
  const mintInfo = await program.provider.connection.getAccountInfo(mintPDA);
  if (mintInfo) {
    console.log("Mint account already initialized.");
    return;
  }
  
  console.log("Mint not found. Attempting to initialize.");
  try {
    await program.methods
      .initToken(metadata)
      .accounts({
        metadata: metadataAccount,
        mint: mintPDA,
        payer: wallet.publicKey,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      })
      .rpc();
    console.log(`Token mint created successfully with mint account: ${mintPDA.toString()}`);
  } catch (error) {
    console.error("Error in initToken:", error);
    console.log("Program ID:", program.programId.toString());
    throw error;
  }
}

// Mint tokens to the associated account
async function mintTokens(program: anchor.Program, wallet: anchor.Wallet) {
  const mintPDA = await findPDA(MINT_SEED, program.programId);
  const associatedTokenAccount = await PublicKey.findProgramAddress(
    [
      wallet.publicKey.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      mintPDA.toBuffer(),
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  const tokenAccountInfo = await program.provider.connection.getAccountInfo(associatedTokenAccount[0]);
  if (!tokenAccountInfo) {
    console.log("Token account does not exist. Minting new tokens...");
  } else {
    console.log("Token account already exists.");
  }
  
  // Calculate the amount to mint (1 billion tokens)
  const oneBillion = new BN(1000000000);
  const decimalsBN = new BN(10).pow(new BN(metadata.decimals));
  const amountToMint = oneBillion.mul(decimalsBN);

  await program.methods
    .mintTokens(amountToMint)
    .accounts({
      mint: mintPDA,
      destination: associatedTokenAccount[0],
      payer: wallet.publicKey,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .rpc();
  console.log(`1,000,000,000 tokens minted to: ${associatedTokenAccount[0].toString()}`);
}

// Main function to initialize and mint tokens
async function main() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  
  // Load the keypair from pj_final2-keypair.json
  const keypairPath = path.join('/home/arushr/.config/solana/id.json');
  const keypair = loadKeypair(keypairPath);
  const wallet = new anchor.Wallet(keypair);

  const idlPath = path.join(__dirname, '../../pj-final2/target/idl/token_minter.json');
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));


  // Create the provider
  const provider = new anchor.AnchorProvider(connection, wallet, {
    preflightCommitment: "confirmed",
  });

  // Set the provider as the default one
  anchor.setProvider(provider);

  console.log("Provider's wallet public key:", provider.wallet.publicKey.toString());
  console.log("Program ID:", PROGRAM_ID.toString());
  console.log("Wallet public key:", wallet.publicKey.toString());

  // Fetch the IDL
  if (!idl) {
    throw new Error("IDL not found");
  }
  
  const program = new anchor.Program(idl, PROGRAM_ID, provider);

  try {
    console.log("Initializing token...");
    await initToken(program, wallet);
    console.log("Minting tokens...");
    await mintTokens(program, wallet);
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the main function
main().catch(console.error);