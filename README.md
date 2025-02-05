# js-scriptpath

## prepare

* `~/.bitcoin/bitcoin.conf`

```file
txindex=1
server=1
regtest=1
rpcuser=user
rpcpassword=pass
fallbackfee=0.00001
```

```console
$ bitcoind -regtest -daemon
$ bitcoin-cli -regtest -named createwallet wallet_name=test load_on_startup=true
$ addr=`bitcoin-cli -regtest getnewaddress`
$ bitcoin-cli -regtest generatetoaddress 110 $addr
$ bitcoin-cli -regtest getbalance
```

## script

```
OP_SHA256 <payment_hash> OP_EQUAL
OP_IF
   <alicePubkey>
OP_ELSE
   <bobPubkey>
OP_ENDIF
OP_CHKSIG
     ↓↓
1)  OP_SHA256 <payment_hash> OP_EQUALVERIFY <alicePubkey> OP_CHKSIG
2)  <bobPubkey> OP_CHECKSIG
```

### redeem 1(index=0)

```
<<signatureAlice>>
<<preimage>>
OP_SHA256 <payment_hash> OP_EQUALVERIFY <alicePubkey> OP_CHKSIG
```

### redeem 2(index=1)

```
<<signatureBob>>
<bobPubkey> OP_CHECKSIG
```

## run

