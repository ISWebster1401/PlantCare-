# 🌱 Agregar Plantas en Mal Estado - margaritabaztian@gmail.com

Este script agrega 5 plantas en mal estado al usuario `margaritabaztian@gmail.com` para que el agente de IA pueda dar consejos de riego y cuidado.

## Plantas que se agregarán:

1. **Monstera Sedienta** - Estado crítico, sedienta (sin regar hace 10 días)
2. **Pothos Marchito** - Advertencia, enferma (sin regar hace 12 días)
3. **Suculenta Seca** - Advertencia, sedienta (sin regar hace 15 días)
4. **Cactus Deshidratado** - Advertencia, sedienta (sin regar hace 13 días)
5. **Helecho Seco** - Estado crítico, enferma (sin regar hace 17 días)

## Ejecutar con Docker

**Opción 1: Copiar script al contenedor y ejecutar (RECOMENDADO)**
```bash
cd back
docker cp seed_user_margarita.py plantcare-backend:/app/
docker exec -it plantcare-backend python /app/seed_user_margarita.py
```

**Opción 2: Usando docker-compose (si el archivo está montado)**
```bash
cd back
docker-compose exec app python /app/seed_user_margarita.py
```

**Opción 3: Ejecutar directamente desde el host (copiar y ejecutar en un solo comando)**
```bash
cd back
docker cp seed_user_margarita.py plantcare-backend:/tmp/ && docker exec -it plantcare-backend python /tmp/seed_user_margarita.py
```

## Verificar

Después de ejecutar, puedes verificar que las plantas se agregaron correctamente consultando el endpoint de plantas o directamente en la base de datos.
