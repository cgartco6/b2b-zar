#!/bin/bash

# Image Optimization Script for AfriHost
echo "🖼️  Optimizing images for web..."

# Check if required tools are installed
if ! command -v convert &> /dev/null; then
    echo "ImageMagick not found. Installing..."
    sudo apt-get update && sudo apt-get install -y imagemagick
fi

if ! command -v jpegoptim &> /dev/null; then
    echo "jpegoptim not found. Installing..."
    sudo apt-get install -y jpegoptim
fi

if ! command -v optipng &> /dev/null; then
    echo "optipng not found. Installing..."
    sudo apt-get install -y optipng
fi

# Optimize product images
echo "Optimizing product images..."
find public/uploads/products -name "*.jpg" -exec jpegoptim --max=80 --strip-all {} \;
find public/uploads/products -name "*.jpeg" -exec jpegoptim --max=80 --strip-all {} \;
find public/uploads/products -name "*.png" -exec optipng -o5 {} \;

# Optimize supplier images
echo "Optimizing supplier images..."
find public/uploads/suppliers -name "*.jpg" -exec jpegoptim --max=80 --strip-all {} \;
find public/uploads/suppliers -name "*.jpeg" -exec jpegoptim --max=80 --strip-all {} \;
find public/uploads/suppliers -name "*.png" -exec optipng -o5 {} \;

# Create WebP versions for modern browsers
echo "Creating WebP versions..."
find public/uploads -name "*.jpg" -o -name "*.jpeg" | while read file; do
    webp_file="${file%.*}.webp"
    if [ ! -f "$webp_file" ]; then
        convert "$file" -quality 80 "$webp_file"
    fi
done

# Generate thumbnails for product listings
echo "Generating thumbnails..."
find public/uploads/products -name "*.jpg" -o -name "*.jpeg" | while read file; do
    thumbnail="${file%.*}_thumb.jpg"
    if [ ! -f "$thumbnail" ]; then
        convert "$file" -resize 300x300 -quality 80 "$thumbnail"
    fi
done

echo "✅ Image optimization completed!"
