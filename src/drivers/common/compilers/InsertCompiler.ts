import type { InsertQuery } from "@/query-builder";
import type { QueryCompiler } from "@/drivers/common/compilers/QueryCompiler";

export type InsertCompiler = QueryCompiler<InsertQuery>;
