# Connection

Global singleton that holds the active database driver. Acts as the bridge between user code / `BaseModel` and the driver layer.

## API

| Method | Description |
|---|---|
| `Connection.setup(config)` | Async. Creates the singleton, instantiates the correct driver, and connects. No-ops if already set up. |
| `Connection.getInstance()` | Returns the singleton. Throws `"Connection not setup"` if `setup()` hasn't been called. |
| `Connection.destroy()` | Async. Disconnects the driver and clears the singleton, allowing `setup()` to be called again. No-ops if not set up. |
| `.getDriver()` | Returns the active `Driver` instance. |
| `.getConfig()` | Returns the `DriverConfig` used to create the connection. |

## Setup Flow

```
Connection.setup({ type: "postgres", config: { host, port, ... } })
  → DriverFactory.createDriver(type, config)
    → creates driver singleton (e.g. PostgresDriver.getInstance(config))
  → calls driver.connect()
  → stores new Connection(driver, config) as static instance (only after successful connect)
```

Supported types: `"postgres"`, `"mysql"`, `"sqlite"`.

## DatabaseConfig

```ts
interface DatabaseConfig {
    type: dbType;  // 'postgres' | 'mysql' | 'sqlite' — imported from DriverFactory
    config: DriverConfig;
}
```

## Usage

Called by `BaseModel.execute()` to get the driver:

```ts
Connection.getInstance().getDriver().query(builtQuery)
```

## Design Notes

- **Singleton** — only one connection at a time. `setup()` silently returns if already initialized. Call `destroy()` to tear down and allow re-setup.
- **Private constructor** — enforces singleton; all instantiation goes through `setup()`.
- **Uses `DriverFactory`** — driver creation is delegated to `DriverFactory.createDriver()`, avoiding duplicated switch/case logic.
- **No tests** — this module has no unit tests. It depends on real driver connections, so testing would require integration tests or driver mocks.
