const field = (key, label, type, options = {}) => ({ key, label, type, ...options });

export const specificationDefinitions = {
  smartphone: {
    label: "Smartphone",
    groups: [
      { label: "Performance", fields: [
        field("chipset", "Chipset", "text", { maxLength: 120 }),
        field("processorFamily", "Processor family", "select", { filter: true, options: ["Snapdragon", "Apple A-Series", "MediaTek Dimensity", "Google Tensor", "Exynos", "Other"] }),
        field("ramGb", "RAM", "number", { unit: "GB", min: 1, max: 64, filter: true }),
        field("storageGb", "Storage options", "multiSelect", { unit: "GB", filter: true, options: ["32", "64", "128", "256", "512", "1024", "2048"] }),
        field("os", "Operating system", "select", { filter: true, options: ["Android", "iOS", "Other"] }),
        field("network", "Network", "select", { filter: true, options: ["4G", "5G"] })
      ]},
      { label: "Display and camera", fields: [
        field("displayType", "Display type", "select", { filter: true, options: ["LCD", "OLED", "AMOLED", "LTPO OLED"] }),
        field("displaySizeIn", "Display size", "number", { unit: "in", min: 3, max: 10 }),
        field("refreshRateHz", "Refresh rate", "number", { unit: "Hz", min: 30, max: 240, filter: true }),
        field("rearCameras", "Rear cameras", "text", { maxLength: 180 }),
        field("frontCamera", "Front camera", "text", { maxLength: 120 })
      ]},
      { label: "Power and connectivity", fields: [
        field("batteryMah", "Battery", "number", { unit: "mAh", min: 500, max: 20000 }),
        field("chargingW", "Charging", "number", { unit: "W", min: 1, max: 300 }),
        field("sim", "SIM", "select", { options: ["Single SIM", "Dual SIM", "SIM + eSIM", "eSIM only"] }),
        field("features", "Supported features", "multiSelect", { filter: true, options: ["NFC", "Wireless Charging", "eSIM", "Stereo Speakers", "IP Rating", "Fingerprint Sensor"] })
      ]}
    ]
  },
  laptop: {
    label: "Laptop",
    groups: [
      { label: "Performance", fields: [
        field("cpu", "CPU", "text", { maxLength: 140 }),
        field("processorFamily", "Processor family", "select", { filter: true, options: ["Intel Core", "Intel Ultra", "AMD Ryzen", "Apple M-Series", "Qualcomm Snapdragon", "Other"] }),
        field("generation", "Processor generation", "text", { maxLength: 80 }),
        field("ramGb", "RAM", "number", { unit: "GB", min: 2, max: 256, filter: true }),
        field("ramType", "RAM type", "select", { filter: true, options: ["DDR4", "DDR5", "LPDDR4X", "LPDDR5", "LPDDR5X", "Unified Memory"] }),
        field("storageGb", "Storage", "number", { unit: "GB", min: 32, max: 8192, filter: true }),
        field("gpu", "Graphics", "text", { maxLength: 140 })
      ]},
      { label: "Display and platform", fields: [
        field("displayType", "Display type", "select", { filter: true, options: ["IPS", "OLED", "Mini-LED", "TN", "VA"] }),
        field("displaySizeIn", "Display size", "number", { unit: "in", min: 8, max: 24 }),
        field("resolution", "Resolution", "select", { options: ["HD", "Full HD", "2K", "QHD", "3K", "4K", "Other"] }),
        field("refreshRateHz", "Refresh rate", "number", { unit: "Hz", min: 30, max: 500, filter: true }),
        field("os", "Operating system", "select", { filter: true, options: ["Windows", "macOS", "ChromeOS", "Linux", "No OS", "Other"] })
      ]},
      { label: "Mobility", fields: [
        field("batteryWh", "Battery", "number", { unit: "Wh", min: 10, max: 200 }),
        field("weightKg", "Weight", "number", { unit: "kg", min: 0.3, max: 10 }),
        field("features", "Features", "multiSelect", { filter: true, options: ["Backlit Keyboard", "Touchscreen", "Fingerprint Reader", "Face Unlock", "Thunderbolt", "Wi-Fi 6E", "Wi-Fi 7"] })
      ]}
    ]
  },
  smartwatch: {
    label: "Smartwatch",
    groups: [
      { label: "Display and platform", fields: [
        field("displayType", "Display type", "select", { filter: true, options: ["AMOLED", "OLED", "LCD", "Memory-in-Pixel"] }),
        field("displaySizeIn", "Display size", "number", { unit: "in", min: 0.5, max: 3 }),
        field("os", "Operating system", "select", { filter: true, options: ["watchOS", "Wear OS", "HarmonyOS", "Proprietary", "Other"] }),
        field("compatibility", "Compatibility", "multiSelect", { filter: true, options: ["Android", "iOS"] })
      ]},
      { label: "Connectivity and health", fields: [
        field("connectivity", "Connectivity", "multiSelect", { options: ["Bluetooth", "Wi-Fi", "LTE"] }),
        field("gps", "Built-in GPS", "boolean", { filter: true }),
        field("nfc", "NFC", "boolean", { filter: true }),
        field("sensors", "Sensors", "multiSelect", { filter: true, options: ["Heart Rate", "SpO2", "ECG", "Temperature", "Altimeter", "Compass"] })
      ]},
      { label: "Durability", fields: [
        field("batteryDays", "Battery life", "number", { unit: "days", min: 0.1, max: 60 }),
        field("waterResistance", "Water resistance", "select", { filter: true, options: ["IP67", "IP68", "3 ATM", "5 ATM", "10 ATM", "Other"] })
      ]}
    ]
  },
  tablet: {
    label: "Tablet",
    groups: [
      { label: "Performance", fields: [
        field("chipset", "Chipset", "text", { maxLength: 120 }),
        field("processorFamily", "Processor family", "select", { filter: true, options: ["Apple M-Series", "Apple A-Series", "Snapdragon", "MediaTek", "Exynos", "Other"] }),
        field("ramGb", "RAM", "number", { unit: "GB", min: 1, max: 64, filter: true }),
        field("storageGb", "Storage", "number", { unit: "GB", min: 16, max: 4096, filter: true }),
        field("os", "Operating system", "select", { filter: true, options: ["Android", "iPadOS", "Windows", "Other"] })
      ]},
      { label: "Display and mobility", fields: [
        field("displayType", "Display type", "select", { filter: true, options: ["LCD", "IPS", "OLED", "Mini-LED"] }),
        field("displaySizeIn", "Display size", "number", { unit: "in", min: 5, max: 20 }),
        field("refreshRateHz", "Refresh rate", "number", { unit: "Hz", min: 30, max: 240 }),
        field("batteryMah", "Battery", "number", { unit: "mAh", min: 1000, max: 30000 }),
        field("connectivity", "Connectivity", "select", { filter: true, options: ["Wi-Fi", "Wi-Fi + 4G", "Wi-Fi + 5G"] }),
        field("features", "Features", "multiSelect", { filter: true, options: ["Stylus Support", "Keyboard Support", "Face Unlock", "Fingerprint Sensor", "Stereo Speakers"] })
      ]}
    ]
  },
  audio: {
    label: "Headphones and audio",
    groups: [
      { label: "Audio", fields: [
        field("audioType", "Product type", "select", { filter: true, options: ["True Wireless Earbuds", "Wireless Headphones", "Wired Headphones", "Neckband", "Bluetooth Speaker", "Soundbar", "Other"] }),
        field("driverSizeMm", "Driver size", "number", { unit: "mm", min: 1, max: 200 }),
        field("connectivity", "Connectivity", "multiSelect", { filter: true, options: ["Bluetooth", "3.5 mm", "USB-C", "USB-A", "Wi-Fi"] }),
        field("noiseCancellation", "Active noise cancellation", "boolean", { filter: true }),
        field("microphone", "Built-in microphone", "boolean", { filter: true }),
        field("features", "Features", "multiSelect", { filter: true, options: ["Transparency Mode", "Spatial Audio", "Multipoint", "Low Latency", "Voice Assistant", "Water Resistant"] })
      ]},
      { label: "Power", fields: [
        field("batteryHours", "Battery life", "number", { unit: "hours", min: 0.5, max: 200 }),
        field("charging", "Charging", "select", { options: ["USB-C", "Micro-USB", "Wireless", "Mains Powered", "Not Applicable"] })
      ]}
    ]
  },
  gamingAccessory: {
    label: "Gaming accessory",
    groups: [
      { label: "Compatibility", fields: [
        field("accessoryType", "Accessory type", "select", { filter: true, options: ["Mouse", "Keyboard", "Controller", "Headset", "Monitor", "Webcam", "Microphone", "Other"] }),
        field("platform", "Platform", "multiSelect", { filter: true, options: ["PC", "PlayStation", "Xbox", "Nintendo Switch", "Mobile", "Universal"] }),
        field("connectivity", "Connectivity", "multiSelect", { filter: true, options: ["Wired", "Bluetooth", "2.4 GHz Wireless", "USB-C"] }),
        field("rgb", "RGB lighting", "boolean", { filter: true }),
        field("features", "Features", "multiSelect", { filter: true, options: ["Programmable Buttons", "Mechanical Switches", "Haptic Feedback", "Noise Cancellation", "Hot-swappable", "Adjustable DPI"] })
      ]}
    ]
  },

  camera: { label: "Camera & photography", groups: [
    { label: "Imaging", fields: [
      field("cameraType","Camera type","text",{maxLength:100}),
      field("sensor","Sensor","text",{maxLength:120}),
      field("megapixels","Resolution","number",{unit:"MP",min:0.1,max:500}),
      field("lens","Lens / mount","text",{maxLength:150}),
      field("video","Video recording","text",{maxLength:120})
    ]},
    { label: "Connectivity", fields: [field("connectivity","Connectivity","text",{maxLength:180}),field("battery","Battery","text",{maxLength:120})] }
  ]},
  display: { label: "Television & display", groups: [
    { label: "Screen", fields: [
      field("displayType","Display technology","text",{maxLength:120}),
      field("displaySizeIn","Screen size","number",{unit:"in",min:1,max:150}),
      field("resolution","Resolution","text",{maxLength:100}),
      field("refreshRateHz","Refresh rate","number",{unit:"Hz",min:24,max:500}),
      field("hdr","HDR formats","text",{maxLength:120})
    ]},
    { label: "Connections", fields: [field("ports","Ports","text",{maxLength:150}),field("features","Smart features","text",{maxLength:200})] }
  ]},
  computerAccessory: { label: "Computer accessories", groups: [
    { label: "Compatibility & design", fields: [
      field("accessoryType","Product type","text",{maxLength:100}),
      field("connectivity","Connection type","text",{maxLength:120}),
      field("compatibility","Compatible devices","text",{maxLength:180}),
      field("dimensions","Dimensions","text",{maxLength:100}),
      field("features","Main features","text",{maxLength:200})
    ]}
  ]},
  charger: { label: "Chargers & power banks", groups: [
    { label: "Power & compatibility", fields: [
      field("capacityMah","Capacity","number",{unit:"mAh",min:100,max:100000}),
      field("maxPowerW","Maximum output","number",{unit:"W",min:1,max:1000}),
      field("ports","Ports and interfaces","text",{maxLength:120}),
      field("chargingStandard","Supported standards","text",{maxLength:150}),
      field("compatibility","Compatible devices","text",{maxLength:200})
    ]}
  ]},
  networking: { label: "Networking & Wi-Fi", groups: [
    { label: "Network capabilities", fields: [
      field("deviceType","Device type","text",{maxLength:100}),
      field("wifiStandard","Wi-Fi standard","text",{maxLength:100}),
      field("speed","Maximum speed","text",{maxLength:100}),
      field("ports","Ports","text",{maxLength:130}),
      field("frequency","Frequency bands","text",{maxLength:120}),
      field("security","Security","text",{maxLength:120})
    ]}
  ]},
  storage: { label: "Digital storage", groups: [
    { label: "Capacity & transfer", fields: [
      field("deviceType","Storage type","text",{maxLength:100}),
      field("capacityGb","Capacity","number",{unit:"GB",min:1,max:131072}),
      field("interface","Interface","text",{maxLength:120}),
      field("readSpeed","Read speed","text",{maxLength:100}),
      field("writeSpeed","Write speed","text",{maxLength:100}),
      field("compatibility","Compatibility","text",{maxLength:180})
    ]}
  ]},
  clothing: {
    label: "Clothing & apparel", groups: [
      { label: "Fabric & fit", fields: [
        field("fabric", "Material / fabric", "text", { maxLength: 120 }),
        field("fit", "Fit", "select", { filter: true, options: ["Regular", "Slim", "Relaxed", "Oversized", "Tailored", "Other"] }),
        field("pattern", "Pattern", "select", { filter: true, options: ["Solid", "Printed", "Striped", "Checked", "Embroidered", "Other"] }),
        field("sleeve", "Sleeve", "select", { options: ["Full sleeve", "Half sleeve", "Sleeveless", "Not applicable"] }),
        field("neck", "Neck / collar", "text", { maxLength: 90 }),
        field("gender", "Intended fit", "select", { options: ["Men", "Women", "Kids", "Unisex"] })
      ] },
      { label: "Care & origin", fields: [
        field("care", "Wash / care instructions", "text", { maxLength: 200 }),
        field("countryOfOrigin", "Country of origin", "text", { maxLength: 80 })
      ] }
    ]
  },
  footwear: { label: "Footwear", groups: [
    { label: "Construction & comfort", fields: [
      field("upper", "Upper material", "text", { maxLength: 100 }),
      field("sole", "Sole material", "text", { maxLength: 100 }),
      field("closure", "Closure", "select", { options: ["Lace-up", "Slip-on", "Velcro", "Buckle", "Zip", "Other"] }),
      field("fit", "Fit", "select", { options: ["Regular", "Wide", "Narrow"] }),
      field("occasion", "Use / occasion", "text", { maxLength: 120 })
    ]},
    { label: "Care", fields: [field("care", "Care instructions", "text", { maxLength: 200 })] }
  ]},
  skincare: { label: "Skincare & beauty", groups: [
    { label: "Formula", fields: [
      field("productType", "Product type", "text", { maxLength: 100 }),
      field("skinType", "Suitable skin types", "multiSelect", { filter: true, options: ["Dry", "Oily", "Combination", "Normal", "Sensitive", "All skin types"] }),
      field("ingredients", "Key ingredients", "text", { maxLength: 200 }),
      field("texture", "Texture / finish", "text", { maxLength: 100 }),
      field("spf", "SPF rating", "number", { min: 1, max: 100, filter: true }),
      field("volumeMl", "Net volume", "number", { unit: "ml", min: 1, max: 5000 })
    ]},
    { label: "Usage", fields: [
      field("usage", "How to use", "text", { maxLength: 200 }),
      field("warnings", "Precautions", "text", { maxLength: 200 })
    ]}
  ]},
  fragrance: { label: "Fragrance", groups: [
    { label: "Fragrance profile", fields: [
      field("fragranceType", "Concentration / type", "select", { options: ["EDP", "EDT", "EDC", "Attar", "Body mist", "Deodorant", "Other"] }),
      field("notes", "Fragrance notes", "text", { maxLength: 200 }),
      field("family", "Scent family", "text", { maxLength: 100 }),
      field("volumeMl", "Net volume", "number", { unit: "ml", min: 1, max: 5000 }),
      field("application", "How to apply", "text", { maxLength: 160 })
    ]}
  ]},
  personalCare: { label: "Personal care", groups: [
    { label: "Product details", fields: [
      field("productType", "Product type", "text", { maxLength: 100 }),
      field("hairType", "Suitable hair type", "text", { maxLength: 120 }),
      field("ingredients", "Key ingredients", "text", { maxLength: 200 }),
      field("volumeMl", "Net volume", "number", { unit: "ml", min: 1, max: 5000 }),
      field("usage", "Directions for use", "text", { maxLength: 200 }),
      field("warnings", "Precautions", "text", { maxLength: 200 })
    ]}
  ]},
  home: { label: "Home & kitchen", groups: [
    { label: "Dimensions & material", fields: [
      field("productType", "Product type", "text", { maxLength: 100 }),
      field("material", "Material", "text", { maxLength: 120 }),
      field("dimensions", "Dimensions", "text", { maxLength: 120 }),
      field("capacity", "Capacity", "text", { maxLength: 100 }),
      field("weightKg", "Weight", "number", { unit: "kg", min: 0.001, max: 1000 })
    ]},
    { label: "Use & care", fields: [
      field("power", "Power rating (if applicable)", "text", { maxLength: 100 }),
      field("care", "Care instructions", "text", { maxLength: 200 }),
      field("warranty", "Warranty (if applicable)", "text", { maxLength: 100 })
    ]}
  ]},
  general: { label: "Product details", groups: [
    { label: "General information", fields: [
      field("productType", "Product type", "text", { maxLength: 100 }),
      field("material", "Material / composition", "text", { maxLength: 150 }),
      field("dimensions", "Size / dimensions", "text", { maxLength: 150 }),
      field("keyFeatures", "Key features", "text", { maxLength: 200 }),
      field("care", "Care / handling", "text", { maxLength: 200 }),
      field("countryOfOrigin", "Country of origin", "text", { maxLength: 80 })
    ]}
  ]},
  other: {
    label: "Electronics",
    groups: [
      { label: "Technical details", fields: [
        field("productType", "Product type", "text", { maxLength: 100 }),
        field("connectivity", "Connectivity", "text", { maxLength: 160 }),
        field("power", "Power requirements", "text", { maxLength: 160 }),
        field("compatibility", "Compatibility", "text", { maxLength: 180 }),
        field("features", "Features", "multiSelect", { options: ["Bluetooth", "Wi-Fi", "USB-C", "Battery Powered", "Smart Home Compatible"] })
      ]}
    ]
  }
};

