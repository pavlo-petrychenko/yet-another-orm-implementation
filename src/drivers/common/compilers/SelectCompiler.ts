import type { SelectQuery } from "@/query-builder";
import type { QueryCompiler } from "@/drivers/common/compilers/QueryCompiler";

export type SelectCompiler = QueryCompiler<SelectQuery>;
