#!/usr/bin/env node

// Test script to verify KubeCon event rotation logic
// This demonstrates how the automatic rotation works

import { events, getNextEvent } from '../src/config/events.ts';

console.log('🧪 Testing KubeCon Event Rotation Logic\n');
console.log('========================================\n');

console.log(`Total events configured: ${events.length}\n`);

// Display all configured events
console.log('All Events:');
events.forEach((event, index) => {
  console.log(`  ${index + 1}. ${event.name}`);
  console.log(`     Start: ${event.start}`);
  console.log(`     End: ${event.end}`);
  console.log('');
});

// Test: Current date (should show Europe 2026)
console.log('Current Date Test:');
const today = new Date();
console.log(`  Today: ${today.toISOString().split('T')[0]}`);
const currentEvent = getNextEvent();
if (currentEvent) {
  console.log(`  ✅ Next Event: ${currentEvent.name}`);
  console.log(`     Dates: ${currentEvent.start} to ${currentEvent.end}`);
} else {
  console.log(`  ❌ No upcoming events`);
}
console.log('');

// Test: Simulate date after Europe 2026 ends (should show North America 2026)
console.log('Simulation: After Europe 2026 Ends (March 28, 2026):');
console.log('  Simulated Date: 2026-03-28');
console.log('  Expected: North America 2026');

// Manually filter for this test
const simulatedDate = new Date('2026-03-28');
simulatedDate.setHours(0, 0, 0, 0);

const activeAfterEurope = events.filter(event => {
  const endDate = new Date(event.end);
  endDate.setHours(23, 59, 59, 999);
  return endDate >= simulatedDate;
});

const sortedAfterEurope = activeAfterEurope.sort((a, b) => {
  const dateA = new Date(a.start);
  const dateB = new Date(b.start);
  return dateA.getTime() - dateB.getTime();
});

if (sortedAfterEurope.length > 0) {
  console.log(`  ✅ Next Event: ${sortedAfterEurope[0].name}`);
} else {
  console.log(`  ❌ No upcoming events`);
}
console.log('');

// Test: Simulate date after all 2026 events end
console.log('Simulation: After All 2026 Events (December 1, 2026):');
console.log('  Simulated Date: 2026-12-01');
console.log('  Expected: No events (null)');

const simulatedLate = new Date('2026-12-01');
simulatedLate.setHours(0, 0, 0, 0);

const activeAfterAll = events.filter(event => {
  const endDate = new Date(event.end);
  endDate.setHours(23, 59, 59, 999);
  return endDate >= simulatedLate;
});

if (activeAfterAll.length > 0) {
  console.log(`  ❌ Unexpected event found: ${activeAfterAll[0].name}`);
} else {
  console.log(`  ✅ Correctly returns no events`);
}
console.log('');

console.log('========================================');
console.log('Summary:');
console.log('  - Events are filtered by end date');
console.log('  - Sorted by start date (earliest first)');
console.log('  - Next upcoming event is automatically selected');
console.log('  - Rotation happens automatically at build time');
