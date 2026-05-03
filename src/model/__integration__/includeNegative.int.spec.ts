import { ModelError } from "@/model/errors/ModelError";
import { User } from "@/model/__integration__/fixtures/User.entity";
import { setupModelFixture } from "@/model/__integration__/fixtures/setup";
import type { IncludeConfig } from "@/model/types/IncludeConfig";

describe("include negative paths (integration)", () => {
  const fixture = setupModelFixture();

  it("unknown relation key throws UNKNOWN_RELATION", async () => {
    const userRepo = fixture.getDataSource().getRepository(User);
    await userRepo.insert({
      email: "u@x.com",
      displayName: "U",
      isActive: true,
      signupCount: 0,
      lastLoginAt: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });

    await expect(
      userRepo.find({
        include: { nonExistent: true } as unknown as IncludeConfig<User>,
      }),
    ).rejects.toBeInstanceOf(ModelError);
  });
});
