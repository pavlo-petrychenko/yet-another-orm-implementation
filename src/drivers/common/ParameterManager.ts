export interface ParameterManager {
  add(value: unknown): string;
  getParams(): readonly unknown[];
}
