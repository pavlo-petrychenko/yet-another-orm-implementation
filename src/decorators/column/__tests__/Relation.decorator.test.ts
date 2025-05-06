import {
    OneToOne,
    OneToMany,
    ManyToOne,
    ManyToMany
} from "@/decorators/column/Relation.decorator";  // Adjust path as needed

import { MetadataStorage } from "@/metadata/metadata-storage";
import { RelationMetadata, RelationOptions } from "@/metadata/types/Relation.metadata.types";

// Mock MetadataStorage to spy on its method calls
jest.mock("@/metadata/metadata-storage", () => ({
    MetadataStorage: {
        addRelation: jest.fn(),
    },
}));

describe("Relation decorators", () => {
    beforeEach(() => {
        jest.clearAllMocks();  // Clear previous mock calls before each test
    });

    const decorators = [
        { name: "OneToOne", fn: OneToOne, type: "OneToOne" },
        { name: "OneToMany", fn: OneToMany, type: "OneToMany" },
        { name: "ManyToOne", fn: ManyToOne, type: "ManyToOne" },
        { name: "ManyToMany", fn: ManyToMany, type: "ManyToMany" },
    ];

    decorators.forEach(({ name, fn, type }) => {
        describe(`${name} Decorator`, () => {

            it(`should register a ${type} relation with all parameters`, () => {
                const TargetEntity = () => class {};  // Target entity as a class
                const inverseSide = "someProperty";  // Example inverse side property
                const options: RelationOptions = {
                    fkColumn: "id",
                    onDelete: "CASCADE",
                    onUpdate: "RESTRICT"
                };  // Valid options as per RelationOptions interface

                class TestEntity {
                    @fn(TargetEntity, inverseSide, options)
                    relation: any;
                }

                expect(MetadataStorage.addRelation).toHaveBeenCalledWith(
                    TestEntity.prototype,
                    "relation",
                    {
                        type,
                        targetEntity: TargetEntity,
                        propertyKey: "relation",
                        inverseSide,
                        options,
                    } as RelationMetadata
                );
            });

            it("should register a relation without inverseSide and options", () => {
                const TargetEntity = () => class {};  // Just pass target entity

                class TestEntity {
                    @fn(TargetEntity)
                    relation: any;
                }

                expect(MetadataStorage.addRelation).toHaveBeenCalledWith(
                    TestEntity.prototype,
                    "relation",
                    {
                        type,
                        targetEntity: TargetEntity,
                        propertyKey: "relation",
                        inverseSide: undefined,
                        options: undefined,
                    } as RelationMetadata
                );
            });

            it("should handle numeric property keys correctly", () => {
                const TargetEntity = () => class {};  // Target entity as a class
                const inverseSide = "someProperty";  // Example inverse side property
                const options: RelationOptions = {
                    fkColumn: "user_id",
                    onDelete: "SET NULL",
                    onUpdate: "CASCADE"
                };  // Valid options

                const decorator = fn(TargetEntity, inverseSide, options);
                const fakeTarget = {};
                decorator(fakeTarget, 123 as any);  // Using a numeric property key

                expect(MetadataStorage.addRelation).toHaveBeenCalledWith(
                    fakeTarget,
                    "123",  // Property key as string (converted)
                    {
                        type,
                        targetEntity: TargetEntity,
                        propertyKey: "123",
                        inverseSide,
                        options,
                    } as RelationMetadata
                );
            });

            it("should handle symbol property keys correctly", () => {
                const TargetEntity = () => class {};  // Target entity as a class
                const inverseSide = "someProperty";  // Example inverse side property
                const options: RelationOptions = {
                    fkColumn: "user_id",
                    onDelete: "SET NULL",
                    onUpdate: "RESTRICT"
                };  // Valid options

                const decorator = fn(TargetEntity, inverseSide, options);
                const fakeTarget = {};
                const symbolKey = Symbol("symbolProperty");

                decorator(fakeTarget, symbolKey);  // Using a symbol property key

                expect(MetadataStorage.addRelation).toHaveBeenCalledWith(
                    fakeTarget,
                    "Symbol(symbolProperty)",  // Symbol converted to string
                    {
                        type,
                        targetEntity: TargetEntity,
                        propertyKey: "Symbol(symbolProperty)",
                        inverseSide,
                        options,
                    } as RelationMetadata
                );
            });

            it("should not throw if target is null or undefined", () => {
                const TargetEntity = () => class {};  // Target entity as a class
                const inverseSide = "someProperty";  // Example inverse side property
                const options: RelationOptions = {
                    fkColumn: "user_id",
                    onDelete: "CASCADE",
                    onUpdate: "RESTRICT"
                };  // Valid options

                const decorator = fn(TargetEntity, inverseSide, options);

                expect(() => decorator(null as any, "relation")).not.toThrow();
                expect(() => decorator(undefined as any, "relation")).not.toThrow();

                expect(MetadataStorage.addRelation).toHaveBeenCalledTimes(2);
            });

            it("should handle invalid targetEntity (throws)", () => {
                const invalidTargetEntity = () => {
                    throw new Error("Invalid entity");
                };

                expect(() => {
                    class Test {
                        @fn(invalidTargetEntity)
                        brokenRelation: any;
                    }
                }).not.toThrow();  // The error is thrown when the decorator is applied
            });
        });
    });
});
