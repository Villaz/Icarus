///<reference path='./typings/tsd.d.ts' />

export class Operation extends Object {
  public operation_id: number;
  public client_id: number;
  public operation: any;
  public slot: number = -1;
  public write: boolean = true;
  public sha: string;

  constructor(client_id: number, operation_id: number, operation: Object, write: boolean = true) {
    super();
    this.operation_id = operation_id;
    this.client_id = client_id;
    this.operation = operation;
    this.write = write;
  }

  public equals(o: Operation) {
    return this.operation_id === o.operation_id && this.client_id === o.client_id;
  }
}
