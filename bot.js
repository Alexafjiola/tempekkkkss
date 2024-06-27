const {
    Connection,
    LAMPORTS_PER_SOL,
    Transaction,
    SystemProgram,
    sendAndConfirmTransaction,
    PublicKey,
    Keypair,
  } = require('@solana/web3.js');
  const fs = require('fs');
  const colors = require('colors');
  const bip39 = require('bip39');
  const { derivePath } = require('ed25519-hd-key');
  const base58 = require('bs58');
  const DEVNET_URL = 'https://devnet.sonic.game/';
  const connection = new Connection(DEVNET_URL, 'confirmed');
  
  const MIN_AMOUNT = 0.001;
  const MAX_AMOUNT = 0.0015;
  
  function getRandomAmount() {
    // Menghasilkan nilai acak antara MIN_AMOUNT dan MAX_AMOUNT
    return MIN_AMOUNT + Math.random() * (MAX_AMOUNT - MIN_AMOUNT);
  }
  
  async function sendSol(fromKeypair, toPublicKey, amount) {
    const lamports = BigInt(Math.round(amount * LAMPORTS_PER_SOL));
  
    try {
      // Periksa saldo yang tersedia di akun pengirim sebelum melakukan transfer
      const accountInfo = await connection.getAccountInfo(fromKeypair.publicKey);
      const balanceInSol = accountInfo.lamports / LAMPORTS_PER_SOL;
      if (balanceInSol < amount) {
        throw new Error('Saldo tidak mencukupi untuk mengirimkan transfer');
      }
  
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: fromKeypair.publicKey,
          toPubkey: toPublicKey,
          lamports: lamports,
        })
      );
  
      const signature = await sendAndConfirmTransaction(connection, transaction, [
        fromKeypair,
      ]);
      console.log(colors.green('Transaksi di Konfirmasi:'), signature);
      console.log(colors.green(`Sukses ${amount} SOL to ${toPublicKey.toString()}`));
    } catch (error) {
      console.error(colors.red(`Gagal mengirim SOL ke ${toPublicKey.toString()}:`), error);
      if (error.message.includes('insufficient funds for rent')) {
        console.error(colors.red('Saldo tidak mencukupi untuk membayar biaya sewa akun.'));
      }
    }
  }
  
  function generateRandomAddresses(count) {
    return Array.from({ length: count }, () =>
      Keypair.generate().publicKey.toString()
    );
  }
  
  function getKeypairFromPrivateKey(privateKeyBase58) {
    const privateKeyBytes = base58.decode(privateKeyBase58);
    const keypair = Keypair.fromSecretKey(privateKeyBytes);
    return keypair;
  }
  
  function displayHeader() {
    console.log(colors.magenta('--- Solana Transaction Script ---'));
  }
  
  (async () => {
    while (true) {
      displayHeader();
  
      const method = '1';
  
      let seedPhrasesOrKeys;
  
      if (method === '1') {
        seedPhrasesOrKeys = JSON.parse(fs.readFileSync('privateKeys.json', 'utf-8'));
        if (!Array.isArray(seedPhrasesOrKeys) || seedPhrasesOrKeys.length === 0) {
          throw new Error(
            colors.red('privateKeys.json is not set correctly or is empty')
          );
        }
      } else {
        throw new Error(colors.red('Invalid input method selected'));
      }
  
      const addressCount = 200;
  
      if (isNaN(addressCount) || addressCount <= 0) {
        throw new Error(colors.red('Invalid number of addresses specified'));
      }
  
      const randomAddresses = generateRandomAddresses(addressCount);
  
      console.log(
        colors.blue(`Generated ${addressCount} random addresses:`),
        randomAddresses
      );
  
      for (const [index, seedOrKey] of seedPhrasesOrKeys.entries()) {
        let fromKeypair;
        if (method === '0') {
          fromKeypair = await getKeypairFromSeed(seedOrKey);
        } else {
          fromKeypair = getKeypairFromPrivateKey(seedOrKey);
        }
        console.log(
          colors.yellow(
            `Kirim SOL Ke Wallet ${index + 1}: ${fromKeypair.publicKey.toString()}`
          )
        );
  
        for (const address of randomAddresses) {
          const toPublicKey = new PublicKey(address);
          const amountToSend = getRandomAmount();
  
          try {
            await sendSol(fromKeypair, toPublicKey, amountToSend);
            console.log(
              colors.green(`Sukses ${amountToSend} SOL to ${address}`)
            );
          } catch (error) {
            console.error(colors.red(`Gagal mengirim SOL ke ${address}:`), error);
          }
        }
      }
  
      const waitTimeInSeconds = 24 * 60 * 60; 
      console.log(colors.yellow(`Menunggu ${waitTimeInSeconds} detik sebelum mengirim kembali...`));
      await sleep(waitTimeInSeconds * 1000); // Tunggu 24 jam sebelum mengulang (dikonversi ke milidetik)
  
      console.log(colors.yellow('Waktu istirahat selesai, mengirim kembali...'));
    }
  })();
  
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  