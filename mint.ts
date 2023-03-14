import { Transaction, SystemProgram, Keypair, Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { MINT_SIZE, TOKEN_PROGRAM_ID, createInitializeMintInstruction, getMinimumBalanceForRentExemptMint, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createMintToInstruction } from '@solana/spl-token';
import { DataV2, createCreateMetadataAccountV2Instruction } from '@metaplex-foundation/mpl-token-metadata';
import { bundlrStorage, findMetadataPda, keypairIdentity, Metaplex, UploadMetadataInput } from '@metaplex-foundation/js';
import * as pkg from 'bs58';


const privatekey ='';
const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
console.log('Connection succesfull');
  

const MINT_CONFIG = {
    numDecimals: 6,
    numberTokens: 1500
}

const MY_TOKEN_METADATA: UploadMetadataInput = {
    name: "THOMAS FUCKIN SHELBY",
    symbol: "TFS",
    description: "This is a shelby's token!",
    image: "https://www.bing.com/ck/a?!&&p=3a5e0626d69c4770JmltdHM9MTY3ODc1MjAwMCZpZ3VpZD0yNDVkNjc4Yi1mMjNkLTYzYjMtMzVkMy03N2I4ZjNjYTYyMjAmaW5zaWQ9NTQ5Nw&ptn=3&hsh=3&fclid=245d678b-f23d-63b3-35d3-77b8f3ca6220&u=a1L2ltYWdlcy9zZWFyY2g_cT1UaG9tYXMlMjBTaGVsYnklMjBXYWxscGFwZXIlMjBQTkcmRk9STT1JUUZSQkEmaWQ9RUUxNDNBNDQzNEJCNUM1REZBNTAzN0RENDZCNTZCOTUyNTVBNDY0NA&ntb=1" //add public URL to image you'd like to use
}

const ON_CHAIN_METADATA = {
    name: MY_TOKEN_METADATA.name, 
    symbol: MY_TOKEN_METADATA.symbol,
    uri: 'TO_UPDATE_LATER',
    sellerFeeBasisPoints: 0,
    creators: null,
    collection: null,
    uses: null
} as DataV2;

/**
 * 
 * @param wallet Solana Keypair
 * @param tokenMetadata Metaplex Fungible Token Standard object 
 * @returns Arweave url for our metadata json file
 */
 const uploadMetadata = async(wallet: Keypair, tokenMetadata: UploadMetadataInput):Promise<string> => {
    //create metaplex instance on devnet using this wallet
    const metaplex = Metaplex.make(connection)
        .use(keypairIdentity(wallet))
        .use(bundlrStorage({
        address: 'https://devnet.bundlr.network',
        providerUrl: 'https://solana-devnet.g.alchemy.com/v2/YP9VNLdrXJrU8a_2o63SyYV7ZtguZkId',
        timeout: 60000,
        }));
    
    //Upload to Arweave
    const { uri } = await metaplex.nfts().uploadMetadata(tokenMetadata);
    console.log(`Arweave URL: `, uri);
    return uri;
}

const createNewMintTransaction = async (connection:Connection, payer:Keypair, mintKeypair: Keypair, destinationWallet: PublicKey, mintAuthority: PublicKey, freezeAuthority: PublicKey)=>{
    //Get the minimum lamport balance to create a new account and avoid rent payments
    const requiredBalance = await getMinimumBalanceForRentExemptMint(connection);
    //metadata account associated with mint
    const metadataPDA = await findMetadataPda(mintKeypair.publicKey);
    //get associated token account of your wallet
    const tokenATA = await getAssociatedTokenAddress(mintKeypair.publicKey, destinationWallet);   
    

    const createNewTokenTransaction = new Transaction().add(
        SystemProgram.createAccount({
            fromPubkey: payer.publicKey,
            newAccountPubkey: mintKeypair.publicKey,
            space: MINT_SIZE,
            lamports: requiredBalance,
            programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(
          mintKeypair.publicKey, //Mint Address
          MINT_CONFIG.numDecimals, //Number of Decimals of New mint
          mintAuthority, //Mint Authority
          freezeAuthority, //Freeze Authority
          TOKEN_PROGRAM_ID),
        createAssociatedTokenAccountInstruction(
          payer.publicKey, //Payer 
          tokenATA, //Associated token account 
          payer.publicKey, //token owner
          mintKeypair.publicKey, //Mint
        ),
        createMintToInstruction(
          mintKeypair.publicKey, //Mint
          tokenATA, //Destination Token Account
          mintAuthority, //Authority
          MINT_CONFIG.numberTokens * Math.pow(10, MINT_CONFIG.numDecimals),//number of tokens
        ),
        createCreateMetadataAccountV2Instruction({
            metadata: metadataPDA, 
            mint: mintKeypair.publicKey, 
            mintAuthority: mintAuthority,
            payer: payer.publicKey,
            updateAuthority: mintAuthority,
          },
          { createMetadataAccountArgsV2: 
            { 
              data: ON_CHAIN_METADATA, 
              isMutable: true 
            } 
          }
        )
    );

    return createNewTokenTransaction;
}
const main = async() => {
    console.log(`---STEP 1: Uploading MetaData---`);
    const userWallet = Keypair.fromSecretKey(pkg.decode(privatekey))
    let metadataUri = await uploadMetadata(userWallet, MY_TOKEN_METADATA);
    ON_CHAIN_METADATA.uri = metadataUri;

    console.log(`---STEP 2: Creating Mint Transaction---`);
    let mintKeypair = Keypair.generate();   
    console.log(`New Mint Address: `, mintKeypair.publicKey.toString());

    const newMintTransaction:Transaction = await createNewMintTransaction(
        connection,
        userWallet,
        mintKeypair,
        userWallet.publicKey,
        userWallet.publicKey,
        userWallet.publicKey
    );

    console.log(`---STEP 3: Executing Mint Transaction---`);
    const transactionId =  await connection.sendTransaction(newMintTransaction, [userWallet, mintKeypair]);
    console.log(`Transaction ID: `, transactionId);
    console.log(`Succesfully minted ${MINT_CONFIG.numberTokens} ${ON_CHAIN_METADATA.symbol} to ${userWallet.publicKey.toString()}.`);
    console.log(`View Transaction: https://explorer.solana.com/tx/${transactionId}?cluster=devnet`);
    console.log(`View Token Mint: https://explorer.solana.com/address/${mintKeypair.publicKey.toString()}?cluster=devnet`)
}
main();