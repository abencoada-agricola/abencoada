const navigationIcons={
 checklists:'<rect x="5" y="4" width="15" height="17" rx="2"/><path d="M9 4V2h7v2M8 10l1.5 1.5L12 9M14 10h3M8 16l1.5 1.5L12 15M14 16h3"/>',
 dashboard:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/>',
 history:'<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M2 21h14M14 10h2a2 2 0 0 1 2 2v5a2 2 0 0 0 4 0V8l-3-3M19 5v4h3"/><rect x="7" y="6" width="4" height="5" rx=".5"/>',
 operations:'<path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4"/>',
 occurrences:'<path d="m12 3 10 18H2L12 3Z M12 9v5 M12 17h.01"/>',
 fleets:'<path d="M3 4h10M4 4v8M12 4v13M12 10h7l2 5M16 10V6M10 18h6M8 4v5h4"/><circle cx="6" cy="17" r="4"/><circle cx="19" cy="18" r="2.5"/>',
 pending:'<path d="M20 8a8 8 0 0 0-13.7-3M20 3v5h-5M4 16a8 8 0 0 0 13.7 3M4 21v-5h5"/>',
 settings:'<path d="M9.8 3h4.4l.7 2.5 2.2 1.3 2.5-.7 2.2 3.8-1.8 1.8v2.6l1.8 1.8-2.2 3.8-2.5-.7-2.2 1.3-.7 2.5H9.8l-.7-2.5-2.2-1.3-2.5.7-2.2-3.8 1.8-1.8v-2.6L2.2 9.9l2.2-3.8 2.5.7 2.2-1.3L9.8 3Z"/><circle cx="12" cy="13" r="3"/>'
};

// Shared by website navigation and the bundled Android interface.
export const navigationSvg=(id,className='nav-icon')=>`<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${navigationIcons[id]||navigationIcons.history}</svg>`;
