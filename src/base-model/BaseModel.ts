export class BaseModel {
    async save(): Promise<void> {
        console.log("Saving instance");
    }

    async delete(): Promise<void> {
        console.log("Deleting instance");
    }

    static async find() : Promise<void>{
        console.log("Finding all instances");
    }

    static async findById() : Promise<void>{
        console.log("Finding all instances");
    }

    static async select() : Promise<void>{
        console.log("Finding all instances");
    }

    static async update() : Promise<void>{
        console.log("Finding all instances");
    }

    static async delete() : Promise<void>{
        console.log("Finding all instances");
    }

    static async insert() : Promise<void>{
        console.log("Finding all instances");
    }


}
