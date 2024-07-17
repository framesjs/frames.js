export class AwaitableController<TResolveValue = any, TData = unknown>
  implements Promise<TResolveValue>
{
  public readonly data: TData;

  private promise: Promise<TResolveValue>;
  private resolvePromise!: (value: TResolveValue) => void;
  private rejectPromise!: (reason?: any) => void;

  constructor(data: TData) {
    this.data = data;
    this.promise = new Promise((resolve, reject) => {
      this.resolvePromise = resolve;
      this.rejectPromise = reject;
    });
  }

  [Symbol.toStringTag] = "AwaitableController";

  resolve(value: TResolveValue) {
    this.resolvePromise(value);
  }

  reject(reason?: any) {
    this.rejectPromise(reason);
  }

  then<TResult1 = TResolveValue, TResult2 = never>(
    onfulfilled?:
      | ((value: TResolveValue) => TResult1 | PromiseLike<TResult1>)
      | null
      | undefined,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | null
      | undefined
  ): Promise<TResult1 | TResult2> {
    return this.promise.then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?:
      | ((reason: any) => TResult | PromiseLike<TResult>)
      | null
      | undefined
  ): Promise<TResolveValue | TResult> {
    return this.promise.catch(onrejected);
  }

  finally(onfinally?: (() => void) | null | undefined): Promise<TResolveValue> {
    return this.promise.finally(onfinally);
  }
}
