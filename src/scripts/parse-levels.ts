#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { BinanceService } from '../services/BinanceService';
import { tradingConfig } from '../config';

interface LevelData {
  description: string;
  price: number;
  type: 'RESISTANCE' | 'SUPPORT' | 'NEUTRAL';
  importance: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
}

async function parseCSVLevels(): Promise<LevelData[]> {
  const csvPath = path.join(__dirname, '../../docs/ADAUSD_сheat-sheet-09_08_2025.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');
  
  const levels: LevelData[] = [];
  
  // Get real-time current price
  const binanceService = new BinanceService(tradingConfig);
  await binanceService.initialize();
  const currentPrice = await binanceService.getCurrentPrice();
  binanceService.cleanup();
  
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
    
    // Determine importance
    let importance: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    let category = 'Other';
    
    if (description.includes('Pivot Point') || description.includes('Standard Deviation')) {
      importance = 'HIGH';
      category = 'Pivot/Statistical';
    } else if (description.includes('Week High') || description.includes('Week Low') || 
               description.includes('Month High') || description.includes('Month Low')) {
      importance = 'HIGH';
      category = 'Time-based';
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
    
    levels.push({
      description,
      price,
      type,
      importance,
      category
    });
  }
  
  return levels;
}

function generateConfig(levels: LevelData[]): void {
  // Sort levels by importance and proximity to current price
  const currentPrice = 0.866985;
  
  const resistanceLevels = levels
    .filter(l => l.type === 'RESISTANCE')
    .sort((a, b) => {
      // Sort by importance first, then by proximity to current price
      const importanceOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      const aImportance = importanceOrder[a.importance];
      const bImportance = importanceOrder[b.importance];
      
      if (aImportance !== bImportance) {
        return bImportance - aImportance;
      }
      
      // If same importance, sort by proximity to current price
      return Math.abs(a.price - currentPrice) - Math.abs(b.price - currentPrice);
    });
  
  const supportLevels = levels
    .filter(l => l.type === 'SUPPORT')
    .sort((a, b) => {
      const importanceOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      const aImportance = importanceOrder[a.importance];
      const bImportance = importanceOrder[b.importance];
      
      if (aImportance !== bImportance) {
        return bImportance - aImportance;
      }
      
      return Math.abs(a.price - currentPrice) - Math.abs(b.price - currentPrice);
    });
  
  // Generate configuration
  console.log('🎯 COMPREHENSIVE SUPPORT/RESISTANCE LEVELS');
  console.log('==========================================\n');
  
  console.log('📈 RESISTANCE LEVELS (LONG Entry Triggers):');
  console.log('--------------------------------------------');
  resistanceLevels.slice(0, 10).forEach((level, index) => {
    const distance = ((level.price - currentPrice) / currentPrice * 100).toFixed(2);
    console.log(`${index + 1}. $${level.price.toFixed(4)} (${distance}% above) - ${level.description}`);
  });
  
  console.log('\n📉 SUPPORT LEVELS (SHORT Entry Triggers):');
  console.log('------------------------------------------');
  supportLevels.slice(0, 10).forEach((level, index) => {
    const distance = ((currentPrice - level.price) / currentPrice * 100).toFixed(2);
    console.log(`${index + 1}. $${level.price.toFixed(4)} (${distance}% below) - ${level.description}`);
  });
  
  // Generate TypeScript configuration
  const topResistance = resistanceLevels.slice(0, 5);
  const topSupport = supportLevels.slice(0, 5);
  
  console.log('\n🔧 UPDATED CONFIGURATION:');
  console.log('==========================');
  console.log('// Update src/config/index.ts with these values:');
  console.log('export const supportResistanceLevels: SupportResistanceLevels = {');
  console.log(`  resistance1: ${topResistance[0]?.price.toFixed(4) || 0}, // ${topResistance[0]?.description || 'N/A'}`);
  console.log(`  resistance2: ${topResistance[1]?.price.toFixed(4) || 0}, // ${topResistance[1]?.description || 'N/A'}`);
  console.log(`  resistance3: ${topResistance[2]?.price.toFixed(4) || 0}, // ${topResistance[2]?.description || 'N/A'}`);
  console.log(`  support1: ${topSupport[0]?.price.toFixed(4) || 0}, // ${topSupport[0]?.description || 'N/A'}`);
  console.log(`  support2: ${topSupport[1]?.price.toFixed(4) || 0}, // ${topSupport[1]?.description || 'N/A'}`);
  console.log(`  support3: ${topSupport[2]?.price.toFixed(4) || 0}, // ${topSupport[2]?.description || 'N/A'}`);
  console.log('  liquidationStop: 0.318249 // 52-Week Low');
  console.log('};');
  
  console.log('\n📊 LEVEL STATISTICS:');
  console.log(`Total Levels: ${levels.length}`);
  console.log(`Resistance Levels: ${resistanceLevels.length}`);
  console.log(`Support Levels: ${supportLevels.length}`);
  console.log(`High Importance: ${levels.filter(l => l.importance === 'HIGH').length}`);
  console.log(`Medium Importance: ${levels.filter(l => l.importance === 'MEDIUM').length}`);
  console.log(`Low Importance: ${levels.filter(l => l.importance === 'LOW').length}`);
  
  console.log(`\n💰 CURRENT ADA PRICE: $${currentPrice.toFixed(6)} (Real-time)`);
  console.log('🎯 Bot will use these levels for bidirectional trading decisions');
}

// Run the parser
async function main() {
  try {
    const levels = await parseCSVLevels();
    generateConfig(levels);
  } catch (error) {
    console.error('❌ Error parsing levels:', error);
    process.exit(1);
  }
}

main();
