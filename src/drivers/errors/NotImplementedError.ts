import { DriverError } from "@/drivers/errors/DriverError";

export class NotImplementedError extends DriverError {
  constructor(what: string) {
    super(`Not implemented: ${what}`);
    this.name = "NotImplementedError";
  }
}
