'use strict';

// ── iPhone & iPad model names ─────────────────────────
const MODEL_NAMES = {
  // ─── iPhone 4 (2010)
  'iPhone3,1':'iPhone 4', 'iPhone3,2':'iPhone 4', 'iPhone3,3':'iPhone 4',
  // ─── iPhone 4S (2011)
  'iPhone4,1':'iPhone 4S',
  // ─── iPhone 5 (2012)
  'iPhone5,1':'iPhone 5', 'iPhone5,2':'iPhone 5',
  // ─── iPhone 5C (2013)
  'iPhone5,3':'iPhone 5C', 'iPhone5,4':'iPhone 5C',
  // ─── iPhone 5S (2013)
  'iPhone6,1':'iPhone 5S', 'iPhone6,2':'iPhone 5S',
  // ─── iPhone 6 (2014)
  'iPhone7,2':'iPhone 6', 'iPhone7,1':'iPhone 6 Plus',
  // ─── iPhone 6S (2015)
  'iPhone8,1':'iPhone 6S', 'iPhone8,2':'iPhone 6S Plus',
  // ─── iPhone SE الجيل الأول (2016)
  'iPhone8,4':'iPhone SE (الجيل الأول)',
  // ─── iPhone 7 (2016)
  'iPhone9,1':'iPhone 7', 'iPhone9,3':'iPhone 7',
  'iPhone9,2':'iPhone 7 Plus', 'iPhone9,4':'iPhone 7 Plus',
  // ─── iPhone 8 (2017)
  'iPhone10,1':'iPhone 8', 'iPhone10,4':'iPhone 8',
  'iPhone10,2':'iPhone 8 Plus', 'iPhone10,5':'iPhone 8 Plus',
  // ─── iPhone X (2017)
  'iPhone10,3':'iPhone X', 'iPhone10,6':'iPhone X',
  // ─── iPhone XS / XR (2018)
  'iPhone11,2':'iPhone XS',
  'iPhone11,4':'iPhone XS Max', 'iPhone11,6':'iPhone XS Max',
  'iPhone11,8':'iPhone XR',
  // ─── iPhone 11 (2019)
  'iPhone12,1':'iPhone 11',
  'iPhone12,3':'iPhone 11 Pro', 'iPhone12,5':'iPhone 11 Pro Max',
  'iPhone12,8':'iPhone SE (الجيل الثاني)',
  // ─── iPhone 12 (2020)
  'iPhone13,1':'iPhone 12 mini', 'iPhone13,2':'iPhone 12',
  'iPhone13,3':'iPhone 12 Pro', 'iPhone13,4':'iPhone 12 Pro Max',
  // ─── iPhone 13 (2021)
  'iPhone14,4':'iPhone 13 mini', 'iPhone14,5':'iPhone 13',
  'iPhone14,2':'iPhone 13 Pro', 'iPhone14,3':'iPhone 13 Pro Max',
  'iPhone14,6':'iPhone SE (الجيل الثالث)',
  // ─── iPhone 14 (2022)
  'iPhone14,7':'iPhone 14', 'iPhone14,8':'iPhone 14 Plus',
  'iPhone15,2':'iPhone 14 Pro', 'iPhone15,3':'iPhone 14 Pro Max',
  // ─── iPhone 15 (2023)
  'iPhone16,1':'iPhone 15', 'iPhone16,2':'iPhone 15 Plus',
  'iPhone16,3':'iPhone 15 Pro', 'iPhone16,4':'iPhone 15 Pro Max',
  // ─── iPhone 16 (2024)
  'iPhone17,1':'iPhone 16 Pro', 'iPhone17,2':'iPhone 16 Pro Max',
  'iPhone17,3':'iPhone 16',     'iPhone17,4':'iPhone 16 Plus',
  'iPhone17,5':'iPhone 16e',
  // ─── iPhone 17 (2025)
  'iPhone18,1':'iPhone 17',     'iPhone18,2':'iPhone 17 Pro',
  'iPhone18,3':'iPhone 17 Pro Max', 'iPhone18,4':'iPhone 17 Plus',

  // ─── iPad (اختيار الموديلات الرئيسية)
  'iPad2,1':'iPad 2', 'iPad2,2':'iPad 2', 'iPad2,3':'iPad 2', 'iPad2,4':'iPad 2',
  'iPad2,5':'iPad mini', 'iPad2,6':'iPad mini', 'iPad2,7':'iPad mini',
  'iPad3,1':'iPad (الجيل الثالث)', 'iPad3,2':'iPad (الجيل الثالث)', 'iPad3,3':'iPad (الجيل الثالث)',
  'iPad3,4':'iPad (الجيل الرابع)', 'iPad3,5':'iPad (الجيل الرابع)', 'iPad3,6':'iPad (الجيل الرابع)',
  'iPad4,1':'iPad Air', 'iPad4,2':'iPad Air', 'iPad4,3':'iPad Air',
  'iPad4,4':'iPad mini 2', 'iPad4,5':'iPad mini 2', 'iPad4,6':'iPad mini 2',
  'iPad4,7':'iPad mini 3', 'iPad4,8':'iPad mini 3', 'iPad4,9':'iPad mini 3',
  'iPad5,1':'iPad mini 4', 'iPad5,2':'iPad mini 4',
  'iPad5,3':'iPad Air 2', 'iPad5,4':'iPad Air 2',
  'iPad6,3':'iPad Pro 9.7"', 'iPad6,4':'iPad Pro 9.7"',
  'iPad6,7':'iPad Pro 12.9" (الجيل الأول)', 'iPad6,8':'iPad Pro 12.9" (الجيل الأول)',
  'iPad6,11':'iPad (الجيل الخامس)', 'iPad6,12':'iPad (الجيل الخامس)',
  'iPad7,1':'iPad Pro 12.9" (الجيل الثاني)', 'iPad7,2':'iPad Pro 12.9" (الجيل الثاني)',
  'iPad7,3':'iPad Pro 10.5"', 'iPad7,4':'iPad Pro 10.5"',
  'iPad7,5':'iPad (الجيل السادس)', 'iPad7,6':'iPad (الجيل السادس)',
  'iPad7,11':'iPad (الجيل السابع)', 'iPad7,12':'iPad (الجيل السابع)',
  'iPad8,1':'iPad Pro 11" (الجيل الأول)', 'iPad8,2':'iPad Pro 11" (الجيل الأول)',
  'iPad8,3':'iPad Pro 11" (الجيل الأول)', 'iPad8,4':'iPad Pro 11" (الجيل الأول)',
  'iPad8,5':'iPad Pro 12.9" (الجيل الثالث)', 'iPad8,6':'iPad Pro 12.9" (الجيل الثالث)',
  'iPad8,7':'iPad Pro 12.9" (الجيل الثالث)', 'iPad8,8':'iPad Pro 12.9" (الجيل الثالث)',
  'iPad8,9':'iPad Pro 11" (الجيل الثاني)', 'iPad8,10':'iPad Pro 11" (الجيل الثاني)',
  'iPad8,11':'iPad Pro 12.9" (الجيل الرابع)', 'iPad8,12':'iPad Pro 12.9" (الجيل الرابع)',
  'iPad11,1':'iPad mini (الجيل الخامس)', 'iPad11,2':'iPad mini (الجيل الخامس)',
  'iPad11,3':'iPad Air (الجيل الثالث)', 'iPad11,4':'iPad Air (الجيل الثالث)',
  'iPad11,6':'iPad (الجيل الثامن)', 'iPad11,7':'iPad (الجيل الثامن)',
  'iPad12,1':'iPad (الجيل التاسع)', 'iPad12,2':'iPad (الجيل التاسع)',
  'iPad13,1':'iPad Air (الجيل الرابع)', 'iPad13,2':'iPad Air (الجيل الرابع)',
  'iPad13,4':'iPad Pro 11" (الجيل الثالث)', 'iPad13,5':'iPad Pro 11" (الجيل الثالث)',
  'iPad13,6':'iPad Pro 11" (الجيل الثالث)', 'iPad13,7':'iPad Pro 11" (الجيل الثالث)',
  'iPad13,8':'iPad Pro 12.9" (الجيل الخامس)', 'iPad13,9':'iPad Pro 12.9" (الجيل الخامس)',
  'iPad13,10':'iPad Pro 12.9" (الجيل الخامس)', 'iPad13,11':'iPad Pro 12.9" (الجيل الخامس)',
  'iPad13,16':'iPad Air (الجيل الخامس)', 'iPad13,17':'iPad Air (الجيل الخامس)',
  'iPad13,18':'iPad (الجيل العاشر)', 'iPad13,19':'iPad (الجيل العاشر)',
  'iPad14,1':'iPad mini (الجيل السادس)', 'iPad14,2':'iPad mini (الجيل السادس)',
  'iPad14,3':'iPad Pro 11" (الجيل الرابع)', 'iPad14,4':'iPad Pro 11" (الجيل الرابع)',
  'iPad14,5':'iPad Pro 12.9" (الجيل السادس)', 'iPad14,6':'iPad Pro 12.9" (الجيل السادس)',
  'iPad14,8':'iPad Air 11" (M2)', 'iPad14,9':'iPad Air 11" (M2)',
  'iPad14,10':'iPad Air 13" (M2)', 'iPad14,11':'iPad Air 13" (M2)',
  'iPad16,1':'iPad mini (الجيل السابع)', 'iPad16,2':'iPad mini (الجيل السابع)',
  'iPad16,3':'iPad Pro 11" (M4)', 'iPad16,4':'iPad Pro 11" (M4)',
  'iPad16,5':'iPad Pro 13" (M4)', 'iPad16,6':'iPad Pro 13" (M4)',
};

