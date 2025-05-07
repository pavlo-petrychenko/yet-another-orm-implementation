// import {PostgresDialectUtils} from "@/drivers/postgres/dialect/utils/PostgresDialectUtils";
// import {ColumnDescription} from "@/query-builder/queries/common/ColumnDecription";

// import {PostgresDialectUtils} from "drivers/postgres/dialect/utils/PostgresDialectUtils";
// import {ColumnDescription} from "query-builder/queries/common/ColumnDecription";

import {PostgresDialectUtils} from "../PostgresDialectUtils";
import {ColumnDescription} from "../../../../../query-builder/queries/common/ColumnDecription";

describe('PostgresDialectUtils', () => {
    let utils : PostgresDialectUtils;

    beforeEach(() => {
        utils = new PostgresDialectUtils();
    });
    describe('escapeIdentifier', () => {
        it('should escape simple string identifiers', () => {
            expect(utils.escapeIdentifier('column_name')).toBe('"column_name"');
        });

        it('should properly escape strings containing double quotes', () => {
            expect(utils.escapeIdentifier('column"name')).toBe('"column""name"');
        });

        it('should handle simple column description without alias or table', () => {
            const col: ColumnDescription = {
                name: 'column_name'
            };
            expect(utils.escapeIdentifier(col)).toBe('"column_name"');
        });

        it('should handle column description with alias', () => {
            const col: ColumnDescription = {
                name: 'column_name',
                alias: 'col_alias'
            };
            expect(utils.escapeIdentifier(col)).toBe('"column_name" AS "col_alias"');
        });

        it('should handle column description with table', () => {
            const col: ColumnDescription = {
                name: 'column_name',
                table: 'table_name'
            };
            expect(utils.escapeIdentifier(col)).toBe('"table_name"."column_name"');
        });

        it('should handle column description with table and alias', () => {
            const col: ColumnDescription = {
                name: 'column_name',
                table: 'table_name',
                alias: 'col_alias'
            };
            expect(utils.escapeIdentifier(col)).toBe('"table_name"."column_name" AS "col_alias"');
        });

        it('should handle qualified column names with dot notation', () => {
            const col: ColumnDescription = {
                name: 'table_name.column_name'
            };
            expect(utils.escapeIdentifier(col)).toBe('"table_name"."column_name"');
        });

        it('should handle qualified column names with dot notation and alias', () => {
            const col: ColumnDescription = {
                name: 'table_name.column_name',
                alias: 'col_alias'
            };
            expect(utils.escapeIdentifier(col)).toBe('"table_name"."column_name" AS "col_alias"');
        });
    });

})
