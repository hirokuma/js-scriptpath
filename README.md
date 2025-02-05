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
internal pubkey: 96cb997b084bdb0ab8697ea3680451409312613bcac477dec392696b99ed5bad
send to bcrt1puu7sdsl7y5s7tdc3l5vx2dek5hmqnlu5tkl99tl4sf5x78nfuw3stzh7vk, txid: eef8bcfcef120786ffb9d2468946897dd1533011219fa54c03a82787e96bafbd
generate block: bcrt1q48wn9ssrlk5lsx3slhk0m8e6scfmvlefp2a4pe
[ '48b738affdef5443087ef25d63858cae4fc89b8700d0615d57a1ee5749e9bb61' ]
{
  "txid": "eef8bcfcef120786ffb9d2468946897dd1533011219fa54c03a82787e96bafbd",
  "hash": "36b2f295e787597407ff2b9721d2f9306a55b4f4788e30fc5e5c4b6878b66c2c",
  "version": 2,
  "size": 246,
  "vsize": 165,
  "weight": 657,
  "locktime": 122,
  "vin": [
    {
      "txid": "7f451920d9b7d803aea14f0f3aa8d11f02f4d32983c389d0d91b91bd907906a0",
      "vout": 0,
      "scriptSig": {
        "asm": "",
        "hex": ""
      },
      "txinwitness": [
        "304402201b0346738c0162cb135bf9ace955c383e5573f2af7a4ce59deec59c72dbc2feb02201f1b2883010f0dcd5d6c8c904c980fcd819538efa91ddf17fcb0d54e1ca6207f01",
        "02e2086f57082f0dca5934d133bf6c3396a2f8d44f8f20e5fcb52a81f9f9dfaa87"
      ],
      "sequence": 4294967293
    }
  ],
  "vout": [
    {
      "value": 49.99899835,
      "n": 0,
      "scriptPubKey": {
        "asm": "1 65a5a3f950d374ec13b321ee35a9bde6fc2342773a5b22d5231443fed450d033",
        "desc": "rawtr(65a5a3f950d374ec13b321ee35a9bde6fc2342773a5b22d5231443fed450d033)#4qx3zett",
        "hex": "512065a5a3f950d374ec13b321ee35a9bde6fc2342773a5b22d5231443fed450d033",
        "address": "bcrt1pvkj6872s6d6wcyany8hrt2daum7zxsnh8fdj94frz3pla4zs6qeshyr7dg",
        "type": "witness_v1_taproot"
      }
    },
    {
      "value": 0.001,
      "n": 1,
      "scriptPubKey": {
        "asm": "1 e73d06c3fe2521e5b711fd18653736a5f609ff945dbe52aff582686f1e69e3a3",
        "desc": "rawtr(e73d06c3fe2521e5b711fd18653736a5f609ff945dbe52aff582686f1e69e3a3)#g955x96a",
        "hex": "5120e73d06c3fe2521e5b711fd18653736a5f609ff945dbe52aff582686f1e69e3a3",
        "address": "bcrt1puu7sdsl7y5s7tdc3l5vx2dek5hmqnlu5tkl99tl4sf5x78nfuw3stzh7vk",
        "type": "witness_v1_taproot"
      }
    }
  ],
  "hex": "02000000000101a0067990bd911bd9d089c38329d3f4021fd1a83a0f4fa1ae03d8b7d92019457f0000000000fdffffff02bb6a042a0100000022512065a5a3f950d374ec13b321ee35a9bde6fc2342773a5b22d5231443fed450d033a086010000000000225120e73d06c3fe2521e5b711fd18653736a5f609ff945dbe52aff582686f1e69e3a30247304402201b0346738c0162cb135bf9ace955c383e5573f2af7a4ce59deec59c72dbc2feb02201f1b2883010f0dcd5d6c8c904c980fcd819538efa91ddf17fcb0d54e1ca6207f012102e2086f57082f0dca5934d133bf6c3396a2f8d44f8f20e5fcb52a81f9f9dfaa877a000000",
  "blockhash": "48b738affdef5443087ef25d63858cae4fc89b8700d0615d57a1ee5749e9bb61",
  "confirmations": 1,
  "time": 1738741072,
  "blocktime": 1738741072
}


