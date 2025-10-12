#!/bin/bash

##############################################################################
# AsTeRICS-Grid Android Setup Verification Script
# 
# This script checks if all required files are present and valid.
#
# Usage:
#   chmod +x verify-setup.sh
#   ./verify-setup.sh
##############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'
BOLD='\033[1m'

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

##############################################################################
# Helper Functions
##############################################################################

print_header() {
    echo ""
    echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}${BLUE}  $1${NC}"
    echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

check_file() {
    local file="$1"
    local description="$2"
    local required="${3:-true}"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if [ -f "$file" ]; then
        # Check if file is not empty
        if [ -s "$file" ]; then
            echo -e "  ${GREEN}✓${NC} $description"
            echo -e "    ${BLUE}→${NC} $file"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
            return 0
        else
            echo -e "  ${YELLOW}⚠${NC} $description (file is empty)"
            echo -e "    ${BLUE}→${NC} $file"
            WARNING_CHECKS=$((WARNING_CHECKS + 1))
            return 1
        fi
    else
        if [ "$required" = "true" ]; then
            echo -e "  ${RED}✗${NC} $description (missing)"
            echo -e "    ${BLUE}→${NC} Expected: $file"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
            return 1
        else
            echo -e "  ${YELLOW}⚠${NC} $description (optional, missing)"
            echo -e "    ${BLUE}→${NC} $file"
            WARNING_CHECKS=$((WARNING_CHECKS + 1))
            return 0
        fi
    fi
}

check_directory() {
    local dir="$1"
    local description="$2"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if [ -d "$dir" ]; then
        echo -e "  ${GREEN}✓${NC} $description"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        echo -e "  ${RED}✗${NC} $description (missing)"
        echo -e "    ${BLUE}→${NC} Expected: $dir"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

check_command() {
    local cmd="$1"
    local description="$2"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if command -v "$cmd" >/dev/null 2>&1; then
        local version=$($cmd --version 2>&1 | head -n 1)
        echo -e "  ${GREEN}✓${NC} $description"
        echo -e "    ${BLUE}→${NC} $version"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        echo -e "  ${RED}✗${NC} $description (not installed)"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

##############################################################################
# Main Verification
##############################################################################

print_header "AsTeRICS-Grid Android Setup Verification"

echo -e "${BOLD}Checking project setup...${NC}"
echo -e "Current directory: ${BLUE}$(pwd)${NC}"
echo ""

##############################################################################
# Check System Requirements
##############################################################################

echo -e "${BOLD}1. System Requirements${NC}"
echo ""

check_command "node" "Node.js"
check_command "npm" "npm"
check_command "java" "Java JDK"

echo ""

##############################################################################
# Check Root Files
##############################################################################

echo -e "${BOLD}2. Root Configuration Files${NC}"
echo ""

check_file "package.json" "package.json"
check_file "tsconfig.json" "TypeScript config"
check_file "capacitor.config.ts" "Capacitor config"
check_file "vite.config.ts" "Vite config"
check_file ".eslintrc.js" "ESLint config"
check_file ".prettierrc" "Prettier config"
check_file "README.md" "README"
check_file ".gitignore" "Git ignore" "false"

echo ""

##############################################################################
# Check TypeScript Source Files
##############################################################################

echo -e "${BOLD}3. TypeScript Source Files${NC}"
echo ""

check_file "src/js/types/global.d.ts" "Global type definitions"
check_file "src/js/util/Logger.ts" "Logger utility"
check_file "src/js/util/ErrorHandler.ts" "Error handler"
check_file "src/js/util/PerformanceMonitor.ts" "Performance monitor"
check_file "src/js/service/tts/TTSService.ts" "TTS service interface"
check_file "src/js/service/tts/MockTTSService.ts" "Mock TTS implementation"

echo ""

##############################################################################
# Check Android Native Files
##############################################################################

echo -e "${BOLD}4. Android Native Files${NC}"
echo ""

check_file "android/app/src/main/java/com/asterics/grid/MainActivity.kt" "MainActivity (Kotlin)"
check_file "android/app/src/main/java/com/asterics/grid/AstericsGridApplication.kt" "Application class (Kotlin)"
check_file "android/app/build.gradle.kts" "Android app build config"
check_file "android/app/proguard-rules.pro" "ProGuard rules"
check_file "android/app/src/main/AndroidManifest.xml" "Android manifest"
check_file "android/build.gradle.kts" "Android root build config"
check_file "android/settings.gradle.kts" "Gradle settings"
check_file "android/gradle.properties" "Gradle properties"

echo ""

##############################################################################
# Check Build Scripts
##############################################################################

echo -e "${BOLD}5. Build Scripts${NC}"
echo ""

check_file "scripts/copy-asterics-grid.js" "AsTeRICS-Grid copy script"

echo ""

##############################################################################
# Check Directories
##############################################################################

echo -e "${BOLD}6. Directory Structure${NC}"
echo ""

check_directory "src/js" "TypeScript source directory"
check_directory "src/vue-components" "Vue components directory"
check_directory "android/app/src/main" "Android main source"
check_directory "android/app/src/main/res" "Android resources"

echo ""

##############################################################################
# Check AsTeRICS-Grid
##############################################################################

echo -e "${BOLD}7. AsTeRICS-Grid Repository${NC}"
echo ""

if [ -d "../asterics-grid" ]; then
    echo -e "  ${GREEN}✓${NC} AsTeRICS-Grid repository found"
    
    if [ -f "../asterics-grid/package.json" ]; then
        echo -e "  ${GREEN}✓${NC} AsTeRICS-Grid is valid npm project"
        
        if [ -d "../asterics-grid/app/build" ] || [ -d "../asterics-grid/dist" ]; then
            echo -e "  ${GREEN}✓${NC} AsTeRICS-Grid is built"
            PASSED_CHECKS=$((PASSED_CHECKS + 3))
        else
            echo -e "  ${YELLOW}⚠${NC} AsTeRICS-Grid not built yet"
            echo -e "    ${BLUE}→${NC} Run: cd ../asterics-grid && npm run build"
            WARNING_CHECKS=$((WARNING_CHECKS + 1))
            PASSED_CHECKS=$((PASSED_CHECKS + 2))
        fi
    else
        echo -e "  ${RED}✗${NC} AsTeRICS-Grid appears invalid"
        FAILED_CHECKS=$((FAILED_CHECKS + 2))
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    fi
    TOTAL_CHECKS=$((TOTAL_CHECKS + 3))
else
    echo -e "  ${RED}✗${NC} AsTeRICS-Grid not found at ../asterics-grid"
    echo -e "    ${BLUE}→${NC} Clone it: git clone https://github.com/asterics/AsTeRICS-Grid.git ../asterics-grid"
    FAILED_CHECKS=$((FAILED_CHECKS + 3))
    TOTAL_CHECKS=$((TOTAL_CHECKS + 3))
fi

echo ""

##############################################################################
# Check Node Modules
##############################################################################

echo -e "${BOLD}8. Dependencies${NC}"
echo ""

if [ -d "node_modules" ]; then
    echo -e "  ${GREEN}✓${NC} Node modules installed"
    
    if [ -f "node_modules/.bin/vite" ]; then
        echo -e "  ${GREEN}✓${NC} Vite installed"
        PASSED_CHECKS=$((PASSED_CHECKS + 2))
    else
        echo -e "  ${YELLOW}⚠${NC} Vite missing in node_modules"
        echo -e "    ${BLUE}→${NC} Run: npm install"
        WARNING_CHECKS=$((WARNING_CHECKS + 1))
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    fi
else
    echo -e "  ${RED}✗${NC} Node modules not installed"
    echo -e "    ${BLUE}→${NC} Run: npm install"
    FAILED_CHECKS=$((FAILED_CHECKS + 2))
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 2))

