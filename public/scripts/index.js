// Funkce pro načtení receptů s vyhledáváním a kategoriemi
async function loadRecipes(url = '/api/recipes') {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Chyba při načítání receptů');
        }
        const recipes = await response.json();
        const container = document.getElementById('recipes-container');
        container.innerHTML = '';

        recipes.forEach(recipe => {
            const recipeElement = document.createElement('div');
            recipeElement.classList.add('recipe');

            recipeElement.innerHTML = `
                <h2>${recipe.title}</h2>
                ${recipe.image_path ? `<img src="${recipe.image_path}" alt="${recipe.title}" class="recipe-image">` : ''}
                <p><strong>Ingredience:</strong> ${recipe.ingredients}</p>
                <p><strong>Postup:</strong> ${recipe.instructions}</p>
            `;

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
// Načtení tagů do dropdownu
async function loadTags() {
    try {
        const response = await fetch('/api/tags');
        if (!response.ok) {
            throw new Error('Chyba při načítání kategorií');
        }
        const tags = await response.json();
        const tagContainer = document.getElementById('tag-checkboxes');
        tagContainer.innerHTML = '';

        tags.forEach(tag => {
            const label = document.createElement('label');
            label.innerHTML = `<input type="checkbox" value="${tag.id}" class="tag-checkbox"> ${tag.tag_name}`;
            tagContainer.appendChild(label);
        });
    } catch (error) {
        console.error(error);
    }
}

// Funkce pro zobrazení/skrytí dropdownu s kategoriemi
document.getElementById('toggle-tags').addEventListener('click', () => {
    document.getElementById('tag-filter').classList.toggle('show');
});

// Skrytí dropdownu při kliknutí mimo něj
document.addEventListener('click', (event) => {
    const dropdown = document.getElementById('tag-filter');
    const button = document.getElementById('toggle-tags');

    if (!dropdown.contains(event.target) && !button.contains(event.target)) {
        dropdown.classList.remove('show');
    }
});

// Filtr receptů podle kategorie a vyhledávacího dotazu
async function applyFilters() {
    const query = document.querySelector('.search-bar').value.trim();
    const checkedTags = Array.from(document.querySelectorAll('.tag-checkbox:checked'))
                            .map(tag => tag.value);
    
    let searchUrl = '/api/recipes/search?';
    if (query) {
        searchUrl += `q=${encodeURIComponent(query)}&`;
    }
    if (checkedTags.length > 0) {
        searchUrl += `tags=${checkedTags.join(',')}`;
    }

    loadRecipes(searchUrl);
}

// Event listener na checkboxy
document.getElementById('tag-checkboxes').addEventListener('change', applyFilters);

// Event listener pro vyhledávání
document.querySelector('.search-btn').addEventListener('click', applyFilters);
document.querySelector('.search-bar').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        applyFilters();
    }
});

// Načíst tagy a recepty po načtení stránky
window.onload = () => {
    loadTags();
    loadRecipes();
};
