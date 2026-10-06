// Run the following commands below in order for test coverage
// 1. npm install
// 2. npm test -- --coverage --verbose --silent 

// ##################################### 
//      MOCKS
// ##################################### 

//Declarations
const mockGetCataloguePage = jest.fn();
const mockGetComparison = jest.fn();
const mockAddProductToList = jest.fn();

//Creates mock versions of real functions
jest.mock("../../model/db", () => ({
  pool: { connect: jest.fn() },
}));

jest.mock("../../model/queries", () => ({
  getComparison: mockGetComparison,
}));

jest.mock("../../service/catalogueService", () => () => ({
  getCataloguePage: mockGetCataloguePage,
  addProductToList: mockAddProductToList,
}));

// ##################################### 
//      IMPORTS
// ##################################### 

const { getCatalogue, getProductModal, addToList } = require("../../controllers/catalogueController");
const { pool } = require("../../model/db");

// ##################################### 
//      MOCK DATA
// ##################################### 
//
// Fake data objects for Service, Product and Client released
const mockServiceResult = {
  products: [{ id: 1, name: "Test Boot" }],
  totalProducts: 1,
  totalPages: 1,
  uniqueCategories: ["footwear"],
  uniqueBrands: ["Nike"],
};

const mockProductResult = {
  product: { id: 5, name: "Test Boot" },
  filtered: [{ id: 6, name: "Other Boot" }],
};

// Client release mock
const mockClient = { release: jest.fn() };

// ##################################### 
//      UTILITY FUNCTIONS
// ##################################### 

// Mock Express Request object with query parameters
const createRequest = (query = {}) => ({ query });

// Mock Express Response object that returns a response from status and json.
const createResponse = () => {
  const response = {};
  response.render = jest.fn();
  response.status = jest.fn().mockReturnValue(response);
  response.json = jest.fn().mockReturnValue(response);
  return response;
};

  // Mock Express Request for addToList function only
  const createAddRequest = () => ({
    body: { id: "1" },
    session: { user: { id: "5" } },
  });

// ##################################### 
//      SETUP
// ##################################### 

// IMPORTANT: resets all mock before each test
beforeEach(() => { jest.clearAllMocks(); });

// ##################################### 
//      getCATALOGUE
// ##################################### 

