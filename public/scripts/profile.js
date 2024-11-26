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

loadProfile();