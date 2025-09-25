#!/bin/bash

# Sync orders to R2 bucket
ORDERS_DIR="/Users/mobicycle/Library/Mobile Documents/com~apple~CloudDocs/0._Legal/Roman_House/orders_from_courts"
BUCKET="legal-housing-court-orders"

echo "Syncing orders to R2 bucket: $BUCKET"
echo "Source directory: $ORDERS_DIR"

# Find all PDF files and upload them
find "$ORDERS_DIR" -name "*.pdf" -type f | while read -r file; do
    # Get relative path from orders directory
    relative_path=${file#"$ORDERS_DIR/"}
    
    echo "Uploading: $relative_path"
    wrangler r2 object put "$BUCKET/$relative_path" --file "$file" --content-type "application/pdf"
    
    if [ $? -eq 0 ]; then
        echo "✅ Uploaded: $relative_path"
    else
        echo "❌ Failed: $relative_path"
    fi
done

echo "Sync complete!"