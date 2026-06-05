#!/bin/bash

# ============================================
# School Timetable Display System
# Setup Script
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
check_nodejs() {
    print_status "Checking Node.js installation..."
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js found: $NODE_VERSION"
    else
        print_error "Node.js is not installed. Please install Node.js v18 or higher."
        exit 1
    fi
}

# Check if npm is installed
check_npm() {
    print_status "Checking npm installation..."
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_success "npm found: $NPM_VERSION"
    else
        print_error "npm is not installed."
        exit 1
    fi
}

# Setup backend
setup_backend() {
    print_status "Setting up backend..."
    cd backend
    
    if [ ! -f .env ]; then
        print_status "Creating .env file from example..."
        cp ../.env.example .env
        print_warning "Please edit backend/.env with your actual configuration"
    fi
    
    print_status "Installing backend dependencies..."
    npm install
    
    print_status "Initializing database..."
    npm run init-db || print_warning "Database initialization may have failed. Check your database configuration."
    
    cd ..
    print_success "Backend setup complete!"
}

# Setup frontend
setup_frontend() {
    print_status "Setting up frontend..."
    cd frontend
    
    print_status "Installing frontend dependencies..."
    npm install
    
    cd ..
    print_success "Frontend setup complete!"
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    mkdir -p backend/uploads
    mkdir -p backend/logs
    print_success "Directories created!"
}

# Main setup function
main() {
    echo "=========================================="
    echo "School Timetable Display System - Setup"
    echo "=========================================="
    echo ""
    
    check_nodejs
    check_npm
    create_directories
    setup_backend
    setup_frontend
    
    echo ""
    echo "=========================================="
    print_success "Setup completed successfully!"
    echo "=========================================="
    echo ""
    echo "Next steps:"
    echo "1. Edit backend/.env with your actual configuration"
    echo "2. Start the backend: cd backend && npm run dev"
    echo "3. Start the frontend: cd frontend && npm start"
    echo "4. Access the application at http://localhost:3000"
    echo ""
    echo "Default credentials:"
    echo "  Username: admin"
    echo "  Password: admin123"
    echo ""
    echo "Display URL: http://localhost:3000/display"
    echo ""
}

# Run main function
main
