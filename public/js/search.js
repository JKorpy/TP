document.addEventListener("DOMContentLoaded", () => {
    const searchIcon = document.getElementById("search-icon");
    const searchPopup = document.getElementById("search-popup");
    const searchInput = document.getElementById("search-input");
    const searchBtn = document.getElementById("search-btn");

    // Toggle search popup
    searchIcon.addEventListener("click", () => {
        searchPopup.classList.toggle("hidden");
        searchInput.focus();
    });

    // Close search popup when clicking outside
    document.addEventListener("click", (e) => {
        if (!searchPopup.contains(e.target) && e.target !== searchIcon) {
            searchPopup.classList.add("hidden");
        }
    });

    // Perform search
    searchBtn.addEventListener("click", () => {
        const query = searchInput.value.trim();
        if (query.length > 0) {
            window.location.href = `/search?q=${encodeURIComponent(query)}`;
        }
    });

    // Press Enter to search
    searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") searchBtn.click();
    });
});