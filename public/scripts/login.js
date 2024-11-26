// Check if there's an error message in the query parameters
const urlParams = new URLSearchParams(window.location.search);
const errorMessage = urlParams.get('error');

if (errorMessage) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = errorMessage;
    errorDiv.style.display = 'block';
}