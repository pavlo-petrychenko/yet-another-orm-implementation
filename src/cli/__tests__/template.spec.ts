import {
  migrationFileName,
  MIGRATION_TEMPLATE,
  slugify,
  timestampPrefix,
} from "@/cli/template";

describe("timestampPrefix", () => {
  it("returns a 14-digit zero-padded UTC timestamp", () => {
    const fixed = new Date(Date.UTC(2026, 4, 9, 14, 30, 22));
    expect(timestampPrefix(fixed)).toBe("20260509143022");
  });

  it("zero-pads single-digit components", () => {
    const fixed = new Date(Date.UTC(2026, 0, 1, 0, 0, 5));
    expect(timestampPrefix(fixed)).toBe("20260101000005");
  });
});

describe("slugify", () => {
  it("lowercases and replaces non-alphanumerics with underscores", () => {
    expect(slugify("AddPosts")).toBe("addposts");
    expect(slugify("Add Posts")).toBe("add_posts");
    expect(slugify("Add  Posts")).toBe("add_posts");
    expect(slugify("Add-Posts!")).toBe("add_posts");
  });

  it("trims leading/trailing underscores", () => {
    expect(slugify("__hello__")).toBe("hello");
    expect(slugify("---x---")).toBe("x");
  });

  it("returns 'migration' for empty/garbage input", () => {
    expect(slugify("")).toBe("migration");
    expect(slugify("---")).toBe("migration");
  });

  it("truncates to maxLength", () => {
    const result = slugify("a".repeat(120), 60);
    expect(result).toHaveLength(60);
  });

  it("is idempotent on already-slugified input", () => {
    expect(slugify(slugify("AddPosts"))).toBe(slugify("AddPosts"));
  });
});

describe("migrationFileName", () => {
  it("composes <timestamp>_<slug>.ts", () => {
    const fixed = new Date(Date.UTC(2026, 4, 9, 14, 30, 22));
    expect(migrationFileName("AddPosts", fixed)).toBe("20260509143022_addposts.ts");
  });
});

describe("MIGRATION_TEMPLATE", () => {
  it("contains both up and down stubs and a default export", () => {
    expect(MIGRATION_TEMPLATE).toContain("async up(");
    expect(MIGRATION_TEMPLATE).toContain("async down(");
    expect(MIGRATION_TEMPLATE).toContain("export default migration");
  });
});
