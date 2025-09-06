 // Global variables
 let serverUrl = 'http://192.168.103.12:5000';
 let apiDataUrl = 'http://192.168.103.12:5000/api/datos-sensores';
 let apiStatsUrl = 'http://192.168.103.12:5000/api/estadisticas';
 let testUrl = 'http://192.168.103.12:5000/test';
 let isConnected = false;
 let autoUpdate = true;
 let updateInterval = 5000;
 let updateTimer = null;
 let sensorData = [];
 let chartData = [];
 
 // Initialize application
 document.addEventListener('DOMContentLoaded', function() {
   console.log('🚀 Inicializando dashboard corregido...');
   initTheme();
   initEventListeners();
   loadSavedSettings();
   setTimeout(() => connectToServer(), 1000);
 });
 
 // Theme functionality
 function toggleTheme() {
   const currentTheme = document.documentElement.getAttribute('data-theme');
   const newTheme = currentTheme === 'light' ? 'dark' : 'light';
   document.documentElement.setAttribute('data-theme', newTheme);
   localStorage.setItem('theme', newTheme);
 }
 
 function initTheme() {
   const savedTheme = localStorage.getItem('theme') || 'dark';
   document.documentElement.setAttribute('data-theme', savedTheme);
 }
 
 // Load saved settings
 function loadSavedSettings() {
   const savedUrl = localStorage.getItem('serverUrl');
   if (savedUrl) {
     serverUrl = savedUrl;
     updateApiUrls(savedUrl);
     document.getElementById('serverUrl').value = savedUrl;
   } else {
     document.getElementById('serverUrl').value = serverUrl;
   }
   
   const savedInterval = localStorage.getItem('updateInterval');
   if (savedInterval) {
     updateInterval = parseInt(savedInterval);
     document.getElementById('updateInterval').value = savedInterval;
   }
   
   const savedAutoUpdate = localStorage.getItem('autoUpdate');
   if (savedAutoUpdate !== null) {
     autoUpdate = savedAutoUpdate === 'true';
     updateAutoUpdateToggle();
   }
 }
 
 function updateApiUrls(baseUrl) {
   apiDataUrl = baseUrl + '/api/datos-sensores';
   apiStatsUrl = baseUrl + '/api/estadisticas';
   testUrl = baseUrl + '/test';
 }
 
 function initEventListeners() {
   document.getElementById('updateInterval').addEventListener('change', function() {
     updateInterval = parseInt(this.value);
     localStorage.setItem('updateInterval', updateInterval);
     if (autoUpdate) {
       restartAutoUpdate();
     }
   });
   
   document.getElementById('serverUrl').addEventListener('change', function() {
     const newUrl = this.value.trim();
     if (newUrl) {
       serverUrl = newUrl;
       updateApiUrls(newUrl);
       localStorage.setItem('serverUrl', newUrl);
     }
   });
 
   const searchInput = document.querySelector('.search input');
   if (searchInput) {
     searchInput.addEventListener('input', function() {
       filterData(this.value);
     });
   }
 }
 
 function toggleAutoUpdate() {
   autoUpdate = !autoUpdate;
   localStorage.setItem('autoUpdate', autoUpdate);
   updateAutoUpdateToggle();
   
   if (autoUpdate && isConnected) {
     startAutoUpdate();
   } else {
     stopAutoUpdate();
   }
 }
 
 function updateAutoUpdateToggle() {
   const toggle = document.getElementById('autoUpdateToggle');
   if (toggle) {
     if (autoUpdate) {
       toggle.style.transform = 'translateX(18px)';
       toggle.style.backgroundColor = 'var(--accent)';
     } else {
       toggle.style.transform = 'translateX(2px)';
       toggle.style.backgroundColor = 'var(--muted)';
     }
   }
 }
 
 // CONEXIÓN AL SERVIDOR CORREGIDA
 async function connectToServer() {
   console.log('🔌 Intentando conectar a:', serverUrl);
   const statusElement = document.getElementById('connectionStatus');
   const serverStatusElement = document.getElementById('serverStatus');
   
   try {
     statusElement.className = 'connection-status connecting';
     statusElement.querySelector('span').textContent = 'Conectando...';
     
     // Probar endpoint de test primero
     console.log('🧪 Probando endpoint de test:', testUrl);
     const testResponse = await fetch(testUrl, {
       method: 'GET',
       headers: {
         'Content-Type': 'application/json',
       },
       mode: 'cors'
     });
     
     if (!testResponse.ok) {
       throw new Error(`Test falló: HTTP ${testResponse.status} - ${testResponse.statusText}`);
     }
     
     const testData = await testResponse.json();
     console.log('✅ Test exitoso:', testData);
     
     // Obtener datos históricos del servidor
     console.log('📊 Obteniendo datos históricos de:', apiDataUrl);
     const dataResponse = await fetch(apiDataUrl, {
       method: 'GET',
       headers: {
         'Content-Type': 'application/json',
       },
       mode: 'cors'
     });
     
     if (!dataResponse.ok) {
       throw new Error(`API datos falló: HTTP ${dataResponse.status} - ${dataResponse.statusText}`);
     }
     
     const historicalData = await dataResponse.json();
     console.log('📈 Datos históricos recibidos:', historicalData);
     console.log('📏 Cantidad de registros:', historicalData.length);
     
     // Validar que es un array
     if (!Array.isArray(historicalData)) {
       throw new Error('Servidor devolvió formato inválido (no es array): ' + typeof historicalData);
     }
     
     if (historicalData.length === 0) {
       console.warn('⚠️ Servidor conectado pero sin datos históricos');
       statusElement.className = 'connection-status connecting';
       statusElement.querySelector('span').textContent = 'Sin datos';
       if (serverStatusElement) serverStatusElement.textContent = '⚠️ Conectado - Sin datos';
       isConnected = true; // Marcamos como conectado aunque sin datos
     } else {
       // Conexión exitosa con datos
       isConnected = true;
       statusElement.className = 'connection-status connected';
       statusElement.querySelector('span').textContent = `${historicalData.length} registros`;
       if (serverStatusElement) serverStatusElement.textContent = '✅ Multi-Sensor v2.0';
       
       // Procesar datos históricos
       processHistoricalData(historicalData);
       
       // Obtener último registro para mostrar datos actuales
       const latestData = historicalData[0]; // El más reciente (ORDER BY fecha DESC)
       if (latestData) {
         console.log('🔥 Datos más recientes:', latestData);
         updateCurrentReadings(latestData);
         await detectSensors(latestData);
       }
     }
     
     // Cargar estadísticas
     await loadStatistics();
     
     // Iniciar auto-actualización si está habilitada
     if (autoUpdate && isConnected) {
       startAutoUpdate();
     }
     
   } catch (error) {
     console.error('❌ Error de conexión:', error);
     isConnected = false;
     statusElement.className = 'connection-status disconnected';
     statusElement.querySelector('span').textContent = 'Error conexión';
     if (serverStatusElement) serverStatusElement.textContent = '❌ ' + (error.message.length > 30 ? 'Error conexión' : error.message);
     
     // Mostrar error específico en las estadísticas
     const statsContainer = document.getElementById('statisticsContainer');
     if (statsContainer) {
       statsContainer.innerHTML = `
         <div class="text-center" style="color: var(--error)">
           <div style="margin-bottom:8px">❌ Error de conexión</div>
           <div class="muted" style="font-size:11px">${error.message}</div>
         </div>
       `;
     }
   }
 }
 
 // PROCESAR DATOS HISTÓRICOS
 function processHistoricalData(historicalData) {
   console.log('🔄 Procesando', historicalData.length, 'registros históricos...');
   
   // Limpiar datos previos
   sensorData = [];
   chartData = [];
   
   // Procesar cada registro (ya vienen ordenados por fecha DESC)
   historicalData.forEach(record => {
     // Convertir fecha string a objeto Date
     const timestamp = new Date(record.fecha);
     
     // Crear registro normalizado
     const normalizedRecord = {
       id: record.id,
       humedad_suelo: record.humedad,
       humedad: record.humedad, // alias
       temperatura: record.temperatura,
       presion: record.presion,
       altitud: record.altitud,
       timestamp: timestamp,
       fecha: record.fecha
     };
     
     sensorData.push(normalizedRecord);
     
     // Agregar a datos del gráfico (solo últimos 50 para performance)
     if (chartData.length < 50) {
       chartData.push({
         timestamp: timestamp.getTime(),
         humedad: record.humedad || 0,
         temperatura: record.temperatura || 0,
         presion: record.presion || 0
       });
     }
   });
   
   // Ordenar chartData por timestamp (más antiguo primero para el gráfico)
   chartData.sort((a, b) => a.timestamp - b.timestamp);
   
   // Actualizar contadores
   const dataCountElement = document.getElementById('dataCount');
   const totalRecordsElement = document.getElementById('totalRecords');
   if (dataCountElement) dataCountElement.textContent = `🔢 ${sensorData.length} registros`;
   if (totalRecordsElement) totalRecordsElement.textContent = sensorData.length;
   
   // Actualizar componentes visuales
   updateAverages();
   updateRecentDataTable();
   drawChart();
   
   console.log('✅ Procesados', sensorData.length, 'registros históricos');
 }
 
 // ACTUALIZAR LECTURAS ACTUALES
 function updateCurrentReadings(latestData) {
   console.log('🔥 Actualizando lecturas actuales con:', latestData);
   
   // Humedad (siempre presente)
   if (latestData.humedad !== undefined && latestData.humedad !== null) {
     const currentHumidityElement = document.getElementById('currentHumidity');
     if (currentHumidityElement) {
       currentHumidityElement.textContent = parseFloat(latestData.humedad).toFixed(1) + '%';
     }
     
     // Determinar estado de humedad
     const humedad = parseFloat(latestData.humedad);
     let status = '';
     if (humedad < 30) {
       status = '<span class="status-indicator status-error"></span>MUY SECO';
     } else if (humedad < 50) {
       status = '<span class="status-indicator status-warning"></span>SECO';
     } else if (humedad < 70) {
       status = '<span class="status-indicator status-online"></span>ÓPTIMO';
     } else {
       status = '<span class="status-indicator status-online"></span>HÚMEDO';
     }
     const humidityStatusElement = document.getElementById('humidityStatus');
     if (humidityStatusElement) humidityStatusElement.innerHTML = status;
   }
   
   // Temperatura BMP180
   const currentTemperatureElement = document.getElementById('currentTemperature');
   const temperatureStatusElement = document.getElementById('temperatureStatus');
   
   if (latestData.temperatura !== undefined && latestData.temperatura !== null) {
     if (currentTemperatureElement) currentTemperatureElement.textContent = parseFloat(latestData.temperatura).toFixed(1) + '°C';
     if (temperatureStatusElement) temperatureStatusElement.textContent = 'BMP180 Online';
   } else {
     if (currentTemperatureElement) currentTemperatureElement.textContent = '--';
     if (temperatureStatusElement) temperatureStatusElement.textContent = 'BMP180 N/A';
   }
   
   // Presión BMP180
   const currentPressureElement = document.getElementById('currentPressure');
   const pressureStatusElement = document.getElementById('pressureStatus');
   
   if (latestData.presion !== undefined && latestData.presion !== null) {
     if (currentPressureElement) currentPressureElement.textContent = parseFloat(latestData.presion).toFixed(1) + ' hPa';
     if (pressureStatusElement) pressureStatusElement.textContent = 'BMP180';
   } else {
     if (currentPressureElement) currentPressureElement.textContent = '--';
     if (pressureStatusElement) pressureStatusElement.textContent = 'N/A';
   }
   
   // Timestamps
   const fechaData = new Date(latestData.fecha);
   const lastUpdateTimeElement = document.getElementById('lastUpdateTime');
   const lastReadingElement = document.getElementById('lastReading');
   const dbStatusElement = document.getElementById('dbStatus');
   
   if (lastUpdateTimeElement) {
     lastUpdateTimeElement.textContent = `📅 ${fechaData.toLocaleTimeString()}`;
   }
   if (lastReadingElement) {
     lastReadingElement.textContent = `✅ ${fechaData.toLocaleTimeString()}`;
   }
   if (dbStatusElement) {
     dbStatusElement.textContent = '✅ Multi-Sensor v2.0';
   }
 }
 
 // DETECCIÓN DE SENSORES MEJORADA
 async function detectSensors(latestData) {
   const container = document.getElementById('sensorsContainer');
   if (!container) return;
   
   container.innerHTML = '';
   
   console.log('🔍 Detectando sensores con último registro:', latestData);
   
   const sensors = [];
   
   // Sensor de Humedad (siempre presente)
   if (latestData.humedad !== undefined && latestData.humedad !== null) {
     sensors.push({
       name: 'Humedad del Suelo',
       type: 'humedad',
       icon: '💧',
       value: latestData.humedad,
       unit: '%',
       status: 'online'
     });
   }
   
   // Sensor BMP180 - Temperatura
   if (latestData.temperatura !== undefined && latestData.temperatura !== null) {
     sensors.push({
       name: 'Temperatura BMP180',
       type: 'temperatura',
       icon: '🌡️',
       value: latestData.temperatura,
       unit: '°C',
       status: 'online'
     });
   } else {
     sensors.push({
       name: 'Temperatura BMP180',
       type: 'temperatura',
       icon: '🌡️',
       value: null,
       unit: '°C',
       status: 'offline'
     });
   }
   
   // Sensor BMP180 - Presión
   if (latestData.presion !== undefined && latestData.presion !== null) {
     sensors.push({
       name: 'Presión BMP180',
       type: 'presion',
       icon: '📊',
       value: latestData.presion,
       unit: 'hPa',
       status: 'online'
     });
   } else {
     sensors.push({
       name: 'Presión BMP180',
       type: 'presion',
       icon: '📊',
       value: null,
       unit: 'hPa',
       status: 'offline'
     });
   }
   
   // Sensor BMP180 - Altitud (opcional)
   if (latestData.altitud !== undefined && latestData.altitud !== null) {
     sensors.push({
       name: 'Altitud BMP180',
       type: 'altitud',
       icon: '🏔️',
       value: latestData.altitud,
       unit: 'm',
       status: 'online'
     });
   }
   
   // Mostrar sensores detectados
   sensors.forEach(sensor => {
     const statusIcon = sensor.status === 'online' ? '✅' : '⚠️';
     const sensorElement = document.createElement('div');
     sensorElement.className = 'chip';
     sensorElement.innerHTML = `${statusIcon} ${sensor.icon} ${sensor.name}`;
     
     if (sensor.status === 'online' && sensor.value !== null) {
       sensorElement.title = `Último valor: ${sensor.value} ${sensor.unit}`;
     } else {
       sensorElement.title = 'Sensor sin datos';
     }
     
     container.appendChild(sensorElement);
   });
   
   const activeSensors = sensors.filter(s => s.status === 'online').length;
   console.log(`📈 ${activeSensors}/${sensors.length} sensores activos`);
   
   const activeSensorsElement = document.getElementById('activeSensors');
   if (activeSensorsElement) {
     activeSensorsElement.textContent = activeSensors;
   }
   
   // Guardar sensores detectados
   window.detectedSensors = sensors;
 }
 
 // CARGAR ESTADÍSTICAS DEL SERVIDOR
 async function loadStatistics() {
   try {
     console.log('📊 Cargando estadísticas de:', apiStatsUrl);
     const response = await fetch(apiStatsUrl, {
       method: 'GET',
       headers: {
         'Content-Type': 'application/json',
       },
       mode: 'cors'
     });
     
     if (!response.ok) {
       throw new Error(`HTTP ${response.status} - ${response.statusText}`);
     }
     
     const stats = await response.json();
     console.log('📈 Estadísticas recibidas:', stats);
     updateServerStatistics(stats);
     
   } catch (error) {
     console.error('❌ Error cargando estadísticas:', error);
     const statsContainer = document.getElementById('statisticsContainer');
     if (statsContainer) {
       statsContainer.innerHTML = `<div class="text-center muted">Error cargando estadísticas: ${error.message}</div>`;
     }
   }
 }
 
 // ACTUALIZAR ESTADÍSTICAS EN UI
 function updateServerStatistics(serverStats) {
   const container = document.getElementById('statisticsContainer');
   if (!container) return;
   
   let statsHTML = '';
   
   // Total de registros
   if (serverStats.total_registros !== undefined) {
     statsHTML += `
       <div style="display:flex;justify-content:space-between;margin-bottom:8px">
         <span class="muted">📊 Total registros</span>
         <span style="font-weight:600">${serverStats.total_registros}</span>
       </div>
     `;
   }
   
   // Estadísticas de humedad
   if (serverStats.humedad) {
     statsHTML += `
       <div style="display:flex;justify-content:space-between;margin-bottom:8px">
         <span class="muted">💧 Humedad promedio</span>
         <span style="font-weight:600">${serverStats.humedad.promedio}%</span>
       </div>
       <div style="display:flex;justify-content:space-between;margin-bottom:8px">
         <span class="muted">💧 Min/Max</span>
         <span style="font-weight:600">${serverStats.humedad.minima}% - ${serverStats.humedad.maxima}%</span>
       </div>
     `;
   }
   
   // Estadísticas de temperatura
   if (serverStats.temperatura) {
     statsHTML += `
       <div style="display:flex;justify-content:space-between;margin-bottom:8px">
         <span class="muted">🌡️ Temp. promedio</span>
         <span style="font-weight:600">${serverStats.temperatura.promedio}°C</span>
       </div>
       <div style="display:flex;justify-content:space-between;margin-bottom:8px">
         <span class="muted">🌡️ Min/Max</span>
         <span style="font-weight:600">${serverStats.temperatura.minima}°C - ${serverStats.temperatura.maxima}°C</span>
       </div>
     `;
   }
   
   // Estadísticas de presión
   if (serverStats.presion) {
     statsHTML += `
       <div style="display:flex;justify-content:space-between;margin-bottom:8px">
         <span class="muted">🔽 Presión promedio</span>
         <span style="font-weight:600">${serverStats.presion.promedio} hPa</span>
       </div>
     `;
   }
   
   // Período de estadísticas
   if (serverStats.periodo) {
     statsHTML += `
       <div style="display:flex;justify-content:space-between;margin-top:12px;padding-top:8px;border-top:1px solid var(--border)">
         <span class="muted" style="font-size:11px">📅 Período</span>
         <span style="font-size:11px;font-weight:600">${serverStats.periodo}</span>
       </div>
     `;
   }
   
   if (statsHTML) {
     container.innerHTML = statsHTML;
   } else {
     container.innerHTML = '<div class="text-center muted">Sin estadísticas disponibles</div>';
   }
 }
 
 // OBTENER DATOS MÁS RECIENTES (para auto-actualización)
 async function fetchLatestData() {
   try {
     console.log('🔄 Obteniendo datos más recientes...');
     const response = await fetch(apiDataUrl, {
       method: 'GET',
       headers: {
         'Content-Type': 'application/json',
       },
       mode: 'cors'
     });
     
     if (!response.ok) {
       throw new Error(`HTTP ${response.status}: ${response.statusText}`);
     }
     
     const data = await response.json();
     
     if (!Array.isArray(data) || data.length === 0) {
       console.warn('⚠️ No hay datos del servidor');
       return;
     }
     
     const latestRecord = data[0]; // El más reciente
     console.log('🔥 Último registro del servidor:', latestRecord);
     
     // Verificar si hay cambios respecto al último que tenemos
     const lastLocal = sensorData[0]; // Nuestro más reciente local
     if (lastLocal && lastLocal.id === latestRecord.id) {
       console.log('📊 Sin cambios en los datos');
       return;
     }
     
     // Hay un registro nuevo, actualizar
     console.log('🆕 Nuevo registro detectado, actualizando...');
     
     // Procesar nuevo registro
     const timestamp = new Date(latestRecord.fecha);
     const normalizedRecord = {
       id: latestRecord.id,
       humedad_suelo: latestRecord.humedad,
       humedad: latestRecord.humedad,
       temperatura: latestRecord.temperatura,
       presion: latestRecord.presion,
       altitud: latestRecord.altitud,
       timestamp: timestamp,
       fecha: latestRecord.fecha
     };
     
     // Agregarlo al inicio (más reciente)
     sensorData.unshift(normalizedRecord);
     
     // Mantener máximo 1000 registros
     if (sensorData.length > 1000) {
       sensorData.pop();
     }
     
     // Actualizar gráfico
     addDataToChart(normalizedRecord);
     
     // Actualizar lecturas actuales
     updateCurrentReadings(latestRecord);
     
     // Actualizar componentes
     updateAverages();
     updateRecentDataTable();
     
     // Actualizar contadores
     const dataCountElement = document.getElementById('dataCount');
     const totalRecordsElement = document.getElementById('totalRecords');
     const lastUpdateTimeElement = document.getElementById('lastUpdateTime');
     
     if (dataCountElement) dataCountElement.textContent = `🔢 ${sensorData.length} registros`;
     if (totalRecordsElement) totalRecordsElement.textContent = sensorData.length;
     
     // Actualizar timestamp
     const now = new Date();
     if (lastUpdateTimeElement) {
       lastUpdateTimeElement.textContent = `📅 ${now.toLocaleTimeString()}`;
     }
     
     showNotification('🔄 Datos actualizados correctamente', 'success');
     
   } catch (error) {
     console.error('❌ Error obteniendo datos:', error);
     
     if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
       console.log('🔄 Error de red temporal, continuando...');
     } else if (error.message.includes('500') || error.message.includes('404')) {
       console.error('🚫 Error del servidor, deteniendo actualizaciones');
       isConnected = false;
       const statusElement = document.getElementById('connectionStatus');
       if (statusElement) {
         statusElement.className = 'connection-status disconnected';
         statusElement.querySelector('span').textContent = 'Error servidor';
       }
       stopAutoUpdate();
     }
   }
 }
 
 // AGREGAR DATOS AL GRÁFICO
 function addDataToChart(data) {
   const timestamp = data.timestamp.getTime();
   
   chartData.push({
     timestamp: timestamp,
     humedad: data.humedad || 0,
     temperatura: data.temperatura || 0,
     presion: data.presion || 0
   });
   
   // Mantener solo los últimos 50 puntos
   if (chartData.length > 50) {
     chartData.shift();
   }
   
   drawChart();
 }
 
 // DIBUJAR GRÁFICO SVG
 function drawChart() {
   const svg = document.getElementById('realTimeChart');
   if (!svg) return;
   
   const width = 600;
   const height = 120;
   const padding = 20;
   
   if (chartData.length < 2) {
     svg.innerHTML = `
       <defs>
         <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
           <stop offset="0%" stop-color="#16a34a" stop-opacity="0.3" />
           <stop offset="100%" stop-color="#16a34a" stop-opacity="0" />
         </linearGradient>
       </defs>
       <text x="300" y="60" text-anchor="middle" fill="var(--muted)" font-size="14">
         ${chartData.length === 0 ? 'Esperando datos del servidor...' : 'Necesita al menos 2 puntos para gráfico'}
       </text>
     `;
     return;
   }
   
   // Limpiar SVG
   svg.innerHTML = `
     <defs>
       <linearGradient id="humidityGradient" x1="0" x2="0" y1="0" y2="1">
         <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.3" />
         <stop offset="100%" stop-color="#3b82f6" stop-opacity="0" />
       </linearGradient>
       <linearGradient id="tempGradient" x1="0" x2="0" y1="0" y2="1">
         <stop offset="0%" stop-color="#16a34a" stop-opacity="0.2" />
         <stop offset="100%" stop-color="#16a34a" stop-opacity="0" />
       </linearGradient>
     </defs>
   `;
   
   // Calcular escalas para humedad (0-100%)
   const humedadValues = chartData.map(d => d.humedad).filter(v => v > 0);
   if (humedadValues.length === 0) return;
   
   const maxHumedad = Math.max(...humedadValues);
   const minHumedad = Math.min(...humedadValues);
   const rangeHumedad = Math.max(maxHumedad - minHumedad, 10); // Mínimo rango de 10
   
   // Generar path para humedad
   let humedadPath = '';
   let validPoints = [];
   
   chartData.forEach((point, index) => {
     if (point.humedad > 0) {
       const x = padding + (index / (chartData.length - 1)) * (width - 2 * padding);
       const y = height - padding - ((point.humedad - minHumedad) / rangeHumedad) * (height - 2 * padding);
       validPoints.push({x, y});
       humedadPath += (validPoints.length === 1 ? 'M' : 'L') + `${x},${y}`;
     }
   });
   
   // Crear línea de humedad
   if (humedadPath && validPoints.length >= 2) {
     const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
     path.setAttribute('d', humedadPath);
     path.setAttribute('fill', 'none');
     path.setAttribute('stroke', '#3b82f6');
     path.setAttribute('stroke-width', '2');
     path.setAttribute('stroke-linejoin', 'round');
     path.setAttribute('stroke-linecap', 'round');
     svg.appendChild(path);
     
     // Área bajo la curva de humedad
     if (validPoints.length >= 2) {
       const areaPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
       const firstPoint = validPoints[0];
       const lastPoint = validPoints[validPoints.length - 1];
       const areaData = humedadPath + `L${lastPoint.x},${height - padding}L${firstPoint.x},${height - padding}Z`;
       areaPath.setAttribute('d', areaData);
       areaPath.setAttribute('fill', 'url(#humidityGradient)');
       svg.insertBefore(areaPath, path);
     }
     
     // Agregar puntos de datos
     validPoints.forEach(point => {
       const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
       circle.setAttribute('cx', point.x);
       circle.setAttribute('cy', point.y);
       circle.setAttribute('r', '3');
       circle.setAttribute('fill', '#3b82f6');
       circle.setAttribute('stroke', '#ffffff');
       circle.setAttribute('stroke-width', '1');
       svg.appendChild(circle);
     });
   }
 }
 
 // ACTUALIZAR PROMEDIOS
 function updateAverages() {
   if (sensorData.length === 0) return;
   
   const validHumidity = sensorData.filter(d => d.humedad_suelo && d.humedad_suelo > 0);
   const validTemp = sensorData.filter(d => d.temperatura && d.temperatura !== null);
   const validPressure = sensorData.filter(d => d.presion && d.presion !== null);
   
   const avgHumidity = validHumidity.length > 0 ? 
     validHumidity.reduce((sum, d) => sum + d.humedad_suelo, 0) / validHumidity.length : 0;
   const avgTemp = validTemp.length > 0 ? 
     validTemp.reduce((sum, d) => sum + d.temperatura, 0) / validTemp.length : 0;
   const avgPressure = validPressure.length > 0 ? 
     validPressure.reduce((sum, d) => sum + d.presion, 0) / validPressure.length : 0;
   
   const avgHumidityElement = document.getElementById('avgHumidity');
   const avgTemperatureElement = document.getElementById('avgTemperature');
   const avgPressureElement = document.getElementById('avgPressure');
   
   if (avgHumidityElement) avgHumidityElement.textContent = avgHumidity > 0 ? avgHumidity.toFixed(1) + '%' : '--%';
   if (avgTemperatureElement) avgTemperatureElement.textContent = avgTemp > 0 ? avgTemp.toFixed(1) + '°C' : '--°C';
   if (avgPressureElement) avgPressureElement.textContent = avgPressure > 0 ? avgPressure.toFixed(1) + ' hPa' : '-- hPa';
 }
 
 // ACTUALIZAR TABLA DE DATOS RECIENTES
 function updateRecentDataTable() {
   const container = document.getElementById('recentDataContainer');
   if (!container) return;
   
   const recentData = sensorData.slice(0, 15); // Los 15 más recientes
   
   if (recentData.length === 0) {
     container.innerHTML = '<div class="text-center muted">No hay datos disponibles</div>';
     return;
   }
   
   let tableHTML = `
     <table style="width:100%;font-size:12px">
       <thead>
         <tr style="border-bottom:1px solid var(--border)">
           <th style="padding:8px;text-align:left">ID</th>
           <th style="padding:8px;text-align:left">Fecha/Hora</th>
           <th style="padding:8px;text-align:right">💧 Humedad</th>
           <th style="padding:8px;text-align:right">🌡️ Temp</th>
           <th style="padding:8px;text-align:right">📊 Presión</th>
         </tr>
       </thead>
       <tbody>
   `;
   
   recentData.forEach(data => {
     const fecha = new Date(data.fecha);
     const humedadValue = data.humedad !== null && data.humedad !== undefined ? data.humedad.toFixed(1) + '%' : '--';
     const tempValue = data.temperatura !== null && data.temperatura !== undefined ? data.temperatura.toFixed(1) + '°C' : '--';
     const presionValue = data.presion !== null && data.presion !== undefined ? data.presion.toFixed(1) + ' hPa' : '--';
     
     tableHTML += `
       <tr style="border-bottom:1px solid var(--border)">
         <td style="padding:6px;font-family:monospace">#${data.id}</td>
         <td style="padding:6px">${fecha.toLocaleString('es-ES')}</td>
         <td style="padding:6px;text-align:right;color:var(--accent-2)">${humedadValue}</td>
         <td style="padding:6px;text-align:right;color:var(--accent)">${tempValue}</td>
         <td style="padding:6px;text-align:right;color:var(--warning)">${presionValue}</td>
       </tr>
     `;
   });
   
   tableHTML += '</tbody></table>';
   container.innerHTML = tableHTML;
 }
 
 // FILTRAR DATOS
 function filterData(searchTerm) {
   if (!searchTerm) {
     updateRecentDataTable();
     return;
   }
   
   const filteredData = sensorData.filter(data => {
     const searchLower = searchTerm.toLowerCase();
     return (
       data.id.toString().includes(searchTerm) ||
       data.fecha.toLowerCase().includes(searchLower) ||
       (data.humedad && data.humedad.toString().includes(searchTerm)) ||
       (data.temperatura && data.temperatura.toString().includes(searchTerm)) ||
       (data.presion && data.presion.toString().includes(searchTerm))
     );
   });
   
   // Mostrar resultados filtrados
   const container = document.getElementById('recentDataContainer');
   if (!container) return;
   
   if (filteredData.length === 0) {
     container.innerHTML = '<div class="text-center muted">No se encontraron datos que coincidan</div>';
     return;
   }
   
   let tableHTML = `
     <table style="width:100%;font-size:12px">
       <thead>
         <tr style="border-bottom:1px solid var(--border)">
           <th style="padding:8px;text-align:left">ID</th>
           <th style="padding:8px;text-align:left">Fecha/Hora</th>
           <th style="padding:8px;text-align:right">💧 Humedad</th>
           <th style="padding:8px;text-align:right">🌡️ Temp</th>
           <th style="padding:8px;text-align:right">📊 Presión</th>
         </tr>
       </thead>
       <tbody>
   `;
   
   filteredData.slice(0, 20).forEach(data => {
     const fecha = new Date(data.fecha);
     const humedadValue = data.humedad !== null && data.humedad !== undefined ? data.humedad.toFixed(1) + '%' : '--';
     const tempValue = data.temperatura !== null && data.temperatura !== undefined ? data.temperatura.toFixed(1) + '°C' : '--';
     const presionValue = data.presion !== null && data.presion !== undefined ? data.presion.toFixed(1) + ' hPa' : '--';
     
     tableHTML += `
       <tr style="border-bottom:1px solid var(--border)">
         <td style="padding:6px;font-family:monospace">#${data.id}</td>
         <td style="padding:6px">${fecha.toLocaleString('es-ES')}</td>
         <td style="padding:6px;text-align:right;color:var(--accent-2)">${humedadValue}</td>
         <td style="padding:6px;text-align:right;color:var(--accent)">${tempValue}</td>
         <td style="padding:6px;text-align:right;color:var(--warning)">${presionValue}</td>
       </tr>
     `;
   });
   
   tableHTML += '</tbody></table>';
   container.innerHTML = tableHTML;
 }
 
 // AUTO-ACTUALIZACIÓN
 function startAutoUpdate() {
   if (updateTimer) clearInterval(updateTimer);
   updateTimer = setInterval(async () => {
     if (isConnected && autoUpdate) {
       await fetchLatestData();
     }
   }, updateInterval);
   console.log(`🔄 Auto-actualización iniciada cada ${updateInterval}ms`);
 }
 
 function restartAutoUpdate() {
   if (autoUpdate) {
     startAutoUpdate();
   }
 }
 
 function stopAutoUpdate() {
   if (updateTimer) {
     clearInterval(updateTimer);
     updateTimer = null;
   }
   console.log('⏹️ Auto-actualización detenida');
 }
 
 // FUNCIONES DE BOTONES
 async function manualRefresh() {
   console.log('🔄 Actualización manual solicitada');
   showNotification('🔄 Actualizando datos...', 'info');
   
   try {
     if (isConnected) {
       await fetchLatestData();
       await loadStatistics();
       showNotification('✅ Datos actualizados correctamente', 'success');
     } else {
       await connectToServer();
     }
   } catch (error) {
     showNotification('❌ Error al actualizar: ' + error.message, 'error');
   }
 }
 
 function exportData() {
   if (sensorData.length === 0) {
     showNotification('⚠️ No hay datos para exportar', 'warning');
     return;
   }
   
   try {
     const headers = ['ID', 'Fecha', 'Humedad (%)', 'Temperatura (°C)', 'Presion (hPa)', 'Altitud (m)'];
     const csvContent = [
       headers.join(','),
       ...sensorData.map(data => [
         data.id,
         data.fecha,
         data.humedad || '', 
         data.temperatura || '',
         data.presion || '',
         data.altitud || ''
       ].join(','))
     ].join('\n');
 
     const blob = new Blob([csvContent], { type: 'text/csv' });
     const url = window.URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.style.display = 'none';
     a.href = url;
     a.download = `plantcare_datos_${new Date().toISOString().split('T')[0]}.csv`;
     document.body.appendChild(a);
     a.click();
     window.URL.revokeObjectURL(url);
     document.body.removeChild(a);
     
     showNotification('📁 Datos exportados correctamente', 'success');
   } catch (error) {
     showNotification('❌ Error al exportar: ' + error.message, 'error');
   }
 }
 
 function clearData() {
   if (confirm('¿Estás seguro de que deseas limpiar todos los datos de la vista actual?')) {
     sensorData = [];
     chartData = [];
     
     // Limpiar UI
     const elements = {
       'currentHumidity': '--',
       'currentTemperature': '--',
       'currentPressure': '--',
       'temperatureStatus': 'Sin datos',
       'pressureStatus': 'Sin datos',
       'dataCount': '🔢 0 registros',
       'totalRecords': '0',
       'lastUpdateTime': '📅 Nunca actualizado',
       'lastReading': '❓ Desconocido',
       'avgHumidity': '--%',
       'avgTemperature': '--°C',
       'avgPressure': '-- hPa',
       'activeSensors': '0'
     };
     
     Object.keys(elements).forEach(id => {
       const element = document.getElementById(id);
       if (element) element.textContent = elements[id];
     });
     
     const humidityStatusElement = document.getElementById('humidityStatus');
     if (humidityStatusElement) humidityStatusElement.innerHTML = 'Sin datos';
     
     // Limpiar gráfico
     const svg = document.getElementById('realTimeChart');
     if (svg) {
       svg.innerHTML = `
         <defs>
           <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
             <stop offset="0%" stop-color="#16a34a" stop-opacity="0.3" />
             <stop offset="100%" stop-color="#16a34a" stop-opacity="0" />
           </linearGradient>
         </defs>
         <text x="300" y="60" text-anchor="middle" fill="var(--muted)" font-size="14">
           Vista limpiada - Esperando datos...
         </text>
       `;
     }
     
     // Limpiar tabla
     const recentDataContainer = document.getElementById('recentDataContainer');
     if (recentDataContainer) {
       recentDataContainer.innerHTML = '<div class="text-center muted">Vista limpiada - No hay datos</div>';
     }
     
     // Limpiar sensores
     const sensorsContainer = document.getElementById('sensorsContainer');
     if (sensorsContainer) {
       sensorsContainer.innerHTML = '<div class="chip">🔍 Vista limpiada</div>';
     }
     
     showNotification('🗑️ Vista limpiada correctamente', 'success');
   }
 }
 
 async function testConnection() {
   showNotification('🧪 Probando conexión...', 'info');
   
   try {
     const response = await fetch(testUrl, {
       method: 'GET',
       headers: {
         'Content-Type': 'application/json',
       },
       mode: 'cors'
     });
     
     if (!response.ok) {
       throw new Error(`HTTP ${response.status}: ${response.statusText}`);
     }
     
     const result = await response.json();
     console.log('🧪 Test exitoso:', result);
     
     showNotification(
       `✅ Conexión exitosa - ${result.mensaje || 'Servidor respondiendo'}`, 
       'success'
     );
     
     // Mostrar información adicional si está disponible
     if (result.version) {
       setTimeout(() => {
         showNotification(`ℹ️ Versión: ${result.version}`, 'info');
       }, 2000);
     }
     
   } catch (error) {
     console.error('❌ Test de conexión falló:', error);
     showNotification('❌ Test falló: ' + error.message, 'error');
   }
 }
 
 // SISTEMA DE NOTIFICACIONES
 function showNotification(message, type = 'info') {
   // Crear elemento de notificación
   const notification = document.createElement('div');
   notification.style.cssText = `
     position: fixed;
     top: 20px;
     right: 20px;
     padding: 12px 16px;
     border-radius: 8px;
     color: white;
     font-size: 14px;
     font-weight: 500;
     z-index: 1000;
     max-width: 300px;
     box-shadow: 0 4px 12px rgba(0,0,0,0.3);
     transform: translateX(100%);
     transition: all 0.3s ease;
   `;
   
   // Colores según tipo
   switch (type) {
     case 'success':
       notification.style.backgroundColor = '#16a34a';
       break;
     case 'error':
       notification.style.backgroundColor = '#dc2626';
       break;
     case 'warning':
       notification.style.backgroundColor = '#f59e0b';
       break;
     case 'info':
     default:
       notification.style.backgroundColor = '#3b82f6';
       break;
   }
   
   notification.textContent = message;
   document.body.appendChild(notification);
   
   // Animar entrada
   setTimeout(() => {
     notification.style.transform = 'translateX(0)';
   }, 100);
   
   // Auto-ocultar después de 4 segundos
   setTimeout(() => {
     notification.style.transform = 'translateX(100%)';
     setTimeout(() => {
       if (document.body.contains(notification)) {
         document.body.removeChild(notification);
       }
     }, 300);
   }, 4000);
 }
 
 // INICIALIZACIÓN FINAL
 console.log('✅ Dashboard PlantCare Multi-Sensor v2.0 cargado correctamente');
 console.log('📊 Funciones disponibles:');
 console.log('  - connectToServer(): Conectar al servidor');
 console.log('  - manualRefresh(): Actualización manual');
 console.log('  - exportData(): Exportar datos a CSV');
 console.log('  - clearData(): Limpiar vista');
 console.log('  - testConnection(): Probar conexión');
 console.log('  - toggleTheme(): Cambiar tema');
 console.log('  - toggleAutoUpdate(): Activar/desactivar auto-actualización');