// ── Release year per model ────────────────────────────
const MODEL_YEAR = {
  'iPhone3,1':2010, 'iPhone3,2':2010, 'iPhone3,3':2010,
  'iPhone4,1':2011,
  'iPhone5,1':2012, 'iPhone5,2':2012,
  'iPhone5,3':2013, 'iPhone5,4':2013,
  'iPhone6,1':2013, 'iPhone6,2':2013,
  'iPhone7,1':2014, 'iPhone7,2':2014,
  'iPhone8,1':2015, 'iPhone8,2':2015, 'iPhone8,4':2016,
  'iPhone9,1':2016, 'iPhone9,2':2016, 'iPhone9,3':2016, 'iPhone9,4':2016,
  'iPhone10,1':2017,'iPhone10,2':2017,'iPhone10,3':2017,
  'iPhone10,4':2017,'iPhone10,5':2017,'iPhone10,6':2017,
  'iPhone11,2':2018,'iPhone11,4':2018,'iPhone11,6':2018,'iPhone11,8':2018,
  'iPhone12,1':2019,'iPhone12,3':2019,'iPhone12,5':2019,'iPhone12,8':2020,
  'iPhone13,1':2020,'iPhone13,2':2020,'iPhone13,3':2020,'iPhone13,4':2020,
  'iPhone14,2':2021,'iPhone14,3':2021,'iPhone14,4':2021,'iPhone14,5':2021,
  'iPhone14,6':2022,'iPhone14,7':2022,'iPhone14,8':2022,
  'iPhone15,2':2022,'iPhone15,3':2022,
  'iPhone16,1':2023,'iPhone16,2':2023,'iPhone16,3':2023,'iPhone16,4':2023,
  'iPhone17,1':2024,'iPhone17,2':2024,'iPhone17,3':2024,'iPhone17,4':2024,
  'iPhone17,5':2025,
  'iPhone18,1':2025,'iPhone18,2':2025,'iPhone18,3':2025,'iPhone18,4':2025,
};

