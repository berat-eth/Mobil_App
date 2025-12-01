#!/bin/bash

# APK Build Script for Huglu Outdoor Mobile App
# Builds APK and uploads it to FTP

set -e  # Exit on any error

echo "🚀 Starting APK build process for Huglu Outdoor..."

# FTP Configuration
FTP_HOST="46.202.158.159"
FTP_USER="u987029066.hugluser"
FTP_PASS="38cdfD8217.."
REMOTE_DIR="/files/public_html/app"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper print functions
print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# QR code generator
generate_qr_code() {
    local download_url="$1"
    local apk_name="$2"
    print_status "Generating QR code..."
    if ! command -v qrencode &> /dev/null; then
        print_warning "qrencode not found, installing..."
        sudo apt-get update && sudo apt-get install -y qrencode
    fi
    qrencode -o "${apk_name%.apk}_qr.png" -s 10 -m 1 "$download_url"
}

# FTP Upload Function
upload_to_ftp() {
    local apk_file="$1"
    print_status "Uploading $apk_file to FTP..."
    if ! command -v lftp &> /dev/null; then
        print_warning "lftp not found, installing..."
        sudo apt-get update && sudo apt-get install -y lftp
    fi
    lftp -c "
    set ftp:ssl-allow no
    open -u $FTP_USER,$FTP_PASS $FTP_HOST
    cd $REMOTE_DIR
    rm -f 1.apk
    put $apk_file -o 1.apk
    bye
    "
    if [ $? -eq 0 ]; then
        print_success "Upload complete ✓"
        local link="http://$FTP_HOST$REMOTE_DIR/1.apk"
        print_status "Download URL: $link"
        generate_qr_code "$link" "$apk_file"
    else
        print_error "FTP upload failed!"
    fi
}

# Check directory
if [ ! -f "package.json" ]; then
    print_error "Run from project root!"
    exit 1
fi

print_status "Environment checks..."
NODE_VERSION=$(node --version)
JAVA_VERSION=$(java -version 2>&1 | head -n 1)
print_status "Node.js: $NODE_VERSION"
print_status "Java: $JAVA_VERSION"

# Set Android SDK paths if not set
if [ -z "$ANDROID_HOME" ] && [ -z "$ANDROID_SDK_ROOT" ]; then
    if [ -d "/opt/android-sdk" ]; then
        export ANDROID_HOME="/opt/android-sdk"
        export ANDROID_SDK_ROOT="/opt/android-sdk"
        export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools"
        print_status "Set ANDROID_HOME to /opt/android-sdk"
    else
        print_error "ANDROID_HOME or ANDROID_SDK_ROOT not set and /opt/android-sdk not found."
        print_error "Please run setup-debian-android.sh first or set ANDROID_HOME manually."
        exit 1
    fi
fi

# Clean and install
print_status "Cleaning..."
rm -rf node_modules/.cache android/app/build android/build .expo
print_status "Installing dependencies..."
npm install

# Ensure Expo CLI exists
if ! command -v expo &> /dev/null; then
    print_status "Installing Expo CLI..."
    npm install -g @expo/cli
fi

print_status "Running expo prebuild..."
export EXPO_NONINTERACTIVE=1
export EXPO_UNSTABLE_CORE_AUTOLINKING=1

# Create a temporary script to handle expo prebuild
cat > temp_prebuild.sh << 'EOF'
#!/bin/bash
export EXPO_NONINTERACTIVE=1
npx expo prebuild --platform android --clean --no-install
EOF
chmod +x temp_prebuild.sh
./temp_prebuild.sh
rm -f temp_prebuild.sh

cd android
chmod +x gradlew
print_status "Cleaning Gradle..."
./gradlew clean

print_status "Building APK..."
export NODE_ENV=production
export EXPO_PUBLIC_ENV=production
export EXPO_UNSTABLE_CORE_AUTOLINKING=1
./gradlew assembleRelease -Pandroid.enableR8.fullMode=true

APK_PATH="app/build/outputs/apk/release/app-release.apk"
if [ -f "$APK_PATH" ]; then
    cd ..
    APK_NAME="huglu-outdoor-v1.0.0-$(date +%Y%m%d-%H%M%S).apk"
    cp "android/$APK_PATH" "$APK_NAME"
    print_success "Build success: $APK_NAME"
    upload_to_ftp "$APK_NAME"
else
    print_error "Build failed. APK not found."
    exit 1
fi

print_success "All done! 🚀"