echo ""

##############################################################################
# Validate File Contents (sampling)
##############################################################################

echo -e "${BOLD}9. File Content Validation${NC}"
echo ""

# Check package.json has required fields
if [ -f "package.json" ]; then
    if grep -q '"name".*"asterics-grid-android"' package.json 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} package.json appears valid"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "  ${YELLOW}⚠${NC} package.json might be incomplete"
        WARNING_CHECKS=$((WARNING_CHECKS + 1))
    fi
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
fi

# Check tsconfig.json has strict mode
if [ -f "tsconfig.json" ]; then
    if grep -q '"strict".*true' tsconfig.json 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} TypeScript strict mode enabled"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "  ${YELLOW}⚠${NC} TypeScript strict mode not detected"
        WARNING_CHECKS=$((WARNING_CHECKS + 1))
    fi
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
fi

# Check MainActivity.kt exists and has correct package
if [ -f "android/app/src/main/java/com/asterics/grid/MainActivity.kt" ]; then
    if grep -q 'package com.asterics.grid' android/app/src/main/java/com/asterics/grid/MainActivity.kt 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} MainActivity package correct"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "  ${YELLOW}⚠${NC} MainActivity package might be wrong"
        WARNING_CHECKS=$((WARNING_CHECKS + 1))
    fi
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
fi

echo ""

##############################################################################
# Summary
##############################################################################

print_header "Verification Summary"

PERCENT_PASSED=0
if [ $TOTAL_CHECKS -gt 0 ]; then
    PERCENT_PASSED=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
fi

echo -e "${BOLD}Results:${NC}"
echo -e "  Total checks:   ${BLUE}${TOTAL_CHECKS}${NC}"
echo -e "  Passed:         ${GREEN}${PASSED_CHECKS}${NC} (${PERCENT_PASSED}%)"
echo -e "  Failed:         ${RED}${FAILED_CHECKS}${NC}"
echo -e "  Warnings:       ${YELLOW}${WARNING_CHECKS}${NC}"
echo ""

# Determine status
if [ $FAILED_CHECKS -eq 0 ] && [ $WARNING_CHECKS -eq 0 ]; then
    echo -e "${BOLD}${GREEN}✓ Setup is PERFECT!${NC} 🎉"
    echo ""
    echo -e "You're ready to:"
    echo -e "  1. npm install"
    echo -e "  2. npm run build"
    echo -e "  3. npm run android:open"
    echo ""
    exit 0
elif [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${BOLD}${GREEN}✓ Setup is GOOD!${NC} ⚠️"
    echo ""
    echo -e "Minor warnings detected, but you can proceed."
    echo -e "Review warnings above if needed."
    echo ""
    exit 0
elif [ $FAILED_CHECKS -le 5 ]; then
    echo -e "${BOLD}${YELLOW}⚠ Setup is INCOMPLETE${NC}"
    echo ""
    echo -e "Some files are missing. Please:"
    echo -e "  1. Check ${BOLD}COPY_FILES_HERE.md${NC}"
    echo -e "  2. Copy missing files from artifacts"
    echo -e "  3. Run this script again"
    echo ""
    exit 1
else
    echo -e "${BOLD}${RED}✗ Setup is INCOMPLETE${NC}"
    echo ""
    echo -e "Many files are missing. Please:"
    echo -e "  1. Run ${BOLD}./setup-project.sh${NC} first"
    echo -e "  2. Copy files from artifacts using ${BOLD}COPY_FILES_HERE.md${NC}"
    echo -e "  3. Run this script again"
    echo ""
    exit 1
fi