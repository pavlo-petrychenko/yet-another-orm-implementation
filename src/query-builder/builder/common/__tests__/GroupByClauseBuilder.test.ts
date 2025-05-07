// import { GroupByBuilder } from "@/query-builder/builder/common/GroupByClauseBuilder";
// import { ColumnDescription } from "@/query-builder/queries/common/ColumnDecription";

// import {GroupByBuilder} from "query-builder/builder/common/GroupByClauseBuilder";

import {GroupByBuilder} from "../GroupByClauseBuilder";

describe('GroupByBuilder', () => {

    let builder: GroupByBuilder;

    beforeEach(() => {
        builder = new GroupByBuilder();
    });

    it('should add a column to group by', () => {
        builder.add('column1');

        const result = builder.build();

        expect(result).toEqual({
            type: "group_by",
            columns: [{ name: "column1" }]
        });
    });

    it('should return null when no columns are added', () => {
        const result = builder.build();
        expect(result).toBeNull();
    });

    it('should add multiple columns to group by', () => {
        builder.add('column1').add('column2');

        const result = builder.build();

        expect(result).toEqual({
            type: "group_by",
            columns: [
                { name: "column1" },
                { name: "column2" }
            ]
        });
    });

    it('should return a group_by clause with correct columns order', () => {
        builder.add('column1').add('column2').add('column3');

        const result = builder.build();

        expect(result).toEqual({
            type: "group_by",
            columns: [
                { name: "column1" },
                { name: "column2" },
                { name: "column3" }
            ]
        });
    });

    it('should return null if no columns added even after chaining', () => {
        builder.add('column1').add('column2');
        const result = builder.build();
        builder = new GroupByBuilder(); // reset
        expect(builder.build()).toBeNull();
    });
});
