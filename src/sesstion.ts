import { Message } from "../baml_client";
import { UUID } from "crypto";


export class Session {
    public id: UUID;
    public messages: Message[];

    constructor() {
        this.id = crypto.randomUUID();
        this.messages = [];
    }

    addMessage(message: Message) {
        this.messages.push(message);
    }

    getMessages(): Message[] {
        return this.messages;
    }

    createToolCallId(): number {
        return this.messages.length + 1;
    }

    clearMessages() {
        this.messages = [];
    }
}