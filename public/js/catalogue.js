
//Initialisation
const modal = document.getElementById("catalogue-modal");
const closeModalBTN = document.getElementById("modal-close-btn");
//Event delagation
document.addEventListener("click", (e) => {
    //Open the product modal
    if(e.target.closest(".card-image")) {   
        //Searchest the nearest ancestor
        //Returns the dataset-id for the clicked card image wrapper
        const id = e.target.closest(".card-image").dataset.id;
        
        loadModal(id);
        modal.style.display = "block";
    }
    //Close the product modal
    if(e.target === closeModalBTN) {
        modal.style.display = "none";
    }
    //Add product to the list
    if(e.target.classList.contains("add-btn")) {
        const productId = e.target.dataset.id;
        //console.log("Clicked add button:", productId);
        addProductToList(productId);
    }
    if(e.target.classList.contains("select-btn")) {
        document.getElementById("compare-name-2").textContent = e.target.dataset.name;
        document.getElementById("compare-brand-2").textContent = e.target.dataset.brand;
        document.getElementById("compare-price-2").textContent = `€${e.target.dataset.price}`;
        document.getElementById("compare-add-btn").dataset.id = e.target.dataset.id;                    
    }
});

async function addProductToList(productId) {
    //Attempt to create a post request
    //If successful, create alert otherwise produce an error
    try {
        const response = await fetch("/catalogue/add", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ id: productId })
        });
        //Parase product name from server response
        const data = await response.json();
        showAlert("Product added to the list");
        console.log("Product added");
    }
    catch (err) {
        showAlert("Failed to add list");
        console.log("Add product failed: ", err);
    }
}

//Very weird process (Alfie emoji)
async function loadModal(id) {
    try {
        const response = await fetch(`/catalogue/${id}`);
        const html = await response.text();
        document.getElementById("modal-content").innerHTML = html;
    }
    catch (err) {
        console.log("failed to load modal: ", err);
    }
}

function showAlert(message) {
    const alert = document.getElementById("catalogue-alert");
    const msg   = document.getElementById("catalogue-alert-msg");

    msg.textContent  = message;
    alert.style.display = "block";

    setTimeout(() => alert.style.display = "none", 3000);            
}
