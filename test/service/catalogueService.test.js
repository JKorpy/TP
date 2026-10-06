
// Run the following commands below in order for test coverage
// 1. npm install
// 2. npm test -- --coverage --verbose --silent 

// ##################################### 
//      MOCKS
// ##################################### 

// Mock Functions declaration
const mockGetCatalogue = jest.fn();
const mockGetUniqueCategories = jest.fn();
const mockGetUniqueBrands = jest.fn();
const mockGetProduct = jest.fn();
const mockAddToShoppingList = jest.fn();

// Mock queries object with all methods used by catalogueService
const mockQueries = {
    getCatalogue: mockGetCatalogue,
    getUniqueCategories: mockGetUniqueCategories,
    getUniqueBrands: mockGetUniqueBrands,
    getProduct: mockGetProduct,
    addToShoppingList: mockAddToShoppingList,
};

// ##################################### 
//      IMPORTS
// ##################################### 

// inject the mock queries
const catalogueService = require("../../service/catalogueService")(mockQueries);

// ##################################### 
//      MOCK DATA
// ##################################### 

// Mock client with query method for transaction handling (BEGIN, COMMIT, ROLLBACK)
const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
};

// ##################################### 
//      SETUP
// ##################################### 

beforeEach(() => { jest.clearAllMocks(); });

// ##################################### 
//      getCATALOGUEPAGE
// ##################################### 

describe("getCataloguePage", () => {
    // WB-Cat-11 Branches: B1
    test("WB-Cat-11: all queries succeed and returns catalogue page data", async () => {
        // ### Arrange ### 
        // simulate all sucessfully
        mockGetCatalogue.mockResolvedValue({
            products: [{ id: 1, name: "Test Boot" }],
            totalProducts: 50,
        });
        mockGetUniqueCategories.mockResolvedValue(["footwear", "clothing"]);
        mockGetUniqueBrands.mockResolvedValue(["Nike", "Adidas"]);

        // ### Act ###
        const result = await catalogueService.getCataloguePage(mockClient, {
            search: "boots",
            sort: "ascending",
            categoryFilter: "",
            brandFilter: [],
            currentPage: 1,
        });

        // ### Assert ### 
        // all three queries were called and results are returned correctly
        expect(mockGetCatalogue).toHaveBeenCalledWith(
            mockClient,
            expect.objectContaining({
                search: "boots",
                orderBy: "name ASC",
                limit: 24,
                offset: 0,
            })
        );
        expect(mockGetUniqueCategories).toHaveBeenCalledWith(mockClient);
        expect(mockGetUniqueBrands).toHaveBeenCalledWith(mockClient);
        expect(result).toEqual({
            products: [{ id: 1, name: "Test Boot" }],
            totalProducts: 50,
            totalPages: 3, 
            uniqueCategories: ["footwear", "clothing"],
            uniqueBrands: ["Nike", "Adidas"],
        });
    });
    

    // WB-Cat-12: B2
    test("WB-Cat-12: a query failure causes getCataloguePage to throw", async () => {
        // ### Arrange ### 
        // getCatalogue rejects while the other two resolve
        mockGetCatalogue.mockRejectedValue(new Error("Query error"));
        mockGetUniqueCategories.mockResolvedValue(["footwear"]);
        mockGetUniqueBrands.mockResolvedValue(["Nike"]);

        // ### Act & Assert ### 
        // Promise.all rejects as soon as one query fails
        await expect(
            catalogueService.getCataloguePage(mockClient, {
                search: "boots",
                sort: "ascending",
                categoryFilter: "",
                brandFilter: [],
                currentPage: 1,
            })
        ).rejects.toThrow("Query error");
    });

    test("WB-Cat-13: invalid sort provide default value of ASC order", async () => {
        // ### Arrange ###
        // All queries successful
        mockGetCatalogue.mockResolvedValue({
            products: [{ id: 1, name: "Test Boot" }],
            totalProducts: 100,
        });
        mockGetUniqueCategories.mockResolvedValue(["footwear"]);
        mockGetUniqueBrands.mockResolvedValue(["Nike"]);

        // ### Act ###
        // Invalid sort
        await catalogueService.getCataloguePage(mockClient, {
            search: "boots",
            sort: "",
            categoryFilter: "",
            brandFilter: [],
            currentPage: 1,
        });     
        
        // ### Assert ###
        // The sort value is defaulted to ASC
        expect(mockGetCatalogue).toHaveBeenCalledWith(
            mockClient,
            expect.objectContaining({ orderBy: "name ASC" })
        );        
    });

});

// ##################################### 
//      addPRODUCTOTLIST
// ##################################### 

describe("addProductToList", () => {
    // WB-Cat-14: B3, B1
    test("WB-Cat-14: product fetched and transaction committed successfully", async () => {
        // ### Arrange ### 
        mockGetProduct.mockResolvedValue({ id: 10, name: "Test Boot" });
        mockClient.query.mockResolvedValue(); 
        mockAddToShoppingList.mockResolvedValue();

        // ### Act ###
        const result = await catalogueService.addProductToList(mockClient, {
            userId: 1,
            productId: 10,
        });

        // ### Assert ### 
        expect(mockGetProduct).toHaveBeenCalledWith(mockClient, 10);
        expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
        expect(mockAddToShoppingList).toHaveBeenCalledWith(mockClient, { userId: 1, productId: 10 });
        expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
        expect(mockClient.query).not.toHaveBeenCalledWith("ROLLBACK");
        expect(result).toEqual({ id: 10, name: "Test Boot" });
    });

    // WB-Cat-15: B3, B2
    test("WB-Cat-15: product fetched but transaction fails and rolls back", async () => {
        // ### Arrange ### 
        // product query resolves but addToShoppingList rejects
        mockGetProduct.mockResolvedValue({ id: 10, name: "Test Boot" });
        mockClient.query.mockResolvedValue(); 
        mockAddToShoppingList.mockRejectedValue(new Error("Transaction error"));

        // ### Act ###
        const result = await catalogueService.addProductToList(mockClient, {
            userId: 1,
            productId: 10,
        });

        // ### Assert ### 
        // transaction was rolled back and the error is returned
        expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
        expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
        expect(mockClient.query).not.toHaveBeenCalledWith("COMMIT");
        expect(result).toEqual(new Error("Transaction error"));
    });

    // WB-Cat-16: B4
    test("WB-Cat-16: product fetch failure throws before transaction starts", async () => {
        // ### Arrange ### 
        // getProduct rejects before the transaction is even opened
        mockGetProduct.mockRejectedValue(new Error("Product not found"));

        // ### Act & Assert ### 
        // Error since product is not failed and transaction should not start
        await expect(
            catalogueService.addProductToList(mockClient, {
                userId: 1,
                productId: 10,
            })
        ).rejects.toThrow("Product not found");
        expect(mockClient.query).not.toHaveBeenCalledWith("BEGIN");
        expect(mockAddToShoppingList).not.toHaveBeenCalled();
    });

});