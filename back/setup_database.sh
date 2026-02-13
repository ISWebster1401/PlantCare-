#!/bin/bash

# ============================================================
# Script de Configuración de Base de Datos - PlantCare
# ============================================================
# Este script automatiza la instalación de PostgreSQL y
# la creación de la base de datos.
# ============================================================

set -e  # Salir si hay algún error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar si estamos en Mac
if [[ "$OSTYPE" != "darwin"* ]]; then
    print_error "Este script está diseñado para macOS"
    exit 1
fi

print_info "Iniciando configuración de PostgreSQL para PlantCare..."

# Paso 1: Verificar si Homebrew está instalado
print_info "Verificando Homebrew..."
if ! command -v brew &> /dev/null; then
    print_warning "Homebrew no está instalado. Instalando..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
    print_success "Homebrew está instalado"
fi

# Paso 2: Verificar si PostgreSQL está instalado
print_info "Verificando PostgreSQL..."
if ! command -v psql &> /dev/null; then
    print_warning "PostgreSQL no está instalado. Instalando..."
    brew install postgresql@14
    print_success "PostgreSQL instalado"
    
    # Agregar al PATH
    if ! grep -q "postgresql@14" ~/.zshrc 2>/dev/null; then
        echo 'export PATH="/opt/homebrew/opt/postgresql@14/bin:$PATH"' >> ~/.zshrc
        export PATH="/opt/homebrew/opt/postgresql@14/bin:$PATH"
    fi
else
    print_success "PostgreSQL ya está instalado"
    PSQL_VERSION=$(psql --version | awk '{print $3}')
    print_info "Versión: $PSQL_VERSION"
fi

# Paso 3: Iniciar servicio de PostgreSQL
print_info "Iniciando servicio de PostgreSQL..."
if brew services list | grep -q "postgresql@14.*started"; then
    print_success "PostgreSQL ya está corriendo"
else
    brew services start postgresql@14
    sleep 2  # Esperar a que inicie
    print_success "PostgreSQL iniciado"
fi

# Paso 4: Configurar variables
DB_NAME="plantcare_db"
DB_USER="${DB_USER:-postgres}"

# Solicitar contraseña si no está en variables de entorno
if [ -z "$DB_PASSWORD" ]; then
    print_warning "Necesitas configurar la contraseña de PostgreSQL"
    echo -n "Ingresa la contraseña para el usuario '$DB_USER' (o presiona Enter para usar tu usuario de Mac): "
    read -s DB_PASSWORD
    echo
    
    if [ -z "$DB_PASSWORD" ]; then
        DB_USER=$(whoami)
        print_info "Usando usuario de Mac: $DB_USER"
    fi
fi

# Paso 5: Crear base de datos
print_info "Creando base de datos '$DB_NAME'..."

# Intentar crear la base de datos
if createdb -U "$DB_USER" "$DB_NAME" 2>/dev/null; then
    print_success "Base de datos '$DB_NAME' creada"
elif psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null; then
    print_success "Base de datos '$DB_NAME' creada"
else
    print_warning "No se pudo crear la base de datos automáticamente"
    print_info "Por favor, créala manualmente:"
    echo "  createdb $DB_NAME"
    echo "  o"
    echo "  psql postgres -c 'CREATE DATABASE $DB_NAME;'"
    exit 1
fi

# Paso 6: Ejecutar script SQL
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_SCRIPT="$SCRIPT_DIR/create_database.sql"

if [ ! -f "$SQL_SCRIPT" ]; then
    print_error "No se encontró el archivo create_database.sql"
    print_info "Asegúrate de estar en el directorio back/"
    exit 1
fi

print_info "Ejecutando script SQL..."

if [ -z "$DB_PASSWORD" ]; then
    # Sin contraseña (usuario de Mac)
    if psql -U "$DB_USER" -d "$DB_NAME" -f "$SQL_SCRIPT" > /dev/null 2>&1; then
        print_success "Script SQL ejecutado correctamente"
    else
        print_warning "Hubo algunos warnings al ejecutar el script (esto es normal)"
        print_success "Script SQL ejecutado"
    fi
