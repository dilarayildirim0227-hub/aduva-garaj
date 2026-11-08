/**
 * Fetch Product Images from Unsplash
 * Downloads 105 product images by category, fallback to SVG placeholder
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

// Output directory
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'img', 'products');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Category to Unsplash search mapping
const CATEGORY_IMAGES = {
  'multimedya-carplay': [
    'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=400&h=250&fit=crop&auto=format', // Car interior with screen
    'https://images.unsplash.com/photo-1480329509673-381b5c8eb16e?w=400&h=250&fit=crop&auto=format', // Car dashboard
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&h=250&fit=crop&auto=format', // Car media system
    'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400&h=250&fit=crop&auto=format', // Modern car interior
  ],
  '3d-paspas': [
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&h=250&fit=crop&auto=format', // Car floor mats
    'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=400&h=250&fit=crop&auto=format', // Car interior floor
    'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=400&h=250&fit=crop&auto=format', // Car mats
    'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=400&h=250&fit=crop&auto=format', // 3D floor mats
  ],
  'koltuk-kilifi-minder': [
    'https://images.unsplash.com/photo-1550355191-ef1f39b7c1e7?w=400&h=250&fit=crop&auto=format', // Car seats
    'https://images.unsplash.com/photo-1567721913486-80c111a55d78?w=400&h=250&fit=crop&auto=format', // Car seat covers
    'https://images.unsplash.com/photo-1521304075133-041e563c2344?w=400&h=250&fit=crop&auto=format', // Luxury car interior
    'https://images.unsplash.com/photo-1544829099-b9a0c07fad1e?w=400&h=250&fit=crop&auto=format', // Car upholstery
  ],
  'krom-dis-tuning': [
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&h=250&fit=crop&auto=format', // Car exterior
    'https://images.unsplash.com/photo-1549924231-f129b911e442?w=400&h=250&fit=crop&auto=format', // Chrome details
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=250&fit=crop&auto=format', // Car tuning
    'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=400&h=250&fit=crop&auto=format', // Car exterior parts
  ],
  'led-ambiyans': [
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&h=250&fit=crop&auto=format', // Car LED lights
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&h=250&fit=crop&auto=format', // Ambient lighting
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=250&fit=crop&auto=format', // Car interior lights
    'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=400&h=250&fit=crop&auto=format', // LED strips
  ],
  'ses-kamera': [
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=250&fit=crop&auto=format', // Audio equipment
    'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=400&h=250&fit=crop&auto=format', // Car speakers
    'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&h=250&fit=crop&auto=format', // Microphone
    'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=400&h=250&fit=crop&auto=format', // Audio system
  ],
  'periyodik-bakim-fren': [
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&h=250&fit=crop&auto=format', // Car maintenance
    'https://images.unsplash.com/photo-1623971349096-030c45d5f06d?w=400&h=250&fit=crop&auto=format', // Brake discs
    'https://images.unsplash.com/photo-1581539250439-c96689b516dd?w=400&h=250&fit=crop&auto=format', // Oil filter
    'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=400&h=250&fit=crop&auto=format', // Car parts
  ],
};

// Special product images (specific URLs)
const SPECIAL_IMAGES = {
  'adv-1000': 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=400&h=250&fit=crop&auto=format',
  'adv-1001': 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&h=250&fit=crop&auto=format',
  'adv-1002': 'https://images.unsplash.com/photo-1550355191-ef1f39b7c1e7?w=400&h=250&fit=crop&auto=format',
  'adv-opel-01': 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=400&h=250&fit=crop&auto=format',
  'adv-bkm-16': 'https://images.unsplash.com/photo-1581539250439-c96689b516dd?w=400&h=250&fit=crop&auto=format',
};

// Product list from seed
const PRODUCTS = [
  // Special products
  { sku: 'ADV-1000', category: 'multimedya-carplay' },
  { sku: 'ADV-1001', category: '3d-paspas' },
  { sku: 'ADV-1002', category: 'koltuk-kilifi-minder' },
  { sku: 'ADV-OPEL-01', category: 'multimedya-carplay' },
  { sku: 'ADV-BKM-16', category: 'periyodik-bakim-fren' },
  // Auto-generated products (100 products, SKU ADV-1003 to ADV-1102)
  ...Array.from({ length: 100 }, (_, i) => {
    const categories = [
      'multimedya-carplay',
      '3d-paspas',
      'koltuk-kilifi-minder',
      'krom-dis-tuning',
      'led-ambiyans',
      'ses-kamera',
      'periyodik-bakim-fren'
    ];
    const category = categories[i % categories.length];
    return { sku: `ADV-${String(1003 + i).padStart(4, '0')}`, category };
  })
];

/**
 * Download image from URL
 */
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(filepath, () => {});
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

/**
 * Generate SVG placeholder
 */
