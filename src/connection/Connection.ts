import {Driver} from "@/drivers/common/Driver";
import {DriverConfig} from "@/drivers/common/DriverConfig";
import {DriverFactory, dbType} from "@/drivers/DriverFactory";

interface DatabaseConfig {
    type: dbType;
    config: DriverConfig;
}

export class Connection {
    private static instance: Connection | undefined;
    private readonly driver: Driver;
    private readonly config: DriverConfig;

    public getDriver(): Driver {
        return this.driver;
    }
    public getConfig(): DriverConfig {
        return this.config;
    }

    private constructor(driver: Driver, config: DriverConfig) {
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
            const driver = DriverFactory.createDriver(config.type, config.config);
            await driver.connect();
            this.instance = new Connection(driver, config.config);
        } catch (e) {
            if(e instanceof Error) {
                throw e;
            }
            throw new Error('Unknown error during database setup', {cause: e});
        }
    }

    public static async destroy(): Promise<void> {
        if (!this.instance) {
            return;
        }
        await this.instance.driver.disconnect();
        this.instance = undefined;
    }

}
