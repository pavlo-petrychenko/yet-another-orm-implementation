import type { ReferentialAction } from "@/schema-builder/types/ReferentialAction";

export function compileReferentialAction(action: ReferentialAction): string {
  switch (action) {
    case "cascade":
      return "CASCADE";
    case "set null":
      return "SET NULL";
    case "set default":
      return "SET DEFAULT";
    case "restrict":
      return "RESTRICT";
    case "no action":
      return "NO ACTION";
  }
}