function generatePlaceholderSVG(sku, category) {
  const categoryColors = {
    'multimedya-carplay': '#3b82f6',
    '3d-paspas': '#8b5cf6',
    'koltuk-kilifi-minder': '#ec4899',
    'krom-dis-tuning': '#f59e0b',
    'led-ambiyans': '#06b6d4',
    'ses-kamera': '#ef4444',
    'periyodik-bakim-fren': '#22c55e',
  };

  const color = categoryColors[category] || '#6b7280';
  const icons = {
    'multimedya-carplay': '📺',
    '3d-paspas': '🚗',
    'koltuk-kilifi-minder': '💺',
    'krom-dis-tuning': '✨',
    'led-ambiyans': '💡',
    'ses-kamera': '🔊',
    'periyodik-bakim-fren': '🔧',
  };

  const icon = icons[category] || '📦';

  return `<svg width="400" height="250" viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="250" fill="#f3f4f6"/>
  <rect x="0" y="0" width="400" height="4" fill="${color}"/>
  <rect x="0" y="246" width="400" height="4" fill="${color}"/>
  <text x="200" y="100" font-family="system-ui, sans-serif" font-size="48" text-anchor="middle" fill="${color}">${icon}</text>
  <text x="200" y="140" font-family="system-ui, sans-serif" font-size="14" text-anchor="middle" fill="#9ca3af">${sku}</text>
  <text x="200" y="160" font-family="system-ui, sans-serif" font-size="12" text-anchor="middle" fill="#9ca3af">${category}</text>
</svg>`;
}

/**
 * Save SVG placeholder
 */
function savePlaceholderSVG(sku, category) {
  const svg = generatePlaceholderSVG(sku, category);
  const filepath = path.join(OUTPUT_DIR, `${sku.toLowerCase()}.svg`);
  fs.writeFileSync(filepath, svg);
  return filepath;
}

/**
 * Main function to fetch all images
 */
async function fetchAllImages() {
  console.log('🚀 ADUVA GARAJ - Product Image Fetcher');
  console.log('===========================================\n');

  let downloaded = 0;
  let placeholders = 0;
  let errors = 0;

  for (const product of PRODUCTS) {
    const sku = product.sku;
    const category = product.category;
    const filename = `${sku.toLowerCase()}.jpg`;
    const filepath = path.join(OUTPUT_DIR, filename);

    // Skip if already exists
    if (fs.existsSync(filepath)) {
      console.log(`⏭️  ${sku} - already exists`);
      continue;
    }

    // Check for special image
    const specialKey = sku.toLowerCase().replace('adv-', 'adv-');
    let imageUrl = SPECIAL_IMAGES[specialKey];

    if (!imageUrl && CATEGORY_IMAGES[category]) {
      // Use category images in rotation
      const categoryImages = CATEGORY_IMAGES[category];
      const index = PRODUCTS.findIndex(p => p.sku === sku) % categoryImages.length;
      imageUrl = categoryImages[index];
    }

    if (imageUrl) {
      try {
        console.log(`⬇️  Downloading ${sku} from ${imageUrl.substring(0, 60)}...`);
        await downloadImage(imageUrl, filepath);
        console.log(`✅  ${sku} - downloaded`);
        downloaded++;
      } catch (error) {
        console.log(`⚠️  ${sku} - download failed, creating placeholder: ${error.message}`);
        savePlaceholderSVG(sku, category);
        placeholders++;
        errors++;
      }
    } else {
      console.log(`📝  ${sku} - no URL, creating placeholder`);
      savePlaceholderSVG(sku, category);
      placeholders++;
    }

    // Small delay to be nice to the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Create a generic placeholder for any missing images
  const genericPlaceholder = path.join(OUTPUT_DIR, 'placeholder.svg');
  if (!fs.existsSync(genericPlaceholder)) {
    const svg = `<svg width="400" height="250" viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="250" fill="#f3f4f6"/>
  <rect x="0" y="0" width="400" height="4" fill="#d9a820"/>
  <rect x="0" y="246" width="400" height="4" fill="#d9a820"/>
  <text x="200" y="110" font-family="system-ui, sans-serif" font-size="48" text-anchor="middle" fill="#d9a820">📦</text>
  <text x="200" y="145" font-family="system-ui, sans-serif" font-size="14" text-anchor="middle" fill="#9ca3af">Ürün Görseli</text>
  <text x="200" y="165" font-family="system-ui, sans-serif" font-size="12" text-anchor="middle" fill="#9ca3af">ADUVA GARAJ</text>
</svg>`;
    fs.writeFileSync(genericPlaceholder, svg);
  }

  console.log('\n===========================================');
  console.log(`📊 Summary:`);
  console.log(`   ✅ Downloaded: ${downloaded}`);
  console.log(`   📝 Placeholders: ${placeholders}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📁 Output: ${OUTPUT_DIR}`);
  console.log('===========================================');
}

// Run if executed directly
if (require.main === module) {
  fetchAllImages().catch(console.error);
}

module.exports = { fetchAllImages, generatePlaceholderSVG };
