// Load profile information
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
        } else {
            const errorText = await response.text();
            alert('Chyba: ' + errorText);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Chyba při přidávání receptu.');
    }
});

loadProfile();
