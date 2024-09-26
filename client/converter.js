import { Keypair } from '@solana/web3.js';
import fs from 'fs';

// Load the Keypair from the file
function loadKeypair(filePath) {
  const secretKey = new Uint8Array(JSON.parse(fs.readFileSync(filePath, 'utf-8')));
  return Keypair.fromSecretKey(secretKey);
}

const keypairPath = '/home/arushr/.config/solana/id.json';
const keypair = loadKeypair(keypairPath);

// Convert the private key to Base64
const privateKeyBase64 = Buffer.from(keypair.secretKey).toString('base64');
console.log("Private Key (Base64):", privateKeyBase64);

const privateKeyHex = Array.from(keypair.secretKey).map(byte => byte.toString(16).padStart(2, '0')).join('');
console.log("Private Key (Hex):", privateKeyHex);

//Loader