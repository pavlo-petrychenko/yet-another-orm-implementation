// import {Driver} from "@/drivers/common/Driver";
// import {PostgresDriver} from "@/drivers/postgres/PostgresDriver";
// import {DriverConfig} from "@/drivers/common/DriverConfig";
// import {MySqlDriver} from "@/drivers/mysql/MySqlDriver";
// import {SqliteDriver} from "@/drivers/sqlite/SqliteDriver";
// import {SqliteDriverConfig} from "@/drivers/sqlite/SqliteConfig";
// import {PostgresConfig} from "@/drivers/postgres/PostgresConfig";
// import {MySqlConfig} from "@/drivers/mysql/MySqlConfig";

// import {DriverConfig} from "drivers/common/DriverConfig";
// import {Driver} from "drivers/common/Driver";
// import {PostgresDriver} from "drivers/postgres/PostgresDriver";
// import {PostgresConfig} from "drivers/postgres/PostgresConfig";
// import {MySqlDriver} from "drivers/mysql/MySqlDriver";
// import {MySqlConfig} from "drivers/mysql/MySqlConfig";
// import {SqliteDriver} from "drivers/sqlite/SqliteDriver";
// import {SqliteDriverConfig} from "drivers/sqlite/SqliteConfig";

import {PostgresDriver} from "./postgres/PostgresDriver";
import {DriverConfig} from "./common/DriverConfig";
import {Driver} from "./common/Driver";
import {PostgresConfig} from "./postgres/PostgresConfig";
import {MySqlDriver} from "./mysql/MySqlDriver";
import {MySqlConfig} from "./mysql/MySqlConfig";
import {SqliteDriver} from "./sqlite/SqliteDriver";
import {SqliteDriverConfig} from "./sqlite/SqliteConfig";

type dbType = 'postgres' | 'mysql' | 'sqlite'

/**
 * DriverFactory is a factory class responsible for instantiating the correct
 * database driver based on the provided database type and configuration.
 */
export class DriverFactory {
    /**
     * Creates and returns a singleton instance of a database driver.
     * @param dbType Type of the database ('postgres' | 'mysql' | 'sqlite')
     * @param config Configuration object for the selected driver
     * @returns A Driver instance
     * @throws Error if the driver type is unsupported
     */
    static createDriver(dbType : dbType, config : DriverConfig) : Driver {
        switch (dbType){
            case "postgres":
                return PostgresDriver.getInstance(config as PostgresConfig)
            case "mysql":
                return MySqlDriver.getInstance(config as MySqlConfig);
            case "sqlite":
                return SqliteDriver.getInstance(config as SqliteDriverConfig);
            default:
                throw new Error('Driver not found')
        }
    }
}