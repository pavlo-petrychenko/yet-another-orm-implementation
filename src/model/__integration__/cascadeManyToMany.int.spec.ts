import { CascPost } from "@/model/__integration__/fixtures/cascade/CascPost.entity";
import { CascTag } from "@/model/__integration__/fixtures/cascade/CascTag.entity";
import { setupModelFixture } from "@/model/__integration__/fixtures/setup";

describe("cascade M2M (integration)", () => {
  const fixture = setupModelFixture();

  it("inserts post + tags + join rows in one tx", async () => {
    const ds = fixture.getDataSource();
    const postRepo = ds.getRepository(CascPost);

    const tagA = Object.assign(new CascTag(), { label: "alpha" });
    const tagB = Object.assign(new CascTag(), { label: "beta" });
    const post = Object.assign(new CascPost(), { title: "P1", tags: [tagA, tagB] });

    await postRepo.insert(post);

    expect(post.id).toBeGreaterThan(0);
    expect(tagA.id).toBeGreaterThan(0);
    expect(tagB.id).toBeGreaterThan(0);

    const links = await fixture.rawQuery<{ post_id: number; tag_id: number }>(
      "SELECT post_id, tag_id FROM casc_post_tags ORDER BY tag_id",
    );
    expect(links).toHaveLength(2);
    expect(links.every((l) => l.post_id === post.id)).toBe(true);
    expect(links.map((l) => l.tag_id).sort()).toEqual([tagA.id, tagB.id].sort());
  });
});
