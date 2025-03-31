document.addEventListener("DOMContentLoaded", () => {
    const recipeId = document.getElementById("rating-widget").getAttribute("data-recipe-id");
    const commentsList = document.getElementById("comments-list");
    const commentInput = document.getElementById("comment-input");
    const submitButton = document.getElementById("submit-comment");
    const errorMessage = document.createElement("p");
    errorMessage.id = "comment-error";
    errorMessage.style.color = "red";
    errorMessage.style.display = "none"; // Skryté, dokud není potřeba
    commentInput.parentNode.insertBefore(errorMessage, commentInput);

    let sessionUsername = null;

    // Zakázaná slova (doplnit další podle potřeby)
    const forbiddenWords = ["nig"];

    // Získání jména přihlášeného uživatele
    fetch("/api/profile")
        .then(response => response.json())
        .then(data => {
            sessionUsername = data.username;
            loadComments();
        })
        .catch(error => console.error("Chyba při načítání profilu:", error));

    // Funkce pro načtení komentářů
    function loadComments() {
        fetch(`/api/recipes/${recipeId}/comments`)
            .then(response => response.json())
            .then(comments => {
                commentsList.innerHTML = ""; // Vymazání starých komentářů
                comments.forEach(comment => {
                    const commentElement = document.createElement("div");
                    commentElement.classList.add("comment");
                    commentElement.innerHTML = `
                        <p><strong>${comment.username}</strong> <small>(${new Date(comment.created_at).toLocaleString()})</small></p>
                        <p>${comment.content}</p>
                        ${comment.username === sessionUsername ? `<button class="delete-comment" data-id="${comment.id}">Smazat</button>` : ""}
                    `;
                    commentsList.appendChild(commentElement);
                });

                // Přidání event listenerů na tlačítka smazání
                document.querySelectorAll(".delete-comment").forEach(button => {
                    button.addEventListener("click", function () {
                        deleteComment(this.getAttribute("data-id"));
                    });
                });
            })
            .catch(error => console.error("Chyba při načítání komentářů:", error));
    }

    // Funkce pro odeslání komentáře
    function submitComment() {
        const content = commentInput.value.trim();

        // Kontrola na nevhodná slova
        if (forbiddenWords.some(word => content.toLowerCase().includes(word))) {
            errorMessage.textContent = "Váš komentář obsahuje nevhodné slovo!";
            errorMessage.style.display = "block";
            return;
        }

        if (!content) return;

        fetch(`/api/recipes/${recipeId}/comments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content })
        })
        .then(response => response.json())
        .then(() => {
            commentInput.value = "";
            errorMessage.style.display = "none"; // Skryje error message po úspěšném odeslání
            loadComments();
        })
        .catch(error => console.error("Chyba při odesílání komentáře:", error));
    }

    // Odeslání komentáře tlačítkem
    submitButton.addEventListener("click", submitComment);

    // Odeslání komentáře klávesou Enter
    commentInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter" && !event.shiftKey) { // Shift + Enter umožní nový řádek
            event.preventDefault();
            submitComment();
        }
    });

    // Funkce pro smazání komentáře
    function deleteComment(commentId) {
        fetch(`/api/comments/${commentId}`, {
            method: "DELETE"
        })
        .then(() => loadComments())
        .catch(error => console.error("Chyba při mazání komentáře:", error));
    }
});
