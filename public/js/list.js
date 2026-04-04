const table = document.getElementById("list-table");

// Event Delegation (Listens to the child element that was clicked)
const tbody = table.querySelector("tbody");
tbody.addEventListener("click", async (e) => {

    // Find the closest row to the clicked element
    const row = e.target.closest("tr");;
    //console.log(row);
    if (!row || !row.dataset.id) return; 

    // Collect data
    const id = row.dataset.id;
    const quantityElement = row.querySelector(".product-qty");
    const priceElement = row.querySelector(".product-price");

    // Increase Quantity
    if (e.target.classList.contains("quantity-increase")) {
        updateQuantity(`/list/${id}/increase`, quantityElement, priceElement);
    } 

    // Decrease Quantity
    if (e.target.classList.contains("quantity-decrease")) {
        updateQuantity(`/list/${id}/decrease`, quantityElement, priceElement);
    }

    // Delete Item
    if (e.target.classList.contains("product-delete-btn")) {
        deleteItem(id, row);
    }
});

// Delete Item
async function deleteItem(id, row) {
    try {
        // Create a delete request
        await fetch(`/list/${id}`, { method: "DELETE" });
        //Delete current row from DOM
        row.remove();
        //Update the total price
        updateTotal();
    } catch (err) {
        console.error("Failed to delete item:", err);
    }
}

// Update Total Price
function updateTotal() {
    let total = 0;
    //Accessing the product element's data price and add it to total
    tbody.querySelectorAll(".product-price").forEach(priceElement => {
        total += Number(priceElement.dataset.price);
    });
    document.querySelector("#list-footer td").textContent = `Total: €${total.toFixed(2)}`;
}

async function updateQuantity(url, quantityElement, priceElement) {
    try {
        //Put Reqeust
        const response = await fetch(url, { method: "PUT" });
        //Server response in JSON format
        const item = await response.json();
        console.log(item);

        //Deletes the Front-end
        if(item.deleted) {
            const row = priceElement.closest("tr");
            row.remove();
            updateTotal();
            return;
        }

        //Initialise a price
        const newPrice = parseFloat(item.total);
        //Update Quantity
        quantityElement.textContent = item.quantity;
        //Update Price
        priceElement.dataset.price = newPrice;
        priceElement.textContent = `€${newPrice.toFixed(2)}`;
        //Recalculate Total
        updateTotal();
    }
    catch (err) {
        console.error("Failed to update quantity:", err);
    }
}
// Execute on page load
updateTotal();