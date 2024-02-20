// Exporta un objeto con dos propiedades: Downloader y Launcher,
// que hacen referencia a dos módulos diferentes ubicados en el mismo directorio.
module.exports = {
  Downloader: require('./downloader'), // Clase para descargar archivos
  Launcher: require('./launcher')      // Clase para lanzar aplicaciones
}