import type { UpdateQuery } from "@/query-builder";
import type { QueryCompiler } from "@/drivers/common/compilers/QueryCompiler";

export type UpdateCompiler = QueryCompiler<UpdateQuery>;
