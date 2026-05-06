# 🚀 Guía Rápida de Inicio - BarberOS

## ⚡ Para Probar en 3 Minutos

### Paso 1: Instalar Node.js

Si no tienes Node.js, descárgalo desde: **https://nodejs.org**

Verifica que esté instalado:
```bash
node --version
# Debe mostrar v18.0.0 o superior
```

### Paso 2: Abrir Terminal en la Carpeta

Abre la terminal/cmd en la carpeta del proyecto:

**Windows**: Click derecho dentro de la carpeta → "Abrir en Terminal"
**Mac**: Click derecho → "Servicios" → "Nueva Terminal en la Carpeta"

### Paso 3: Instalar e Iniciar

```bash
# Instalar dependencias (solo primera vez)
npm install

# Iniciar la aplicación
npm run dev
```

¡Listo! La aplicación se abrirá automáticamente en tu navegador en:
**http://localhost:3000**

---

## 🧪 Cómo Probar la Sincronización

### Prueba 1: En la misma pestaña

1. Inicia la app y elige **"Soy Cliente"**
2. Agenda una cita con cualquier barbero
3. Después de confirmar, click en **"Volver al inicio"**
4. Elige **"Soy Dueño"**
5. ✨ Verás tu cita recién creada en el panel

### Prueba 2: En dos pestañas (¡La mejor parte!)

1. Abre la app: `http://localhost:3000/cliente`
2. **En otra pestaña** abre: `http://localhost:3000/admin`
3. Acomódalas lado a lado en tu pantalla
4. Agenda una cita en la pestaña del cliente
5. ✨ **Verás aparecer la cita instantáneamente en la pestaña del admin**

¡No necesitas refrescar la página! Funciona en tiempo real.

---

## 🎯 URLs Importantes

| Vista | URL |
|-------|-----|
| Inicio (selección) | http://localhost:3000/ |
| Cliente | http://localhost:3000/cliente |
| Admin | http://localhost:3000/admin |

---

## 📝 Datos de Prueba Incluidos

Al iniciar por primera vez, ya tienes:

**Barberos:**
- Carlos Mendoza (Degradados & Navaja)
- Luis Reyes (Clásicos & Peinados)
- Miguel Torres (Barbas & Diseños)

**Servicios:**
- Corte clásico - $150
- Corte + barba - $220
- Degradado - $180
- Barba completa - $120
- Corte infantil - $100
- Diseño + líneas - $200

**Citas de ejemplo:**
- 4 citas para hoy con diferentes estados

---

## 🎬 Demo de Funcionalidades

### Como Cliente:
1. **Agendar cita** → 4 pasos fáciles
2. **Ver disponibilidad** → Horarios ocupados se ocultan
3. **Recibir comprobante** → Con número de folio

### Como Admin:
1. **Ver dashboard** → Stats del día en tiempo real
2. **Cambiar estado** → Click en una cita → cambiar estado
3. **Filtrar citas** → Por fecha, barbero, estado
4. **Gestionar equipo** → Agregar/quitar barberos
5. **Ver historial** → Citas completadas + ingresos

---

## ⚠️ Notas Importantes

### Persistencia de Datos
Los datos se guardan en el navegador (localStorage). Esto significa:

✅ **Bueno**: Los datos persisten entre sesiones
✅ **Bueno**: No necesitas servidor para probar

⚠️ **Importante**: Para producción real, necesitarás migrar a una base de datos como Firebase o Supabase.

### Borrar Datos de Prueba
Si quieres empezar de cero:

1. Abre las herramientas de desarrollador (F12)
2. Ve a "Application" → "Local Storage"
3. Borra la entrada `barberos_data`
4. Refresca la página

O ejecuta en la consola del navegador:
```javascript
localStorage.removeItem('barberos_data');
location.reload();
```

---

## 🛠️ Scripts Disponibles

```bash
# Desarrollo (hot reload)
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview
```

---

## 📦 Subir a Internet

### Opción 1: Vercel (Recomendado, gratis)

```bash
npm install -g vercel
vercel login
vercel
```

Sigue las instrucciones y obtendrás una URL pública.

### Opción 2: Netlify

1. Crea cuenta en netlify.com
2. Arrastra la carpeta `dist/` (después de `npm run build`)
3. Listo, tendrás tu URL pública

### Opción 3: Hosting Propio

```bash
npm run build
# Sube todo el contenido de dist/ a tu servidor
```

---

## 🆘 Problemas Comunes

### "command not found: npm"
Instala Node.js desde https://nodejs.org

### Error al instalar dependencias
```bash
# Limpia caché
npm cache clean --force

# Borra node_modules y reinstala
rm -rf node_modules package-lock.json
npm install
```

### Puerto 3000 ocupado
Cambia el puerto en `vite.config.js`:
```javascript
server: {
  port: 3001  // O cualquier otro
}
```

### Las pestañas no se sincronizan
Verifica que ambas pestañas estén en el mismo navegador y dominio.

---

## 📞 ¿Necesitas Ayuda?

- Lee el README.md para más detalles
- Revisa el código - está completamente comentado
- Los componentes son modulares, fáciles de modificar

---

**¡Disfruta tu nuevo sistema de gestión BarberOS!** 💈
