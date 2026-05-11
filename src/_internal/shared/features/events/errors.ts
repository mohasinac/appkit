import { NotFoundError, ConflictError, ExpiredError } from "../../errors/index";

export class EventNotFoundError extends NotFoundError {
  constructor(id: string) {
    super("Event", id);
    this.name = "EventNotFoundError";
  }
}

export class EventNotActiveError extends ConflictError {
  constructor(status: string) {
    super(`Event is not active (status: ${status})`);
    this.name = "EventNotActiveError";
  }
}

export class EventEndedError extends ExpiredError {
  constructor(id: string) {
    super(`Event ${id}`);
    this.name = "EventEndedError";
  }
}

export class EventFullError extends ConflictError {
  constructor() {
    super("Event has reached maximum capacity");
    this.name = "EventFullError";
  }
}

export class AlreadyRegisteredError extends ConflictError {
  constructor(eventId: string) {
    super(`Already registered for event ${eventId}`);
    this.name = "AlreadyRegisteredError";
  }
}
