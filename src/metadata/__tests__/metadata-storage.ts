import { MetadataStorage } from "@/metadata/metadata-storage";
import { RelationMetadata } from "@/metadata/types/Relation.metadata.types";

describe("MetadataStorage", () => {
    it("should add a new entity", () => {
        class TestEntity {}

        MetadataStorage.addEntity(TestEntity, "test_table");
        const metadata = MetadataStorage.getMetadata(TestEntity);

        expect(metadata).toEqual({
            tableName: "test_table",
            columns: [],
            primaryKeys: [],
        });
    });

    it("should update tableName if entity already exists", () => {
        class TestEntity {}

        MetadataStorage.addEntity(TestEntity, "initial_table");
        MetadataStorage.addEntity(TestEntity, "updated_table");
        const metadata = MetadataStorage.getMetadata(TestEntity);

        expect(metadata?.tableName).toBe("updated_table");
    });

    it("should auto-register entity when adding column", () => {
        class AutoEntity {}

        MetadataStorage.addColumn(AutoEntity.prototype, "name", { type: "string" });
        const metadata = MetadataStorage.getMetadata(AutoEntity);

        expect(metadata).toBeDefined();
        expect(metadata?.columns).toContainEqual({ propertyKey: "name", type: "string" });
    });

    it("should add multiple columns", () => {
        class ColumnEntity {}

        MetadataStorage.addEntity(ColumnEntity, "col_table");
        MetadataStorage.addColumn(ColumnEntity.prototype, "col1", { type: "number" });
        MetadataStorage.addColumn(ColumnEntity.prototype, "col2", { type: "string" });

        const metadata = MetadataStorage.getMetadata(ColumnEntity);

        expect(metadata?.columns).toEqual([
            { propertyKey: "col1", type: "number" },
            { propertyKey: "col2", type: "string" },
        ]);
    });

    it("should add primary key and also register it as a column", () => {
        class KeyEntity {}

        MetadataStorage.addPrimaryKey(KeyEntity.prototype, "id", { type: "uuid" });
        const metadata = MetadataStorage.getMetadata(KeyEntity);

        expect(metadata?.primaryKeys).toContain("id");
        expect(metadata?.columns).toContainEqual({ propertyKey: "id", type: "uuid" });
    });

    it("should not return metadata for unregistered entity", () => {
        class UnknownEntity {}

        const metadata = MetadataStorage.getMetadata(UnknownEntity);

        expect(metadata).toBeUndefined();
    });

    it("should add a relation to an existing entity", () => {
        class SourceEntity {}
        class TargetEntity {}

        MetadataStorage.addEntity(SourceEntity, "source_table");

        const relation: RelationMetadata = {
            type: "OneToMany",
            propertyKey: "targets",
            targetEntity: () => TargetEntity,
            inverseSide: "source",
        };

        MetadataStorage.addRelation(SourceEntity.prototype, "targets", relation);
        const metadata = MetadataStorage.getMetadata(SourceEntity);

        expect((metadata as any).relations).toContainEqual(relation);
    });

    it("should throw if relation is added to an unregistered entity", () => {
        class UnregisteredEntity {}
        class RelatedEntity {}

        const relation: RelationMetadata = {
            type: "ManyToOne",
            propertyKey: "related",
            targetEntity: () => RelatedEntity,
            inverseSide: "backRef",
        };

        expect(() =>
            MetadataStorage.addRelation(UnregisteredEntity.prototype, "related", relation)
        ).toThrow("Class UnregisteredEntity is not marked with @Entity");
    });

    it("should allow adding relation with options", () => {
        class Source {}
        class Target {}

        MetadataStorage.addEntity(Source, "source");

        const relation: RelationMetadata = {
            type: "OneToOne",
            propertyKey: "target",
            targetEntity: () => Target,
            options: {
                fkColumn: "target_id",
                onDelete: "CASCADE",
                onUpdate: "SET NULL",
            },
        };

        MetadataStorage.addRelation(Source.prototype, "target", relation);
        const metadata = MetadataStorage.getMetadata(Source);

        expect((metadata as any).relations).toContainEqual(relation);
    });
});
