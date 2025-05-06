import {Driver} from "@/drivers/common/Driver";
import {PostgresDriver} from "@/drivers/postgres/PostgresDriver";
import {DriverConfig} from "@/drivers/common/DriverConfig";
import {MySqlDriver} from "@/drivers/mysql/MySqlDriver";
import {SqliteDriver} from "@/drivers/sqlite/SqliteDriver";
import {SqliteDriverConfig} from "@/drivers/sqlite/SqliteConfig";
import {PostgresConfig} from "@/drivers/postgres/PostgresConfig";
import {MySqlConfig} from "@/drivers/mysql/MySqlConfig";

type dbType = 'postgres' | 'mysql' | 'sqlite'


// Factory

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