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
  const value = `${category?.name || ""} ${category?.slug || ""}`.toLowerCase();
  if (/smart\s*phone|mobile/.test(value)) return "smartphone";
  if (/laptop|notebook|computer/.test(value)) return "laptop";
  if (/smart\s*watch|wearable/.test(value)) return "smartwatch";
  if (/tablet|ipad/.test(value)) return "tablet";
  if (/audio|headphone|earbud|speaker|soundbar/.test(value)) return "audio";
  if (/gaming|game accessory|controller/.test(value)) return "gamingAccessory";
  return "other";
}

export function getSpecificationDefinition(category) {
  const type = resolveSpecificationType(category);
  return { type, ...specificationDefinitions[type] };
}
