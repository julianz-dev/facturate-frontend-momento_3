//* ========================================
//* VERIFICAR SI EXISTE UNA SESIÓN ACTIVA
//* ========================================

export function verificarSesion() {

    const sesionActiva = sessionStorage.getItem("sesionActiva");

    // Redireccionar al inicio de sesión si no existe una sesión
    if (sesionActiva !== "true") {

        window.location.replace("login.html");

        return false;

    }

    return true;

}