import * as bitcoin from "bitcoinjs-lib";
import { Taptree } from 'bitcoinjs-lib/src/types';
import { LEAF_VERSION_TAPSCRIPT } from 'bitcoinjs-lib/src/payments/bip341.js';
import { toXOnly } from 'bitcoinjs-lib/src/psbt/bip371.js';
import { witnessStackToScriptWitness } from 'bitcoinjs-lib/src/psbt/psbtutils.js';
import { PsbtInput } from 'bip174/src/lib/interfaces.js';
import { ECPairFactory, ECPairAPI } from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import * as tools from 'uint8array-tools';

import * as rpc from './bitcoinrpc.js';


async function sleepMsec(msec: number) {
  new Promise(resolve => setTimeout(resolve, msec));
}

const FEE = 1000;

const network = bitcoin.networks.regtest;
const ECPair: ECPairAPI = ECPairFactory(ecc);

bitcoin.initEccLib(ecc);

(async () => {
  let res;

  // for generatetoaddress
  const genAddr = await rpc.request('getnewaddress') as rpc.GetNewAddress;


  // internal key
  const privKey = Buffer.from('1229101a0fcf2104e8808dab35661134aa5903867d44deb73ce1c7e4eb925be8', 'hex');
  const internalKey = ECPair.fromPrivateKey(privKey, {network});

  // script Alice
  const CSV_DELAY = 144;
  const keyAlice = ECPair.fromPrivateKey(Buffer.from('2bd806c97f0e00af1a1fc3328fa763a9269723c8db8fac4f93af71db186d6e90', 'hex'));
  const alice_script_asm = `${tools.toHex(bitcoin.script.number.encode(CSV_DELAY))} OP_CHECKSEQUENCEVERIFY OP_DROP ${toXOnly(keyAlice.publicKey).toString('hex')} OP_CHECKSIG`;
  const alice_lock_script = bitcoin.script.fromASM(alice_script_asm);
  console.log(`alice_lock_script: ${alice_lock_script.toString('hex')}`);

  // script Bob
  const preimage = Buffer.from('107661134f21fc7c02223d50ab9eb3600bc3ffc3712423a1e47bb1f9a9dbf55f', 'hex');
  const payment_hash = bitcoin.crypto.sha256(preimage);
  const keyBob = ECPair.fromPrivateKey(Buffer.from('81b637d8fcd2c6da6359e6963113a1170de795e4b725b84d1e0b4cfd9ec58ce9', 'hex'));
  const bob_script_asm = `OP_SHA256 ${payment_hash.toString('hex')} OP_EQUALVERIFY ${toXOnly(keyBob.publicKey).toString('hex')} OP_CHECKSIG`;
  const bob_lock_script = bitcoin.script.fromASM(bob_script_asm);
  console.log(`bob_lock_script: ${bob_lock_script.toString('hex')}`);

  const scriptTree: Taptree = [
    {
      output: alice_lock_script
    },
    {
      output: bob_lock_script
    }
  ];

  // P2TR script path address
  const scriptPath = bitcoin.payments.p2tr({
    internalPubkey: toXOnly(internalKey.publicKey),
    scriptTree,
    network
  });
  console.log(`internal pubkey: ${toXOnly(internalKey.publicKey).toString('hex')}`);
  const scriptPathAddr = scriptPath.address!;
  console.log(`address: ${scriptPathAddr}`);

  // send to address
  const txid = await rpc.request('sendtoaddress', scriptPathAddr, 0.001) as rpc.SendToAddress;
  console.log(`send to ${scriptPathAddr}, txid: ${txid}`);

  // generate block
  console.log(`generate block: ${genAddr}`);
  await rpc.request('generatetoaddress', 1, genAddr) as rpc.GenerateToAddress;

  // wait for confirmation
  while (true) {
    res = await rpc.request('getrawtransaction', txid, 1) as rpc.GetRawTransaction;
    if (res.confirmations && res.confirmations > 0) {
      break;
    }
    await sleepMsec(3000);
  }
  console.log(JSON.stringify(res, null, 2));

  //
  // redeem
  //

  // outpoint
  let voutIndex = -1;
  for (const vout of res.vout) {
    if (vout.scriptPubKey.address === scriptPathAddr) {
      voutIndex = vout.n;
      break;
    }
  }
  if (voutIndex === -1) {
    console.error('vout not found');
    return;
  }
  const recvAddr = await rpc.request('getnewaddress') as rpc.GetNewAddress;
  const inputSats = res.vout[voutIndex].value * 100_000_000;

  //
  // key path
  //  https://github.com/bitcoinjs/bitcoinjs-lib/blob/ad82549088d89f50587f14fe7a883f24d4438324/test/integration/taproot.spec.ts#L177-L237
  console.log('\n\n---------------- KeyPath ----------------\n');
  {
    const psbt = new bitcoin.Psbt({ network });
    psbt.addInput({
      hash: txid,
      index: voutIndex,
      witnessUtxo: {
        value: inputSats,
        script: scriptPath.output!,
      },
      tapInternalKey: toXOnly(internalKey.publicKey),
      tapMerkleRoot: scriptPath.hash,
    });

    psbt.addOutput({
      address: recvAddr,
      value: inputSats - FEE,
    });

    const tweakedSigner = internalKey.tweak(
      bitcoin.crypto.taggedHash(
        'TapTweak',
        Buffer.concat([toXOnly(internalKey.publicKey), scriptPath.hash!]),
      ),
    );
    psbt.signInput(0, tweakedSigner);
    psbt.finalizeAllInputs();

    // test transaction
    const tx = psbt.extractTransaction();
    console.log(`KeyPath: Test Mempool Accept Hex: ${tx.toHex()}`);
    const result = await rpc.request('testmempoolaccept', [tx.toHex()]);
    console.log(`result: ${JSON.stringify(result, null, 2)}`);
  }


  //
  // redeem by script Bob
  //
  console.log('\n\n---------------- Bob Script ----------------\n');
  {
    const lock_redeem: bitcoin.payments.Payment = {
      output: bob_lock_script,
      redeemVersion: LEAF_VERSION_TAPSCRIPT,
    };
    const redeemScriptPath = bitcoin.payments.p2tr({
      internalPubkey: toXOnly(internalKey.publicKey),
      scriptTree,
      redeem: lock_redeem,
      network
    });

    // create redeem transaction
    const psbt = new bitcoin.Psbt({ network });
    const tapLeafScript = {
      leafVersion: lock_redeem.redeemVersion!,
      script: lock_redeem.output!,
      controlBlock: redeemScriptPath.witness![redeemScriptPath.witness!.length - 1],
    };
    psbt.addInput({
      hash: txid,
      index: voutIndex,
      witnessUtxo: {
        value: inputSats,
        script: redeemScriptPath.output!,
      },
      tapLeafScript: [tapLeafScript],
    });

    psbt.addOutput({
      address: recvAddr,
      value: inputSats - FEE,
    });

    psbt.signInput(0, keyBob);

    // https://github.com/bitcoinjs/bitcoinjs-lib/blob/ad82549088d89f50587f14fe7a883f24d4438324/test/integration/taproot.spec.ts#L763-L793
    const myFinalizer = (
      _inputIndex: number, // Which input is it?
      input: PsbtInput, // The PSBT input contents
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _tapLeafHashToFinalize?: Buffer, // Only finalize this specific leaf
    ) => {
      if (!input.tapScriptSig) {
        throw Error('missing input');
      }
      const witness = [
        input.tapScriptSig[0].signature,
        preimage,
      ].concat(tapLeafScript.script).concat(tapLeafScript.controlBlock);

      return {
        finalScriptWitness: witnessStackToScriptWitness(witness),
      };
    };
    psbt.finalizeInput(0, myFinalizer);

    // test transaction
    const tx = psbt.extractTransaction();
    console.log(`Bob: Test Mempool Accept Hex: ${tx.toHex()}`);
    const result = await rpc.request('testmempoolaccept', [tx.toHex()]);
    console.log(`result: ${JSON.stringify(result, null, 2)}`);
  }

  //
  // redeem by script Alice
  //
  for (let i = 0; i < 2; i++) {
    console.log(`\n\n---------------- Alice Script ${i} ----------------\n`);
    {
      const lock_redeem: bitcoin.payments.Payment = {
        output: alice_lock_script,
        redeemVersion: LEAF_VERSION_TAPSCRIPT,
      };
      const redeemScriptPath = bitcoin.payments.p2tr({
        internalPubkey: toXOnly(internalKey.publicKey),
        scriptTree,
        redeem: lock_redeem,
        network
      });

      // create redeem transaction
      const psbt = new bitcoin.Psbt({ network });
      const tapLeafScript = {
        leafVersion: lock_redeem.redeemVersion!,
        script: lock_redeem.output!,
        controlBlock: redeemScriptPath.witness![redeemScriptPath.witness!.length - 1],
      };
      psbt.addInput({
        hash: txid,
        index: voutIndex,
        sequence: CSV_DELAY,
        witnessUtxo: {
          value: inputSats,
          script: redeemScriptPath.output!,
        },
        tapLeafScript: [tapLeafScript],
      });

      psbt.addOutput({
        address: recvAddr,
        value: inputSats - FEE,
      });

      psbt.signInput(0, keyAlice);

      const myFinalizer = (
        _inputIndex: number, // Which input is it?
        input: PsbtInput, // The PSBT input contents
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _tapLeafHashToFinalize?: Buffer, // Only finalize this specific leaf
      ) => {
        if (!input.tapScriptSig) {
          throw Error('missing input');
        }
        const witness = [
          input.tapScriptSig[0].signature,
        ].concat(tapLeafScript.script).concat(tapLeafScript.controlBlock);

        return {
          finalScriptWitness: witnessStackToScriptWitness(witness),
        };
      };
      psbt.finalizeInput(0, myFinalizer);

      // test transaction
      const tx = psbt.extractTransaction();
      console.log(`Alice: Test Mempool Accept Hex: ${tx.toHex()}`);
      const result = await rpc.request('testmempoolaccept', [tx.toHex()]);
      console.log(`result: ${JSON.stringify(result, null, 2)}`);
    }

    // generate block
    if (i === 0) {
      console.log(`generate 143 blocks: ${genAddr}`);
      await rpc.request('generatetoaddress', 143, genAddr) as rpc.GenerateToAddress;
    }
  }

  console.log('\n---------------- done ----------------');
})();
