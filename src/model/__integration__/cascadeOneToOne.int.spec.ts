import { CascProfile } from "@/model/__integration__/fixtures/cascade/CascProfile.entity";
import { CascUser } from "@/model/__integration__/fixtures/cascade/CascUser.entity";
import { setupModelFixture } from "@/model/__integration__/fixtures/setup";

describe("cascade O2O (integration)", () => {
  const fixture = setupModelFixture();

  it("inserts user then profile, backfilling profile.user_id from user.id", async () => {
    const ds = fixture.getDataSource();
    const userRepo = ds.getRepository(CascUser);

    const profile = Object.assign(new CascProfile(), { bio: "hi" });
    const user = Object.assign(new CascUser(), {
      name: "U",
      email: "o2o@x.com",
      profile,
    });

    await userRepo.insert(user);

    expect(user.id).toBeGreaterThan(0);
    expect(profile.id).toBeGreaterThan(0);
    expect(profile.userId).toBe(user.id);

    const rows = await fixture.rawQuery<{ user_id: number; bio: string }>(
      "SELECT user_id, bio FROM casc_profiles",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].user_id).toBe(user.id);
    expect(rows[0].bio).toBe("hi");
  });
});
