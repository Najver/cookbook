document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("favorites-container");
    const loadMoreBtn = document.createElement("button");

    let offset = 0;
    const limit = 12;

    loadMoreBtn.textContent = "Načíst další recepty";
    loadMoreBtn.className = "load-more-button";
    loadMoreBtn.style.display = "none"; // Skryté, pokud nejsou další recepty

    container.after(loadMoreBtn);

    async function loadFavorites() {
        try {
            const response = await fetch(`/api/favorites?offset=${offset}&limit=${limit}`);
            if (!response.ok) throw new Error("Chyba při načítání receptů");

            const recipes = await response.json();
            if (recipes.length === 0 && offset === 0) {
                container.innerHTML = "<p style='text-align: center;'>Nemáte zatím žádné oblíbené recepty.</p>";
                loadMoreBtn.style.display = "none";
                return;
            }

            recipes.forEach(recipe => {
                const recipeElement = document.createElement("div");
                recipeElement.classList.add("recipe");

                recipeElement.innerHTML = `
          <h2>${recipe.title}</h2>
          ${recipe.image_path ? `<img src="${recipe.image_path}" alt="${recipe.title}" class="recipe-image">` : ""}
          <p><strong>Ingredience:</strong> ${recipe.ingredients}</p>
          <p><strong>Postup:</strong> ${recipe.instructions}</p>
        `;

                recipeElement.addEventListener("click", () => {
                    window.location.href = `/recipe/${recipe.id}`;
                });

                container.appendChild(recipeElement);
            });

            offset += limit;
            loadMoreBtn.style.display = recipes.length === limit ? "block" : "none";
        } catch (err) {
            console.error(err);
            container.innerHTML = "<p>Chyba při načítání oblíbených receptů.</p>";
        }
    }

    loadMoreBtn.addEventListener("click", loadFavorites);

    // Načti první dávku receptů
    loadFavorites();
});
