document.addEventListener('DOMContentLoaded', function() {
    // Aggiungi gestore per il clic sul pulsante "Elimina"
    var eliminaPulsanti = document.querySelectorAll('.elimina-elemento');
    eliminaPulsanti.forEach(function(pulsante) {
      pulsante.addEventListener('click', function() {
        var modal = new bootstrap.Modal(document.getElementById('modalConferma'), {});
        modal.show();
  
        // Aggiungi gestore per il clic sul pulsante "Elimina" nel modal
        document.getElementById('confermaEliminazione').addEventListener('click', function() {
          var elementoDaEliminare = pulsante.parentElement;
          elementoDaEliminare.remove();
          modal.hide();
        });
      });
    });
  });