else
    # Con contraseña
    export PGPASSWORD="$DB_PASSWORD"
    if psql -U "$DB_USER" -d "$DB_NAME" -f "$SQL_SCRIPT" > /dev/null 2>&1; then
        print_success "Script SQL ejecutado correctamente"
    else
        print_warning "Hubo algunos warnings al ejecutar el script (esto es normal)"
        print_success "Script SQL ejecutado"
    fi
    unset PGPASSWORD
fi

# Paso 7: Verificar tablas creadas
print_info "Verificando tablas creadas..."

if [ -z "$DB_PASSWORD" ]; then
    TABLE_COUNT=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
else
    export PGPASSWORD="$DB_PASSWORD"
    TABLE_COUNT=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
    unset PGPASSWORD
fi

if [ "$TABLE_COUNT" -ge 8 ]; then
    print_success "Se encontraron $TABLE_COUNT tablas (esperadas: 8)"
else
    print_warning "Se encontraron $TABLE_COUNT tablas (esperadas: 8)"
fi

# Paso 8: Verificar roles
print_info "Verificando roles..."

if [ -z "$DB_PASSWORD" ]; then
    ROLE_COUNT=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM roles;" | xargs)
else
    export PGPASSWORD="$DB_PASSWORD"
    ROLE_COUNT=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM roles;" | xargs)
    unset PGPASSWORD
fi

if [ "$ROLE_COUNT" -eq 2 ]; then
    print_success "Roles creados correctamente (user y admin)"
else
    print_warning "Se encontraron $ROLE_COUNT roles (esperados: 2)"
fi

# Paso 9: Crear/actualizar archivo .env
print_info "Configurando archivo .env..."

ENV_FILE="$SCRIPT_DIR/.env"
ENV_EXAMPLE="$SCRIPT_DIR/env.example"

if [ ! -f "$ENV_FILE" ]; then
    if [ -f "$ENV_EXAMPLE" ]; then
        cp "$ENV_EXAMPLE" "$ENV_FILE"
        print_success "Archivo .env creado desde env.example"
    else
        print_warning "No se encontró env.example, creando .env básico..."
        cat > "$ENV_FILE" << EOF
# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_DATABASE=$DB_NAME
DB_SSLMODE=prefer
DB_CONNECT_TIMEOUT=10
EOF
        print_success "Archivo .env creado"
    fi
else
    print_info "Archivo .env ya existe"
fi

# Actualizar valores en .env si es necesario
if [ -f "$ENV_FILE" ]; then
    # Actualizar DB_USER
    if grep -q "^DB_USER=" "$ENV_FILE"; then
        sed -i '' "s/^DB_USER=.*/DB_USER=$DB_USER/" "$ENV_FILE"
    else
        echo "DB_USER=$DB_USER" >> "$ENV_FILE"
    fi
    
    # Actualizar DB_DATABASE
    if grep -q "^DB_DATABASE=" "$ENV_FILE"; then
        sed -i '' "s/^DB_DATABASE=.*/DB_DATABASE=$DB_NAME/" "$ENV_FILE"
    else
        echo "DB_DATABASE=$DB_NAME" >> "$ENV_FILE"
    fi
    
    # Actualizar DB_PASSWORD si se proporcionó
    if [ -n "$DB_PASSWORD" ] && grep -q "^DB_PASSWORD=" "$ENV_FILE"; then
        sed -i '' "s/^DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" "$ENV_FILE"
    fi
    
    print_success "Archivo .env actualizado"
fi

# Resumen final
echo ""
print_success "=========================================="
print_success "Configuración completada exitosamente!"
print_success "=========================================="
echo ""
print_info "Resumen:"
echo "  📊 Base de datos: $DB_NAME"
echo "  👤 Usuario: $DB_USER"
echo "  📁 Archivo .env: $ENV_FILE"
echo ""
print_info "Próximos pasos:"
echo "  1. Revisa y ajusta el archivo .env si es necesario"
echo "  2. Conéctate desde DBeaver usando:"
echo "     - Host: localhost"
echo "     - Port: 5432"
echo "     - Database: $DB_NAME"
echo "     - Username: $DB_USER"
echo "     - Password: (la que configuraste)"
echo ""
print_info "Para iniciar el backend:"
echo "  cd back"
echo "  python -m uvicorn app.main:app --reload"
echo ""

