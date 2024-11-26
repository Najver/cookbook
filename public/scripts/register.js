// Parse query parameters to check for error messages
const urlParams = new URLSearchParams(window.location.search);
const errorMessage = urlParams.get('error'); // Extract the error parameter

if (errorMessage) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = decodeURIComponent(errorMessage); // Decode and display the error
    errorDiv.style.display = 'block'; // Show the error message
}

// Add client-side password validation
document.getElementById("register-form").addEventListener("submit", function (e) {
    const passwordInput = document.querySelector('input[name="password"]');
    const errorDiv = document.getElementById("error-message");
    
    // Validate password length
    if (passwordInput.value.length < 8) {
        e.preventDefault(); // Prevent form submission
        errorDiv.textContent = "Heslo musí mít alespoň 8 znaků.";
        errorDiv.style.display = 'block';
    }
});
