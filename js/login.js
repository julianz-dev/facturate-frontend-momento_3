//* proyecto@facturate.com
//* facturate
// Credenciales de prueba
const correoPrueba = "proyecto@facturate.com";
const contrasenaPrueba = "facturate";

// Seleccionar elementos del formulario
const formularioLogin = document.querySelector("#formularioLogin");
const campoCorreo = document.querySelector("#email");
const campoContrasena = document.querySelector("#password");
const mensajeError = document.querySelector("#mensajeErrorLogin");
const contenedorError = document.querySelector("#contenedorErrorLogin");

// Escuchar el evento submit
formularioLogin.addEventListener("submit", (evento) => {

    // Evitar el comportamiento predeterminado del formulario
    evento.preventDefault();

    // Capturar los valores ingresados
    const correoIngresado = campoCorreo.value.trim().toLowerCase();
    const contrasenaIngresada = campoContrasena.value;

    // Validar las credenciales
    if (
        correoIngresado === correoPrueba &&
        contrasenaIngresada === contrasenaPrueba
    ) {

        // Crear una sesión temporal
        sessionStorage.setItem("sesionActiva", "true");

        // Redireccionar al dashboard
        window.location.href = "dashboard.html";

    } else {

        // Mostrar mensaje de error
        mensajeError.textContent = "Correo electrónico o contraseña incorrectos.";
        contenedorError.hidden = false;

    }

});

// Ocultar el mensaje cuando el usuario modifica los campos
formularioLogin.addEventListener("input", () => {

    mensajeError.textContent = "";
    contenedorError.hidden = true;

});