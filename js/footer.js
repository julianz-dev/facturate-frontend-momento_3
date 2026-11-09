/*========================================
=       CARGADOR DEL FOOTER FACTURATE    =
========================================*/

class FacturateFooter extends HTMLElement {
    constructor() {
        super();
        this.footerCargado = false;
    }

    async connectedCallback() {
        // Evita realizar la misma petición más de una vez sobre la misma instancia.
        if (this.footerCargado) {
            return;
        }

        this.footerCargado = true;

        try {
            // footer.js está dentro de /js; el fragmento se encuentra en /componentes.
            const rutaFooter = new URL("../componentes/footer.html", import.meta.url);
            const respuesta = await fetch(rutaFooter);

            if (!respuesta.ok) {
                throw new Error(`No se pudo cargar el footer. HTTP ${respuesta.status}.`);
            }

            const contenidoFooter = await respuesta.text();
            this.innerHTML = contenidoFooter;
        } catch (error) {
            console.error("Error al cargar el footer de Facturate:", error);

            // Se muestra un aviso visible sin impedir que el resto de la página funcione.
            this.innerHTML = `
                <footer class="footer">
                    <div class="footer-copy">
                        <p role="alert">No fue posible cargar la información del pie de página.</p>
                    </div>
                </footer>
            `;
        }
    }
}

// Evita registrar el mismo componente más de una vez.
if (!customElements.get("facturate-footer")) {
    customElements.define("facturate-footer", FacturateFooter);
}
