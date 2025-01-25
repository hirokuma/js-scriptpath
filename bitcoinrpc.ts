import ky from 'ky';

import _config from './config.json' assert { type: 'json' };
const config: Config = _config;

export type GetNewAddress = string;
export type GenerateToAddress = string[];
export type GetRawTransaction = {
  confirmations?: number;
  vout: [
    {
      value: number;
      n: number;
      scriptPubKey: {
        address: string;
      },
    },
  ],
};
export type SendToAddress = string;

interface Config {
    network: string;
    rpcuser: string;
    rpcpass: string;
    rpcport: number;
};

type RpcResponse = {
    id: string;
    error: string;
    result: unknown;
};

const RPCID = 'p2tr';

type Params = number | string | boolean;
export async function request(method: string, ...params: Params[]) {
    const body = {
        jsonrpc: '2.0',
        id: RPCID,
        method,
        params,
    };
    try {
        const api = ky.extend({
            hooks: {
                beforeRequest: [
                    request => {
                        request.headers.set('Authorization', 'Basic ' + btoa(`${config.rpcuser}:${config.rpcpass}`));
                    }
                ]
            }
        });
        const res = await api.post(`http://localhost:${config.rpcport}`, {
            json: body,
        }).json() as RpcResponse;
        if (!res || res.id !== RPCID) {
            throw new Error('invalid response: ' + method);
        }
        if (res.error) {
            throw res.error;
        }
        return res.result;
    } catch (e) {
        console.error(`bitcoinrpc.request error: method=${method}, error=${JSON.stringify(e)}`);
        throw e;
    }
}
