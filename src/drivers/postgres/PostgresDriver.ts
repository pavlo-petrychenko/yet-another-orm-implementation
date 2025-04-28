import {Driver} from "@/drivers/common/Driver";
import {PostgresConfig} from "@/drivers/postgres/PostgresConfig";
import { Pool } from 'pg';
import {DriverConfig} from "@/drivers/common/DriverConfig";
import {PostgresDialect} from "@/drivers/postgres/dialect/PostgresDialect";
import {Query} from "@/query-builder/queries/Query";




// singleton

export class PostgresDriver implements Driver{
    private static instance: PostgresDriver | null = null;
    private pool: Pool | null = null;
    private readonly config : DriverConfig;

    private readonly dialect : PostgresDialect;


    constructor(config : PostgresConfig) {
        this.config = config;
        this.dialect = new PostgresDialect();
    }

    public static getInstance(config: DriverConfig): PostgresDriver {
        if (!PostgresDriver.instance) {
            PostgresDriver.instance = new PostgresDriver(config);
        }
        return PostgresDriver.instance;
    }

    async connect(): Promise<void> {
        if (!this.pool) {
            this.pool = new Pool({
                host: this.config.host,
                port: this.config.port,
                database: this.config.database,
                user: this.config.username,
                password: this.config.password
            });
        }
    }


    async disconnect(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
        }
    }

    async query(query: Query): Promise<any> {
        if (!this.pool) {
            throw new Error('Not connected to database');
        }

        const {sql, params} = this.dialect.buildQuery(query);

        return await this.pool.query(sql, params);
    }

    isConnected(): boolean {
        return this.pool !== null;
    }

    getDialect() : PostgresDialect {
        return this.dialect;
    }





}