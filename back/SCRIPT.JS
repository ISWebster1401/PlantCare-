function mostrarError(mensaje) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = mensaje;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

function actualizarUltimaActualizacion() {
    const now = new Date();
    document.getElementById('last-update').textContent = 
        `Última actualización: ${now.toLocaleTimeString()}`;
}

async function actualizarDatos() {
    const deviceKey = document.getElementById('deviceKey').value.trim();
    if (!deviceKey) {
        mostrarError('Por favor, ingresa la clave del dispositivo');
        return;
    }

    try {
        const tabla = document.getElementById('tabla');
        tabla.innerHTML = '<tr><td colspan="3" class="loading">Cargando datos...</td></tr>';
        
        const response = await fetch('http://localhost:5000/api/lector-humedad', {
            headers: {
                'X-Device-Key': deviceKey
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Clave de dispositivo inválida');
            }
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.length === 0) {
            tabla.innerHTML = '<tr><td colspan="3" class="text-center">No hay datos disponibles</td></tr>';
            return;
        }
        
        tabla.innerHTML = data.map(item => `
            <tr>
                <td>${item.id}</td>
                <td>${item.valor.toFixed(2)}%</td>
                <td>${new Date(item.fecha).toLocaleString()}</td>
            </tr>
        `).join('');
        
        actualizarUltimaActualizacion();
        
    } catch (error) {
        console.error('Error:', error);
        mostrarError(error.message || 'Error al cargar los datos. Por favor, verifica que el servidor esté corriendo.');
        document.getElementById('tabla').innerHTML = 
            '<tr><td colspan="3" class="text-center text-danger">Error al cargar datos</td></tr>';
    }
}

// No actualizamos automáticamente al inicio, esperamos a que el usuario ingrese la clave
// setInterval(actualizarDatos, 30000);