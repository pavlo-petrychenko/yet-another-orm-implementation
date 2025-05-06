import {PostgresConfig} from "@/drivers/postgres/PostgresConfig";
import {MySqlConfig} from "@/drivers/mysql/MySqlConfig";
import {SqliteDriverConfig} from "@/drivers/sqlite/SqliteConfig";
import {Driver} from "@/drivers/common/Driver";
import {DriverConfig} from "@/drivers/common/DriverConfig";
import {PostgresDriver} from "@/drivers/postgres/PostgresDriver";
import {MySqlDriver} from "@/drivers/mysql/MySqlDriver";
import {SqliteDriver} from "@/drivers/sqlite/SqliteDriver";


interface DatabaseConfig {
    type: 'postgres' | 'mysql' | 'sqlite';
    config: PostgresConfig | MySqlConfig | SqliteDriverConfig
}

export class Connection {
    private static instance: Connection;
    private readonly driver: Driver;
    private readonly config: DriverConfig;

    public getDriver(): Driver {
        return this.driver;
    }
    public getConfig(): DriverConfig {
        return this.config;
    }

    constructor(driver: Driver, config: DriverConfig) {
        this.driver = driver;
        this.config = config;
    }



    public static getInstance(): Connection {
        if (!this.instance) {
            throw new Error('Connection not setup');
        }
        return this.instance;
    }

    public static async setup(config: DatabaseConfig): Promise<void> {
        if (this.instance) {
            return;
        }
        try {
            switch (config.type) {
                case "postgres":
                    const postgresDriver = PostgresDriver.getInstance(config.config);
                    this.instance = new Connection(postgresDriver, config.config);
                    await postgresDriver.connect();
                    break;

                case "mysql":
                    const mySqlDriver = MySqlDriver.getInstance(config.config);
                    this.instance = new Connection(mySqlDriver, config.config);
                    await mySqlDriver.connect()
                    break;


                case "sqlite":
                    const sqliteDriver = SqliteDriver.getInstance(config.config as SqliteDriverConfig);
                    this.instance = new Connection(sqliteDriver, config.config);
                    await sqliteDriver.connect()
                    break;

                default:
                    throw new Error('Database type not supported');
            }
        } catch (e) {
            if(e instanceof Error) {
                throw e;
            }
            throw new Error('Unknown error during database setup');
        }
    }

}