```console
$ npm start

> js-scriptpath@1.0.0 start
> npx tsc && node dist/index.js

hash_lock_script: 207fa033135f9f099d243ade11f8b9265d58a6316e930ce0cd57824ef967bb629dac
p2pk_script: 203dce6c620fcabcfedc2ce2c46fbd57ea717db26df30afc95082b2fdd67ecd16aac
send to bcrt1p0zvahetwr6ssqe5lsduxqse6axkl523584r5xarsfadkc62p8kgqfy847s, txid: 410e593d9a8d94e94c504c9d5bafd107facc15e8020254b95f18b1c3b31fe1eb
generate block: bcrt1qs5qjm44099frmnvsvmjapkyzvyrlfxaxgxgpun
[ '4ff535ad217eda76df5d62149c52b7475c789d09655ca25060bf88884ab5f99c' ]
{
  "txid": "410e593d9a8d94e94c504c9d5bafd107facc15e8020254b95f18b1c3b31fe1eb",
  "hash": "410d8dd28d23bec833ada2ce549e8ffec6d19cce7224bbf5061b40b74856be7e",
  "version": 2,
  "size": 246,
  "vsize": 165,
  "weight": 657,
  "locktime": 39,
  "vin": [
    {
      "txid": "1fb94d736bebe91334cc0add38d7d66482e29816bfbc0e19941225cfdfa69da3",
      "vout": 0,
      "scriptSig": {
        "asm": "",
        "hex": ""
      },
      "txinwitness": [
        "304402203226fcb22c30d80dd18142c83e443bebe31ad0608d5f2910ece5e8549d241906022038a3ca2a09fc7f5dc23f39e72f21f69a3f05e1979ed2eba260fcfb0a60476dac01",
        "02e2086f57082f0dca5934d133bf6c3396a2f8d44f8f20e5fcb52a81f9f9dfaa87"
      ],
      "sequence": 4294967293
    }
  ],
  "vout": [
    {
      "value": 0.001,
      "n": 0,
      "scriptPubKey": {
        "asm": "1 7899dbe56e1ea100669f837860433ae9adfa2a343d474374704f5b6c69413d90",
        "desc": "rawtr(7899dbe56e1ea100669f837860433ae9adfa2a343d474374704f5b6c69413d90)#acz8ghdj",
        "hex": "51207899dbe56e1ea100669f837860433ae9adfa2a343d474374704f5b6c69413d90",
        "address": "bcrt1p0zvahetwr6ssqe5lsduxqse6axkl523584r5xarsfadkc62p8kgqfy847s",
        "type": "witness_v1_taproot"
      }
    },
    {
      "value": 49.99899835,
      "n": 1,
      "scriptPubKey": {
        "asm": "1 1823d7499f30f9c25f22f06a62a57591b7678a16404eb042f8b675dc7878f3d4",
        "desc": "rawtr(1823d7499f30f9c25f22f06a62a57591b7678a16404eb042f8b675dc7878f3d4)#7uawt64z",
        "hex": "51201823d7499f30f9c25f22f06a62a57591b7678a16404eb042f8b675dc7878f3d4",
        "address": "bcrt1prq3awjvlxruuyhez7p4x9ft4jxmk0zskgp8tqshcke6ac7rc702qf3t50r",
        "type": "witness_v1_taproot"
      }
    }
  ],
  "hex": "02000000000101a39da6dfcf251294190ebcbf1698e28264d6d738dd0acc3413e9eb6b734db91f0000000000fdffffff02a0860100000000002251207899dbe56e1ea100669f837860433ae9adfa2a343d474374704f5b6c69413d90bb6a042a010000002251201823d7499f30f9c25f22f06a62a57591b7678a16404eb042f8b675dc7878f3d40247304402203226fcb22c30d80dd18142c83e443bebe31ad0608d5f2910ece5e8549d241906022038a3ca2a09fc7f5dc23f39e72f21f69a3f05e1979ed2eba260fcfb0a60476dac012102e2086f57082f0dca5934d133bf6c3396a2f8d44f8f20e5fcb52a81f9f9dfaa8727000000",
  "blockhash": "4ff535ad217eda76df5d62149c52b7475c789d09655ca25060bf88884ab5f99c",
  "confirmations": 1,
  "time": 1738737628,
  "blocktime": 1738737628
}


---------------- redeem ----------------

Spent Transaction Hex: 02000000000101ebe11fb3c3b1185fb9540202e815ccfa07d1af5b9d4c504ce9948d9a3d590e410000000000ffffffff01b882010000000000160014288c1d3e4c56ca2481600469f45d51081437e175034005cc64eca60ab1b4c487caf72b01867c2a1a8cea5856a5d4135b8044a6be65ee02fa0c67988dc546e41ba841474f1ebb8f1b085cad7415e2bfc4725c241af65622207fa033135f9f099d243ade11f8b9265d58a6316e930ce0cd57824ef967bb629dac41c0ea555b8e31af91081d70ce2c50d499878d9ab7a63ab00bf10c81e069245aaf8447b07ec5a831973b30f67f0dd2449e8e1455a32a967564a56f71518f0a31bf2800000000
Send to bcrt1q9zxp60jv2m9zfqtqq35lgh23pq2r0ct45q4smh: 56f9754331cf2c6d372c93d9087e0123e50ec31e020c90139f452cb704720e1a
Redeem txid: 56f9754331cf2c6d372c93d9087e0123e50ec31e020c90139f452cb704720e1a
generate block: bcrt1qs5qjm44099frmnvsvmjapkyzvyrlfxaxgxgpun
[ '5178de84a15ca9095ba1f4f0e6c0c030c0008b4dc12916e32b9fe0d184d2223d' ]
{
  "txid": "56f9754331cf2c6d372c93d9087e0123e50ec31e020c90139f452cb704720e1a",
  "hash": "7ef2ffc27cb4df7e7db2e853c3b966044bb05cc1d9ec1886b1d37580a3dc21d9",
  "version": 2,
  "size": 251,
  "vsize": 125,
  "weight": 497,
  "locktime": 0,
  "vin": [
    {
      "txid": "410e593d9a8d94e94c504c9d5bafd107facc15e8020254b95f18b1c3b31fe1eb",
      "vout": 0,
      "scriptSig": {
        "asm": "",
        "hex": ""
      },
      "txinwitness": [
        "05cc64eca60ab1b4c487caf72b01867c2a1a8cea5856a5d4135b8044a6be65ee02fa0c67988dc546e41ba841474f1ebb8f1b085cad7415e2bfc4725c241af656",
        "207fa033135f9f099d243ade11f8b9265d58a6316e930ce0cd57824ef967bb629dac",
        "c0ea555b8e31af91081d70ce2c50d499878d9ab7a63ab00bf10c81e069245aaf8447b07ec5a831973b30f67f0dd2449e8e1455a32a967564a56f71518f0a31bf28"
      ],
      "sequence": 4294967295
    }
  ],
  "vout": [
    {
      "value": 0.00099,
      "n": 0,
      "scriptPubKey": {
        "asm": "0 288c1d3e4c56ca2481600469f45d51081437e175",
        "desc": "addr(bcrt1q9zxp60jv2m9zfqtqq35lgh23pq2r0ct45q4smh)#vyxrnhmz",
        "hex": "0014288c1d3e4c56ca2481600469f45d51081437e175",
        "address": "bcrt1q9zxp60jv2m9zfqtqq35lgh23pq2r0ct45q4smh",
        "type": "witness_v0_keyhash"
      }
    }
  ],
  "hex": "02000000000101ebe11fb3c3b1185fb9540202e815ccfa07d1af5b9d4c504ce9948d9a3d590e410000000000ffffffff01b882010000000000160014288c1d3e4c56ca2481600469f45d51081437e175034005cc64eca60ab1b4c487caf72b01867c2a1a8cea5856a5d4135b8044a6be65ee02fa0c67988dc546e41ba841474f1ebb8f1b085cad7415e2bfc4725c241af65622207fa033135f9f099d243ade11f8b9265d58a6316e930ce0cd57824ef967bb629dac41c0ea555b8e31af91081d70ce2c50d499878d9ab7a63ab00bf10c81e069245aaf8447b07ec5a831973b30f67f0dd2449e8e1455a32a967564a56f71518f0a31bf2800000000",
  "blockhash": "5178de84a15ca9095ba1f4f0e6c0c030c0008b4dc12916e32b9fe0d184d2223d",
  "confirmations": 1,
  "time": 1738737628,
  "blocktime": 1738737628
}

---------------- done ----------------
```
