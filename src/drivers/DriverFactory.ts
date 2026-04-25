import type { DriverConfig } from "@/drivers/types/DriverConfig";
import { DBType } from "@/drivers/types/DBType";
import type { Driver } from "@/drivers/common/Driver";
import { NotImplementedError } from "@/drivers/errors/NotImplementedError";
import { PostgresDriver } from "@/drivers/postgres/PostgresDriver";

export class DriverFactory {
  create(config: DriverConfig): Driver {
    switch (config.type) {
      case DBType.POSTGRES:
        return new PostgresDriver(config);
      case DBType.MYSQL:
        throw new NotImplementedError("MySqlDriver");
      case DBType.SQLITE:
        throw new NotImplementedError("SqliteDriver");
    }
  }
}
