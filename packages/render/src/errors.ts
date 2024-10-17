export class TransactionDataTargetMalformedError extends Error {
  constructor(public readonly response: Response) {
    super("Malformed transaction target data from the server");
  }
}

export class TransactionDataErrorResponseError extends Error {
  constructor(public readonly response: Response) {
    super("Non OK transaction data response from the server");
  }
}

export class TransactionHandlerDidNotReturnTransactionIdError extends Error {
  constructor() {
    super("onTransaction() handler did not return a transaction id");
  }
}

export class SignatureHandlerDidNotReturnTransactionIdError extends Error {
  constructor() {
    super("onSignature() handler did not return a transaction id");
  }
}

export class CastActionUnexpectedResponseError extends Error {
  constructor() {
    super("Unexpected cast action response from the server");
  }
}

export class ComposerActionUnexpectedResponseError extends Error {
  constructor() {
    super("Unexpected composer action response from the server");
  }
}
