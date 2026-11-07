// Verificar si existe una sesión activa
export function gco_verificarSesion() {

    const gco_sesionActiva = sessionStorage.getItem("gco_sesionActiva");

    // Redireccionar si no existe una sesión
    if (gco_sesionActiva !== "true") {

        window.location.replace("login.html");
        return false;

    }

    return true;
}