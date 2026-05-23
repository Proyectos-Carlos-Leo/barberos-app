// Helper para convertir imagen a base64 y comprimir
export const imageToBase64 = (file, maxWidth = 200, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided'));
      return;
    }

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      reject(new Error('El archivo debe ser una imagen'));
      return;
    }

    // Validar tamaño (max 5 MB original)
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('La imagen es muy grande (máx 5 MB)'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Calcular nuevas dimensiones manteniendo aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = (height / width) * maxWidth;
            width = maxWidth;
          } else {
            width = (width / height) * maxWidth;
            height = maxWidth;
          }
        }

        // Crear canvas y dibujar imagen redimensionada
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Recortar a círculo (opcional, mejor mantener cuadrado y CSS lo hace círculo)
        ctx.drawImage(img, 0, 0, width, height);

        // Convertir a base64 JPEG (más compacto)
        const base64 = canvas.toDataURL('image/jpeg', quality);

        // Verificar tamaño final (Firebase max ~256KB por field es seguro)
        const sizeKB = Math.round(base64.length * 0.75 / 1024);
        if (sizeKB > 250) {
          reject(new Error(`Imagen aún muy pesada (${sizeKB} KB). Intenta una más chica.`));
          return;
        }

        resolve(base64);
      };
      img.onerror = () => reject(new Error('Error al cargar la imagen'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsDataURL(file);
  });
};