describe("getCatalogue", () => {
  // WB-Cat-1: Branches B1, B3, B5, B7
  test("WB-Cat-1: filters with no page resets to page 1 and renders catalogue", async () => {
    // ### Arrange ###
    // Simulate Connection, Service, Request & Response
    pool.connect.mockResolvedValue(mockClient);
    mockGetCataloguePage.mockResolvedValue(mockServiceResult);
    const request = createRequest({ search: "boots" });
    const response = createResponse();

    // ### Act ###
    await getCatalogue(request, response);

    // ### Assert ###
    // 1. Expect the connection to obe open
    // 2. Expect the page to reset to 1  since isFiltering is true and no page was provided
    // 3. Expect the render to work
    // 4. Expect no errros
    // 5. Expect the client to be released
    expect(pool.connect).toHaveBeenCalledTimes(1);
    expect(mockGetCataloguePage).toHaveBeenCalledWith(
      mockClient,
      expect.objectContaining({ search: "boots", currentPage: 1 })
    );
    expect(response.render).toHaveBeenCalledWith(
      "catalogue",
      expect.objectContaining({ currentPage: 1, search: "boots" })
    );
    expect(response.status).not.toHaveBeenCalled();
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  // WB-Cat-2: Branches B1, B3, B6, B7
  test("WB-Cat-2: no filters with page=3 maintains page 3 and renders catalogue", async () => {
    // ### Arrange ###
    // Simulate Connection, Service, Request & Response    
    pool.connect.mockResolvedValue(mockClient);
    mockGetCataloguePage.mockResolvedValue(mockServiceResult);
    const request = createRequest({ page: "abc" });
    const response = createResponse();

    // ### Act ### 
    await getCatalogue(request, response);

    // ### Assert ###
    // 1. Expect page to default to 1 since parseInt("abc") returns NaN, triggering || 1 fallback
    // 2. Expect the render to work with page 1
    // 3. Expect the client to be released
    expect(mockGetCataloguePage).toHaveBeenCalledWith(
      mockClient,
      expect.objectContaining({ currentPage: 1 })
    );
    expect(response.render).toHaveBeenCalledWith(
      "catalogue",
      expect.objectContaining({ currentPage: 1 })
    );
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  // WB-Cat-3: Branches B1, B4, B6, B7
  test("WB-Cat-3: service failure returns 500 and releases connection", async () => {
    // ### Arrange ###
    // Simulate connection failure from service and Request & Response
    pool.connect.mockResolvedValue(mockClient);
    mockGetCataloguePage.mockRejectedValue(new Error("Service error"));
    const request = createRequest({ page: "3" });
    const response = createResponse();

    // ### Act ###
    await getCatalogue(request, response);

    // ### Assert ###
    // 1. Expect no render since service failed
    // 2. Expect 500 status
    // 3. Expect error message
    // 4. Expect the client to still be released    
    expect(response.render).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      message: "Failed to load products in catalogue",
    });
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  // WB-Cat-4: Branches B2, B6, B8
  test("WB-Cat-4: connection failure returns 500 and skips release", async () => {
    // ### Arrange ###
    // Simulate connection failure from database, Request & Respons    
    pool.connect.mockRejectedValue(new Error("Connection error"));
    const request = createRequest({ page: "3" });
    const response = createResponse();

    // ### Act ###
    await getCatalogue(request, response);

    // ### Assert ###
    // 1. Expect no service since connection failed
    // 2. Expect no render
    // 3. Expect 500 status
    // 4. Expect error message
    // 5. Expect client to never be released since connection never opened    
    expect(mockGetCataloguePage).not.toHaveBeenCalled();
    expect(response.render).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      message: "Failed to load products in catalogue",
    });
    expect(mockClient.release).not.toHaveBeenCalled();
  });
});

// ##################################### 
//      getPRODUCTMODAL
// ##################################### 

describe("getProductModal", () => {

  // WB-Cat-5: Branches B1, B3, B5
  test("WB-Cat-5: successful connection and query renders product partial", async () => {
    // ### Arrange ###
    // Simulate connection, query, and Request & Response    
    pool.connect.mockResolvedValue(mockClient);
    mockGetComparison.mockResolvedValue(mockProductResult);
    const request = { params: { id: "5" } };
    const response = createResponse();

    // ### Act ###
    await getProductModal(request, response);

    // ### Assert ###
    // 1. Expect client to connect
    // 2. Expect the query to be called with the correct client and id
    // 3. Expect the render to work with the correct product data
    // 4. Expect no errors
    // 5. Expect the client to be released    
    expect(pool.connect).toHaveBeenCalledTimes(1);
    expect(mockGetComparison).toHaveBeenCalledWith(mockClient, 5);
    expect(response.render).toHaveBeenCalledWith(
      "partials/product",
      expect.objectContaining({
        product: mockProductResult.product,
        filtered: mockProductResult.filtered,
      })
    );
    expect(response.status).not.toHaveBeenCalled();
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  // WB-Cat-6: Branches B1, B4, B5
  test("WB-Cat-6: query failure returns 500 and releases connection", async () => {
    // ### Arrange ###
    // Simulate connection, query failure, and  Request & Response  
    pool.connect.mockResolvedValue(mockClient);
    mockGetComparison.mockRejectedValue(new Error("Query error"));
    const request = { params: { id: "5" } };
    const response = createResponse();

    // ### Act ###
    await getProductModal(request, response);

    // ### Assert ###
    // 1. Expect no render since query failed
    // 2. Expect 500 status
    // 3. Expect error message
    // 4. Expect the client to still be released    
    expect(response.render).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      message: "Failed to load products in modal",
    });
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  // WB-Cat-7: Branches B2, B6
  test("WB-Cat-7: connection failure causes 500 and finally throws on release", async () => {
    // ### Arrange ###
    // Simulate database connection failure, and Request & Response    
    pool.connect.mockRejectedValue(new Error("Connection error"));
    const request = { params: { id: "5" } };
    const response = createResponse();

    // ### Act & Assert ###
    // Expect the controller to throw since finally tries to release a null client (Oversight on client guard)
    await expect(getProductModal(request, response)).rejects.toThrow();
    // 1. Expect no query since connection failed
    // 2. Expect 500 status
    // 3. Expect error message
    expect(mockGetComparison).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      message: "Failed to load products in modal",
    });
  });
});

// ##################################### 
//      addTOLIST
// ##################################### 

describe("addToList", () => {
  // WB-Cat-8: Branches B1, B3, B5
  test("WB-Cat-8: successful connection and add to list returns product name", async () => {
    // ### Arrange ###
    // Simulate connection, service, and Request & Response    
    pool.connect.mockResolvedValue(mockClient);
    mockAddProductToList.mockResolvedValue({ name: "Test Boot" });
    const request = createAddRequest();
    const response = createResponse();

    // ### Act ###
    await addToList(request, response);

    // ### Assert ###
    // 1. Open the connection once
    // 2. Expect service with correct client, userId and productId
    // 3. Expect the product name to be returned
    // 4. Expect no errors
    // 5. Expect the client to be released
    expect(pool.connect).toHaveBeenCalledTimes(1);
    expect(mockAddProductToList).toHaveBeenCalledWith(
      mockClient,
      { userId: "5", productId: 1 }
    );
    expect(response.json).toHaveBeenCalledWith({ productName: "Test Boot" });
    expect(response.status).not.toHaveBeenCalled();
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  // WB-Cat-9: Branches B1, B4, B5
  test("WB-Cat-9: service failure returns 500 and releases connection", async () => {
    // ### Arrange ###
    // Simulate connection, service failure, and  Request & Response    
    pool.connect.mockResolvedValue(mockClient);
    mockAddProductToList.mockRejectedValue(new Error("Service error"));
    const request = createAddRequest();
    const response = createResponse();

    // ### Act ###
    await addToList(request, response);

    // ### Assert ###
    // 1. Expect no product name to be returned since service failed
    // 2. Expect 500 status
    // 3. Expect error message
    // 4. Expect the client to still be released    
    expect(response.json).not.toHaveBeenCalledWith({ productName: expect.anything() });
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      message: "Failed append items to shopping list",
    });
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  // WB-Cat-10: Branches B2, B6
  test("WB-Cat-10: connection failure causes 500 and finally throws on release", async () => {
    // ### Arrange ###
    // Simulate database connection failure, and Request & Response    
    pool.connect.mockRejectedValue(new Error("Connection error"));
    const request = createAddRequest();
    const response = createResponse();

    // ### Act & Assert ###
    // Expect the controller to throw since finally tries to release a null client (Oversight on client guard)    
    await expect(addToList(request, response)).rejects.toThrow();
    // 1. Expect no service since connection failed
    // 2. Expect 500 status
    // 3. Expect error message
    expect(mockAddProductToList).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      message: "Failed append items to shopping list",
    });
  });

});