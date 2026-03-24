export class ToolCall {
    public id: number;
    public name: string;
    public args: string;
    public result?: string;

    constructor(id: number, name: string, args: string, result?: string) {
        this.id = id;
        this.name = name;
        this.args = args;
        this.result = result;
    }

    setResult(result: string) {
        this.result = result;
    }
}