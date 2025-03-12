// Načte profilová data (např. uživatelské jméno)
async function loadProfile() {
    try {
        const response = await fetch('/api/profile');
        if (!response.ok) {
            throw new Error('Nelze načíst profilová data');
        }
        const data = await response.json();
        document.getElementById('username').textContent = data.username;
    } catch (error) {
        console.error(error);
        alert('Chyba při načítání profilu.');
    }
}

async function loadTags() {
    try {
      const response = await fetch('/api/tags');
      if (!response.ok) {
        throw new Error('Chyba při načítání tagů.');
      }
      const tags = await response.json();
      const tagsContainer = document.getElementById('tags-container');
      tagsContainer.innerHTML = ''; // Vyčistíme kontejner

      tags.forEach(tag => {
        const label = document.createElement('label');
        label.className = 'tag-checkbox';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'tags[]'; // Pole se odesílá jako pole hodnot
        checkbox.value = tag.id;

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(' ' + tag.tag_name));
        tagsContainer.appendChild(label);
      });
    } catch (error) {
      console.error(error);
      alert('Chyba při načítání tagů.');
    }
  }

    // Zavoláme funkci po načtení celé stránky
  document.addEventListener('DOMContentLoaded', loadTags);
// Handle "Přidej recept" modal
document.getElementById('add-recipe-button').addEventListener('click', () => {
    document.getElementById('recipe-modal').style.display = 'block';
});

document.getElementById('close-modal').addEventListener('click', () => {
    document.getElementById('recipe-modal').style.display = 'none';
});

// Submit recipe form
document.getElementById('add-recipe-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    try {
        const response = await fetch('/api/recipes', {
            method: 'POST',
            body: formData,
        });

        if (response.ok) {
            alert('Recept byl přidán!');
            document.getElementById('recipe-modal').style.display = 'none';
            form.reset();
            loadMyRecipes();
        } else {
            const errorText = await response.text();
            alert('Chyba: ' + errorText);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Chyba při přidávání receptu.');
    }
});


// Načte recepty přihlášeného uživatele a vykreslí je ve stejné mřížce jako na index stránce
async function loadMyRecipes() {
    try {
        const response = await fetch('/api/myrecipes');
        if (!response.ok) {
            throw new Error('Nelze načíst Vaše recepty');
        }
        const recipes = await response.json();
        const container = document.getElementById('my-recipes-container');
        container.innerHTML = ''; // Vyčistíme předchozí obsah

        recipes.forEach(recipe => {
            const recipeElement = document.createElement('div');
            recipeElement.classList.add('recipe'); // Použijeme stejný CSS styl jako na indexu

            // Vytvoříme strukturu receptové karty s tlačítkem pro smazání
            recipeElement.innerHTML = `
                <button class="delete-button">×</button>
                ${recipe.image_path ? `<img src="${recipe.image_path}" alt="${recipe.title}" class="recipe-image">` : ''}
                <h2>${recipe.title}</h2>
                <p><strong>Ingredience:</strong> ${recipe.ingredients}</p>
                <p><strong>Postup:</strong> ${recipe.instructions}</p>
            `;

            // Přidáme událost kliknutí pro tlačítko smazání, aby se zabránilo spuštění kliknutí na celou kartu
            const deleteButton = recipeElement.querySelector('.delete-button');
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Zabrání přesměrování při kliknutí na tlačítko
                if (confirm('Opravdu chcete smazat tento recept?')) {
                    fetch(`/api/recipes/${recipe.id}`, { method: 'DELETE' })
                        .then(response => {
                            if (response.ok) {
                                recipeElement.remove();
                            } else {
                                response.text().then(errorText => alert('Chyba: ' + errorText));
                            }
                        })
                        .catch(error => {
                            console.error(error);
                            alert('Chyba při mazání receptu.');
                        });
                }
            });

            // Kliknutím mimo tlačítko se uživatel přesměruje na detail receptu
            recipeElement.addEventListener('click', () => {
                window.location.href = `/recipe/${recipe.id}`;
            });

            container.appendChild(recipeElement);
        });
    } catch (error) {
        console.error(error);
        alert('Chyba při načítání Vašich receptů.');
    }
}

// Zavoláme funkce pro načtení profilu a receptů
loadProfile();
loadMyRecipes();