export function capacityWarning(fleet, liters) {
  const capacity = Number(fleet?.tank_capacity);
  if (!(capacity > 0) || !Number.isFinite(liters) || liters <= capacity) return null;
  return {capacity, liters};
}

// Ratios are estimates from meter intervals, not measurements of a full tank.
export function consumptionSummary(records, fromDate = '') {
  const fleets = new Map();
  const sorted = [...records].sort((a,b) => String(a.created_at || a.createdAt || a.date).localeCompare(String(b.created_at || b.createdAt || b.date)) || String(a.id).localeCompare(String(b.id)));
  for (const record of sorted) {
    if (record.status && record.status !== 'synced') continue;
    let fleet = fleets.get(record.fleet);
    if (!fleet) { fleet = {fleet:record.fleet, liters:0, count:0, km:0, kmLiters:0, hours:0, hourLiters:0, kmSamples:0, hourSamples:0, previous:{}}; fleets.set(record.fleet,fleet); }
    const included = !fromDate || record.date >= fromDate;
    if (included) { fleet.liters += Number(record.liters); fleet.count++; }
    for (const meter of ['km','engine']) {
      if (record.capture_mode === 'quick' && !record.measured_fields?.[meter]) continue;
      const current = Number(record[meter]);
      const snapshot = record.previous_readings?.[meter];
      const hasSnapshot = record.capture_mode === 'quick' && snapshot !== undefined && snapshot !== null && (record.previous_record_id || record.previous_readings?.recordedAt || Number(snapshot) > 0);
      const previous = hasSnapshot ? Number(snapshot) : fleet.previous[meter];
      const delta = current - previous;
      if (included && Number.isFinite(delta) && delta > 0 && Number(record.liters) > 0) {
        if (meter === 'km') { fleet.km += delta; fleet.kmLiters += Number(record.liters); fleet.kmSamples++; }
        else { fleet.hours += delta; fleet.hourLiters += Number(record.liters); fleet.hourSamples++; }
      }
      if (Number.isFinite(current)) fleet.previous[meter] = current;
    }
  }
  return [...fleets.values()].filter(f => f.count).map(f => ({
    ...f, averageLiters: f.liters/f.count,
    kmPerLiter: f.kmSamples ? f.km/f.kmLiters : null,
    litersPerHour: f.hourSamples ? f.hourLiters/f.hours : null
  }));
}

export function confirmCapacity(warning, fleetId) {
  return new Promise(resolve => {
    const dialog = document.createElement('dialog');
    dialog.className = 'capacity-dialog';
    dialog.setAttribute('aria-labelledby','capacity-dialog-title');
    dialog.innerHTML = '<h2 id="capacity-dialog-title">CONFIRA A QUANTIDADE</h2><p></p><button type="button" class="btn secondary">VOLTAR E CORRIGIR</button><button type="button" class="btn primary">CONFIRMAR QUANTIDADE</button>';
    const format = value => Number(value).toLocaleString('pt-BR',{maximumFractionDigits:2});
    dialog.querySelector('p').textContent = 'FROTA '+fleetId+' · CAPACIDADE CADASTRADA: '+format(warning.capacity)+' L. QUANTIDADE INFORMADA: '+format(warning.liters)+' L. DESEJA CONFIRMAR ESTE VALOR?';
    dialog.querySelector('.secondary').onclick = () => dialog.close('cancel');
    dialog.querySelector('.primary').onclick = () => dialog.close('confirm');
    dialog.addEventListener('close', () => { const confirmed = dialog.returnValue === 'confirm'; dialog.remove(); resolve(confirmed); },{once:true});
    document.body.append(dialog);
    dialog.showModal();
    dialog.querySelector('.secondary').focus();
  });
}
