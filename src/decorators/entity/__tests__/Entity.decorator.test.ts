// import { Entity } from "@/decorators/entity/Entity.decorator";  // Adjust path as needed
// import { MetadataStorage } from "@/metadata/metadata-storage";

// Mock MetadataStorage to spy on its method calls
// import {Entity} from "decorators/entity/Entity.decorator";
// import {MetadataStorage} from "metadata/metadata-storage";

import {Entity} from "../Entity.decorator";
import {MetadataStorage} from "../../../metadata/metadata-storage";

jest.mock("@/metadata/metadata-storage", () => ({
    MetadataStorage: {
        addEntity: jest.fn(),
    },
}));

describe("Entity decorator", () => {
    beforeEach(() => {
        jest.clearAllMocks();  // Clear previous mock calls before each test
    });

    it("should register an entity with the provided tableName", () => {
        const tableName = "custom_table";
        @Entity(tableName)
        class TestEntity {}

        expect(MetadataStorage.addEntity).toHaveBeenCalledWith(TestEntity, tableName);
    });

    it("should register an entity using the class name as tableName when no tableName is provided", () => {
        @Entity()
        class TestEntity {}

        // The tableName should be the class name in lowercase
        expect(MetadataStorage.addEntity).toHaveBeenCalledWith(TestEntity, "testentity");
    });

    it("should call addEntity only once per decorated class", () => {
        @Entity()
        class TestEntity {}

        @Entity("another_table")
        class AnotherEntity {}

        // Ensure that addEntity is called exactly twice, once for each entity
        expect(MetadataStorage.addEntity).toHaveBeenCalledTimes(2);
    });

    it("should handle multiple entities being decorated", () => {
        @Entity("table_one")
        class EntityOne {}

        @Entity("table_two")
        class EntityTwo {}

        // Verify that both entities are correctly registered
        expect(MetadataStorage.addEntity).toHaveBeenCalledWith(EntityOne, "table_one");
        expect(MetadataStorage.addEntity).toHaveBeenCalledWith(EntityTwo, "table_two");
    });

    it("should work with a class that already has a custom constructor", () => {
        @Entity("custom_table")
        class CustomEntity {
            constructor(public name: string) {}
        }

        expect(MetadataStorage.addEntity).toHaveBeenCalledWith(CustomEntity, "custom_table");
    });
});
