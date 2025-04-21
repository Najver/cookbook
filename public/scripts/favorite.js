// public/scripts/favorite.js

document.addEventListener("DOMContentLoaded", () => {
    const favoriteBtn = document.getElementById("favorite-btn");
    const ratingWidget = document.getElementById("rating-widget");

    if (!favoriteBtn || !ratingWidget) return;

    const recipeId = ratingWidget.getAttribute("data-recipe-id");

    async function updateFavoriteStatus() {
        try {
            const res = await fetch(`/api/favorites/${recipeId}`);
            const data = await res.json();
            favoriteBtn.textContent = data.isFavorite
                ? "💔 Odebrat z oblíbených"
                : "❤️ Přidat do oblíbených";
        } catch (error) {
            console.error("Chyba při kontrole oblíbenosti:", error);
        }
    }

    favoriteBtn.addEventListener("click", async () => {
        try {
            const res = await fetch(`/api/favorites/${recipeId}`);
            const data = await res.json();
            const method = data.isFavorite ? "DELETE" : "POST";

            await fetch(`/api/favorites/${recipeId}`, { method });
            updateFavoriteStatus();
        } catch (error) {
            console.error("Chyba při přidávání/odebírání oblíbeného receptu:", error);
        }
    });

    updateFavoriteStatus();
});
