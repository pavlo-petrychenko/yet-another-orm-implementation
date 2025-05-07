// import {DriverConfig} from "@/drivers/common/DriverConfig";

// import {DriverConfig} from "drivers/common/DriverConfig";

import {DriverConfig} from "../common/DriverConfig";

export interface SqliteDriverConfig extends DriverConfig{
    filename: string;
}