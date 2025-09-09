#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';

interface LevelData {
  description: string;
  price: number;
  type: 'RESISTANCE' | 'SUPPORT' | 'NEUTRAL';
  importance: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  zone: string;
}

interface PriceZone {
  name: string;
  minPrice: number;
  maxPrice: number;
  levels: LevelData[];
}

function parseAllLevels(): LevelData[] {
  const csvPath = path.join(__dirname, '../../docs/ADAUSD_сheat-sheet-09_08_2025.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');
  
  const levels: LevelData[] = [];
  const currentPrice = 0.866985; // Last price from CSV
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line || line.includes('Downloaded from') || line.includes('N/A')) continue;
    
    // Parse CSV line
    const parts = line.split(',');
    if (parts.length < 2) continue;
    
    const description = parts[0]?.replace(/"/g, '').trim() || '';
    const priceStr = parts[1]?.replace(/"/g, '').trim() || '';
    const keyPoint = parts[2]?.replace(/"/g, '').trim() || '';
    
    if (!priceStr || priceStr === 'N/A') continue;
    
    const price = parseFloat(priceStr);
    if (isNaN(price)) continue;
    
    // Determine type based on price relative to current
    let type: 'RESISTANCE' | 'SUPPORT' | 'NEUTRAL';
    if (price > currentPrice) {
      type = 'RESISTANCE';
    } else if (price < currentPrice) {
      type = 'SUPPORT';
    } else {
      type = 'NEUTRAL';
    }
    
    // Determine importance and category
    let importance: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    let category = 'Other';
    
    if (description.includes('52-Week') || description.includes('13-Week') || 
        description.includes('1-Month')) {
      importance = 'CRITICAL';
      category = 'Time-based Extremes';
    } else if (description.includes('Pivot Point') || description.includes('Standard Deviation')) {
      importance = 'HIGH';
      category = 'Pivot/Statistical';
    } else if (description.includes('RSI') && (description.includes('80%') || description.includes('20%'))) {
      importance = 'CRITICAL';
      category = 'RSI Extremes';
    } else if (description.includes('RSI') || description.includes('Stochastic')) {
      importance = 'MEDIUM';
      category = 'Technical Indicator';
    } else if (description.includes('Retracement') || description.includes('Moving Average')) {
      importance = 'MEDIUM';
      category = 'Technical Analysis';
    } else if (description.includes('High') || description.includes('Low') || 
               description.includes('Last') || description.includes('Close')) {
      importance = 'HIGH';
      category = 'Price Action';
    }
    
    // Determine price zone
    let zone = 'Current Zone';
    if (price > 1.0) {
      zone = 'Extreme Bull Zone (1.0+)';
    } else if (price > 0.9) {
      zone = 'Bull Zone (0.9-1.0)';
    } else if (price > 0.8) {
      zone = 'Current Zone (0.8-0.9)';
    } else if (price > 0.6) {
      zone = 'Bear Zone (0.6-0.8)';
    } else if (price > 0.4) {
      zone = 'Deep Bear Zone (0.4-0.6)';
    } else {
      zone = 'Extreme Bear Zone (0.0-0.4)';
    }
    
    levels.push({
      description,
      price,
      type,
      importance,
      category,
      zone
    });
  }
  
  return levels;
}

function organizeByZones(levels: LevelData[]): PriceZone[] {
  const zones: PriceZone[] = [
    { name: 'Extreme Bull Zone (1.0+)', minPrice: 1.0, maxPrice: 2.0, levels: [] },
    { name: 'Bull Zone (0.9-1.0)', minPrice: 0.9, maxPrice: 1.0, levels: [] },
    { name: 'Current Zone (0.8-0.9)', minPrice: 0.8, maxPrice: 0.9, levels: [] },
    { name: 'Bear Zone (0.6-0.8)', minPrice: 0.6, maxPrice: 0.8, levels: [] },
    { name: 'Deep Bear Zone (0.4-0.6)', minPrice: 0.4, maxPrice: 0.6, levels: [] },
    { name: 'Extreme Bear Zone (0.0-0.4)', minPrice: 0.0, maxPrice: 0.4, levels: [] }
  ];
  
  // Organize levels by zones
  levels.forEach(level => {
    const zone = zones.find(z => level.price >= z.minPrice && level.price < z.maxPrice);
    if (zone) {
      zone.levels.push(level);
    }
  });
  
  // Sort levels within each zone by importance and price
  zones.forEach(zone => {
    zone.levels.sort((a, b) => {
      const importanceOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      const aImportance = importanceOrder[a.importance];
      const bImportance = importanceOrder[b.importance];
      
      if (aImportance !== bImportance) {
        return bImportance - aImportance;
      }
      
      return a.price - b.price; // Sort by price within same importance
    });
  });
  
  return zones.filter(zone => zone.levels.length > 0);
}

function generateComprehensiveConfig(zones: PriceZone[]): void {
  console.log('🌍 COMPREHENSIVE MULTI-ZONE SUPPORT/RESISTANCE SYSTEM');
  console.log('=====================================================\n');
  
  const currentPrice = 0.866985;
  
  zones.forEach(zone => {
    console.log(`📍 ${zone.name.toUpperCase()}`);
    console.log('='.repeat(zone.name.length + 3));
    
    const resistanceLevels = zone.levels.filter(l => l.type === 'RESISTANCE');
    const supportLevels = zone.levels.filter(l => l.type === 'SUPPORT');
    
    if (resistanceLevels.length > 0) {
      console.log('📈 RESISTANCE LEVELS (LONG Entry Triggers):');
      resistanceLevels.forEach((level, index) => {
        const distance = ((level.price - currentPrice) / currentPrice * 100).toFixed(1);
        const importanceIcon = level.importance === 'CRITICAL' ? '🔥' : 
                              level.importance === 'HIGH' ? '⭐' : 
                              level.importance === 'MEDIUM' ? '📊' : '📌';
        console.log(`  ${importanceIcon} $${level.price.toFixed(4)} (${distance}% above) - ${level.description}`);
      });
    }
    
    if (supportLevels.length > 0) {
      console.log('📉 SUPPORT LEVELS (SHORT Entry Triggers):');
      supportLevels.forEach((level, index) => {
        const distance = ((currentPrice - level.price) / currentPrice * 100).toFixed(1);
        const importanceIcon = level.importance === 'CRITICAL' ? '🔥' : 
                              level.importance === 'HIGH' ? '⭐' : 
                              level.importance === 'MEDIUM' ? '📊' : '📌';
        console.log(`  ${importanceIcon} $${level.price.toFixed(4)} (${distance}% below) - ${level.description}`);
      });
    }
    
    console.log(`\n📊 Zone Statistics: ${zone.levels.length} total levels`);
    console.log(`   Critical: ${zone.levels.filter(l => l.importance === 'CRITICAL').length}`);
    console.log(`   High: ${zone.levels.filter(l => l.importance === 'HIGH').length}`);
    console.log(`   Medium: ${zone.levels.filter(l => l.importance === 'MEDIUM').length}`);
    console.log(`   Low: ${zone.levels.filter(l => l.importance === 'LOW').length}\n`);
  });
  
  // Generate trading strategy for each zone
  console.log('🎯 TRADING STRATEGY BY ZONE');
  console.log('===========================\n');
  
  zones.forEach(zone => {
    const criticalLevels = zone.levels.filter(l => l.importance === 'CRITICAL');
    const highLevels = zone.levels.filter(l => l.importance === 'HIGH');
    
    if (criticalLevels.length > 0 || highLevels.length > 0) {
      console.log(`📍 ${zone.name}:`);
      
      const resistance = [...criticalLevels, ...highLevels].filter(l => l.type === 'RESISTANCE');
      const support = [...criticalLevels, ...highLevels].filter(l => l.type === 'SUPPORT');
      
      if (resistance.length > 0) {
        console.log(`   🔥 LONG Entry: Break above $${resistance[0]?.price.toFixed(4)} (${resistance[0]?.description})`);
      }
      
      if (support.length > 0) {
        console.log(`   🔥 SHORT Entry: Break below $${support[0]?.price.toFixed(4)} (${support[0]?.description})`);
      }
      
      console.log('');
    }
  });
  
  // Generate comprehensive configuration
  console.log('🔧 COMPREHENSIVE CONFIGURATION');
  console.log('===============================\n');
  
  const allLevels = zones.flatMap(zone => zone.levels);
  const criticalResistance = allLevels.filter(l => l.type === 'RESISTANCE' && l.importance === 'CRITICAL');
  const criticalSupport = allLevels.filter(l => l.type === 'SUPPORT' && l.importance === 'CRITICAL');
  const highResistance = allLevels.filter(l => l.type === 'RESISTANCE' && l.importance === 'HIGH');
  const highSupport = allLevels.filter(l => l.type === 'SUPPORT' && l.importance === 'HIGH');
  
  console.log('// Multi-Zone Support/Resistance Configuration');
  console.log('export const comprehensiveLevels = {');
  console.log('  // Critical levels (market extremes)');
  console.log('  criticalResistance: [');
  criticalResistance.forEach(level => {
    console.log(`    { price: ${level.price.toFixed(4)}, description: "${level.description}", zone: "${level.zone}" },`);
  });
  console.log('  ],');
  console.log('  criticalSupport: [');
  criticalSupport.forEach(level => {
    console.log(`    { price: ${level.price.toFixed(4)}, description: "${level.description}", zone: "${level.zone}" },`);
  });
  console.log('  ],');
  console.log('  // High importance levels (primary trading zones)');
  console.log('  highResistance: [');
  highResistance.forEach(level => {
    console.log(`    { price: ${level.price.toFixed(4)}, description: "${level.description}", zone: "${level.zone}" },`);
  });
  console.log('  ],');
  console.log('  highSupport: [');
  highSupport.forEach(level => {
    console.log(`    { price: ${level.price.toFixed(4)}, description: "${level.description}", zone: "${level.zone}" },`);
  });
  console.log('  ],');
  console.log('  // All levels by zone');
  zones.forEach(zone => {
    console.log(`  ${zone.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}: [`);
    zone.levels.forEach(level => {
      console.log(`    { price: ${level.price.toFixed(4)}, type: "${level.type}", importance: "${level.importance}", description: "${level.description}" },`);
    });
    console.log('  ],');
  });
  console.log('};');
  
  console.log('\n📊 COMPREHENSIVE STATISTICS:');
  console.log(`Total Levels: ${allLevels.length}`);
  console.log(`Critical Levels: ${allLevels.filter(l => l.importance === 'CRITICAL').length}`);
  console.log(`High Importance: ${allLevels.filter(l => l.importance === 'HIGH').length}`);
  console.log(`Medium Importance: ${allLevels.filter(l => l.importance === 'MEDIUM').length}`);
  console.log(`Low Importance: ${allLevels.filter(l => l.importance === 'LOW').length}`);
  console.log(`Price Range: $${Math.min(...allLevels.map(l => l.price)).toFixed(4)} - $${Math.max(...allLevels.map(l => l.price)).toFixed(4)}`);
  console.log(`Coverage: ${((Math.max(...allLevels.map(l => l.price)) - Math.min(...allLevels.map(l => l.price))) / Math.min(...allLevels.map(l => l.price)) * 100).toFixed(1)}% price range`);
}

// Run the comprehensive analysis
const levels = parseAllLevels();
const zones = organizeByZones(levels);
generateComprehensiveConfig(zones);
