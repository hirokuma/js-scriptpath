import * as _bip32 from 'bip32';
import * as bitcoin from "bitcoinjs-lib";
import { Taptree } from 'bitcoinjs-lib/src/types';
import { LEAF_VERSION_TAPSCRIPT } from 'bitcoinjs-lib/src/payments/bip341.js';
import { toXOnly } from 'bitcoinjs-lib/src/psbt/bip371.js';
import { witnessStackToScriptWitness } from 'bitcoinjs-lib/src/psbt/psbtutils.js';
import { PsbtInput } from 'bip174/src/lib/interfaces.js';
import { randomBytes } from 'crypto';
import { ECPairFactory, ECPairAPI } from 'ecpair';
import * as ecc from 'tiny-secp256k1';

import * as rpc from './bitcoinrpc.js';


async function sleepMsec(msec: number) {
  new Promise(resolve => setTimeout(resolve, msec));
}

const FEE = 1000;

const rng = (size: number) => randomBytes(size);
const bip32 = _bip32.BIP32Factory(ecc);
const network = bitcoin.networks.regtest;
const ECPair: ECPairAPI = ECPairFactory(ecc);

bitcoin.initEccLib(ecc);

(async () => {
  let res;

  // for generatetoaddress
  const genAddr = await rpc.request('getnewaddress') as rpc.GetNewAddress;
  //  <<signature>>
  //  <<preimage>>
  //
  //  OP_SHA256 <payment_hash> OP_EQUAL
  //  OP_IF
  //     <alicePubkey>
  //  OP_ELSE
  //     <bobPubkey>
  //  OP_ENDIF
  //  OP_CHKSIG
  //
  //  ↓↓
  //
  //  1)  OP_SHA256 <payment_hash> OP_EQUALVERIFY <alicePubkey> OP_CHKSIG
  //  2)  <bobPubkey> OP_CHECKSIG


  // internal key
  const internalKey = bip32.fromSeed(rng(64), network);

  // script 1
  // const preimage = Buffer.from('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 'hex');
  // const payment_hash = bitcoin.crypto.sha256(preimage);
  const keyAlice = ECPair.fromPrivateKey(Buffer.from('00112233445566778899aabbccddee0000112233445566778899aabbccddee00', 'hex'));
  // const hash_script_asm = `OP_SHA256 ${payment_hash.toString('hex')} OP_EQUALVERIFY ${toXOnly(keyAlice.publicKey).toString('hex')} OP_CHECKSIG`;
  const hash_script_asm = `${toXOnly(keyAlice.publicKey).toString('hex')} OP_CHECKSIG`;
  const hash_lock_script = bitcoin.script.fromASM(hash_script_asm);
  console.log(`hash_lock_script: ${hash_lock_script.toString('hex')}`);

  // script 2
  const keyBob = ECPair.fromPrivateKey(Buffer.from('00112233445566778899aabbccddee0100112233445566778899aabbccddee01', 'hex'));
  const p2pk_script_asm = `${toXOnly(keyBob.publicKey).toString('hex')} OP_CHECKSIG`;
  const p2pk_script = bitcoin.script.fromASM(p2pk_script_asm);
  console.log(`p2pk_script: ${p2pk_script.toString('hex')}`);

  const scriptTree: Taptree = [
    {
      output: hash_lock_script
    },
    {
      output: p2pk_script
    }
  ];

  // P2TR script path address
  const scriptPath = bitcoin.payments.p2tr({
    internalPubkey: toXOnly(internalKey.publicKey),
    scriptTree,
    network
  });
  const scriptPathAddr = scriptPath.address!;

  // send to address
  const txid = await rpc.request('sendtoaddress', scriptPathAddr, 0.001) as rpc.SendToAddress;
  console.log(`send to ${scriptPathAddr}, txid: ${txid}`);

  // generate block
  console.log(`generate block: ${genAddr}`);
  let blockhash = await rpc.request('generatetoaddress', 1, genAddr) as rpc.GenerateToAddress;
  console.log(blockhash);

  // wait for confirmation
  while (true) {
    res = await rpc.request('getrawtransaction', txid, 1) as rpc.GetRawTransaction;
    if (res.confirmations && res.confirmations > 0) {
      break;
    }
    await sleepMsec(3000);
  }
  console.log(JSON.stringify(res, null, 2));

  console.log('\n\n---------------- redeem ----------------\n');

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

  // redeem by script 1
  const hash_lock_redeem: bitcoin.payments.Payment = {
    output: hash_lock_script,
    redeemVersion: LEAF_VERSION_TAPSCRIPT,
  };
  const redeemScriptPath = bitcoin.payments.p2tr({
    internalPubkey: toXOnly(internalKey.publicKey),
    scriptTree,
    redeem: hash_lock_redeem,
    network,
  });

  // create redeem transaction
  const inputSats = res.vout[voutIndex].value * 100_000_000;
  const psbt = new bitcoin.Psbt({ network });
  const tapLeafScript = {
    leafVersion: hash_lock_redeem.redeemVersion!,
    script: hash_lock_redeem.output!,
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

  const recvAddr = await rpc.request('getnewaddress') as rpc.GetNewAddress;
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

  // broadcast redeem transaction
  const tx = psbt.extractTransaction();
  console.log(`Spent Transaction Hex: ${tx.toHex()}`);
  res = await rpc.request('sendrawtransaction', tx.toHex());
  console.log(`Send to ${recvAddr}: ${res}`);

  const redeemTxid = tx.getId();
  console.log(`Redeem txid: ${redeemTxid}`);

  // generate block
  console.log(`generate block: ${genAddr}`);
  blockhash = await rpc.request('generatetoaddress', 1, genAddr) as rpc.GenerateToAddress;
  console.log(blockhash);

  // wait for confirmation
  while (true) {
    res = await rpc.request('getrawtransaction', redeemTxid, 1) as rpc.GetRawTransaction;
    if (res.confirmations && res.confirmations > 0) {
      break;
    }
    await sleepMsec(3000);
  }
  console.log(JSON.stringify(res, null, 2));

  console.log('\n---------------- done ----------------');
})();
