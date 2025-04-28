import {DriverConfig} from "@/drivers/common/DriverConfig";

export interface SqliteDriverConfig extends DriverConfig{
    filename: string;
}