export function resolveSpecificationType(category) {
  // Match the selected leaf first, but also use ancestor names supplied by the
  // category endpoint. A parent such as Fashion must not turn "Jeans" into
  // generic electronics specifications.
  const value = `${category?.name || ""} ${category?.slug || ""} ${category?.path || ""}`.toLowerCase();
  if (/camera|photograph|dslr|mirrorless/.test(value)) return "camera";
  if (/television|\btv\b|monitor|display/.test(value)) return "display";
  if (/charging|charger|power bank/.test(value)) return "charger";
  if (/network|router|wi-fi/.test(value)) return "networking";
  if (/storage device|ssd|hard drive|pen drive|flash drive/.test(value)) return "storage";
  if (/peripheral|computer accessor|keyboard|mouse pad/.test(value)) return "computerAccessory";
  if (/smart\s*phone|mobile/.test(value)) return "smartphone";
  if (/laptop|notebook|computer/.test(value)) return "laptop";
  if (/smart\s*watch|wearable/.test(value)) return "smartwatch";
  if (/tablet|ipad/.test(value)) return "tablet";
  if (/audio|headphone|earbud|speaker|soundbar/.test(value)) return "audio";
  if (/gaming|game accessory|controller/.test(value)) return "gamingAccessory";
  if (/fragrance|perfume|attar|deodorant|scent/.test(value)) return "fragrance";
  if (/hair|shampoo|conditioner/.test(`${category?.name || ""} ${category?.slug || ""}`.toLowerCase())) return "personalCare";
  if (/skincare|skin care|sunscreen|serum|toner|essence|moisturi|face wash|cleanser|makeup|lipstick|cosmetic/.test(value)) return "skincare";
  if (/hair|shampoo|conditioner|bath|body care|personal care/.test(value)) return "personalCare";
  if (/shoe|sneaker|footwear|sandal|slipper|clog|boot/.test(value)) return "footwear";
  if (/shirt|jean|trouser|t-shirt|kurta|dress|jacket|fashion|clothing|apparel|wear/.test(value)) return "clothing";
  if (/kitchen|home|furniture|decor|appliance|cookware|storage device/.test(value)) return "home";
  return "general";
}

export function getSpecificationDefinition(category) {
  const type = resolveSpecificationType(category);
  return { type, ...specificationDefinitions[type] };
}
