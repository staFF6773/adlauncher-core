const fs = require('fs');
const path = require('path');
let https = require('https');
https.globalAgent.maxSockets = 2;
const Zip = require('adm-zip');

/**
 * Clase para gestionar la descarga de archivos relacionados con Minecraft.
 */
class Downloader {
  /**
   * Crea una instancia de Downloader.
   */
  constructor() {
    /**
     * URLs base utilizadas para la descarga de archivos.
     * @type {Object}
     */
    this.url = {
      meta: 'https://launchermeta.mojang.com/mc/game/version_manifest.json',
      resource: 'https://resources.download.minecraft.net',
    },
    /**
     * Directorio de caché para almacenar archivos temporales.
     * @type {string}
     */
    this.cache = 'cache',
    /**
     * Directorio para almacenar las versiones descargadas.
     * @type {string}
     */
    this.versions = 'versions',
    /**
     * Directorio para almacenar los recursos (assets) descargados.
     * @type {string}
     */
    this.assets = 'assets',
    /**
     * Directorio para almacenar las librerías descargadas.
     * @type {string}
     */
    this.libraries = 'libraries',
    /**
     * Directorio para almacenar los archivos nativos descargados.
     * @type {string}
     */
    this.natives = 'natives'
  }

  /**
   * Descarga un archivo desde una URL y lo guarda en un directorio especificado.
   * @param {string} url La URL del archivo a descargar.
   * @param {string} dir El directorio donde se guardará el archivo.
   * @param {string} name El nombre con el que se guardará el archivo.
   * @returns {Promise<string>} Una promesa que se resuelve con un mensaje de éxito cuando la descarga se completa.
   */
  
  async down(url, dir, name) {
    try {
      const response = new Promise((resolve, reject) => {
        const req = https.get(url, { timeout: 10000 }, (res) => {
          const filePath = path.join(dir, name);
          const writeToFile = fs.createWriteStream(filePath);
          res.pipe(writeToFile);
  
          writeToFile.on('finish', () => {
            resolve(`Se ha descargado correctamente ${name}.`);
          });
  
          writeToFile.on('error', reject);
        });
  
        req.on('error', reject);
      });
  
      return response;
    } catch (error) {
      console.error('Error en la descarga:', error);
      throw error;
    }
  }

  /**
   * Descarga el archivo de metadatos de una versión específica de Minecraft.
   * @returns {Promise<string>} Una promesa que se resuelve con un mensaje de éxito cuando la descarga se completa.
   */

  downloadVersion() {
    return new Promise(async (resolve, reject) => {
      if(!fs.existsSync(path.join(this.root, this.cache, 'json'))) fs.mkdirSync(path.join(this.root, this.cache, 'json'), { recursive: true })
      await this.down(this.url.meta, path.join(this.root, this.cache, 'json'), 'version_manifest.json');

      if(fs.existsSync(path.join(this.root, this.cache))) {
        let ver = JSON.parse(fs.readFileSync(path.join(this.root, this.cache, 'json', 'version_manifest.json'), { encoding: 'utf-8' }))
        const verJson = ver.versions.find(x => x.type === 'release' && x.id === this.version).url;
        if (!verJson) throw "La version no existe.";
        
        if(!fs.existsSync(path.join(this.root,this.versions, this.version))) fs.mkdirSync(path.join(this.root, this.versions, this.version), { recursive: true})
        try {
          await this.down(verJson, path.join(this.root, this.versions, this.version), `${this.version}.json`)
        } catch (error) {
          reject(new Error('Error al descargar el archivo de metadatos de la versión.', error));
        }
      }
      resolve(`VERSION: ${this.version}`)
    })
  }

  /**
   * Descarga el cliente (archivo .jar) de una versión específica de Minecraft.
   * @returns {Promise<string>} Una promesa que se resuelve con un mensaje de éxito cuando la descarga se completa.
   */

  downloadClient() {
    return new Promise(async (resolve, reject) => {
      this.file = path.join(this.root, this.versions, this.version, `${this.version}.json`);
      this.file = JSON.parse(fs.readFileSync(this.file, { encoding: 'utf-8' }));
      
      const client = this.file.downloads.client.url;
      if(!fs.existsSync(path.join(this.root, this.versions, this.version))) fs.mkdirSync(path.join(this.root, this.versions, this.version))
      try {
        await this.down(client, path.join(this.root, this.versions, this.version), `${this.version}.jar`);
      } catch (error) {
        reject(new Error('Error al descargar el archivo .jar de la versión.', error));
      }
      resolve(`CLIENTE DESCARGADO - ${this.version}.jar`);
    })
  }

  /**
   * Descarga los recursos (assets) de una versión específica de Minecraft.
   * @returns {Promise<string>} Una promesa que se resuelve con un mensaje de éxito cuando la descarga se completa.
   */

