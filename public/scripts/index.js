// Funkce pro načtení receptů (standardně načítá všechny, pokud není zadán jiný URL)
async function loadRecipes(url = '/api/recipes') {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Chyba při načítání receptů');
        }
        const recipes = await response.json();
        const container = document.getElementById('recipes-container');
        container.innerHTML = ''; // Vyčistíme obsah kontejneru

        recipes.forEach(recipe => {
            const recipeElement = document.createElement('div');
            recipeElement.classList.add('recipe');

            recipeElement.innerHTML = `
                <h2>${recipe.title}</h2>
                ${recipe.image_path ? `<img src="${recipe.image_path}" alt="${recipe.title}" class="recipe-image">` : ''}
                <p><strong>Ingredience:</strong> ${recipe.ingredients}</p>
                <p><strong>Postup:</strong> ${recipe.instructions}</p>
            `;

            // Přesměrování na detail receptu při kliknutí
            recipeElement.addEventListener('click', () => {
                window.location.href = `/recipe/${recipe.id}`;
            });

            container.appendChild(recipeElement);
        });

    } catch (error) {
        console.error(error);
        document.getElementById('recipes-container').innerHTML = '<p>Chyba při načítání receptů.</p>';
    }
}

// Načtení všech receptů při načtení stránky
loadRecipes();

// Posluchač pro vyhledávací tlačítko
const searchBar = document.querySelector('.search-bar');
const searchButton = document.querySelector('.search-btn');

searchButton.addEventListener('click', async () => {
    const query = searchBar.value.trim();
    if (query === '') {
        loadRecipes();
    } else {
        const searchUrl = `/api/recipes/search?q=${encodeURIComponent(query)}`;
        loadRecipes(searchUrl);
    }
});

// Nový posluchač pro vyhledávací pole, reagující na stisk klávesy Enter
searchBar.addEventListener('keydown', async (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); // Zabráníme výchozímu odeslání formuláře, pokud by byl
        const query = searchBar.value.trim();
        if (query === '') {
            loadRecipes();
        } else {
            const searchUrl = `/api/recipes/search?q=${encodeURIComponent(query)}`;
            loadRecipes(searchUrl);
        }
    }
});