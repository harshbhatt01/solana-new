import {Keypair,LAMPORTS_PER_SOL,Connection,clusterApiUrl,} from '@solana/web3.js';
import * as pkg from 'bs58';
  
  //STEP 1 - Connect to Solana Network
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  console.log('Connection succesfull');
  
  const privatekey ='';
  
  const payer = Keypair.fromSecretKey(pkg.decode(privatekey));
  // console.log('payer is -> ', payer);
  
  //STEP 4 - Airdrop 1 SOL to new wallet
  const main = async () => {
    const airdropSignature = connection.requestAirdrop(
      payer.publicKey,
      LAMPORTS_PER_SOL
    );
    try {
      const txId = await airdropSignature;
      console.log(`Airdrop Transaction Id: ${txId}`);
    } catch (err) {
      console.log(err);
    }
  };
  main();
  