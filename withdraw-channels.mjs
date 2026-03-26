/**
 * Withdraw funds from finalized Tempo payment channels.
 *
 * Usage:
 *   PRIVATE_KEY=0x... node withdraw-channels.mjs
 */

import { createWalletClient, http, createPublicClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { tempo } from 'viem/chains'

const ESCROW = '0x33b901018174DDabE4841042ab76ba85D4e24f25'
const RPC = 'https://rpc.tempo.xyz'

const CHANNEL_IDS = [
  '0x7046a91fbf801ea14490ae9598b0790c4c74780284d8e2922860114e5caaca39',
  '0x432800c86cc958eccdd727945438ae20bf2a386a2197fd4e370da7155e2d517a',
  '0xcd5008adbd5edb9ac9677b0b228847c3e623b13b25c3fcd4ae901c520a49622e',
  '0xa1745f6a7f06c474d60f651405d98aea222bfdcae6f25706055074159a9260fe',
]

const withdrawAbi = [
  {
    type: 'function',
    name: 'withdraw',
    inputs: [{ name: 'channelId', type: 'bytes32' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
]

const privateKey = process.env.PRIVATE_KEY
if (!privateKey) {
  console.error('Set PRIVATE_KEY env var to your wallet private key (0x...)')
  process.exit(1)
}

const account = privateKeyToAccount(privateKey)
console.log(`Using account: ${account.address}`)

const client = createWalletClient({
  account,
  chain: tempo,
  transport: http(RPC),
})

const publicClient = createPublicClient({
  chain: tempo,
  transport: http(RPC),
})

for (const channelId of CHANNEL_IDS) {
  console.log(`\nWithdrawing channel ${channelId}...`)
  try {
    const hash = await client.writeContract({
      address: ESCROW,
      abi: withdrawAbi,
      functionName: 'withdraw',
      args: [channelId],
    })
    console.log(`  tx: ${hash}`)
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    console.log(`  status: ${receipt.status}`)
  } catch (err) {
    console.error(`  failed: ${err.message}`)
  }
}