---------------- redeem ----------------

Spent Transaction Hex: 02000000000101bdaf6be98727a8034ca59f21113053d17d89468946d2b9ff860712effcbcf8ee0100000000ffffffff01b882010000000000160014450589517d5d42e7da15d9dc9b1264ede92956380340a2e2a27bff7727101474ddb8674652fb00c31722b81e9ba9f0b21d19cb58c370909ffbf642acb27538d0967a191f779dd44dd7f7a512082c49f1eea1393e2efe22207fa033135f9f099d243ade11f8b9265d58a6316e930ce0cd57824ef967bb629dac41c196cb997b084bdb0ab8697ea3680451409312613bcac477dec392696b99ed5bad47b07ec5a831973b30f67f0dd2449e8e1455a32a967564a56f71518f0a31bf2800000000
Send to bcrt1qg5zcj5tat4pw0ks4m8wfkynyah5jj43cmuuwwu: 3fb19e09d82ace57c03b9552314feae0621dae117959c301c7db9c993d9f03b5
Redeem txid: 3fb19e09d82ace57c03b9552314feae0621dae117959c301c7db9c993d9f03b5
generate block: bcrt1q48wn9ssrlk5lsx3slhk0m8e6scfmvlefp2a4pe
[ '1dc43e6b7f51717ea55b4a4011b72168f4e36661140d84dde0d43df64b25d27d' ]
{
  "txid": "3fb19e09d82ace57c03b9552314feae0621dae117959c301c7db9c993d9f03b5",
  "hash": "c423c05de4d6e3c1ae34f543b3333a48b125a45bc8879d6ab233224c71374b7d",
  "version": 2,
  "size": 251,
  "vsize": 125,
  "weight": 497,
  "locktime": 0,
  "vin": [
    {
      "txid": "eef8bcfcef120786ffb9d2468946897dd1533011219fa54c03a82787e96bafbd",
      "vout": 1,
      "scriptSig": {
        "asm": "",
        "hex": ""
      },
      "txinwitness": [
        "a2e2a27bff7727101474ddb8674652fb00c31722b81e9ba9f0b21d19cb58c370909ffbf642acb27538d0967a191f779dd44dd7f7a512082c49f1eea1393e2efe",
        "207fa033135f9f099d243ade11f8b9265d58a6316e930ce0cd57824ef967bb629dac",
        "c196cb997b084bdb0ab8697ea3680451409312613bcac477dec392696b99ed5bad47b07ec5a831973b30f67f0dd2449e8e1455a32a967564a56f71518f0a31bf28"
      ],
      "sequence": 4294967295
    }
  ],
  "vout": [
    {
      "value": 0.00099,
      "n": 0,
      "scriptPubKey": {
        "asm": "0 450589517d5d42e7da15d9dc9b1264ede9295638",
        "desc": "addr(bcrt1qg5zcj5tat4pw0ks4m8wfkynyah5jj43cmuuwwu)#au086vw8",
        "hex": "0014450589517d5d42e7da15d9dc9b1264ede9295638",
        "address": "bcrt1qg5zcj5tat4pw0ks4m8wfkynyah5jj43cmuuwwu",
        "type": "witness_v0_keyhash"
      }
    }
  ],
  "hex": "02000000000101bdaf6be98727a8034ca59f21113053d17d89468946d2b9ff860712effcbcf8ee0100000000ffffffff01b882010000000000160014450589517d5d42e7da15d9dc9b1264ede92956380340a2e2a27bff7727101474ddb8674652fb00c31722b81e9ba9f0b21d19cb58c370909ffbf642acb27538d0967a191f779dd44dd7f7a512082c49f1eea1393e2efe22207fa033135f9f099d243ade11f8b9265d58a6316e930ce0cd57824ef967bb629dac41c196cb997b084bdb0ab8697ea3680451409312613bcac477dec392696b99ed5bad47b07ec5a831973b30f67f0dd2449e8e1455a32a967564a56f71518f0a31bf2800000000",
  "blockhash": "1dc43e6b7f51717ea55b4a4011b72168f4e36661140d84dde0d43df64b25d27d",
  "confirmations": 1,
  "time": 1738741072,
  "blocktime": 1738741072
}

---------------- done ----------------
```
