import { parseArgs } from "@/cli/args";

describe("parseArgs", () => {
  it("returns null command and empty result for empty argv", () => {
    expect(parseArgs([])).toEqual({ command: null, positional: [], flags: {} });
  });

  it("parses a bare command", () => {
    expect(parseArgs(["migrate:up"])).toEqual({
      command: "migrate:up",
      positional: [],
      flags: {},
    });
  });

  it("parses positional arguments after the command", () => {
    expect(parseArgs(["migrate:make", "AddPosts"])).toEqual({
      command: "migrate:make",
      positional: ["AddPosts"],
      flags: {},
    });
  });

  it("parses --key=value style flags", () => {
    expect(parseArgs(["migrate:up", "--to=002_x"])).toEqual({
      command: "migrate:up",
      positional: [],
      flags: { to: "002_x" },
    });
  });

  it("parses --key value style flags", () => {
    expect(parseArgs(["migrate:up", "--to", "002_x"])).toEqual({
      command: "migrate:up",
      positional: [],
      flags: { to: "002_x" },
    });
  });

  it("treats a flag with no value followed by another flag as boolean", () => {
    expect(parseArgs(["migrate:status", "--help"])).toEqual({
      command: "migrate:status",
      positional: [],
      flags: { help: true },
    });
  });

  it("treats a trailing flag with no value as boolean", () => {
    expect(parseArgs(["migrate:up", "--dry"])).toEqual({
      command: "migrate:up",
      positional: [],
      flags: { dry: true },
    });
  });

  it("supports leading flags before the command", () => {
    expect(parseArgs(["--config", "./yaoi.config.ts", "migrate:up"])).toEqual({
      command: "migrate:up",
      positional: [],
      flags: { config: "./yaoi.config.ts" },
    });
  });

  it("treats `--` as end-of-flags", () => {
    expect(parseArgs(["migrate:make", "--", "--LooksLikeFlag"])).toEqual({
      command: "migrate:make",
      positional: ["--LooksLikeFlag"],
      flags: {},
    });
  });

  it("last value wins for repeated flags", () => {
    expect(parseArgs(["migrate:up", "--to=a", "--to=b"]).flags).toEqual({ to: "b" });
  });

  it("supports short -h flag", () => {
    expect(parseArgs(["-h"]).flags).toEqual({ h: true });
  });
});
