import { gco_verificarSesion } from "./auth.js";

console.log("[GCO-DASHBOARD ONLINE]");

// Verificar autorización de acceso
const gco_accesoAutorizado = gco_verificarSesion();

if (gco_accesoAutorizado) {

    console.log("Sesión validada. Acceso autorizado al dashboard.");

    // Seleccionar botón de cierre de sesión
    const gco_btnCerrarSesion = document.querySelector("#btnCerrarSesion");

    // Escuchar el evento de cierre de sesión
    gco_btnCerrarSesion.addEventListener("click", () => {

        // Eliminar la sesión temporal
        sessionStorage.removeItem("gco_sesionActiva");

        // Redireccionar al login
        window.location.replace("login.html");

    });

}