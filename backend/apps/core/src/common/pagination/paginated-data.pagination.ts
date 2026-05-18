export class PaginatedData<T> {
    readonly items: T[];
    readonly totalItems: number;
    readonly page: number;
    readonly limit: number;
    readonly totalPages: number;
    readonly hasNextPage: boolean;
    readonly hasPrevPage: boolean;

    constructor(items: T[], totalItems: number, page: number, limit: number) {
        this.items = items;
        this.totalItems = totalItems;
        this.page = page;
        this.limit = limit;
        this.totalPages = Math.ceil(totalItems / limit);
        this.hasPrevPage = page > 1;
        this.hasNextPage = page < this.totalPages;
    }
}
