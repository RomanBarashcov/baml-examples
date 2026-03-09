import { UUID } from "crypto";
import { Session } from "./sesstion";

export class State {
    private sessions: Session[];

    constructor() {
        this.sessions = [];
    }

    public addSession(session: Session) {
        this.sessions.push(session);
    }

    public getSession(sessionId: UUID): Session | undefined {
        return this.sessions.find((session) => session.id === sessionId);
    }

    public removeSession(sessionId: UUID) {
        this.sessions = this.sessions.filter((session) => session.id !== sessionId);
    }
}
