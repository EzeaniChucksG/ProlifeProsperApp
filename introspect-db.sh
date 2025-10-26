#!/bin/bash
# Introspect the actual database schema from the provided DATABASE_URL

echo "🔍 Introspecting database schema from production database..."
echo ""

npx drizzle-kit introspect

echo ""
echo "✅ Schema introspection complete!"
echo "📁 Check the output folder for the introspected schema"
