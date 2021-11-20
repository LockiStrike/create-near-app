import { Component, Inject, OnInit } from '@angular/core'

import { login, logout } from '../utils'
import { WINDOW } from './services/window.service'
import { FormBuilder, FormGroup, Validators } from '@angular/forms'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  currentName: string = ''
  newName: string = ''
  showNotification = false
  balance = 0.0
  receiveForm: FormGroup = this.fb.group({
    amount: [null, [Validators.required, Validators.min(0.1), Validators.max(10_000)]],
    note: [null, [Validators.required, Validators.maxLength(255)]]
  })

  spentForm: FormGroup = this.fb.group({
    amount: [null, [Validators.required, Validators.min(0.1)]],
    note: [null, [Validators.required, Validators.maxLength(255)]]
  })

  get accountId(): string {
    return this.window.walletConnection.getAccountId()
  }

  get signedIn(): boolean {
    return this.window.walletConnection.isSignedIn()
  }

  get contractId(): string {
    return this.window.contract.contractId
  }

  get formDisabled(): boolean {
    return !this.signedIn || this.currentName.trim() === this.newName.trim()
  }

  get balanceDisabled(): boolean {
    return !this.signedIn
  }

  constructor(@Inject(WINDOW) private window: Window, private fb: FormBuilder) {
  }

  ngOnInit(): void {
    this.fetchGreeting()
    this.fetchBalance(null)
  }

  login(): void {
    login()
  }

  logout(): void {
    logout()
  }

  async send(event, action): Promise<void> {
    event.preventDefault()

    const form = action === 'receive'
      ? event.target.elements.forReceive
      : event.target.elements.forSpent

    form.disabled = true

    if (this.signedIn) {
      try {
        if (action === 'receive') {
          await this.window.contract.receive({
            accountId: this.accountId,
            amount: this.receiveForm.controls.amount.value.toString(),
            note: this.receiveForm.controls.note.value
          })
        } else {
          await this.window.contract.spent({
            accountId: this.accountId,
            amount: this.spentForm.controls.amount.value.toString(),
            note: this.spentForm.controls.note.value
          })
        }
      } catch (e) {
        alert(
          'Something went wrong! ' +
          'Maybe you need to sign out and back in? ' +
          'Check your browser console for more info.'
        )
        throw e
      } finally {
        form.disabled = false
      }

      this.fetchBalance(null)
    }
  }

  async fetchGreeting(): Promise<void> {
    if (this.signedIn) {
      this.currentName = this.newName = await this.window.contract.getGreeting({accountId: this.accountId})
    }
  }

  async fetchBalance(event): Promise<void> {
    let forBalance = null
    if (event) {
      event.preventDefault()
      forBalance = event.target.elements.forBalance

      forBalance.disabled = true
    }

    try {
      // make an update call to the smart contract
      this.balance = await this.window.contract.getBalance({accountId: this.accountId})
    } catch (e) {
      alert(
        'Something went wrong! ' +
        'Maybe you need to sign out and back in? ' +
        'Check your browser console for more info.'
      )
      throw e
    } finally {
      if (forBalance) {
        forBalance.disabled = false
      }
    }

    // update local `greeting` variable to match persisted value
    this.fetchGreeting()

    // show notification
    this.showNotification = true

    // remove notification again after css animation completes
    // this allows it to be shown again next time the form is submitted
    setTimeout(() => {
      this.showNotification = false
    }, 11000)
  }

  async onSubmit(event): Promise<void> {
    event.preventDefault()

    // get elements from the form using their id attribute
    const {fieldset, greeting} = event.target.elements

    // disable the form while the value gets updated on-chain
    fieldset.disabled = true

    try {
      // make an update call to the smart contract
      await this.window.contract.setGreeting({name: greeting.value})
    } catch (e) {
      alert(
        'Something went wrong! ' +
        'Maybe you need to sign out and back in? ' +
        'Check your browser console for more info.'
      )
      throw e
    } finally {
      // re-enable the form, whether the call succeeded or failed
      fieldset.disabled = false
    }

    // update local `greeting` variable to match persisted value
    this.fetchGreeting()

    // show notification
    this.showNotification = true

    // remove notification again after css animation completes
    // this allows it to be shown again next time the form is submitted
    setTimeout(() => {
      this.showNotification = false
    }, 11000)
  }

  spentFormInvalid(form): boolean {
    return form.invalid || form.controls.amount.pristine || form.controls.amount.value > this.balance
  }
}
