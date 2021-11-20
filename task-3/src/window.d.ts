import { Contract, WalletConnection } from 'near-api-js'

interface MyContract extends Contract {
  setGreeting(value: { name: string }): void
  getGreeting(value: { accountId: string }): string | null
  getBalance(value: {accountId: string}): number
  getTransactionDetails(value: {index: string}): string
  spent(value: {accountId: string, amount: string, note: string}): string
  receive(value: {accountId: string, amount: string, note: string}): string
}

declare global {
  interface Window {
    walletConnection: WalletConnection
    accountId: string
    contract: MyContract
    nearInitPromise: Promise<void>
  }
}
