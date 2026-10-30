GLOW 3 WEB — VERSIÓN CON IMPORTACIÓN DE EXCEL Y CAMBIO DE FOTOGRAFÍAS

CONTENIDO
- index.html: página de tienda y panel de administración.
- styles.css: diseño adaptable a celular y computador.
- app.js: catálogo, carrito, lectura del Excel y actualización de fotografías.

USO
1. Descomprime el ZIP.
2. Abre index.html en Chrome. Para publicar, sube los tres archivos a la raíz del repositorio de GitHub Pages.
3. Entra a Administrar > Importar inventario Excel.
4. El Excel debe tener encabezados REFERENCIA, STOCK y DESCRIPCION. La columna PRECIO es opcional; si existe, actualiza los precios. Si no existe, conserva el precio anterior cuando coincide la referencia y descripción; para productos nuevos queda en $0.
5. En la lista del panel puedes cambiar la fotografía de cada producto. Se aceptan imágenes de hasta 1.5 MB.
6. Configura WHATSAPP_NUMBER al inicio de app.js antes de recibir pedidos.

IMPORTANTE — ALCANCE DE ESTA VERSIÓN
Los cambios se guardan en localStorage del navegador donde se realizan. No se sincronizan con otros teléfonos o computadores y no constituyen un panel administrativo seguro. Para sincronización real de catálogo, precios, stock y fotos entre todos los clientes se debe conectar Firebase (Firestore + Storage + Authentication) y configurar reglas de seguridad. No publiques claves privadas en JavaScript.

La biblioteca SheetJS se carga desde CDN para leer archivos Excel; se requiere conexión a internet al importar.
