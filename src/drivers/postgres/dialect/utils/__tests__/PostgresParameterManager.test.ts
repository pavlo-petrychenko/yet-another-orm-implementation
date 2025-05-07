// import { PostgresParameterManager } from "@/drivers/postgres/dialect/utils/PostgresParameterManager";

// import {PostgresParameterManager} from "drivers/postgres/dialect/utils/PostgresParameterManager";

import {PostgresParameterManager} from "../PostgresParameterManager";

describe("PostgresParameterManager", () => {
    it("returns sequential parameters", () => {
        const manager = new PostgresParameterManager();
        expect(manager.getNextParameter()).toBe("$1");
        expect(manager.getNextParameter()).toBe("$2");
        expect(manager.getNextParameter()).toBe("$3");
    });

    it("resets parameter count", () => {
        const manager = new PostgresParameterManager();
        manager.getNextParameter(); // $1
        manager.getNextParameter(); // $2
        manager.reset();
        expect(manager.getNextParameter()).toBe("$1");
    });
});
