export class PostgresParameterManager {
    private paramCount = 1;

    getNextParameter(): string {
        return `$${this.paramCount++}`;
    }

    reset(): void {
        this.paramCount = 1;
    }
}