// Credenciales de prueba
const gco_correoPrueba = "proyecto@facturate.com";
const gco_contrasenaPrueba = "facturate";

// Seleccionar elementos del formulario
const gco_formularioLogin = document.querySelector("#formularioLogin");
const gco_email = document.querySelector("#email");
const gco_password = document.querySelector("#password");
const gco_mensajeError = document.querySelector("#mensajeErrorLogin");
const gco_contenedorError = document.querySelector("#contenedorErrorLogin");

// Escuchar el evento submit
gco_formularioLogin.addEventListener("submit", (gco_evento) => {

    // Evitar el comportamiento predeterminado del formulario
    gco_evento.preventDefault();

    // Capturar los valores ingresados
    const gco_correoIngresado = gco_email.value.trim().toLowerCase();
    const gco_contrasenaIngresada = gco_password.value;

    // Validar las credenciales
    if (
        gco_correoIngresado === gco_correoPrueba &&
        gco_contrasenaIngresada === gco_contrasenaPrueba
    ) {

        // Crear una sesión temporal
        sessionStorage.setItem("gco_sesionActiva", "true");

        // Redireccionar al dashboard
        window.location.href = "dashboard.html";

    } else {

        // Mostrar mensaje de error
        gco_mensajeError.textContent = "Correo electrónico o contraseña incorrectos.";
        gco_contenedorError.hidden = false;

    }

});

// Ocultar el mensaje cuando el usuario modifica los campos
gco_formularioLogin.addEventListener("input", () => {

    gco_mensajeError.textContent = "";
    gco_contenedorError.hidden = true;

});