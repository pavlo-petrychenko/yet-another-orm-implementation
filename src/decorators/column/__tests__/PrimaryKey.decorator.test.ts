// import { PrimaryKey } from "@/decorators/column/PrimaryKey.decorator";
// import { MetadataStorage } from "@/metadata/metadata-storage";
// Mock MetadataStorage
// import {PrimaryKey} from "decorators/column/PrimaryKey.decorator";
// import {MetadataStorage} from "metadata/metadata-storage";

import {PrimaryKey} from "../PrimaryKey.decorator";
import {MetadataStorage} from "../../../metadata/metadata-storage";

jest.mock("@/metadata/metadata-storage", () => ({
    MetadataStorage: {
        addPrimaryKey: jest.fn(),
    },
}));

describe("PrimaryKey decorator", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should call addPrimaryKey with default options when no arguments are passed", () => {
        class TestClass {
            @PrimaryKey()
            id: number;
        }

        expect(MetadataStorage.addPrimaryKey).toHaveBeenCalledWith(
            TestClass.prototype,
            "id",
            { name: "id", type: "increment" }
        );
    });

    it("should NOT call addPrimaryKey when options are passed (intended behavior)", () => {
        const customOptions = { name: "custom_id", type: "uuid" };

        class TestClass {
            @PrimaryKey(customOptions)
            customId: string;
        }

        expect(MetadataStorage.addPrimaryKey).not.toHaveBeenCalled();
    });

    it("should convert numeric propertyKey to string", () => {
        const decorator = PrimaryKey();
        const fakeTarget = {};

        decorator(fakeTarget, 123 as any);

        expect(MetadataStorage.addPrimaryKey).toHaveBeenCalledWith(
            fakeTarget,
            "123",
            { name: "123", type: "increment" }
        );
    });

    it("should convert symbol propertyKey to string and call addPrimaryKey", () => {
        const decorator = PrimaryKey();
        const fakeTarget = {};
        const symbolKey = Symbol("mySymbol");

        decorator(fakeTarget, symbolKey);

        expect(MetadataStorage.addPrimaryKey).toHaveBeenCalledWith(
            fakeTarget,
            "Symbol(mySymbol)",
            { name: "Symbol(mySymbol)", type: "increment" }
        );
    });


    it("should not throw if target is null or undefined", () => {
        const decorator = PrimaryKey();

        expect(() => decorator(null as any, "field")).not.toThrow();
        expect(() => decorator(undefined as any, "field")).not.toThrow();

        expect(MetadataStorage.addPrimaryKey).toHaveBeenCalledTimes(2);
    });
});
