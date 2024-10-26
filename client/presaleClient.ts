import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PresaleProgram } from "../target/types/presale_program";
import BN from "bn.js";

const MINT_SEED = "mint_seed";

async function findPDA(seed: string, programId: PublicKey): Promise<PublicKey> {
  const [pda] = await PublicKey.findProgramAddress([Buffer.from(seed)], programId);
  return pda;
}

async function createPresale(
  program: Program<PresaleProgram>,
  wallet: anchor.Wallet,
  pricePerToken: number,
  totalTokens: number,
  presaleStart: number,
  presaleEnd: number
): Promise<void> {
  const presalePDA = await findPDA(MINT_SEED, program.programId);
  const tokenMint = new PublicKey("CPavmEMtrWhv1Xfj7FZg1GhqKx6r4LhHyATDRHJc5Nc4");

  const [adminTokenAccount] = await PublicKey.findProgramAddress(
    [wallet.publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), tokenMint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const presaleTokenVault = new PublicKey("3jdtccyrzV8LwkH8cBfxgN6fDyxxYTFtTGwtDyc9hD2K");

  try {
    await program.methods
      .createPresale(
        new BN(pricePerToken),
        new BN(totalTokens),
        new BN(presaleStart),
        new BN(presaleEnd)
      )
      .accounts({
        admin: wallet.publicKey,
        presale: presalePDA,
        tokenMint: tokenMint,
        adminTokenAccount: adminTokenAccount,
        presaleTokenVault: presaleTokenVault,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log("Presale created successfully.");
  } catch (error) {
    console.error("Error creating presale:", error);
    throw error;
  }
}

async function participateInPresale(
  program: Program<PresaleProgram>,
  wallet: anchor.Wallet,
  amount: number
): Promise<void> {
  const presalePDA = await findPDA(MINT_SEED, program.programId);
  const tokenMint = new PublicKey("CPavmEMtrWhv1Xfj7FZg1GhqKx6r4LhHyATDRHJc5Nc4");

  const [buyerTokenAccount] = await PublicKey.findProgramAddress(
    [wallet.publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), tokenMint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const presaleTokenVault = new PublicKey("3jdtccyrzV8LwkH8cBfxgN6fDyxxYTFtTGwtDyc9hD2K");

  try {
    await program.methods
      .participate(new BN(amount))
      .accounts({
        buyer: wallet.publicKey,
        admin: new PublicKey("2dMqTJC87XAC6grsLEpDLf2PdeNm2ujMw3Bu4maSWW6Z"),
        presale: presalePDA,
        tokenMint: tokenMint,
        buyerTokenAccount: buyerTokenAccount,
        presaleTokenVault: presaleTokenVault,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log(`Successfully participated with ${amount} tokens.`);
  } catch (error) {
    console.error("Error participating in presale:", error);
    throw error;
  }
}

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const wallet = provider.wallet as anchor.Wallet;
  const programId = new PublicKey("CDSXanmPbW46F8mSpWvC6hvFnqn9hikPcPEKPjWCo7ov");
  
  const idl = await Program.fetchIdl(programId, provider);
  if (!idl) throw new Error("IDL not found");

  const program = new Program(idl as PresaleProgram, programId, provider);

  console.log("Creating presale...");
  try {
    await createPresale(program, wallet, 1000000, 1000000, Date.now() / 1000, (Date.now() / 1000) + 86400);
    console.log("Presale created successfully.");

    console.log("Participating in presale...");
    await participateInPresale(program, wallet, 100);
    console.log("Participated in presale successfully.");
  } catch (error) {
    console.error("Error executing presale actions:", error);
  }
}

main().then(() => console.log("Done")).catch(console.error);