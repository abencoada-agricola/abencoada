import assert from 'node:assert/strict';
import {dashboardRange,dashboardVolumes} from '../web/fuel-utils.js';
assert.deepEqual(dashboardRange('2026-10-14',7),{start:'2026-10-08',end:'2026-10-14'});
assert.equal(dashboardRange('2026-10-14',30).start,'2026-09-15');
assert.equal(dashboardRange('2026-10-14',60).start,'2026-08-16');
assert.equal(dashboardRange('2026-10-14',90).start,'2026-07-17');
assert.equal(dashboardRange('2024-03-01',7).start,'2024-02-24');
assert.throws(()=>dashboardRange('2026-10-14',8));
const records=[{date:'2026-10-08',liters:10},{date:'2026-10-14',liters:20},{date:'2026-10-07',liters:40},{date:'2026-10-15',liters:1000},{date:'2026-10-10',liters:1000,status:'pending'}];
const week=dashboardVolumes(records,'2026-10-14',7);assert.equal(week.length,7);assert.equal(week[0].total,10);assert.equal(week.at(-1).total,20);assert.equal(week.reduce((s,b)=>s+b.total,0),30);
for(const days of [30,60,90]){const buckets=dashboardVolumes(records,'2026-10-14',days);assert.equal(buckets.length,Math.ceil(days/7));assert.equal(buckets.at(-1).end,'2026-10-14');assert.equal(buckets.reduce((s,b)=>s+b.total,0),70)}
console.log('Dashboard inclusive periods, month/leap-year boundaries, volume grouping and exclusion of future/pending records passed.');
