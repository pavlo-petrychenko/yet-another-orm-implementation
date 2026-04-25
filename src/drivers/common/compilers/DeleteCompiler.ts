import type { DeleteQuery } from "@/query-builder";
import type { QueryCompiler } from "@/drivers/common/compilers/QueryCompiler";

export type DeleteCompiler = QueryCompiler<DeleteQuery>;