// ── Camera / biometric config ─────────────────────────
// [rearCams, hasTelephoto, hasLiDAR, hasTrueDepth/FaceID]
const CAMERA_CONFIG = {
  // iPhone 17 (2025)
  'iPhone18,2':[3,true, true, true], 'iPhone18,3':[3,true, true, true],
  'iPhone18,1':[2,false,false,true], 'iPhone18,4':[2,false,false,true],
  // iPhone 16 (2024)
  'iPhone17,1':[3,true, true, true], 'iPhone17,2':[3,true, true, true],
  'iPhone17,3':[2,false,false,true], 'iPhone17,4':[2,false,false,true],
  'iPhone17,5':[2,false,false,false],  // 16e — Touch ID
  // iPhone 15 (2023)
  'iPhone16,3':[3,true, true, true], 'iPhone16,4':[3,true, true, true],
  'iPhone16,1':[2,false,false,true], 'iPhone16,2':[2,false,false,true],
  // iPhone 14 (2022)
  'iPhone15,2':[3,true, true, true], 'iPhone15,3':[3,true, true, true],
  'iPhone14,7':[2,false,false,true], 'iPhone14,8':[2,false,false,true],
  // iPhone 13 (2021)
  'iPhone14,2':[3,true, true, true], 'iPhone14,3':[3,true, true, true],
  'iPhone14,4':[2,false,false,true], 'iPhone14,5':[2,false,false,true],
  'iPhone14,6':[1,false,false,false],  // SE 3rd — Touch ID
  // iPhone 12 (2020)
  'iPhone13,3':[3,true, true, true], 'iPhone13,4':[3,true, true, true],
  'iPhone13,1':[2,false,false,true], 'iPhone13,2':[2,false,false,true],
  // iPhone 11 (2019) — LiDAR not yet available
  'iPhone12,3':[3,true, false,true], 'iPhone12,5':[3,true, false,true],
  'iPhone12,1':[2,false,false,true],   // wide + ultra-wide, Face ID
  'iPhone12,8':[1,false,false,false],  // SE 2nd — Touch ID
  // iPhone X / XS / XR (2017-2018)
  'iPhone11,2':[2,true, false,true],
  'iPhone11,4':[2,true, false,true], 'iPhone11,6':[2,true, false,true],
  'iPhone11,8':[1,false,false,true],   // XR — single cam, Face ID
  'iPhone10,3':[2,true, false,true], 'iPhone10,6':[2,true, false,true],
  // iPhone 8 (2017)
  'iPhone10,1':[1,false,false,false], 'iPhone10,4':[1,false,false,false],
  'iPhone10,2':[2,true, false,false], 'iPhone10,5':[2,true, false,false],
  // iPhone 7 (2016)
  'iPhone9,1':[1,false,false,false], 'iPhone9,3':[1,false,false,false],
  'iPhone9,2':[2,true, false,false], 'iPhone9,4':[2,true, false,false],
  // iPhone 6S and older — single cam, Touch ID
  'iPhone8,1':[1,false,false,false], 'iPhone8,2':[1,false,false,false],
  'iPhone8,4':[1,false,false,false],
  'iPhone7,1':[1,false,false,false], 'iPhone7,2':[1,false,false,false],
  'iPhone6,1':[1,false,false,false], 'iPhone6,2':[1,false,false,false],
  'iPhone5,1':[1,false,false,false], 'iPhone5,2':[1,false,false,false],
  'iPhone5,3':[1,false,false,false], 'iPhone5,4':[1,false,false,false],
  'iPhone4,1':[1,false,false,false],
};

