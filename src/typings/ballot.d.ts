declare class Ballot {
    public number:number;
    public id:string;

    constructor(params?: {
        number: Number;
        id: string;
    });
    isMayorThanOtherBallot(ballot: Ballot): boolean;
    isMayorOrEqualThanOtherBallot(ballot: Ballot): boolean;
    isEqual(ballot: Ballot): boolean;
    private getValue(id):number;
    private getBytes(id):Array<number>;
}
