import type { ParameterManager } from "@/drivers/common/ParameterManager";

export class PostgresParameterManager implements ParameterManager {
  private readonly values: unknown[] = [];

  add(value: unknown): string {
    this.values.push(value);
    return `$${String(this.values.length)}`;
  }

  getParams(): readonly unknown[] {
    return this.values;
  }
}
