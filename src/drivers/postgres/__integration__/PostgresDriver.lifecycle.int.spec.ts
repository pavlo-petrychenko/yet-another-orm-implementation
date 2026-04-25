import { PostgresDriver } from "@/drivers/postgres/PostgresDriver";
import { getEnvConfig } from "@/drivers/postgres/__integration__/helpers";

describe("PostgresDriver lifecycle (integration)", () => {
  for (const mode of ["pool", "client"] as const) {
    describe(`mode=${mode}`, () => {
      it("connect resolves and isConnected flips true", async () => {
        const driver = new PostgresDriver({ ...getEnvConfig(), mode });
        expect(driver.isConnected()).toBe(false);
        await driver.connect();
        expect(driver.isConnected()).toBe(true);
        await driver.disconnect();
      });

      it("disconnect flips isConnected back to false", async () => {
        const driver = new PostgresDriver({ ...getEnvConfig(), mode });
        await driver.connect();
        await driver.disconnect();
        expect(driver.isConnected()).toBe(false);
      });
    });
  }

  describe("invalid credentials", () => {
    it("rejects with the pg auth-failure code (28P01)", async () => {
      const driver = new PostgresDriver({ ...getEnvConfig(), password: "wrong-password", mode: "client" });
      await expect(driver.connect()).rejects.toMatchObject({ code: "28P01" });
    });
  });
});
