(function() {
    // Načteme rating widget a příslušná data
    const ratingWidget = document.getElementById('rating-widget');
    const recipeId = ratingWidget.getAttribute('data-recipe-id');
    const initialRating = parseFloat(ratingWidget.getAttribute('data-initial-rating'));
    const ratedCount = ratingWidget.getAttribute('data-rated-count');
    let userRated = false; // zabráníme vícenásobnému odeslání ratingu
  
    const userRatingInfo = document.getElementById('user-rating-info');
  
    // Funkce pro aktualizaci vzhledu hvězd
    function updateStars(rating) {
      const stars = document.querySelectorAll('#star-rating .star');
      stars.forEach((star, index) => {
        const starValue = index + 1;
        star.classList.remove('full', 'half');
        if (rating >= starValue) {
          star.classList.add('full');
          star.innerHTML = '&#9733;'; // plná hvězda
        } else if (rating >= starValue - 0.5) {
          star.classList.add('half');
          star.innerHTML = '&#9733;'; // polovina hvězdy bude vykreslena pomocí pseudo-elementu
        } else {
          star.innerHTML = '&#9734;'; // prázdná hvězda
        }
      });
    }
  
    // Inicializace zobrazení hvězd
    updateStars(initialRating);
    userRatingInfo.innerText = `Průměrné hodnocení: ${initialRating.toFixed(1)} / 5 (z ${ratedCount} hodnocení)`;
  
    const starContainer = document.getElementById('star-rating');
  
    // Hover efekt: při pohybu myši se dočasně zobrazí rating podle pozice kurzoru
    starContainer.addEventListener('mousemove', function(e) {
      if (userRated) return;
      const rect = starContainer.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const totalWidth = rect.width;
      let rating = (mouseX / totalWidth) * 5;
      rating = Math.round(rating * 2) / 2;
      updateStars(rating);
      userRatingInfo.innerText = `Vaše hodnocení: ${rating} / 5 (klikni pro odeslání)`;
    });
  
    // Po opuštění oblasti se vrátí původní zobrazení
    starContainer.addEventListener('mouseleave', function() {
      if (userRated) return;
      updateStars(initialRating);
      userRatingInfo.innerText = `Průměrné hodnocení: ${initialRating.toFixed(1)} / 5 (z ${ratedCount} hodnocení)`;
    });
  
    // Odeslání ratingu po kliknutí
    starContainer.addEventListener('click', function(e) {
      if (userRated) return;
      const rect = starContainer.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const totalWidth = rect.width;
      let rating = (clickX / totalWidth) * 5;
      rating = Math.round(rating * 2) / 2;
      updateStars(rating);
      userRatingInfo.innerText = `Vaše hodnocení: ${rating} / 5`;
  
      fetch(`/api/recipes/${recipeId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rating: rating })
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Chyba při odesílání hodnocení');
        }
        userRated = true;
        return response.text();
      })
      .then(message => {
        userRatingInfo.innerText += ' - ' + message;
      })
      .catch(err => {
        console.error(err);
      });
    });
  })();
  