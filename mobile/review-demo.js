export function createReviewSession() {
  return {
    demo: true,
    user: {id: 'review-demo', name: 'DEMONSTRAÇÃO'},
    rules: {},
    fleets: [
      {id: '990101', name: 'CAMINHÃO DE DEMONSTRAÇÃO', type: 'Caminhão', active: true, last_km: 45000, tank_capacity: 200},
    ],
    locations: [
      {local_code: '990001', material_code: '990010', name: 'TANQUE DE DEMONSTRAÇÃO A', material_name: 'DIESEL DE DEMONSTRAÇÃO', last_meter: 10000, last_verified_meter: 10000},
      {local_code: '990002', material_code: '990010', name: 'TANQUE DE DEMONSTRAÇÃO B', material_name: 'DIESEL DE DEMONSTRAÇÃO', last_meter: 20000, last_verified_meter: 20000},
    ],
    checklistTemplates: [{
      fleet: '990101',
      version: 1,
      questions: [
        {id: 'tires', text: 'CONDIÇÃO DOS PNEUS'},
        {id: 'lights', text: 'FUNCIONAMENTO DAS LUZES'},
      ],
    }],
  };
}