// ── Color names (DeviceColor hex → Arabic name) ───────
// Values are the literal hex strings ideviceinfo returns.
const COLOR_NAMES = {
  // ─── Blacks
  '#1d1d1f':'أسود',              // Midnight / Black / Space Black
  '#1b1b1f':'أسود',
  '#222222':'أسود لامع',         // Jet Black iPhone 7
  '#2c2c2e':'رمادي فضائي',       // Space Gray iPhone 8
  '#3a3b3c':'رمادي فضائي',       // Space Gray older
  '#3a3a3c':'جرافيت',            // Graphite iPhone 12/13 Pro
  '#474747':'جرافيت',
  '#303033':'تيتانيوم أسود',     // Black Titanium iPhone 16 Pro
  '#36393f':'تيتانيوم أسود',     // Black Titanium iPhone 15 Pro
  // ─── Whites / Silvers / Starlight
  '#f2f2f7':'أبيض',
  '#e1e1e6':'فضي',
  '#e3e3e8':'فضي',               // Silver iPhone 8 / XS
  '#e4ddd8':'فضي',               // Silver iPhone 6 / 7
  '#e2e2e7':'فضي',
  '#e5e4e1':'فضي',               // Silver iPhone 13/14 Pro
  '#faf6ef':'ستارلايت',          // Starlight iPhone 13/14
  '#e8e2d9':'تيتانيوم أبيض',    // White Titanium iPhone 15 Pro
  '#e4e0d8':'تيتانيوم أبيض',    // White Titanium iPhone 16 Pro
  '#e9e4dd':'تيتانيوم أبيض',
  // ─── Golds / Natural / Desert
  '#fddea8':'ذهبي',
  '#f5e6d0':'ذهبي',              // Gold iPhone 8 / XS
  '#f0dfc3':'ذهبي',              // Gold iPhone 12/13/14 Pro
  '#c8b79a':'تيتانيوم طبيعي',   // Natural Titanium iPhone 15/16 Pro
  '#d4bea4':'تيتانيوم صحراوي',  // Desert Titanium iPhone 16 Pro
  '#c7b79a':'تيتانيوم طبيعي',
  // ─── Rose Gold / Pink
  '#f2bfb2':'ذهبي وردي',        // Rose Gold iPhone 6S / 7
  '#f2c0c8':'وردي',              // Pink iPhone 13
  '#f7c9d0':'وردي',              // Pink iPhone 15 / 16
  '#f8d0d8':'وردي',
  // ─── Reds
  '#d03535':'أحمر PRODUCT(RED)',
  '#c0392b':'أحمر PRODUCT(RED)',
  '#fe3824':'أحمر PRODUCT(RED)',
  '#b31f28':'أحمر PRODUCT(RED)',
  '#b01b24':'أحمر PRODUCT(RED)',
  '#bf2023':'أحمر PRODUCT(RED)',
  '#9a2030':'أحمر PRODUCT(RED)',
  '#c41230':'أحمر PRODUCT(RED)',
  // ─── Blues
  '#276393':'أزرق',
  '#2b4f6e':'أزرق الباسيفيك',   // Pacific Blue iPhone 12 Pro
  '#4e77ab':'أزرق',
  '#5f748c':'تيتانيوم أزرق',    // Blue Titanium iPhone 15 Pro
  '#3c507a':'ألترامارين',        // Ultramarine iPhone 16
  '#6ea3c3':'أزرق سيرا',        // Sierra Blue iPhone 13 Pro
  '#5e8db8':'أزرق',
  // ─── Greens
  '#aee0d3':'أخضر',              // Green iPhone 11
  '#e1efde':'أخضر',              // Green iPhone 12
  '#4e7b62':'أخضر',              // Green iPhone 13 / 15
  '#364839':'أخضر منتصف الليل', // Midnight Green iPhone 11 Pro
  '#576856':'أخضر الجبال',      // Alpine Green iPhone 13 Pro
  '#3d6b57':'أخضر',
  // ─── Purples
  '#d4b4d8':'بنفسجي',            // Purple iPhone 11
  '#d0bfe0':'بنفسجي',            // Purple iPhone 12
  '#c8b9d0':'بنفسجي',            // Purple iPhone 14
  '#60345c':'بنفسجي داكن',       // Deep Purple iPhone 14 Pro
  '#c9b8d8':'بنفسجي',
  // ─── Yellows / Coral
  '#f5e07b':'أصفر',              // Yellow iPhone XR / 11
  '#fae680':'أصفر',              // Yellow iPhone 14
  '#fce280':'أصفر',              // Yellow iPhone 15
  '#f2996b':'مرجاني',            // Coral iPhone XR
  // ─── Teals
  '#619e9a':'تيل',               // Teal iPhone 16
  '#50968f':'تيل',
};

module.exports = { MODEL_NAMES, MODEL_YEAR, CAMERA_CONFIG, COLOR_NAMES };