  downloadAssets() {
    return new Promise(async (resolve, reject) => {
      if(!fs.existsSync(path.join(this.root, this.assets, 'indexes'))) fs.mkdirSync(path.join(this.root, this.assets, 'indexes'), { recursive: true })
      await this.down(this.file.assetIndex.url, path.join(this.root, this.assets, 'indexes'), `${this.version}.json`);
      await this.down(this.file.assetIndex.url, path.join(this.root, this.cache, 'json'), `${this.version}.json`);

      const assetFile = JSON.parse(fs.readFileSync(path.join(this.root, this.assets, 'indexes', `${this.version}.json`)));
      if(!fs.existsSync(path.join(this.root, this.assets, 'objects'))) fs.mkdirSync(path.join(this.root, this.assets, 'objects'))

      for (const key in assetFile.objects) {
        if (assetFile.objects.hasOwnProperty.call(assetFile.objects, key)) {
          const fileName = assetFile.objects[key];
          const fileHash = fileName.hash;
          const fileSubHash = fileHash.substring(0, 2);
          
          if(!fs.existsSync(path.join(this.root, this.assets, 'objects', fileSubHash))) fs.mkdirSync(path.join(this.root, this.assets, 'objects', fileSubHash))
          try {
            this.down(`${this.url.resource}/${fileSubHash}/${fileHash}`, path.join(this.root, this.assets, 'objects', fileSubHash), fileName.hash).then(a => console.log(a)).catch(e => console.log(e))
            
          } catch (error) {
            reject(new Error('Error al descargar los recursos de la versión.', error));
          }
        }
      }
      resolve(`RECURSOS DESCARGADOS - ${path.join(this.root, this.assets)}`)
    })
  }

  /**
   * Descarga los archivos nativos de una versión específica de Minecraft.
   * @returns {Promise<string>} Una promesa que se resuelve con un mensaje de éxito cuando la descarga se completa.
   */

  downloadNatives() {
    return new Promise((resolve, reject) => {
      if(!fs.existsSync(path.join(this.root, this.natives))) fs.mkdirSync(path.join(this.root, this.natives));

      this.file.libraries.forEach(async element => {
        const el = element.downloads.classifiers;
        const natives = (typeof el === 'object' && (el['natives-windows'] ? el['natives-windows'] : el['natives-windows-64']))
        if(natives) {
          try {
            await this.down(natives.url, path.join(this.root, this.natives), path.basename(natives.path))
  
            if(this.version === '1.8' && natives.url.includes('nightly')) return fs.unlinkSync(path.join(this.root, this.natives, path.basename(natives.path)));
            new Zip(path.join(path.join(this.root, this.natives), path.basename(natives.path))).extractAllTo(path.join(this.root, this.natives, this.version), true)

            fs.unlinkSync(path.join(this.root, this.natives, path.basename(natives.path)))
          } catch (error) {
            reject(new Error('Error al descargar los archivos nativos de la versión.', error));
          }
        }
      })
      resolve(`NATIVES DESCARGADOS - ${path.join(this.root, this.natives)}`);
    })
  }

  /**
   * Descarga las librerías de una versión específica de Minecraft.
   * @returns {Promise<string>} Una promesa que se resuelve con un mensaje de éxito cuando la descarga se completa.
   */

  downloadLibraries() {
    return new Promise((resolve, reject) => {
      if(!fs.existsSync(path.join(this.root, this.libraries))) fs.mkdirSync(path.join(this.root, this.libraries));
      this.file.libraries.forEach(async element => {
        if(element.downloads.artifact !== undefined) {
          const jarFile = element.downloads.artifact.path;
          const parts = jarFile.split('/');
          parts.pop();
          const libRoot = parts.join('/');
          const libName = path.basename(jarFile);
          if(!fs.existsSync(path.join(this.root, this.libraries, libRoot))) fs.mkdirSync(path.join(this.root, this.libraries, libRoot), { recursive: true});
          try {
            await this.down(element.downloads.artifact.url, path.join(this.root, this.libraries, libRoot), libName);
          } catch (error) {
            reject(new Error('Error al descargar las librerías de la versión.', error));
          }
        }
      });
      resolve(`LIBRERÍAS DESCARGADAS - ${path.join(this.root, this.libraries)}`);
    })
  }

  /**
   * Descarga todos los archivos necesarios para una versión específica de Minecraft.
   * @param {string} version La versión de Minecraft de la que se descargarán los archivos.
   * @param {string} root El directorio raíz donde se guardarán los archivos descargados.
   * @returns {Promise<string>} Una promesa que se resuelve con un mensaje de éxito cuando todas las descargas se completan.
   */

  download(version, root) {
    this.version = version;
    this.root = root;
    return new Promise(async (resolve, reject) => {
      if (!version) {
        reject(new Error("No se ha proporcionado una versión"));
      } 

      console.log(`DESCARGANDO VERSION: ${version}`)
      console.log(await this.downloadVersion())
      console.log(await this.downloadClient())
      console.log(await this.downloadAssets())
      console.log(await this.downloadLibraries())
      console.log(await this.downloadNatives())


      resolve(`Se han descargado correctamente todos los archivos`);
    })
  }

}

module.exports = Downloader;