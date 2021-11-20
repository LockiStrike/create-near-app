import { Context, logging, storage } from 'near-sdk-as'

@nearBindgen
export class Contract {

  NEGATIVE_AMOUNT_ERROR: string = '🚫 Amount can only be a positive number'
  AMOUNT_BIGGER_BALANCE_ERROR: string = '🚫 You cannot spend more than you have'
  NOTE_LENGTH_ERROR: string = '🚫 Note cannot be longer than 255 symbols'
  INVALID_INDEX_ERROR: string = '🚫 Transaction index is not valid'

  NOTE_LENGTH_LIMIT: i32 = 255

  getGreeting(accountId: string): string | null {
    return storage.get<string>(accountId, 'unknown')
  }

  @mutateState()
  setGreeting(name: string): void {
    storage.set(Context.sender, name)
  }


  getBalance(accountId: string): f64 {
    if (storage.hasKey(`${accountId} balance`)) {
      return storage.getPrimitive<f64>(`${accountId} balance`, 0.0)
    }

    return 0.0
  }

  getHistory(): string {
    const history = ''

    const lastIndex = storage.getPrimitive<i32>(`${Context.sender} lastIndex`, 0)

    for (let i = 0; i <= lastIndex; i++) {
      const storageIndex = storage.getPrimitive<i32>(`${Context.sender} ${i} index`, 0)
      const amount = storage.getPrimitive<f64>(`${Context.sender} ${i} amount`, 0.0)
      const newBalance = storage.getPrimitive<f64>(`${Context.sender} ${i} newBalance`, 0.0)
      const action = storage.getString(`${Context.sender} ${i} action`)
      const note = storage.getString(`${Context.sender} ${i} note`)

      if (action && note) {
        history.concat(`[${storageIndex}]. ${action} ${amount}, newBalance: ${newBalance}. Note: ${note} \\n`)
      }
    }

    return history
  }

  getTransactionDetails(index: string): string {
    const parsedIndex = parseInt(index, 10)

    if (isNaN(parsedIndex)) {
      return this.INVALID_INDEX_ERROR
    }

    const storageIndex = storage.getPrimitive<i32>(`${Context.sender} ${index} index`, 0)
    const amount = storage.getPrimitive<f64>(`${Context.sender} ${index} amount`, 0.0)
    const newBalance = storage.getPrimitive<f64>(`${Context.sender} ${index} newBalance`, 0.0)
    const action = storage.getString(`${Context.sender} ${index} action`)
    const note = storage.getString(`${Context.sender} ${index} note`)

    if (action && note) {
      return `[${storageIndex}]. ${action} ${amount}, newBalance: ${newBalance}. Note: ${note} \\n`
    }

    return `🚫 Key [ ${index} ] not found in storage. ( ${this.storageReport()} )`
  }

  @mutateState()
  spent(accountId: string, amount: string, note: string): string {
    const parsedAmount = parseFloat(amount)
    const balance = storage.getPrimitive<f64>(`${accountId} balance`, 0.0) || 0.0
    const lastIndex = storage.getPrimitive<i32>(`${accountId} lastIndex`, 0.0) || 0.0

    if (this.isAmountNegative(parsedAmount)) {
      return this.NEGATIVE_AMOUNT_ERROR
    }

    if (parsedAmount > balance) {
      return this.AMOUNT_BIGGER_BALANCE_ERROR
    }

    if (this.noteExceedLengthLimit(note)) {
      return this.NOTE_LENGTH_ERROR
    }

    const newIndex = lastIndex + 1
    const newBalance = balance - parsedAmount
    this.recordTransaction(newIndex, parsedAmount, newBalance, 'spent', note)

    return `✅ Data saved. ( ${this.storageReport()} )`
  }

  @mutateState()
  receive(accountId: string, amount: string, note: string): string {
    const parsedAmount = parseFloat(amount)
    const balance = storage.getPrimitive<f64>(`${accountId} balance`, 0.0) || 0.0
    const lastIndex = storage.getPrimitive<i32>(`${accountId} lastIndex`, 0.0) || 0.0

    if (this.isAmountNegative(parsedAmount)) {
      return this.NEGATIVE_AMOUNT_ERROR
    }

    if (this.noteExceedLengthLimit(note)) {
      return this.NOTE_LENGTH_ERROR
    }

    const newIndex = lastIndex + 1
    const newBalance = balance + parsedAmount
    this.recordTransaction(newIndex, parsedAmount, newBalance, 'receive', note)

    return `✅ Data saved. ( ${this.storageReport()} )`
  }

  private recordTransaction(newIndex: i32, parsedAmount: f64, newBalance: f64, action: string, note: string): void {
    storage.set<i32>(`${Context.sender} ${newIndex.toString()} index`, newIndex)
    storage.set<f64>(`${Context.sender} ${newIndex.toString()} amount`, parsedAmount)
    storage.set<f64>(`${Context.sender} ${newIndex.toString()} newBalance`, newBalance)
    storage.setString(`${Context.sender} ${newIndex.toString()} action`, action)
    storage.setString(`${Context.sender} ${newIndex.toString()} note`, note)
    storage.set<f64>(`${Context.sender} balance`, newBalance)
    storage.set<f64>(`${Context.sender} lastIndex`, newIndex)
  }

  private isAmountNegative(amount: f64): boolean {
    return !amount || amount < 0
  }

  private noteExceedLengthLimit(note: string): boolean {
    return !!note && note.length > this.NOTE_LENGTH_LIMIT
  }

  private storageReport(): string {
    return `storage [ ${Context.storageUsage} bytes ]`
  }
}
